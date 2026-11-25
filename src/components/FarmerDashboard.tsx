import {
  Bell,
  Bookmark,
  CheckCircle2,
  Download,
  History,
  LayoutDashboard,
  LogOut,
  ScanLine,
  Shield,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { t } from '../i18n/translations';
import type {
  DetectionResult,
  FarmerProfile,
  Language,
  NotificationItem,
  PageRoute,
  SavedReportRow,
  User,
} from '../types';
import { downloadDetectionPdfReport } from '../utils/pdfReport';

interface FarmerDashboardProps {
  lang: Language;
  token: string;
  user: User;
  profile: FarmerProfile | null;
  onUpdateProfile: (user: User, profile: FarmerProfile) => void;
  onChangeLang: (lang: Language) => void;
  onOpenDetection: (result: DetectionResult) => void;
  onNavigate: (page: PageRoute) => void;
  onLogout: () => void;
}

type DashTab = 'overview' | 'history' | 'reports' | 'profile' | 'notifications';

interface RawDetectionRow {
  id: number;
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
  created_at: string;
}

function safeParseArray<T>(raw: string, fallback: T[] = []): T[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function rowToDetectionResult(row: RawDetectionRow | SavedReportRow): DetectionResult {
  const detectionId = 'detection_id' in row ? row.detection_id : row.id;
  return {
    detectionId,
    imageUrl: row.image_data,
    createdAt: row.created_at,
    isValidLeafImage: true,
    qualityWarning: row.quality_warning || '',
    cropDetected: row.crop_detected,
    diseaseDetected: row.disease_detected,
    isHealthy: Number(row.is_healthy) === 1,
    confidence: row.confidence,
    severity: row.severity,
    alternativePredictions: safeParseArray(row.alternatives_json),
    description: row.description,
    visibleSymptoms: safeParseArray<string>(row.symptoms_json),
    possibleCauses: safeParseArray<string>(row.causes_json),
    preventiveMeasures: safeParseArray<string>(row.prevention_json),
    organicControls: safeParseArray<string>(row.organic_json),
    chemicalTreatments: safeParseArray<string>(row.chemical_json),
    modelUsed: row.model_used || 'gemini-4-hydrogen',
  };
}

export function FarmerDashboard({
  lang,
  token,
  user,
  profile,
  onUpdateProfile,
  onChangeLang,
  onOpenDetection,
  onNavigate,
  onLogout,
}: FarmerDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashTab>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAnalyzed: 0,
    healthyCount: 0,
    diseasedCount: 0,
    savedReportsCount: 0,
  });
  const [cropBreakdown, setCropBreakdown] = useState<
    Array<{ crop: string; total: number; diseased: number; healthy: number }>
  >([]);
  const [detections, setDetections] = useState<RawDetectionRow[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReportRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [profileForm, setProfileForm] = useState({
    name: user.name,
    language_pref: user.language_pref,
    phone: profile?.phone || '',
    village_district: profile?.village_district || '',
    state: profile?.state || '',
    farm_size_acres: String(profile?.farm_size_acres ?? 0),
    primary_crops: profile?.primary_crops || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/farmer', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
        setCropBreakdown(data.cropBreakdown || []);
        setDetections(data.detections || []);
        setSavedReports(data.savedReports || []);
        setNotifications(data.notifications || []);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...profileForm,
          farm_size_acres: Number(profileForm.farm_size_acres) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdateProfile(data.user, data.profile);
        onChangeLang(data.user.language_pref);
        setProfileMsg('Profile updated successfully.');
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    const res = await fetch(`/api/reports/${reportId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setSavedReports((prev) => prev.filter((r) => r.id !== reportId));
      setStats((prev) => ({ ...prev, savedReportsCount: Math.max(0, prev.savedReportsCount - 1) }));
    }
  };

  const handleMarkNotificationRead = async (notifId: number) => {
    await fetch(`/api/notifications/${notifId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: 1 } : n))
    );
  };

  const unreadCount = notifications.filter((n) => n.is_read === 0).length;
  const maxCropTotal = Math.max(1, ...cropBreakdown.map((c) => c.total));
  const healthyPct =
    stats.totalAnalyzed > 0 ? Math.round((stats.healthyCount / stats.totalAnalyzed) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar */}
        <aside className="lg:col-span-3 rounded-2xl bg-white border border-[#E1E8DD] p-4 space-y-6">
          <div className="px-2 pt-1 pb-4 border-b border-[#EDF2EA]">
            <p className="text-xs text-[#526358]">Signed in as {user.role === 'admin' ? 'Administrator' : 'Farmer'}</p>
            <p className="font-display text-lg font-bold text-[#17241B] truncate mt-0.5">{user.name}</p>
            <p className="text-xs text-[#5E7064] truncate">{user.email}</p>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'history', label: 'Detection History', icon: History },
              { id: 'reports', label: 'Saved Reports', icon: Bookmark },
              { id: 'profile', label: 'Farmer Profile', icon: UserIcon },
              {
                id: 'notifications',
                label: unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications',
                icon: Bell,
              },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as DashTab)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#EEF5EC] text-[#15803D]'
                      : 'text-[#46574C] hover:bg-[#F5F8F4] hover:text-[#17241B]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-[#EDF2EA] space-y-2">
            <button
              type="button"
              onClick={() => onNavigate('detect')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] cursor-pointer"
            >
              <ScanLine className="w-4 h-4" />
              Quick Disease Scan
            </button>

            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#DCE4D8] text-xs font-semibold text-[#314136] hover:bg-[#F2F5F0] cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              {t(lang, 'adminConsoleLink')}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t(lang, 'signOut')}
            </button>
          </div>
        </aside>

        {/* Main Viewport */}
        <div className="lg:col-span-9 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#17241B]">
              {t(lang, 'dashboardHeading')}
            </h1>
            <div className="inline-flex items-center p-1 bg-[#EFF3EC] rounded-lg border border-[#DCE4D8]">
              <button
                type="button"
                onClick={() => onChangeLang('en')}
                className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  lang === 'en' ? 'bg-white text-[#17241B] shadow-sm' : 'text-[#526358]'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onChangeLang('kn')}
                className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  lang === 'kn' ? 'bg-white text-[#17241B] shadow-sm' : 'text-[#526358]'
                }`}
              >
                ಕನ್ನಡ
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white border border-[#E1E8DD]">
              <p className="text-xs text-[#526358]">Total Analyzed</p>
              <p className="font-mono tabular-nums text-2xl font-bold text-[#17241B] mt-1">
                {stats.totalAnalyzed}
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white border border-[#E1E8DD]">
              <p className="text-xs text-[#526358]">Healthy Crops</p>
              <p className="font-mono tabular-nums text-2xl font-bold text-emerald-700 mt-1">
                {stats.healthyCount}
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white border border-[#E1E8DD]">
              <p className="text-xs text-[#526358]">Diseased Detected</p>
              <p className="font-mono tabular-nums text-2xl font-bold text-amber-700 mt-1">
                {stats.diseasedCount}
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white border border-[#E1E8DD]">
              <p className="text-xs text-[#526358]">Saved Reports</p>
              <p className="font-mono tabular-nums text-2xl font-bold text-[#17241B] mt-1">
                {stats.savedReportsCount}
              </p>
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Charts Row */}
              <div className="grid md:grid-cols-2 gap-5">
                <div className="p-6 rounded-2xl bg-white border border-[#E1E8DD] space-y-4">
                  <h2 className="font-display text-base font-bold text-[#17241B]">
                    Crop Disease Distribution
                  </h2>
                  {cropBreakdown.length === 0 ? (
                    <p className="text-sm text-[#526358] py-8 text-center">
                      Upload a leaf scan to see crop-by-crop health statistics.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {cropBreakdown.map((item) => (
                        <div key={item.crop} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-[#17241B]">{item.crop}</span>
                            <span className="font-mono tabular-nums text-[#526358]">
                              {item.total} scans ({item.diseased} diseased)
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-[#EFF3EC] overflow-hidden flex">
                            <div
                              style={{ width: `${(item.healthy / maxCropTotal) * 100}%` }}
                              className="bg-emerald-600 h-full"
                              title={`Healthy: ${item.healthy}`}
                            />
                            <div
                              style={{ width: `${(item.diseased / maxCropTotal) * 100}%` }}
                              className="bg-amber-600 h-full"
                              title={`Diseased: ${item.diseased}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 rounded-2xl bg-white border border-[#E1E8DD] flex flex-col justify-between space-y-4">
                  <h2 className="font-display text-base font-bold text-[#17241B]">
                    Overall Crop Health Ratio
                  </h2>
                  {stats.totalAnalyzed === 0 ? (
                    <div className="py-6 text-center space-y-3">
                      <p className="text-sm text-[#526358]">No leaf scans logged on this account yet.</p>
                      <button
                        type="button"
                        onClick={() => onNavigate('detect')}
                        className="px-4 py-2 rounded-lg bg-[#15803D] text-white text-xs font-semibold cursor-pointer"
                      >
                        Run First Leaf Scan
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-6">
                      <svg viewBox="0 0 120 120" className="w-28 h-28 shrink-0">
                        <circle
                          cx="60"
                          cy="60"
                          r="46"
                          fill="none"
                          stroke="#D97706"
                          strokeWidth="16"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="46"
                          fill="none"
                          stroke="#15803D"
                          strokeWidth="16"
                          strokeDasharray={`${(healthyPct / 100) * 289} 289`}
                          transform="rotate(-90 60 60)"
                        />
                        <text
                          x="60"
                          y="64"
                          textAnchor="middle"
                          className="font-mono text-lg font-bold fill-[#17241B]"
                        >
                          {healthyPct}%
                        </text>
                      </svg>
                      <div className="space-y-2 text-xs text-[#46574C]">
                        <p className="font-semibold text-[#17241B]">
                          {healthyPct}% Healthy · {100 - healthyPct}% Diseased
                        </p>
                        <p>Healthy scans: {stats.healthyCount}</p>
                        <p>Pathology alerts: {stats.diseasedCount}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Scans Preview */}
              <div className="rounded-2xl bg-white border border-[#E1E8DD] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E8EEE5] flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-[#17241B]">
                    Recent Detection History
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="text-xs font-semibold text-[#15803D] hover:underline cursor-pointer"
                  >
                    View All →
                  </button>
                </div>
                {loading ? (
                  <p className="p-6 text-sm text-[#526358]">Loading scan history...</p>
                ) : detections.length === 0 ? (
                  <p className="p-6 text-sm text-[#526358]">
                    Your analyzed crop leaf scans will appear here automatically.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#FAFBF9] text-xs text-[#526358] border-b border-[#E8EEE5]">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Crop</th>
                          <th className="py-3 px-4 font-semibold">Prediction</th>
                          <th className="py-3 px-4 font-semibold text-right">Confidence</th>
                          <th className="py-3 px-4 font-semibold">Date</th>
                          <th className="py-3 px-4 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EDF2EA]">
                        {detections.slice(0, 5).map((row) => (
                          <tr key={row.id} className="hover:bg-[#FAFBF9]">
                            <td className="py-3 px-4 font-medium text-[#17241B]">{row.crop_detected}</td>
                            <td className="py-3 px-4 text-[#314136]">{row.disease_detected}</td>
                            <td className="py-3 px-4 font-mono tabular-nums text-right text-[#17241B]">
                              {row.confidence}%
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums text-xs text-[#526358]">
                              {new Date(row.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => onOpenDetection(rowToDetectionResult(row))}
                                className="text-xs font-semibold text-[#15803D] hover:underline cursor-pointer"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="rounded-2xl bg-white border border-[#E1E8DD] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E8EEE5]">
                <h2 className="font-display text-lg font-bold text-[#17241B]">All Leaf Detections</h2>
              </div>
              {detections.length === 0 ? (
                <p className="p-8 text-sm text-[#526358]">No detections logged yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#FAFBF9] text-xs text-[#526358] border-b border-[#E8EEE5]">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Crop</th>
                        <th className="py-3 px-4 font-semibold">Diagnosis</th>
                        <th className="py-3 px-4 font-semibold">Severity</th>
                        <th className="py-3 px-4 font-semibold text-right">Confidence</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF2EA]">
                      {detections.map((row) => {
                        const parsed = rowToDetectionResult(row);
                        return (
                          <tr key={row.id} className="hover:bg-[#FAFBF9]">
                            <td className="py-3 px-4 font-medium text-[#17241B]">{row.crop_detected}</td>
                            <td className="py-3 px-4 text-[#314136]">{row.disease_detected}</td>
                            <td className="py-3 px-4 text-xs text-[#526358]">{row.severity}</td>
                            <td className="py-3 px-4 font-mono tabular-nums text-right">{row.confidence}%</td>
                            <td className="py-3 px-4 text-right space-x-3 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => onOpenDetection(parsed)}
                                className="text-xs font-semibold text-[#15803D] hover:underline cursor-pointer"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadDetectionPdfReport(parsed, user.name)}
                                className="text-xs font-semibold text-[#314136] hover:underline cursor-pointer"
                              >
                                PDF
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-4">
              {savedReports.length === 0 ? (
                <div className="p-10 rounded-2xl bg-white border border-[#E1E8DD] text-center space-y-2">
                  <p className="font-display text-lg font-bold text-[#17241B]">No saved reports yet</p>
                  <p className="text-sm text-[#526358]">
                    Run a crop leaf scan and click “Save Result” to archive reports here.
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {savedReports.map((rep) => {
                    const parsed = rowToDetectionResult(rep);
                    return (
                      <div
                        key={rep.id}
                        className="p-5 rounded-xl bg-white border border-[#E1E8DD] flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <p className="text-xs text-[#526358] font-mono tabular-nums">
                            {rep.crop_detected} · {rep.confidence}% confidence ·{' '}
                            {new Date(rep.created_at).toLocaleDateString()}
                          </p>
                          <h3 className="font-display text-lg font-bold text-[#17241B] mt-1">
                            {rep.title}
                          </h3>
                          <p className="text-xs text-[#46574C] mt-2 line-clamp-2">{rep.description}</p>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-[#EDF2EA]">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => onOpenDetection(parsed)}
                              className="text-xs font-semibold text-[#15803D] hover:underline cursor-pointer"
                            >
                              Open Report
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadDetectionPdfReport(parsed, user.name)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#314136] hover:underline cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" /> PDF
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteReport(rep.id)}
                            className="text-xs text-red-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="p-6 sm:p-7 rounded-2xl bg-white border border-[#E1E8DD] space-y-5"
            >
              <h2 className="font-display text-lg font-bold text-[#17241B]">Farmer & Farm Profile</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#314136] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#314136] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="+91 ..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#314136] mb-1">Village / District</label>
                  <input
                    type="text"
                    value={profileForm.village_district}
                    onChange={(e) => setProfileForm({ ...profileForm, village_district: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#314136] mb-1">State / Region</label>
                  <input
                    type="text"
                    value={profileForm.state}
                    onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#314136] mb-1">Farm Size (Acres)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={profileForm.farm_size_acres}
                    onChange={(e) => setProfileForm({ ...profileForm, farm_size_acres: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#314136] mb-1">Preferred Language</label>
                  <select
                    value={profileForm.language_pref}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, language_pref: e.target.value as Language })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm bg-white"
                  >
                    <option value="en">English</option>
                    <option value="kn">Kannada (ಕನ್ನಡ)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#314136] mb-1">Primary Crops</label>
                <input
                  type="text"
                  value={profileForm.primary_crops}
                  onChange={(e) => setProfileForm({ ...profileForm, primary_crops: e.target.value })}
                  placeholder="Tomato, Potato, Rice, Maize"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm"
                />
              </div>

              {profileMsg && (
                <p className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {profileMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={profileSaving}
                className="px-5 py-2.5 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] cursor-pointer"
              >
                {profileSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="p-8 rounded-2xl bg-white border border-[#E1E8DD] text-sm text-[#526358]">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-5 rounded-xl border flex items-start justify-between gap-4 ${
                      n.is_read === 0
                        ? 'bg-[#F2F5F0] border-[#BBD0B5]'
                        : 'bg-white border-[#E1E8DD]'
                    }`}
                  >
                    <div>
                      <p className="text-xs text-[#526358] font-mono tabular-nums">
                        {n.type.toUpperCase()} · {new Date(n.created_at).toLocaleDateString()}
                      </p>
                      <h3 className="font-display text-base font-bold text-[#17241B] mt-0.5">{n.title}</h3>
                      <p className="text-sm text-[#46574C] mt-1">{n.message}</p>
                    </div>
                    {n.is_read === 0 && (
                      <button
                        type="button"
                        onClick={() => handleMarkNotificationRead(n.id)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-[#CBD6C5] text-xs font-semibold text-[#17241B] shrink-0 cursor-pointer"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
