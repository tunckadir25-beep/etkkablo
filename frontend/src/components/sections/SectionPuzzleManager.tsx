import React from "react";
import { PuzzleSectionConfig, PuzzleSectionId } from "../../types/cable";
import { MASTER_PUZZLE_SECTIONS } from "../../types/puzzleSections";
import {
  Layers,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  PlusCircle,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Puzzle,
} from "lucide-react";

interface SectionPuzzleManagerProps {
  sections: PuzzleSectionConfig[];
  onChange: (updated: PuzzleSectionConfig[]) => void;
  onResetToDefault: () => void;
  lang?: "tr" | "en";
  isFiber?: boolean;
}

export const SectionPuzzleManager: React.FC<SectionPuzzleManagerProps> = ({
  sections,
  onChange,
  onResetToDefault,
  lang = "tr",
}) => {
  const isTr = lang === "tr";

  // Toggle on/off
  const handleToggle = (id: PuzzleSectionId) => {
    const updated = sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    onChange(updated);
  };

  // Move up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...sections];
    const temp = copy[index];
    copy[index] = copy[index - 1];
    copy[index - 1] = temp;
    // Re-index order
    const updated = copy.map((s, idx) => ({ ...s, order: idx + 1 }));
    onChange(updated);
  };

  // Move down
  const handleMoveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const copy = [...sections];
    const temp = copy[index];
    copy[index] = copy[index + 1];
    copy[index + 1] = temp;
    // Re-index order
    const updated = copy.map((s, idx) => ({ ...s, order: idx + 1 }));
    onChange(updated);
  };

  const activeCount = sections.filter((s) => s.enabled).length;

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-5 mb-6 shadow-xs">
      {/* Üst Başlık & Kontroller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700">
            <Puzzle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-wide">
                {isTr ? "TDS Modüler Yapboz Yönetimi" : "Modular TDS Section Puzzle Board"}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold font-mono">
                {activeCount} / {sections.length} {isTr ? "Aktif Parça" : "Active"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isTr
                ? "Bölümleri yapboz gibi açıp kapatabilir, sıralayabilir ve PDF belgesini dilediğiniz gibi yapılandırabilirsiniz."
                : "Toggle, reorder puzzle sections or customize sections for the live PDF sheet."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetToDefault}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          title={isTr ? "Kablo ailesinin varsayılan yapısına sıfırla" : "Reset to family default"}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {isTr ? "Varsayılana Sıfırla" : "Reset Layout"}
        </button>
      </div>

      {/* Yapboz Parçaları Listesi */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {sections.map((section, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === sections.length - 1;
          const meta = MASTER_PUZZLE_SECTIONS[section.id];

          return (
            <div
              key={section.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                section.enabled
                  ? "bg-slate-50 border-slate-200 hover:border-slate-300 shadow-xs"
                  : "bg-slate-100/50 border-slate-200/60 opacity-60 hover:opacity-90"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                {/* Sıra Numarası Rozeti */}
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                    section.enabled
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-slate-200 text-slate-500 border border-slate-300"
                  }`}
                >
                  {idx + 1}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold truncate ${section.enabled ? "text-slate-900" : "text-slate-500"}`}>
                      {isTr ? section.title_tr : section.title_en}
                    </span>
                    {section.isCommon ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium shrink-0">
                        {isTr ? "Ortak" : "Common"}
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium shrink-0">
                        {isTr ? "Teknik / Aile" : "Family Spec"}
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-500 truncate mt-0.5">
                    {meta?.description_tr || ""}
                  </p>
                </div>
              </div>

              {/* Aksiyonlar: Sıralama & Aç/Kapat */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMoveUp(idx)}
                  disabled={isFirst}
                  className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                  title={isTr ? "Yukarı Taşı" : "Move Up"}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(idx)}
                  disabled={isLast}
                  className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                  title={isTr ? "Aşağı Taşı" : "Move Down"}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(section.id)}
                  className={`ml-1 px-2 py-1 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    section.enabled
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-500 border border-slate-200 hover:text-slate-800"
                  }`}
                  title={section.enabled ? (isTr ? "Bölümü Gizle" : "Hide") : (isTr ? "Bölümü Ekle" : "Show")}
                >
                  {section.enabled ? (
                    <>
                      <Eye className="w-3 h-3" />
                      <span className="text-[10px]">{isTr ? "Aktif" : "On"}</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3" />
                      <span className="text-[10px]">{isTr ? "Pasif" : "Off"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
