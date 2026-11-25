import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { db, initDatabase } from './db.ts';
import { SEED_ARTICLES, SEED_CROPS, SEED_DISEASES } from './seedData.ts';

export interface StoredUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'farmer' | 'admin';
  language_pref: 'en' | 'kn';
  created_at: string;
}

export interface StoredProfile {
  user_id: number;
  phone: string;
  village_district: string;
  state: string;
  farm_size_acres: number;
  primary_crops: string;
  updated_at: string;
}

let supabaseClient: SupabaseClient | null = null;
let supabaseReady = false;
let supabaseChecked = false;

function resolveSupabaseConfig(): { url: string; key: string } | null {
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const explicitUrl = process.env.SUPABASE_URL?.trim();
  const projectId = process.env.SUPABASE_PROJECT_ID?.trim();
  const url = explicitUrl || (projectId ? `https://${projectId}.supabase.co` : '');

  if (!key || !url) return null;
  return { url, key };
}

export async function initStorage(): Promise<'supabase' | 'sqlite'> {
  initDatabase();
  const cfg = resolveSupabaseConfig();
  if (!cfg) {
    supabaseChecked = true;
    supabaseReady = false;
    return 'sqlite';
  }

  try {
    supabaseClient = createClient(cfg.url, cfg.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { count, error } = await supabaseClient
      .from('crops')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.warn(
        `Supabase detected (${cfg.url}) but tables are not ready yet (${error.message}). Run supabase_schema.sql in Supabase SQL Editor. Using local SQLite meanwhile.`
      );
      supabaseReady = false;
      supabaseChecked = true;
      return 'sqlite';
    }

    supabaseReady = true;
    supabaseChecked = true;

    if ((count ?? 0) === 0) {
      await seedSupabaseIfEmpty(supabaseClient);
    }
    console.log(`AgroCare AI connected to Supabase backend (${cfg.url})`);
    return 'supabase';
  } catch (err) {
    console.warn('Supabase initialization check failed; using local SQLite fallback.', err);
    supabaseReady = false;
    supabaseChecked = true;
    return 'sqlite';
  }
}

async function seedSupabaseIfEmpty(client: SupabaseClient): Promise<void> {
  const { data: existingCrops } = await client.from('crops').select('id, name');
  let cropRows = existingCrops ?? [];

  if (cropRows.length === 0) {
    const { data: inserted } = await client.from('crops').insert(SEED_CROPS).select('id, name');
    cropRows = inserted ?? [];
  }

  const cropMap = new Map(cropRows.map((c) => [c.name, c.id]));

  const { count: diseaseCount } = await client
    .from('diseases')
    .select('id', { count: 'exact', head: true });

  if ((diseaseCount ?? 0) === 0) {
    const diseasePayload = SEED_DISEASES.map((d) => ({
      ...d,
      crop_id: cropMap.get(d.crop_name),
    })).filter((d) => typeof d.crop_id === 'number');

    if (diseasePayload.length > 0) {
      await client.from('diseases').insert(diseasePayload);
    }
  }

  const { count: articleCount } = await client
    .from('articles')
    .select('id', { count: 'exact', head: true });

  if ((articleCount ?? 0) === 0) {
    await client.from('articles').insert(SEED_ARTICLES);
  }

  const { count: notifCount } = await client
    .from('notifications')
    .select('id', { count: 'exact', head: true });

  if ((notifCount ?? 0) === 0) {
    await client.from('notifications').insert({
      user_id: null,
      title: 'Monsoon Foliar Scouting Advisory',
      message:
        'High morning humidity increases risk of Early Blight in Tomato and Blast in Rice. Inspect lower canopy leaves twice weekly.',
      type: 'advisory',
    });
  }
}

function usingSupabase(): boolean {
  return supabaseChecked && supabaseReady && supabaseClient !== null;
}

export const storage = {
  isUsingSupabase(): boolean {
    return usingSupabase();
  },

  async getPublicStats(): Promise<{ cropsCount: number; diseasesCount: number; detectionsCount: number }> {
    if (usingSupabase()) {
      const sb = supabaseClient!;
      const [c, d, det] = await Promise.all([
        sb.from('crops').select('id', { count: 'exact', head: true }),
        sb.from('diseases').select('id', { count: 'exact', head: true }),
        sb.from('detections').select('id', { count: 'exact', head: true }),
      ]);
      return {
        cropsCount: c.count ?? 0,
        diseasesCount: d.count ?? 0,
        detectionsCount: det.count ?? 0,
      };
    }

    const cropsCount = (db.prepare('SELECT COUNT(*) as c FROM crops').get() as { c: number }).c;
    const diseasesCount = (db.prepare('SELECT COUNT(*) as c FROM diseases').get() as { c: number }).c;
    const detectionsCount = (db.prepare('SELECT COUNT(*) as c FROM detections').get() as { c: number }).c;
    return { cropsCount, diseasesCount, detectionsCount };
  },

  async listCropsWithCounts() {
    if (usingSupabase()) {
      const sb = supabaseClient!;
      const [{ data: crops }, { data: diseases }] = await Promise.all([
        sb.from('crops').select('*').order('name', { ascending: true }),
        sb.from('diseases').select('crop_id'),
      ]);
      const counts = new Map<number, number>();
      for (const row of diseases ?? []) {
        counts.set(row.crop_id, (counts.get(row.crop_id) ?? 0) + 1);
      }
      return (crops ?? []).map((c) => ({ ...c, disease_count: counts.get(c.id) ?? 0 }));
    }

    return db
      .prepare(
        `SELECT c.*, COUNT(d.id) as disease_count
         FROM crops c
         LEFT JOIN diseases d ON d.crop_id = c.id
         GROUP BY c.id
         ORDER BY c.name ASC`
      )
      .all();
  },

  async searchDiseases(filters: { q: string; crop: string; category: string }) {
    if (usingSupabase()) {
      let query = supabaseClient!.from('diseases').select('*');
      if (filters.crop && filters.crop !== 'All') {
        query = query.ilike('crop_name', filters.crop);
      }
      if (filters.category && filters.category !== 'All') {
        query = query.ilike('category', filters.category);
      }
      const { data } = await query.order('crop_name', { ascending: true }).order('name', { ascending: true });
      const rows = data ?? [];
      if (!filters.q) return rows;
      const needle = filters.q.toLowerCase();
      return rows.filter(
        (d) =>
          d.name.toLowerCase().includes(needle) ||
          d.crop_name.toLowerCase().includes(needle) ||
          d.pathogen.toLowerCase().includes(needle) ||
          d.symptoms.toLowerCase().includes(needle)
      );
    }

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filters.crop && filters.crop !== 'All') {
      conditions.push('LOWER(crop_name) = LOWER(?)');
      params.push(filters.crop);
    }
    if (filters.category && filters.category !== 'All') {
      conditions.push('LOWER(category) = LOWER(?)');
      params.push(filters.category);
    }
    if (filters.q) {
      conditions.push(
        '(LOWER(name) LIKE LOWER(?) OR LOWER(crop_name) LIKE LOWER(?) OR LOWER(pathogen) LIKE LOWER(?) OR LOWER(symptoms) LIKE LOWER(?))'
      );
      const like = `%${filters.q}%`;
      params.push(like, like, like, like);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return db.prepare(`SELECT * FROM diseases ${whereClause} ORDER BY crop_name ASC, name ASC`).all(...params);
  },

  async listArticles() {
    if (usingSupabase()) {
      const { data } = await supabaseClient!
        .from('articles')
        .select('*')
        .order('published_at', { ascending: false })
        .order('id', { ascending: false });
      return data ?? [];
    }
    return db.prepare('SELECT * FROM articles ORDER BY published_at DESC, id DESC').all();
  },

  async findUserByEmail(email: string): Promise<StoredUser | undefined> {
    const clean = email.trim().toLowerCase();
    if (usingSupabase()) {
      const { data } = await supabaseClient!.from('users').select('*').eq('email', clean).maybeSingle();
      return (data as StoredUser | null) ?? undefined;
    }
    return db.prepare('SELECT * FROM users WHERE email = ?').get(clean) as StoredUser | undefined;
  },

  async findUserById(id: number): Promise<Omit<StoredUser, 'password_hash'> | undefined> {
    if (usingSupabase()) {
      const { data } = await supabaseClient!
        .from('users')
        .select('id, name, email, role, language_pref, created_at')
        .eq('id', id)
        .maybeSingle();
      return (data as Omit<StoredUser, 'password_hash'> | null) ?? undefined;
    }
    return db
      .prepare('SELECT id, name, email, role, language_pref, created_at FROM users WHERE id = ?')
      .get(id) as Omit<StoredUser, 'password_hash'> | undefined;
  },

  async createUserWithProfile(input: {
    name: string;
    email: string;
    password_hash: string;
    role: 'farmer' | 'admin';
    language_pref: 'en' | 'kn';
    phone?: string;
    village_district?: string;
    state?: string;
    farm_size_acres?: number;
    primary_crops?: string;
  }) {
    if (usingSupabase()) {
      const sb = supabaseClient!;
      const { data: userRow, error: userErr } = await sb
        .from('users')
        .insert({
          name: input.name,
          email: input.email,
          password_hash: input.password_hash,
          role: input.role,
          language_pref: input.language_pref,
        })
        .select('id, name, email, role, language_pref, created_at')
        .single();

      if (userErr || !userRow) {
        throw new Error(userErr?.message || 'Failed to create user in Supabase.');
      }

      const { data: profileRow } = await sb
        .from('farmer_profiles')
        .insert({
          user_id: userRow.id,
          phone: input.phone || '',
          village_district: input.village_district || '',
          state: input.state || '',
          farm_size_acres: input.farm_size_acres ?? 0,
          primary_crops: input.primary_crops || '',
        })
        .select('*')
        .single();

      await sb.from('notifications').insert({
        user_id: userRow.id,
        title: 'Welcome to AgroCare AI',
        message:
          'Upload your first crop leaf photo in the Detect Disease workspace to start tracking field health.',
        type: 'info',
      });

      return { user: userRow, profile: profileRow ?? null };
    }

    const userId = db.transaction(() => {
      const info = db
        .prepare('INSERT INTO users (name, email, password_hash, role, language_pref) VALUES (?, ?, ?, ?, ?)')
        .run(input.name, input.email, input.password_hash, input.role, input.language_pref);

      const newId = Number(info.lastInsertRowid);
      db.prepare(
        `INSERT INTO farmer_profiles (user_id, phone, village_district, state, farm_size_acres, primary_crops)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        newId,
        input.phone || '',
        input.village_district || '',
        input.state || '',
        input.farm_size_acres ?? 0,
        input.primary_crops || ''
      );

      db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run(
        newId,
        'Welcome to AgroCare AI',
        'Upload your first crop leaf photo in the Detect Disease workspace to start tracking field health.',
        'info'
      );
      return newId;
    })();

    const user = db
      .prepare('SELECT id, name, email, role, language_pref, created_at FROM users WHERE id = ?')
      .get(userId);
    const profile = db.prepare('SELECT * FROM farmer_profiles WHERE user_id = ?').get(userId);
    return { user, profile };
  },

  async getFarmerProfile(userId: number) {
    if (usingSupabase()) {
      const { data } = await supabaseClient!
        .from('farmer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      return data ?? null;
    }
    return db.prepare('SELECT * FROM farmer_profiles WHERE user_id = ?').get(userId) ?? null;
  },

  async updateUserAndProfile(
    userId: number,
    input: {
      name: string;
      language_pref: 'en' | 'kn';
      phone: string;
      village_district: string;
      state: string;
      farm_size_acres: number;
      primary_crops: string;
    }
  ) {
    if (usingSupabase()) {
      const sb = supabaseClient!;
      const { data: user } = await sb
        .from('users')
        .update({ name: input.name, language_pref: input.language_pref })
        .eq('id', userId)
        .select('id, name, email, role, language_pref')
        .single();

      const { data: profile } = await sb
        .from('farmer_profiles')
        .upsert({
          user_id: userId,
          phone: input.phone,
          village_district: input.village_district,
          state: input.state,
          farm_size_acres: input.farm_size_acres,
          primary_crops: input.primary_crops,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      return { user, profile };
    }

    db.transaction(() => {
      db.prepare('UPDATE users SET name = ?, language_pref = ? WHERE id = ?').run(
        input.name,
        input.language_pref,
        userId
      );
      db.prepare(
        `INSERT INTO farmer_profiles (user_id, phone, village_district, state, farm_size_acres, primary_crops, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           phone = excluded.phone,
           village_district = excluded.village_district,
           state = excluded.state,
           farm_size_acres = excluded.farm_size_acres,
           primary_crops = excluded.primary_crops,
           updated_at = datetime('now')`
      ).run(
        userId,
        input.phone,
        input.village_district,
        input.state,
        input.farm_size_acres,
        input.primary_crops
      );
    })();

    const user = db.prepare('SELECT id, name, email, role, language_pref FROM users WHERE id = ?').get(userId);
    const profile = db.prepare('SELECT * FROM farmer_profiles WHERE user_id = ?').get(userId);
    return { user, profile };
  },

  async createPasswordReset(userId: number, tokenHash: string, expiresAt: string) {
    if (usingSupabase()) {
      await supabaseClient!.from('password_resets').insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });
      return;
    }
    db.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(
      userId,
      tokenHash,
      expiresAt
    );
  },

  async getLatestPasswordReset(userId: number, tokenHash: string) {
    if (usingSupabase()) {
      const { data } = await supabaseClient!
        .from('password_resets')
        .select('id, expires_at, used')
        .eq('user_id', userId)
        .eq('token_hash', tokenHash)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? undefined;
    }
    return db
      .prepare(
        `SELECT id, expires_at, used FROM password_resets
         WHERE user_id = ? AND token_hash = ?
         ORDER BY id DESC LIMIT 1`
      )
      .get(userId, tokenHash) as { id: number; expires_at: string; used: number } | undefined;
  },

  async completePasswordReset(userId: number, resetId: number, newPasswordHash: string) {
    if (usingSupabase()) {
      const sb = supabaseClient!;
      await sb.from('users').update({ password_hash: newPasswordHash }).eq('id', userId);
      await sb.from('password_resets').update({ used: 1 }).eq('id', resetId);
      return;
    }
    db.transaction(() => {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, userId);
      db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetId);
    })();
  },

  async getAdminPasscodeHash(): Promise<string | null> {
    if (usingSupabase()) {
      const { data } = await supabaseClient!
        .from('app_settings')
        .select('value')
        .eq('key', 'admin_passcode_hash')
        .maybeSingle();
      return data?.value ?? null;
    }
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'admin_passcode_hash'").get() as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  },

  async setAdminPasscodeHash(passcodeHash: string) {
    if (usingSupabase()) {
      await supabaseClient!.from('app_settings').upsert({ key: 'admin_passcode_hash', value: passcodeHash });
      return;
    }
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('admin_passcode_hash', ?)").run(
      passcodeHash
    );
  },

  async promoteUserToAdmin(userId: number) {
    if (usingSupabase()) {
      const { data } = await supabaseClient!
        .from('users')
        .update({ role: 'admin' })
        .eq('id', userId)
        .select('id, name, email, role, language_pref')
        .single();
      return data;
    }
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(userId);
    return db.prepare('SELECT id, name, email, role, language_pref FROM users WHERE id = ?').get(userId);
  },

  async createDetection(input: {
    user_id: number | null;
    image_data: string;
    crop_detected: string;
    disease_detected: string;
    is_healthy: number;
    confidence: number;
    severity: string;
    alternatives_json: string;
    description: string;
    symptoms_json: string;
    causes_json: string;
    prevention_json: string;
    organic_json: string;
    chemical_json: string;
    quality_warning: string;
    model_used: string;
  }): Promise<{ id: number; created_at: string }> {
    if (usingSupabase()) {
      const { data, error } = await supabaseClient!
        .from('detections')
        .insert(input)
        .select('id, created_at')
        .single();
      if (error || !data) {
        throw new Error(error?.message || 'Failed to save detection to Supabase.');
      }
      return data;
    }

    const info = db
      .prepare(
        `INSERT INTO detections (
          user_id, image_data, crop_detected, disease_detected, is_healthy, confidence,
          severity, alternatives_json, description, symptoms_json, causes_json,
          prevention_json, organic_json, chemical_json, quality_warning, model_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.user_id,
        input.image_data,
        input.crop_detected,
        input.disease_detected,
        input.is_healthy,
        input.confidence,
        input.severity,
        input.alternatives_json,
        input.description,
        input.symptoms_json,
        input.causes_json,
        input.prevention_json,
        input.organic_json,
        input.chemical_json,
        input.quality_warning,
        input.model_used
      );

    return { id: Number(info.lastInsertRowid), created_at: new Date().toISOString() };
  },

  async getFarmerDashboardData(userId: number) {
    if (usingSupabase()) {
      const sb = supabaseClient!;
      const [{ data: detections }, { data: savedRows }, { data: notifications }] = await Promise.all([
        sb
          .from('detections')
          .select(
            'id, image_data, crop_detected, disease_detected, is_healthy, confidence, severity, alternatives_json, description, symptoms_json, causes_json, prevention_json, organic_json, chemical_json, quality_warning, model_used, created_at'
          )
          .eq('user_id', userId)
          .order('id', { ascending: false })
          .limit(50),
        sb
          .from('saved_reports')
          .select(
            'id, detection_id, title, notes, created_at, detections(crop_detected, disease_detected, is_healthy, confidence, severity, image_data, description, symptoms_json, causes_json, prevention_json, organic_json, chemical_json, alternatives_json, quality_warning, model_used)'
          )
          .eq('user_id', userId)
          .order('id', { ascending: false }),
        sb
          .from('notifications')
          .select('*')
          .or(`user_id.is.null,user_id.eq.${userId}`)
          .order('id', { ascending: false })
          .limit(20),
      ]);

      const savedReports = (savedRows ?? []).map((sr: Record<string, unknown>) => {
        const det = (sr.detections || {}) as Record<string, unknown>;
        return {
          id: sr.id,
          detection_id: sr.detection_id,
          title: sr.title,
          notes: sr.notes,
          created_at: sr.created_at,
          crop_detected: det.crop_detected,
          disease_detected: det.disease_detected,
          is_healthy: det.is_healthy,
          confidence: det.confidence,
          severity: det.severity,
          image_data: det.image_data,
          description: det.description,
          symptoms_json: det.symptoms_json,
          causes_json: det.causes_json,
          prevention_json: det.prevention_json,
          organic_json: det.organic_json,
          chemical_json: det.chemical_json,
          alternatives_json: det.alternatives_json,
          quality_warning: det.quality_warning,
          model_used: det.model_used,
        };
      });

      return {
        detections: detections ?? [],
        savedReports,
        notifications: notifications ?? [],
      };
    }

    const detections = db
      .prepare(
        `SELECT id, image_data, crop_detected, disease_detected, is_healthy, confidence,
                severity, alternatives_json, description, symptoms_json, causes_json,
                prevention_json, organic_json, chemical_json, quality_warning, model_used, created_at
         FROM detections
         WHERE user_id = ?
         ORDER BY id DESC
         LIMIT 50`
      )
      .all(userId);

    const savedReports = db
      .prepare(
        `SELECT sr.id, sr.detection_id, sr.title, sr.notes, sr.created_at,
                d.crop_detected, d.disease_detected, d.is_healthy, d.confidence, d.severity, d.image_data,
                d.description, d.symptoms_json, d.causes_json, d.prevention_json, d.organic_json, d.chemical_json,
                d.alternatives_json, d.quality_warning, d.model_used
         FROM saved_reports sr
         JOIN detections d ON d.id = sr.detection_id
         WHERE sr.user_id = ?
         ORDER BY sr.id DESC`
      )
      .all(userId);

    const notifications = db
      .prepare(
        `SELECT * FROM notifications
         WHERE user_id IS NULL OR user_id = ?
         ORDER BY id DESC
         LIMIT 20`
      )
      .all(userId);

    return { detections, savedReports, notifications };
  },

  async saveReportForUser(
    userId: number,
    userRole: 'farmer' | 'admin',
    detectionId: number,
    title: string,
    notes: string
  ): Promise<{ status: number; payload: Record<string, unknown> }> {
    if (usingSupabase()) {
      const sb = supabaseClient!;
      const { data: detection } = await sb
        .from('detections')
        .select('id, user_id, crop_detected, disease_detected')
        .eq('id', detectionId)
        .maybeSingle();

      if (!detection) {
        return { status: 404, payload: { error: 'Detection record not found.' } };
      }
      if (detection.user_id !== null && detection.user_id !== userId && userRole !== 'admin') {
        return { status: 403, payload: { error: 'You do not have permission to save this detection record.' } };
      }
      if (detection.user_id === null) {
        await sb.from('detections').update({ user_id: userId }).eq('id', detectionId);
      }

      const { data: existing } = await sb
        .from('saved_reports')
        .select('id')
        .eq('user_id', userId)
        .eq('detection_id', detectionId)
        .maybeSingle();

      if (existing) {
        return { status: 200, payload: { reportId: existing.id, alreadySaved: true } };
      }

      const reportTitle = title || `${detection.crop_detected} — ${detection.disease_detected}`;
      const { data: created } = await sb
        .from('saved_reports')
        .insert({ user_id: userId, detection_id: detectionId, title: reportTitle, notes })
        .select('id')
        .single();

      return { status: 201, payload: { reportId: created?.id, alreadySaved: false } };
    }

    const detection = db
      .prepare('SELECT id, user_id, crop_detected, disease_detected FROM detections WHERE id = ?')
      .get(detectionId) as { id: number; user_id: number | null; crop_detected: string; disease_detected: string } | undefined;

    if (!detection) {
      return { status: 404, payload: { error: 'Detection record not found.' } };
    }
    if (detection.user_id !== null && detection.user_id !== userId && userRole !== 'admin') {
      return { status: 403, payload: { error: 'You do not have permission to save this detection record.' } };
    }
    if (detection.user_id === null) {
      db.prepare('UPDATE detections SET user_id = ? WHERE id = ?').run(userId, detectionId);
    }

    const existing = db
      .prepare('SELECT id FROM saved_reports WHERE user_id = ? AND detection_id = ?')
      .get(userId, detectionId) as { id: number } | undefined;

    if (existing) {
      return { status: 200, payload: { reportId: existing.id, alreadySaved: true } };
    }

    const reportTitle = title || `${detection.crop_detected} — ${detection.disease_detected}`;
    const info = db
      .prepare('INSERT INTO saved_reports (user_id, detection_id, title, notes) VALUES (?, ?, ?, ?)')
      .run(userId, detectionId, reportTitle, notes);

    return { status: 201, payload: { reportId: Number(info.lastInsertRowid), alreadySaved: false } };
  },

  async deleteSavedReport(reportId: number, userId: number): Promise<boolean> {
    if (usingSupabase()) {
      const { data } = await supabaseClient!
        .from('saved_reports')
        .delete()
        .eq('id', reportId)
        .eq('user_id', userId)
        .select('id');
      return (data?.length ?? 0) > 0;
    }
    const info = db.prepare('DELETE FROM saved_reports WHERE id = ? AND user_id = ?').run(reportId, userId);
    return info.changes > 0;
  },

  async markNotificationRead(notifId: number, userId: number) {
    if (usingSupabase()) {
      await supabaseClient!
        .from('notifications')
        .update({ is_read: 1 })
        .eq('id', notifId)
        .or(`user_id.eq.${userId},user_id.is.null`);
      return;
    }
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)').run(
      notifId,
      userId
    );
  },

  async createFeedback(input: {
    user_id: number | null;
    name: string;
    email: string;
    subject: string;
    message: string;
    rating: number;
  }): Promise<number> {
    if (usingSupabase()) {
      const { data } = await supabaseClient!.from('feedback').insert(input).select('id').single();
      return data?.id ?? 0;
    }
    const info = db
      .prepare(
        'INSERT INTO feedback (user_id, name, email, subject, message, rating) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(input.user_id, input.name, input.email, input.subject, input.message, input.rating);
    return Number(info.lastInsertRowid);
  },

  async getAdminOverview() {
    if (usingSupabase()) {
      const sb = supabaseClient!;
      const [
        { data: usersRaw },
        { data: profilesRaw },
        { data: detectionsRaw },
        { data: cropsRaw },
        { data: diseasesRaw },
        { data: feedbackRaw },
        { data: articlesRaw },
        totalDetCount,
        healthyDetCount,
      ] = await Promise.all([
        sb
          .from('users')
          .select('id, name, email, role, language_pref, created_at')
          .order('id', { ascending: false }),
        sb.from('farmer_profiles').select('user_id, village_district, state, farm_size_acres'),
        sb
          .from('detections')
          .select('id, user_id, crop_detected, disease_detected, is_healthy, confidence, severity, model_used, created_at')
          .order('id', { ascending: false })
          .limit(100),
        sb.from('crops').select('*').order('name', { ascending: true }),
        sb.from('diseases').select('*').order('crop_name', { ascending: true }).order('name', { ascending: true }),
        sb.from('feedback').select('*').order('id', { ascending: false }),
        sb.from('articles').select('*').order('id', { ascending: false }),
        sb.from('detections').select('id', { count: 'exact', head: true }),
        sb.from('detections').select('id', { count: 'exact', head: true }).eq('is_healthy', 1),
      ]);

      const profileMap = new Map((profilesRaw ?? []).map((p) => [p.user_id, p]));
      const userMap = new Map((usersRaw ?? []).map((u) => [u.id, u.name]));
      const scanCounts = new Map<number, number>();
      for (const det of detectionsRaw ?? []) {
        if (det.user_id) scanCounts.set(det.user_id, (scanCounts.get(det.user_id) ?? 0) + 1);
      }

      const users = (usersRaw ?? []).map((u) => {
        const p = profileMap.get(u.id);
        return {
          ...u,
          village_district: p?.village_district ?? '',
          state: p?.state ?? '',
          farm_size_acres: p?.farm_size_acres ?? 0,
          scan_count: scanCounts.get(u.id) ?? 0,
        };
      });

      const detections = (detectionsRaw ?? []).map((d) => ({
        ...d,
        farmer_name: d.user_id ? userMap.get(d.user_id) ?? null : null,
      }));

      const totalDetections = totalDetCount.count ?? 0;
      const healthyDetections = healthyDetCount.count ?? 0;

      return {
        summary: {
          totalUsers: users.length,
          totalDetections,
          healthyDetections,
          diseasedDetections: totalDetections - healthyDetections,
          totalCrops: (cropsRaw ?? []).length,
          totalDiseases: (diseasesRaw ?? []).length,
          totalFeedback: (feedbackRaw ?? []).length,
        },
        users,
        detections,
        crops: cropsRaw ?? [],
        diseases: diseasesRaw ?? [],
        feedback: feedbackRaw ?? [],
        articles: articlesRaw ?? [],
      };
    }

    const users = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, u.language_pref, u.created_at,
                fp.village_district, fp.state, fp.farm_size_acres,
                (SELECT COUNT(*) FROM detections d WHERE d.user_id = u.id) as scan_count
         FROM users u
         LEFT JOIN farmer_profiles fp ON fp.user_id = u.id
         ORDER BY u.id DESC`
      )
      .all();

    const detections = db
      .prepare(
        `SELECT d.id, d.user_id, u.name as farmer_name, d.crop_detected, d.disease_detected,
                d.is_healthy, d.confidence, d.severity, d.model_used, d.created_at
         FROM detections d
         LEFT JOIN users u ON u.id = d.user_id
         ORDER BY d.id DESC
         LIMIT 100`
      )
      .all();

    const crops = db.prepare('SELECT * FROM crops ORDER BY name ASC').all();
    const diseases = db.prepare('SELECT * FROM diseases ORDER BY crop_name ASC, name ASC').all();
    const feedbackList = db.prepare('SELECT * FROM feedback ORDER BY id DESC').all();
    const articles = db.prepare('SELECT * FROM articles ORDER BY id DESC').all();

    const totalDetections = (db.prepare('SELECT COUNT(*) as c FROM detections').get() as { c: number }).c;
    const healthyDetections = (
      db.prepare('SELECT COUNT(*) as c FROM detections WHERE is_healthy = 1').get() as { c: number }
    ).c;

    return {
      summary: {
        totalUsers: users.length,
        totalDetections,
        healthyDetections,
        diseasedDetections: totalDetections - healthyDetections,
        totalCrops: crops.length,
        totalDiseases: diseases.length,
        totalFeedback: feedbackList.length,
      },
      users,
      detections,
      crops,
      diseases,
      feedback: feedbackList,
      articles,
    };
  },

  async updateUserRole(targetId: number, role: 'farmer' | 'admin') {
    if (usingSupabase()) {
      await supabaseClient!.from('users').update({ role }).eq('id', targetId);
      return;
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetId);
  },

  async createCrop(input: {
    name: string;
    scientific_name: string;
    season: string;
    climate_zone: string;
    description: string;
  }): Promise<number> {
    if (usingSupabase()) {
      const { data, error } = await supabaseClient!.from('crops').insert(input).select('id').single();
      if (error || !data) throw new Error(error?.message || 'Duplicate crop');
      return data.id;
    }
    const info = db
      .prepare(
        'INSERT INTO crops (name, scientific_name, season, climate_zone, description) VALUES (?, ?, ?, ?, ?)'
      )
      .run(input.name, input.scientific_name, input.season, input.climate_zone, input.description);
    return Number(info.lastInsertRowid);
  },

  async deleteCrop(id: number) {
    if (usingSupabase()) {
      await supabaseClient!.from('crops').delete().eq('id', id);
      return;
    }
    db.prepare('DELETE FROM crops WHERE id = ?').run(id);
  },

  async findCropById(id: number): Promise<{ id: number; name: string } | undefined> {
    if (usingSupabase()) {
      const { data } = await supabaseClient!.from('crops').select('id, name').eq('id', id).maybeSingle();
      return data ?? undefined;
    }
    return db.prepare('SELECT id, name FROM crops WHERE id = ?').get(id) as
      | { id: number; name: string }
      | undefined;
  },

  async createDisease(input: {
    crop_id: number;
    crop_name: string;
    name: string;
    pathogen: string;
    category: string;
    severity_typical: string;
    image_url: string;
    symptoms: string;
    causes: string;
    prevention: string;
    organic_treatment: string;
    chemical_treatment: string;
  }): Promise<number> {
    if (usingSupabase()) {
      const { data, error } = await supabaseClient!.from('diseases').insert(input).select('id').single();
      if (error || !data) throw new Error(error?.message || 'Could not add disease');
      return data.id;
    }
    const info = db
      .prepare(
        `INSERT INTO diseases (
          crop_id, crop_name, name, pathogen, category, severity_typical, image_url,
          symptoms, causes, prevention, organic_treatment, chemical_treatment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.crop_id,
        input.crop_name,
        input.name,
        input.pathogen,
        input.category,
        input.severity_typical,
        input.image_url,
        input.symptoms,
        input.causes,
        input.prevention,
        input.organic_treatment,
        input.chemical_treatment
      );
    return Number(info.lastInsertRowid);
  },

  async deleteDisease(id: number) {
    if (usingSupabase()) {
      await supabaseClient!.from('diseases').delete().eq('id', id);
      return;
    }
    db.prepare('DELETE FROM diseases WHERE id = ?').run(id);
  },

  async deleteDetection(id: number) {
    if (usingSupabase()) {
      await supabaseClient!.from('detections').delete().eq('id', id);
      return;
    }
    db.prepare('DELETE FROM detections WHERE id = ?').run(id);
  },

  async createArticle(input: {
    title: string;
    title_kn: string;
    category: string;
    summary: string;
    summary_kn: string;
    content: string;
    content_kn: string;
    read_time: string;
  }): Promise<number> {
    if (usingSupabase()) {
      const { data } = await supabaseClient!.from('articles').insert(input).select('id').single();
      return data?.id ?? 0;
    }
    const info = db
      .prepare(
        `INSERT INTO articles (title, title_kn, category, summary, summary_kn, content, content_kn, read_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.title,
        input.title_kn,
        input.category,
        input.summary,
        input.summary_kn,
        input.content,
        input.content_kn,
        input.read_time
      );
    return Number(info.lastInsertRowid);
  },

  async deleteArticle(id: number) {
    if (usingSupabase()) {
      await supabaseClient!.from('articles').delete().eq('id', id);
      return;
    }
    db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  },

  async createBroadcastNotification(title: string, message: string, type: 'info' | 'advisory' | 'alert'): Promise<number> {
    if (usingSupabase()) {
      const { data } = await supabaseClient!
        .from('notifications')
        .insert({ user_id: null, title, message, type })
        .select('id')
        .single();
      return data?.id ?? 0;
    }
    const info = db
      .prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (NULL, ?, ?, ?)')
      .run(title, message, type);
    return Number(info.lastInsertRowid);
  },

  async markFeedbackReviewed(id: number) {
    if (usingSupabase()) {
      await supabaseClient!.from('feedback').update({ status: 'reviewed' }).eq('id', id);
      return;
    }
    db.prepare("UPDATE feedback SET status = 'reviewed' WHERE id = ?").run(id);
  },
};
