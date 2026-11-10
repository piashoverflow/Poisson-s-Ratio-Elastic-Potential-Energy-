import React from 'react';
import { RotateCcw, Globe } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants/translations';

interface NavbarProps {
  language: Language;
  onToggleLanguage: () => void;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  language,
  onToggleLanguage,
  onReset,
}) => {
  const t = TRANSLATIONS[language];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-sky-200 px-4 lg:px-6 py-2.5 sticky top-0 z-40 shadow-xs flex items-center justify-between gap-3">
      {/* Title & Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20 ring-2 ring-sky-100 shrink-0">
          <span className="font-mono font-bold text-base">σ</span>
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight leading-snug">
            {t.appTitle}
          </h1>
        </div>
      </div>

      {/* Action Buttons & Top-Right UDVASH Brand */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Reset */}
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-colors shadow-2xs"
          title={t.reset}
        >
          <RotateCcw className="w-4 h-4 text-slate-500" />
          <span className="hidden sm:inline">{t.reset}</span>
        </button>

        {/* Bilingual Switcher Button */}
        <button
          onClick={onToggleLanguage}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 rounded-lg shadow-sm shadow-sky-500/25 transition-all transform active:scale-95"
          title="Switch Language"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{t.toggleLang}</span>
        </button>

        {/* Prominent UDVASH Brand in Red Font on the Far Right */}
        <div className="pl-2 sm:pl-3 border-l border-slate-200 flex items-center">
          <span className="text-red-600 font-black text-xl sm:text-2xl tracking-wider select-none font-sans drop-shadow-2xs">
            UDVASH
          </span>
        </div>
      </div>
    </header>
  );
};
