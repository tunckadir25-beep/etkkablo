import React from "react";
import { Download, Globe, Sparkles } from "lucide-react";
import { ETK_LOGO_SVG } from "../../services/pdf/cableAssetsBase64";

interface HeaderProps {
  lang: "tr" | "en";
  onLangChange: (lang: "tr" | "en") => void;
  productTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onLangChange,
  productTitle,
}) => {
  const isTr = lang === "tr";

  return (
    <header className="h-16 bg-white/95 backdrop-blur border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      {/* Sol: Logo & Başlık */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src={ETK_LOGO_SVG}
            alt="ETK Kablo"
            className="h-9 w-auto object-contain shrink-0"
          />
          <div className="h-7 w-px bg-slate-200 hidden sm:block" />
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>TDS Studio Pro</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                v3.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              {productTitle ? productTitle : (isTr ? "Kurumsal TDS & Varyasyon Yönetim Stüdyosu" : "Enterprise Cable TDS Studio")}
            </p>
          </div>
        </div>
      </div>

      {/* Sağ: Dil Seçimi */}
      <div className="flex items-center gap-3">
        {/* Dil Seçici */}
        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
          <button
            type="button"
            onClick={() => onLangChange("tr")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              lang === "tr"
                ? "bg-white text-emerald-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            TR
          </button>
          <button
            type="button"
            onClick={() => onLangChange("en")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              lang === "en"
                ? "bg-white text-emerald-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
};
