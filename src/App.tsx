import { useEffect, useState } from 'react';
import { AboutContactPage } from './components/AboutContactPage';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthView } from './components/AuthView';
import { DetectionWorkspace } from './components/DetectionWorkspace';
import { DiseaseLibrary } from './components/DiseaseLibrary';
import { FarmerDashboard } from './components/FarmerDashboard';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { t } from './i18n/translations';
import type {
  ArticleItem,
  CropItem,
  DetectionResult,
  FarmerProfile,
  Language,
  PageRoute,
  User,
} from './types';

export default function App() {
  const [page, setPage] = useState<PageRoute>('home');
  const [lang, setLang] = useState<Language>('en');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);

  const [crops, setCrops] = useState<CropItem[]>([]);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [publicStats, setPublicStats] = useState({
    cropsCount: 8,
    diseasesCount: 15,
    detectionsCount: 0,
  });
  const [libraryCropFilter, setLibraryCropFilter] = useState<string>('All');
  const [activeDetection, setActiveDetection] = useState<DetectionResult | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/crops').then((r) => r.json()),
      fetch('/api/articles').then((r) => r.json()),
      fetch('/api/stats/public').then((r) => r.json()),
    ])
      .then(([cropsData, articlesData, statsData]) => {
        if (Array.isArray(cropsData.crops)) setCrops(cropsData.crops);
        if (Array.isArray(articlesData.articles)) setArticles(articlesData.articles);
        if (statsData && typeof statsData.cropsCount === 'number') setPublicStats(statsData);
      })
      .catch(() => {
        // Keep initial empty fallback on transient load issues
      });
  }, []);

  const handleNavigate = (nextPage: PageRoute, cropFilter?: string) => {
    if (cropFilter) setLibraryCropFilter(cropFilter);
    else if (nextPage === 'library' && !cropFilter) setLibraryCropFilter('All');

    if (nextPage === 'dashboard' && !user) {
      setPage('auth');
      return;
    }
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = (payload: {
    token: string;
    user: User;
    profile: FarmerProfile | null;
  }) => {
    setToken(payload.token);
    setUser(payload.user);
    setProfile(payload.profile);
    if (payload.user.language_pref) setLang(payload.user.language_pref);
    setPage('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setProfile(null);
    setPage('home');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBF9] text-[#17241B]">
      <Navbar
        currentPage={page}
        onNavigate={(p) => handleNavigate(p)}
        user={user}
        lang={lang}
        onChangeLang={setLang}
      />

      <main className="flex-1">
        {page === 'home' && (
          <LandingPage
            lang={lang}
            onChangeLang={setLang}
            onNavigate={handleNavigate}
            crops={crops}
            articles={articles}
            publicStats={publicStats}
          />
        )}

        {page === 'detect' && (
          <DetectionWorkspace
            lang={lang}
            token={token}
            user={user}
            initialResult={activeDetection}
            onClearInitialResult={() => setActiveDetection(null)}
            onNavigate={(p) => handleNavigate(p)}
            onSavedReport={() => {
              fetch('/api/stats/public')
                .then((r) => r.json())
                .then((s) => setPublicStats(s))
                .catch(() => {});
            }}
          />
        )}

        {page === 'library' && (
          <DiseaseLibrary
            lang={lang}
            initialCropFilter={libraryCropFilter}
            crops={crops}
            onNavigate={(p) => handleNavigate(p)}
          />
        )}

        {page === 'auth' && <AuthView onSuccess={handleAuthSuccess} />}

        {page === 'dashboard' && user && token && (
          <FarmerDashboard
            lang={lang}
            token={token}
            user={user}
            profile={profile}
            onUpdateProfile={(u, p) => {
              setUser(u);
              setProfile(p);
            }}
            onChangeLang={setLang}
            onOpenDetection={(res) => {
              setActiveDetection(res);
              setPage('detect');
            }}
            onNavigate={(p) => handleNavigate(p)}
            onLogout={handleLogout}
          />
        )}

        {page === 'admin' && (
          <AdminDashboard
            token={token}
            user={user}
            onAdminSessionUpdate={(newTok, newUser) => {
              setToken(newTok);
              setUser(newUser);
            }}
          />
        )}

        {page === 'about' && <AboutContactPage lang={lang} />}
      </main>

      <footer className="border-t border-[#E1E8DD] bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="font-display text-lg font-bold text-[#17241B]">AgroCare AI</p>
            <p className="text-xs text-[#526358] max-w-md">{t(lang, 'footerRights')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-[#46574C]">
            <button type="button" onClick={() => handleNavigate('home')} className="hover:text-[#17241B] cursor-pointer">
              {t(lang, 'navHome')}
            </button>
            <button type="button" onClick={() => handleNavigate('detect')} className="hover:text-[#17241B] cursor-pointer">
              {t(lang, 'navDetect')}
            </button>
            <button type="button" onClick={() => handleNavigate('library')} className="hover:text-[#17241B] cursor-pointer">
              {t(lang, 'navLibrary')}
            </button>
            <button type="button" onClick={() => handleNavigate('about')} className="hover:text-[#17241B] cursor-pointer">
              {t(lang, 'navAbout')}
            </button>
            <button type="button" onClick={() => handleNavigate('admin')} className="hover:text-[#17241B] cursor-pointer">
              {t(lang, 'adminConsoleLink')}
            </button>
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'kn' : 'en')}
              className="font-semibold text-[#15803D] hover:underline cursor-pointer"
            >
              {lang === 'en' ? 'ಕನ್ನಡದಲ್ಲಿ ನೋಡಿ' : 'Switch to English'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
