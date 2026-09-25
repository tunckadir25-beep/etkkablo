import React from "react";
import { ArrowUp, ArrowDown, Eye, EyeOff, Trash2 } from "lucide-react";

interface EditorSectionCardProps {
  title: string;
  badge?: string;
  icon?: React.ReactNode;
  enabled: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
  lang?: "tr" | "en";
  hideControls?: boolean;
}

export const EditorSectionCard: React.FC<EditorSectionCardProps> = ({
  title,
  badge,
  icon,
  enabled,
  isFirst = false,
  isLast = false,
  onMoveUp,
  onMoveDown,
  onToggle,
  onDelete,
  children,
  lang = "tr",
  hideControls = false,
}) => {
  const isTr = lang === "tr";

  return (
    <div
      className={`bg-white border rounded-xl shadow-xs transition-all duration-200 ${
        enabled
          ? "border-slate-200/90 p-5"
          : "border-slate-200 bg-slate-50/70 p-3.5 opacity-75 hover:opacity-100"
      }`}
    >
      {/* Kart Başlığı ve Sağ Üst Eylem Butonları */}
      <div className={`flex items-center justify-between ${enabled ? "border-b border-slate-100 pb-3 mb-4" : ""}`}>
        {/* Sol: İkon & Başlık & Rozet */}
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <div className="text-emerald-600 shrink-0">
              {icon}
            </div>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <h3 className={`text-sm font-bold truncate ${enabled ? "text-slate-900" : "text-slate-500"}`}>
              {title}
            </h3>
            {badge && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium shrink-0">
                {badge}
              </span>
            )}
            {!enabled && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium shrink-0">
                {isTr ? "PDF'ten Gizlendi" : "Hidden from PDF"}
              </span>
            )}
          </div>
        </div>

        {/* Sağ Üst: Yukarı Alma, Aşağı Alma ve Göz Kapatma */}
        {!hideControls && (
          <div className="flex items-center gap-1 shrink-0 ml-3">
            {onMoveUp && (
              <button
                type="button"
                onClick={onMoveUp}
                disabled={isFirst}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                title={isTr ? "Yukarı Taşı" : "Move Up"}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            )}

            {onMoveDown && (
              <button
                type="button"
                onClick={onMoveDown}
                disabled={isLast}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                title={isTr ? "Aşağı Taşı" : "Move Down"}
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            )}

            {onToggle && (
              <button
                type="button"
                onClick={onToggle}
                className={`ml-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  enabled
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/80 shadow-xs"
                    : "bg-slate-100 text-slate-600 border border-slate-200 hover:text-slate-900"
                }`}
                title={enabled ? (isTr ? "PDF'ten Gizle (Gözü Kapat)" : "Hide from PDF") : (isTr ? "PDF'e Dahil Et (Gözü Aç)" : "Include in PDF")}
              >
                {enabled ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] font-bold">{isTr ? "Aktif" : "Active"}</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-bold">{isTr ? "Gizli" : "Hidden"}</span>
                  </>
                )}
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                title={isTr ? "Bölümü Sil" : "Delete Section"}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Kart İçeriği (Aktifse görünür) */}
      {enabled && children}
    </div>
  );
};
