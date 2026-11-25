import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { initStorage, storage } from './backend/storage.ts';
import {
  getAdminPasscodeStatus,
  hashPassword,
  optionalAuth,
  requireAdmin,
  requireAuth,
  signToken,
  verifyAdminPasscode,
  verifyPassword,
  type AuthenticatedRequest,
  type AuthUser,
} from './backend/auth.ts';
import { analyzeCropLeafImage } from './backend/gemini.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '12mb' }));

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return null;
}

function validateImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  return false;
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'AgroCare AI',
    database: storage.isUsingSupabase() ? 'supabase' : 'sqlite',
  });
});

// Public stats & library endpoints
app.get('/api/stats/public', async (_req, res) => {
  try {
    const stats = await storage.getPublicStats();
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Unable to load public statistics.' });
  }
});

app.get('/api/crops', async (_req, res) => {
  try {
    const crops = await storage.listCropsWithCounts();
    res.json({ crops });
  } catch {
    res.status(500).json({ error: 'Unable to load crops.' });
  }
});

app.get('/api/diseases', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const crop = typeof req.query.crop === 'string' ? req.query.crop.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const diseases = await storage.searchDiseases({ q, crop, category });
    res.json({ diseases });
  } catch {
    res.status(500).json({ error: 'Unable to load disease library.' });
  }
});

app.get('/api/articles', async (_req, res) => {
  try {
    const articles = await storage.listArticles();
    res.json({ articles });
  } catch {
    res.status(500).json({ error: 'Unable to load articles.' });
  }
});

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, village_district, state, farm_size_acres, primary_crops, language_pref } =
      req.body ?? {};

    if (typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
      return;
    }
    if (typeof email !== 'string' || !isValidEmail(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }

    const pwError = validatePasswordStrength(password);
    if (pwError) {
      res.status(400).json({ error: pwError });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await storage.findUserByEmail(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = hashPassword(password);
    const lang = language_pref === 'kn' ? 'kn' : 'en';

    const { user, profile } = await storage.createUserWithProfile({
      name: name.trim(),
      email: normalizedEmail,
      password_hash: passwordHash,
      role: 'farmer',
      language_pref: lang,
      phone: typeof phone === 'string' ? phone.trim() : '',
      village_district: typeof village_district === 'string' ? village_district.trim() : '',
      state: typeof state === 'string' ? state.trim() : '',
      farm_size_acres: Number.isFinite(Number(farm_size_acres)) ? Math.max(0, Number(farm_size_acres)) : 0,
      primary_crops: typeof primary_crops === 'string' ? primary_crops.trim() : '',
    });

    const token = signToken(user as AuthUser);
    res.status(201).json({ token, user, profile });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed.';
    res.status(500).json({ error: msg });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const row = await storage.findUserByEmail(email);
    if (!row || !verifyPassword(password, row.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const user: AuthUser = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      language_pref: row.language_pref,
    };
    const profile = await storage.getFarmerProfile(user.id);
    const token = signToken(user);

    res.json({ token, user, profile });
  } catch {
    res.status(500).json({ error: 'Sign in failed. Please try again.' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email, registeredName } = req.body ?? {};
    if (typeof email !== 'string' || !isValidEmail(email.trim())) {
      res.status(400).json({ error: 'Please provide a valid registered email address.' });
      return;
    }
    if (typeof registeredName !== 'string' || registeredName.trim().length < 2) {
      res.status(400).json({ error: 'Please provide your registered full name to verify account ownership.' });
      return;
    }

    const userRow = await storage.findUserByEmail(email);
    if (!userRow || userRow.name.trim().toLowerCase() !== registeredName.trim().toLowerCase()) {
      res.status(404).json({ error: 'Account verification failed. Email and registered name did not match.' });
      return;
    }

    const rawToken = crypto.randomBytes(16).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await storage.createPasswordReset(userRow.id, tokenHash, expiresAt);

    res.json({
      message: 'Identity verified. Use the single-use reset code below within 15 minutes to set a new password.',
      resetToken: rawToken,
    });
  } catch {
    res.status(500).json({ error: 'Unable to initiate password reset.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body ?? {};
    if (typeof email !== 'string' || typeof resetToken !== 'string' || typeof newPassword !== 'string') {
      res.status(400).json({ error: 'Email, reset token, and new password are required.' });
      return;
    }

    const pwError = validatePasswordStrength(newPassword);
    if (pwError) {
      res.status(400).json({ error: pwError });
      return;
    }

    const userRow = await storage.findUserByEmail(email);
    if (!userRow) {
      res.status(400).json({ error: 'Invalid or expired reset request.' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(resetToken.trim()).digest('hex');
    const resetRow = await storage.getLatestPasswordReset(userRow.id, tokenHash);

    if (!resetRow || resetRow.used === 1 || new Date(resetRow.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'Reset token is invalid or has expired.' });
      return;
    }

    const newHash = hashPassword(newPassword);
    await storage.completePasswordReset(userRow.id, resetRow.id, newHash);

    res.json({ message: 'Password updated successfully. You may now sign in.' });
  } catch {
    res.status(500).json({ error: 'Could not update password.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const profile = await storage.getFarmerProfile(req.user!.id);
  res.json({ user: req.user, profile });
});

app.put('/api/auth/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, language_pref, phone, village_district, state, farm_size_acres, primary_crops } =
      req.body ?? {};

    const cleanName = typeof name === 'string' && name.trim().length >= 2 ? name.trim() : req.user!.name;
    const cleanLang = language_pref === 'kn' ? 'kn' : 'en';

    const updated = await storage.updateUserAndProfile(req.user!.id, {
      name: cleanName,
      language_pref: cleanLang,
      phone: typeof phone === 'string' ? phone.trim() : '',
      village_district: typeof village_district === 'string' ? village_district.trim() : '',
      state: typeof state === 'string' ? state.trim() : '',
      farm_size_acres: Number.isFinite(Number(farm_size_acres)) ? Math.max(0, Number(farm_size_acres)) : 0,
      primary_crops: typeof primary_crops === 'string' ? primary_crops.trim() : '',
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Could not update profile.' });
  }
});

// Admin claim & verification
app.get('/api/admin/status', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const status = await getAdminPasscodeStatus();
  res.json({
    ...status,
    isAdmin: req.user?.role === 'admin',
  });
});

app.post('/api/admin/claim', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const status = await getAdminPasscodeStatus();
    if (status.configuredViaEnv || status.claimedInDb) {
      res.status(409).json({
        error: 'Administrator passcode is already configured. Please authenticate with the existing admin passcode.',
      });
      return;
    }

    const { passcode, name, email, password } = req.body ?? {};
    if (typeof passcode !== 'string' || passcode.trim().length < 8) {
      res.status(400).json({ error: 'Admin passcode must be at least 8 characters.' });
      return;
    }

    const passcodeHash = hashPassword(passcode.trim());

    if (req.user) {
      await storage.setAdminPasscodeHash(passcodeHash);
      const updatedUser = (await storage.promoteUserToAdmin(req.user.id)) as AuthUser;
      const token = signToken(updatedUser);
      res.json({ token, user: updatedUser });
      return;
    }

    if (typeof name !== 'string' || name.trim().length < 2 || typeof email !== 'string' || !isValidEmail(email) || typeof password !== 'string') {
      res.status(400).json({ error: 'Provide name, valid email, password, and admin passcode to claim admin access.' });
      return;
    }
    const pwErr = validatePasswordStrength(password);
    if (pwErr) {
      res.status(400).json({ error: pwErr });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await storage.findUserByEmail(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'Email already registered. Sign in first, then claim admin access.' });
      return;
    }

    await storage.setAdminPasscodeHash(passcodeHash);
    const { user: newUser } = await storage.createUserWithProfile({
      name: name.trim(),
      email: normalizedEmail,
      password_hash: hashPassword(password),
      role: 'admin',
      language_pref: 'en',
    });

    const token = signToken(newUser as AuthUser);
    res.status(201).json({ token, user: newUser });
  } catch {
    res.status(500).json({ error: 'Could not claim administrator access.' });
  }
});

app.post('/api/admin/authenticate', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { passcode } = req.body ?? {};
  if (typeof passcode !== 'string' || !passcode.trim()) {
    res.status(400).json({ error: 'Admin passcode is required.' });
    return;
  }

  if (!(await verifyAdminPasscode(passcode.trim()))) {
    res.status(403).json({ error: 'Invalid administrator passcode.' });
    return;
  }

  const updatedUser = (await storage.promoteUserToAdmin(req.user!.id)) as AuthUser;
  const token = signToken(updatedUser);
  res.json({ token, user: updatedUser });
});

// AI Crop Disease Detection Endpoint
app.post('/api/detect', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { imageDataUrl, sampleAssetPath, cropHint, language } = req.body ?? {};
    let mimeType = '';
    let base64Data = '';
    let storedImageRef = '';

    if (typeof sampleAssetPath === 'string' && sampleAssetPath.trim().length > 0) {
      const assetsBaseDir = path.resolve(process.cwd(), 'src', 'assets', 'images');
      const relativeSample = sampleAssetPath.replace(/^\/?src\/assets\/images\//, '');
      const resolvedSample = path.resolve(assetsBaseDir, relativeSample);
      if (!resolvedSample.startsWith(assetsBaseDir + path.sep) || !fs.existsSync(resolvedSample)) {
        res.status(400).json({ error: 'Requested sample leaf image was not found.' });
        return;
      }
      const buffer = fs.readFileSync(resolvedSample);
      mimeType = resolvedSample.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      base64Data = buffer.toString('base64');
      storedImageRef = `/src/assets/images/${path.basename(resolvedSample)}`;
    } else if (typeof imageDataUrl === 'string') {
      const match = imageDataUrl.match(/^data:(image\/(?:jpeg|jpg|png));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) {
        res.status(400).json({ error: 'Unsupported image format. Please upload a JPG, JPEG, or PNG image.' });
        return;
      }
      mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
      base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length > 8 * 1024 * 1024) {
        res.status(400).json({ error: 'Image size exceeds the 8 MB limit.' });
        return;
      }
      if (!validateImageMagicBytes(buffer, mimeType)) {
        res.status(400).json({ error: 'Uploaded file signature does not match JPG or PNG format.' });
        return;
      }
      storedImageRef = imageDataUrl;
    } else {
      res.status(400).json({ error: 'Please upload a crop leaf image before running analysis.' });
      return;
    }

    const result = await analyzeCropLeafImage({
      base64Data,
      mimeType,
      cropHint: typeof cropHint === 'string' ? cropHint : 'auto',
      language: language === 'kn' ? 'kn' : 'en',
    });

    const saved = await storage.createDetection({
      user_id: req.user?.id ?? null,
      image_data: storedImageRef,
      crop_detected: result.cropDetected,
      disease_detected: result.diseaseDetected,
      is_healthy: result.isHealthy ? 1 : 0,
      confidence: result.confidence,
      severity: result.severity,
      alternatives_json: JSON.stringify(result.alternativePredictions),
      description: result.description,
      symptoms_json: JSON.stringify(result.visibleSymptoms),
      causes_json: JSON.stringify(result.possibleCauses),
      prevention_json: JSON.stringify(result.preventiveMeasures),
      organic_json: JSON.stringify(result.organicControls),
      chemical_json: JSON.stringify(result.chemicalTreatments),
      quality_warning: result.qualityWarning || '',
      model_used: result.modelUsed,
    });

    res.json({
      detectionId: saved.id,
      imageUrl: storedImageRef,
      createdAt: saved.created_at,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to analyze crop image right now.';
    const statusCode =
      message.includes('GEMINI_API_KEY') || message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED')
        ? 503
        : 500;
    res.status(statusCode).json({ error: message });
  }
});

// Farmer Dashboard endpoints
app.get('/api/dashboard/farmer', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { detections, savedReports, notifications } = await storage.getFarmerDashboardData(req.user!.id);
    const detRows = detections as Array<Record<string, unknown>>;

    const totalAnalyzed = detRows.length;
    const healthyCount = detRows.filter((d) => Number(d.is_healthy) === 1).length;
    const diseasedCount = totalAnalyzed - healthyCount;

    const cropBreakdownMap = new Map<string, { crop: string; total: number; diseased: number; healthy: number }>();
    for (const d of detRows) {
      const cropName = String(d.crop_detected || 'Unknown');
      const current = cropBreakdownMap.get(cropName) ?? { crop: cropName, total: 0, diseased: 0, healthy: 0 };
      current.total += 1;
      if (Number(d.is_healthy) === 1) current.healthy += 1;
      else current.diseased += 1;
      cropBreakdownMap.set(cropName, current);
    }

    res.json({
      stats: {
        totalAnalyzed,
        healthyCount,
        diseasedCount,
        savedReportsCount: savedReports.length,
      },
      cropBreakdown: Array.from(cropBreakdownMap.values()),
      detections: detRows,
      savedReports,
      notifications,
    });
  } catch {
    res.status(500).json({ error: 'Unable to load dashboard.' });
  }
});

app.post('/api/reports/save', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { detectionId, title, notes } = req.body ?? {};
    const idNum = Number(detectionId);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      res.status(400).json({ error: 'Valid detection ID is required.' });
      return;
    }

    const result = await storage.saveReportForUser(
      req.user!.id,
      req.user!.role,
      idNum,
      typeof title === 'string' ? title.trim() : '',
      typeof notes === 'string' ? notes.trim() : ''
    );
    res.status(result.status).json(result.payload);
  } catch {
    res.status(500).json({ error: 'Could not save report.' });
  }
});

app.delete('/api/reports/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const deleted = await storage.deleteSavedReport(Number(req.params.id), req.user!.id);
  if (!deleted) {
    res.status(404).json({ error: 'Saved report not found.' });
    return;
  }
  res.json({ deleted: true });
});

app.post('/api/notifications/:id/read', requireAuth, async (req: AuthenticatedRequest, res) => {
  await storage.markNotificationRead(Number(req.params.id), req.user!.id);
  res.json({ ok: true });
});

// Contact & Feedback
app.post('/api/feedback', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, email, subject, message, rating } = req.body ?? {};
    if (typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your name.' });
      return;
    }
    if (typeof email !== 'string' || !isValidEmail(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (typeof subject !== 'string' || subject.trim().length < 2) {
      res.status(400).json({ error: 'Please enter a subject.' });
      return;
    }
    if (typeof message !== 'string' || message.trim().length < 5) {
      res.status(400).json({ error: 'Please enter a message (at least 5 characters).' });
      return;
    }

    const numericRating = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));

    const id = await storage.createFeedback({
      user_id: req.user?.id ?? null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      rating: numericRating,
    });

    res.status(201).json({
      id,
      message: 'Thank you. Your inquiry and feedback have been recorded.',
    });
  } catch {
    res.status(500).json({ error: 'Could not submit feedback.' });
  }
});

// Admin Dashboard Routes (Role-Based Access Control)
app.get('/api/admin/overview', requireAdmin, async (_req, res) => {
  try {
    const overview = await storage.getAdminOverview();
    res.json(overview);
  } catch {
    res.status(500).json({ error: 'Could not load admin overview.' });
  }
});

app.patch('/api/admin/users/:id/role', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const targetId = Number(req.params.id);
  const { role } = req.body ?? {};
  if (role !== 'farmer' && role !== 'admin') {
    res.status(400).json({ error: 'Invalid role.' });
    return;
  }
  if (targetId === req.user!.id && role !== 'admin') {
    res.status(400).json({ error: 'You cannot remove your own active administrator privileges.' });
    return;
  }
  await storage.updateUserRole(targetId, role);
  res.json({ ok: true });
});

app.post('/api/admin/crops', requireAdmin, async (req, res) => {
  const { name, scientific_name, season, climate_zone, description } = req.body ?? {};
  if (!name || !scientific_name || !season || !climate_zone || !description) {
    res.status(400).json({ error: 'All crop fields are required.' });
    return;
  }
  try {
    const id = await storage.createCrop({
      name: String(name).trim(),
      scientific_name: String(scientific_name).trim(),
      season: String(season).trim(),
      climate_zone: String(climate_zone).trim(),
      description: String(description).trim(),
    });
    res.status(201).json({ id });
  } catch {
    res.status(409).json({ error: 'A crop with that name already exists.' });
  }
});

app.delete('/api/admin/crops/:id', requireAdmin, async (req, res) => {
  await storage.deleteCrop(Number(req.params.id));
  res.json({ deleted: true });
});

app.post('/api/admin/diseases', requireAdmin, async (req, res) => {
  const {
    crop_id,
    name,
    pathogen,
    category,
    severity_typical,
    image_url,
    symptoms,
    causes,
    prevention,
    organic_treatment,
    chemical_treatment,
  } = req.body ?? {};

  const cropRow = await storage.findCropById(Number(crop_id));
  if (!cropRow) {
    res.status(400).json({ error: 'Please select a valid crop.' });
    return;
  }
  if (!name || !pathogen || !category || !symptoms || !causes || !prevention) {
    res.status(400).json({ error: 'Please fill in all required disease pathology fields.' });
    return;
  }

  const safeImageUrl =
    typeof image_url === 'string' && image_url.startsWith('/src/assets/images/')
      ? image_url
      : '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg';

  const id = await storage.createDisease({
    crop_id: cropRow.id,
    crop_name: cropRow.name,
    name: String(name).trim(),
    pathogen: String(pathogen).trim(),
    category: String(category).trim(),
    severity_typical: String(severity_typical || 'Moderate').trim(),
    image_url: safeImageUrl,
    symptoms: String(symptoms).trim(),
    causes: String(causes).trim(),
    prevention: String(prevention).trim(),
    organic_treatment: String(organic_treatment || '').trim(),
    chemical_treatment: String(chemical_treatment || '').trim(),
  });

  res.status(201).json({ id });
});

app.delete('/api/admin/diseases/:id', requireAdmin, async (req, res) => {
  await storage.deleteDisease(Number(req.params.id));
  res.json({ deleted: true });
});

app.delete('/api/admin/detections/:id', requireAdmin, async (req, res) => {
  await storage.deleteDetection(Number(req.params.id));
  res.json({ deleted: true });
});

app.post('/api/admin/articles', requireAdmin, async (req, res) => {
  const { title, title_kn, category, summary, summary_kn, content, content_kn, read_time } = req.body ?? {};
  if (!title || !category || !summary || !content) {
    res.status(400).json({ error: 'Title, category, summary, and content are required.' });
    return;
  }
  const id = await storage.createArticle({
    title: String(title).trim(),
    title_kn: String(title_kn || title).trim(),
    category: String(category).trim(),
    summary: String(summary).trim(),
    summary_kn: String(summary_kn || summary).trim(),
    content: String(content).trim(),
    content_kn: String(content_kn || content).trim(),
    read_time: String(read_time || '4 min read').trim(),
  });
  res.status(201).json({ id });
});

app.delete('/api/admin/articles/:id', requireAdmin, async (req, res) => {
  await storage.deleteArticle(Number(req.params.id));
  res.json({ deleted: true });
});

app.post('/api/admin/notifications', requireAdmin, async (req, res) => {
  const { title, message, type } = req.body ?? {};
  if (!title || !message) {
    res.status(400).json({ error: 'Title and message are required.' });
    return;
  }
  const safeType = type === 'alert' || type === 'advisory' ? type : 'info';
  const id = await storage.createBroadcastNotification(String(title).trim(), String(message).trim(), safeType);
  res.status(201).json({ id });
});

app.patch('/api/admin/feedback/:id', requireAdmin, async (req, res) => {
  await storage.markFeedbackReviewed(Number(req.params.id));
  res.json({ ok: true });
});

async function startServer() {
  await initStorage();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AgroCare AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
