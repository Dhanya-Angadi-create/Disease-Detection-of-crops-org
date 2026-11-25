import { Bell, Lock, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ArticleItem, CropItem, DiseaseItem, FeedbackItem, User } from '../types';

interface AdminDashboardProps {
  token: string | null;
  user: User | null;
  onAdminSessionUpdate: (token: string, user: User) => void;
}

type AdminTab = 'overview' | 'users' | 'crops' | 'diseases' | 'detections' | 'content';

interface AdminOverviewData {
  summary: {
    totalUsers: number;
    totalDetections: number;
    healthyDetections: number;
    diseasedDetections: number;
    totalCrops: number;
    totalDiseases: number;
    totalFeedback: number;
  };
  users: Array<
    User & {
      village_district?: string;
      state?: string;
      farm_size_acres?: number;
      scan_count: number;
    }
  >;
  detections: Array<{
    id: number;
    farmer_name: string | null;
    crop_detected: string;
    disease_detected: string;
    is_healthy: number;
    confidence: number;
    severity: string;
    created_at: string;
  }>;
  crops: CropItem[];
  diseases: DiseaseItem[];
  feedback: FeedbackItem[];
  articles: ArticleItem[];
}

export function AdminDashboard({ token, user, onAdminSessionUpdate }: AdminDashboardProps) {
  const [adminStatus, setAdminStatus] = useState<{
    configuredViaEnv: boolean;
    claimedInDb: boolean;
    isAdmin: boolean;
  } | null>(null);
  const [passcode, setPasscode] = useState('');
  const [claimAccount, setClaimAccount] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  const [tab, setTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(false);

  // Forms for managing crops, diseases, articles, and notifications
  const [newCrop, setNewCrop] = useState({
    name: '',
    scientific_name: '',
    season: '',
    climate_zone: '',
    description: '',
  });
  const [newDisease, setNewDisease] = useState({
    crop_id: '',
    name: '',
    pathogen: '',
    category: 'Fungal',
    severity_typical: 'Moderate',
    symptoms: '',
    causes: '',
    prevention: '',
    organic_treatment: '',
    chemical_treatment: '',
  });
  const [newArticle, setNewArticle] = useState({
    title: '',
    title_kn: '',
    category: 'Agronomy',
    summary: '',
    content: '',
    read_time: '4 min read',
  });
  const [broadcast, setBroadcast] = useState({ title: '', message: '', type: 'advisory' });
  const [actionMsg, setActionMsg] = useState('');

  const checkAdminStatus = useCallback(async () => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch('/api/admin/status', { headers });
    if (res.ok) {
      setAdminStatus(await res.json());
    }
  }, [token]);

  const loadOverview = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setOverview(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  useEffect(() => {
    if (user?.role === 'admin' && token) {
      loadOverview();
    }
  }, [user, token, loadOverview]);

  const handleClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch('/api/admin/claim', {
      method: 'POST',
      headers,
      body: JSON.stringify(token ? { passcode } : { passcode, ...claimAccount }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error || 'Could not claim admin access.');
      return;
    }
    onAdminSessionUpdate(data.token, data.user);
    setPasscode('');
    await checkAdminStatus();
  };

  const handleAuthenticateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!token) {
      setAuthError('Please sign in with your farmer/user account first, then enter the admin passcode.');
      return;
    }
    const res = await fetch('/api/admin/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ passcode }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error || 'Admin verification failed.');
      return;
    }
    onAdminSessionUpdate(data.token, data.user);
    setPasscode('');
    await checkAdminStatus();
  };

  // Gate: require admin role
  if (!user || user.role !== 'admin') {
    const needsFirstRunClaim =
      adminStatus && !adminStatus.configuredViaEnv && !adminStatus.claimedInDb;

    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-12">
        <div className="p-7 rounded-2xl bg-white border border-[#E1E8DD] space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F2F5F0] border border-[#DCE4D8] flex items-center justify-center text-[#15803D]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-[#17241B]">
                {needsFirstRunClaim ? 'Initialize Administrator Console' : 'Administrator Verification'}
              </h1>
              <p className="text-xs text-[#526358]">
                Role-based access control protects crops, disease records, and user accounts.
              </p>
            </div>
          </div>

          {authError && (
            <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-800">
              {authError}
            </p>
          )}

          {needsFirstRunClaim ? (
            <form onSubmit={handleClaimAdmin} className="space-y-4">
              <p className="text-xs text-[#46574C] leading-relaxed">
                No administrator passcode has been configured yet. Set the initial administrator passcode below to claim and lock console access.
              </p>
              {!token && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#314136] mb-1">Admin Full Name</label>
                    <input
                      type="text"
                      required
                      value={claimAccount.name}
                      onChange={(e) => setClaimAccount({ ...claimAccount, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#314136] mb-1">Admin Email</label>
                    <input
                      type="email"
                      required
                      value={claimAccount.email}
                      onChange={(e) => setClaimAccount({ ...claimAccount, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#314136] mb-1">Account Password</label>
                    <input
                      type="password"
                      required
                      value={claimAccount.password}
                      onChange={(e) => setClaimAccount({ ...claimAccount, password: e.target.value })}
                      placeholder="Min 8 chars, upper, lower, number"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#314136] mb-1">
                  Create Administrator Passcode (8+ chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter a strong admin passcode"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] cursor-pointer"
              >
                Claim Administrator Access
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuthenticateAdmin} className="space-y-4">
              {!token && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Sign in with an account first via the Sign In page, then verify your administrator passcode here.
                </p>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#314136] mb-1">
                  Administrator Passcode
                </label>
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter configured admin passcode"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={!token}
                className="w-full py-2.5 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] disabled:opacity-50 cursor-pointer"
              >
                Verify & Open Admin Console
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const handleCreateCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMsg('');
    const res = await fetch('/api/admin/crops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newCrop),
    });
    const data = await res.json();
    if (res.ok) {
      setNewCrop({ name: '', scientific_name: '', season: '', climate_zone: '', description: '' });
      setActionMsg('Crop added to database.');
      loadOverview();
    } else {
      setActionMsg(data.error || 'Failed to add crop.');
    }
  };

  const handleCreateDisease = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMsg('');
    const res = await fetch('/api/admin/diseases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newDisease),
    });
    const data = await res.json();
    if (res.ok) {
      setNewDisease({
        crop_id: '',
        name: '',
        pathogen: '',
        category: 'Fungal',
        severity_typical: 'Moderate',
        symptoms: '',
        causes: '',
        prevention: '',
        organic_treatment: '',
        chemical_treatment: '',
      });
      setActionMsg('Disease profile published to Crop Library.');
      loadOverview();
    } else {
      setActionMsg(data.error || 'Failed to add disease.');
    }
  };

  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newArticle),
    });
    if (res.ok) {
      setNewArticle({ title: '', title_kn: '', category: 'Agronomy', summary: '', content: '', read_time: '4 min read' });
      setActionMsg('Article published.');
      loadOverview();
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(broadcast),
    });
    if (res.ok) {
      setBroadcast({ title: '', message: '', type: 'advisory' });
      setActionMsg('Advisory notification broadcast to all farmers.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E1E8DD] pb-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[#15803D]" />
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#17241B]">
              Administrator Operations Console
            </h1>
            <p className="text-xs text-[#526358]">
              Manage users, crops, plant pathology library, detections, and farmer advisories.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-[#EFF3EC] rounded-lg border border-[#DCE4D8] w-fit">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'users', label: 'Users' },
          { id: 'crops', label: 'Crops' },
          { id: 'diseases', label: 'Diseases' },
          { id: 'detections', label: 'Detections' },
          { id: 'content', label: 'Content & Feedback' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as AdminTab)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md cursor-pointer ${
              tab === item.id ? 'bg-white text-[#17241B] shadow-sm' : 'text-[#526358]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {actionMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900">
          {actionMsg}
        </div>
      )}

      {loading || !overview ? (
        <p className="text-sm text-[#526358]">Loading platform telemetry...</p>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl bg-white border border-[#E1E8DD]">
                <p className="text-xs text-[#526358]">Registered Users</p>
                <p className="font-mono tabular-nums text-2xl font-bold mt-1">{overview.summary.totalUsers}</p>
              </div>
              <div className="p-5 rounded-xl bg-white border border-[#E1E8DD]">
                <p className="text-xs text-[#526358]">Total Detection Requests</p>
                <p className="font-mono tabular-nums text-2xl font-bold mt-1">{overview.summary.totalDetections}</p>
              </div>
              <div className="p-5 rounded-xl bg-white border border-[#E1E8DD]">
                <p className="text-xs text-[#526358]">Crop & Disease Profiles</p>
                <p className="font-mono tabular-nums text-2xl font-bold mt-1">
                  {overview.summary.totalCrops} / {overview.summary.totalDiseases}
                </p>
              </div>
              <div className="p-5 rounded-xl bg-white border border-[#E1E8DD]">
                <p className="text-xs text-[#526358]">Feedback Submissions</p>
                <p className="font-mono tabular-nums text-2xl font-bold mt-1">{overview.summary.totalFeedback}</p>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="rounded-2xl bg-white border border-[#E1E8DD] overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FAFBF9] text-xs text-[#526358] border-b border-[#E8EEE5]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">District</th>
                    <th className="py-3 px-4 font-semibold text-right">Scans</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF2EA]">
                  {overview.users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 px-4 font-medium">{u.name}</td>
                      <td className="py-3 px-4 text-xs text-[#526358]">{u.email}</td>
                      <td className="py-3 px-4 text-xs text-[#526358]">{u.village_district || '—'}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right">{u.scan_count}</td>
                      <td className="py-3 px-4">
                        <select
                          value={u.role}
                          onChange={async (e) => {
                            await fetch(`/api/admin/users/${u.id}/role`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ role: e.target.value }),
                            });
                            loadOverview();
                          }}
                          className="px-2.5 py-1 rounded border border-[#CED9C8] text-xs bg-white"
                        >
                          <option value="farmer">Farmer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'crops' && (
            <div className="grid lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleCreateCrop}
                className="lg:col-span-5 p-6 rounded-2xl bg-white border border-[#E1E8DD] space-y-3 h-fit"
              >
                <h2 className="font-display text-base font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#15803D]" /> Add Crop
                </h2>
                <input
                  type="text"
                  required
                  placeholder="Crop Name (e.g. Soybean)"
                  value={newCrop.name}
                  onChange={(e) => setNewCrop({ ...newCrop, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                />
                <input
                  type="text"
                  required
                  placeholder="Scientific Name"
                  value={newCrop.scientific_name}
                  onChange={(e) => setNewCrop({ ...newCrop, scientific_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                />
                <input
                  type="text"
                  required
                  placeholder="Season (e.g. Kharif)"
                  value={newCrop.season}
                  onChange={(e) => setNewCrop({ ...newCrop, season: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                />
                <input
                  type="text"
                  required
                  placeholder="Climate Zone"
                  value={newCrop.climate_zone}
                  onChange={(e) => setNewCrop({ ...newCrop, climate_zone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                />
                <textarea
                  rows={3}
                  required
                  placeholder="Agronomic description"
                  value={newCrop.description}
                  onChange={(e) => setNewCrop({ ...newCrop, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#15803D] text-white text-xs font-semibold cursor-pointer"
                >
                  Save Crop
                </button>
              </form>

              <div className="lg:col-span-7 space-y-3">
                {overview.crops.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-white border border-[#E1E8DD] flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="font-display font-bold text-[#17241B]">
                        {c.name} <span className="text-xs italic font-normal text-[#526358]">({c.scientific_name})</span>
                      </p>
                      <p className="text-xs text-[#46574C] mt-1">{c.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/crops/${c.id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        loadOverview();
                      }}
                      className="text-red-700 hover:bg-red-50 p-1.5 rounded cursor-pointer"
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'diseases' && (
            <div className="grid lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleCreateDisease}
                className="lg:col-span-5 p-6 rounded-2xl bg-white border border-[#E1E8DD] space-y-3 h-fit"
              >
                <h2 className="font-display text-base font-bold">Add Disease Profile</h2>
                <select
                  required
                  value={newDisease.crop_id}
                  onChange={(e) => setNewDisease({ ...newDisease, crop_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm bg-white"
                >
                  <option value="">Select Crop</option>
                  {overview.crops.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  placeholder="Disease Name"
                  value={newDisease.name}
                  onChange={(e) => setNewDisease({ ...newDisease, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                />
                <input
                  type="text"
                  required
                  placeholder="Pathogen Scientific Name"
                  value={newDisease.pathogen}
                  onChange={(e) => setNewDisease({ ...newDisease, pathogen: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newDisease.category}
                    onChange={(e) => setNewDisease({ ...newDisease, category: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-[#CED9C8] text-sm bg-white"
                  >
                    <option value="Fungal">Fungal</option>
                    <option value="Bacterial">Bacterial</option>
                    <option value="Viral">Viral</option>
                    <option value="Pest">Pest</option>
                    <option value="Healthy">Healthy</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Typical Severity"
                    value={newDisease.severity_typical}
                    onChange={(e) => setNewDisease({ ...newDisease, severity_typical: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                  />
                </div>
                <textarea
                  rows={2}
                  required
                  placeholder="Visible symptoms"
                  value={newDisease.symptoms}
                  onChange={(e) => setNewDisease({ ...newDisease, symptoms: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                />
                <textarea
                  rows={2}
                  required
                  placeholder="Causes & environmental conditions"
                  value={newDisease.causes}
                  onChange={(e) => setNewDisease({ ...newDisease, causes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                />
                <textarea
                  rows={2}
                  required
                  placeholder="Preventive measures"
                  value={newDisease.prevention}
                  onChange={(e) => setNewDisease({ ...newDisease, prevention: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                />
                <textarea
                  rows={2}
                  placeholder="Organic control methods"
                  value={newDisease.organic_treatment}
                  onChange={(e) => setNewDisease({ ...newDisease, organic_treatment: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                />
                <textarea
                  rows={2}
                  placeholder="Chemical treatment reference"
                  value={newDisease.chemical_treatment}
                  onChange={(e) => setNewDisease({ ...newDisease, chemical_treatment: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#15803D] text-white text-xs font-semibold cursor-pointer"
                >
                  Publish Disease Profile
                </button>
              </form>

              <div className="lg:col-span-7 space-y-3">
                {overview.diseases.map((d) => (
                  <div
                    key={d.id}
                    className="p-4 rounded-xl bg-white border border-[#E1E8DD] flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="text-xs text-[#526358]">
                        {d.crop_name} · {d.category}
                      </p>
                      <p className="font-display font-bold text-[#17241B]">{d.name}</p>
                      <p className="text-xs text-[#46574C] mt-1 line-clamp-2">{d.symptoms}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/diseases/${d.id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        loadOverview();
                      }}
                      className="text-red-700 hover:bg-red-50 p-1.5 rounded cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'detections' && (
            <div className="rounded-2xl bg-white border border-[#E1E8DD] overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FAFBF9] text-xs text-[#526358] border-b border-[#E8EEE5]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">ID</th>
                    <th className="py-3 px-4 font-semibold">Farmer</th>
                    <th className="py-3 px-4 font-semibold">Crop</th>
                    <th className="py-3 px-4 font-semibold">Diagnosis</th>
                    <th className="py-3 px-4 font-semibold text-right">Confidence</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF2EA]">
                  {overview.detections.map((det) => (
                    <tr key={det.id}>
                      <td className="py-3 px-4 font-mono tabular-nums text-xs">#{det.id}</td>
                      <td className="py-3 px-4 text-xs">{det.farmer_name || 'Guest'}</td>
                      <td className="py-3 px-4 font-medium">{det.crop_detected}</td>
                      <td className="py-3 px-4">{det.disease_detected}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right">{det.confidence}%</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/detections/${det.id}`, {
                              method: 'DELETE',
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            loadOverview();
                          }}
                          className="text-xs text-red-700 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'content' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <form
                  onSubmit={handleSendBroadcast}
                  className="p-6 rounded-2xl bg-white border border-[#E1E8DD] space-y-3"
                >
                  <h2 className="font-display text-base font-bold flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#15803D]" /> Broadcast Farmer Notification
                  </h2>
                  <input
                    type="text"
                    required
                    placeholder="Advisory Title"
                    value={broadcast.title}
                    onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                  />
                  <textarea
                    rows={3}
                    required
                    placeholder="Field advisory message..."
                    value={broadcast.message}
                    onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#15803D] text-white text-xs font-semibold cursor-pointer"
                  >
                    Send Broadcast
                  </button>
                </form>

                <form
                  onSubmit={handlePublishArticle}
                  className="p-6 rounded-2xl bg-white border border-[#E1E8DD] space-y-3"
                >
                  <h2 className="font-display text-base font-bold">Publish Agronomy Article</h2>
                  <input
                    type="text"
                    required
                    placeholder="Article Title (English)"
                    value={newArticle.title}
                    onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Article Title (Kannada - optional)"
                    value={newArticle.title_kn}
                    onChange={(e) => setNewArticle({ ...newArticle, title_kn: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Summary"
                    value={newArticle.summary}
                    onChange={(e) => setNewArticle({ ...newArticle, summary: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                  />
                  <textarea
                    rows={3}
                    required
                    placeholder="Full article content"
                    value={newArticle.content}
                    onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#CED9C8] text-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#15803D] text-white text-xs font-semibold cursor-pointer"
                  >
                    Publish Article
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                <h2 className="font-display text-base font-bold text-[#17241B]">
                  Farmer Feedback & Inquiries ({overview.feedback.length})
                </h2>
                {overview.feedback.map((fb) => (
                  <div key={fb.id} className="p-4 rounded-xl bg-white border border-[#E1E8DD] space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#526358]">
                      <span>
                        {fb.name} ({fb.email}) · Rating {fb.rating}/5
                      </span>
                      <span className="font-semibold uppercase">{fb.status}</span>
                    </div>
                    <p className="font-semibold text-sm text-[#17241B]">{fb.subject}</p>
                    <p className="text-xs text-[#46574C]">{fb.message}</p>
                    {fb.status === 'new' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/feedback/${fb.id}`, {
                            method: 'PATCH',
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          loadOverview();
                        }}
                        className="text-xs font-semibold text-[#15803D] hover:underline cursor-pointer"
                      >
                        Mark Reviewed
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
