import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { t } from '../i18n/translations';
import type { Language, PageRoute, User } from '../types';

interface NavbarProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  user: User | null;
  lang: Language;
  onChangeLang: (lang: Language) => void;
}

export function Navbar({ currentPage, onNavigate, user, lang, onChangeLang }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: Array<{ id: PageRoute; label: string }> = [
    { id: 'home', label: t(lang, 'navHome') },
    { id: 'detect', label: t(lang, 'navDetect') },
    { id: 'library', label: t(lang, 'navLibrary') },
    { id: 'dashboard', label: t(lang, 'navDashboard') },
    { id: 'about', label: t(lang, 'navAbout') },
  ];

  const handleNav = (page: PageRoute) => {
    onNavigate(page);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAFBF9]/95 backdrop-blur border-b border-[#E1E8DD]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single clean wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="font-display text-xl font-bold tracking-tight text-[#17241B] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
        >
          AgroCare AI
        </button>

        {/* Zone 2: 5 single-line text nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#46574C]" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 ${
                  active
                    ? 'text-[#15803D] border-[#15803D]'
                    : 'border-transparent hover:text-[#17241B] hover:border-[#C5D3BE]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action button + mobile menu trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNav(user ? 'dashboard' : 'auth')}
            className="hidden md:inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            {user ? user.name.split(' ')[0] : t(lang, 'navSignIn')}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#DCE4D8] text-[#17241B] hover:bg-[#F2F5F0] cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E1E8DD] bg-white px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                  currentPage === item.id
                    ? 'bg-[#EEF5EC] text-[#15803D]'
                    : 'text-[#314136] hover:bg-[#F5F8F4]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="pt-3 border-t border-[#E6ECE3] flex items-center justify-between gap-3">
            <div className="inline-flex items-center p-1 bg-[#F2F5F0] rounded-lg border border-[#DCE4D8]">
              <button
                type="button"
                onClick={() => onChangeLang('en')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                  lang === 'en' ? 'bg-white text-[#17241B] shadow-sm' : 'text-[#526358]'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onChangeLang('kn')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                  lang === 'kn' ? 'bg-white text-[#17241B] shadow-sm' : 'text-[#526358]'
                }`}
              >
                ಕನ್ನಡ
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleNav(user ? 'dashboard' : 'auth')}
              className="px-4 py-2.5 rounded-lg bg-[#15803D] text-white text-sm font-semibold cursor-pointer"
            >
              {user ? t(lang, 'navAccount') : t(lang, 'navSignIn')}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
