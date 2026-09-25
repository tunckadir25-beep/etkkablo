import React, { useState, useMemo } from "react";
import { TableTemplate, getSavedTableTemplates, getDefaultEmptyTemplate } from "../../types/tableTemplates";
import { FamilySummary } from "../../types/cable";
import {
  Search,
  X,
  Layers,
  Table as TableIcon,
  Plus,
  Sparkles,
  Cpu,
  Zap,
  Bookmark,
  Check,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Sliders,
  Bot,
  Package,
} from "lucide-react";

interface SelectTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TableTemplate) => void;
  targetSectionKey: string;
  targetSectionTitle?: string;
  currentFamilyKey?: string;
  families?: FamilySummary[];
  lang?: "tr" | "en";
  onNavigateToDesigner?: () => void;
}

export const SelectTableModal: React.FC<SelectTableModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  targetSectionKey,
  targetSectionTitle,
  currentFamilyKey,
  families = [],
  lang = "tr",
  onNavigateToDesigner,
}) => {
  const isTr = lang === "tr";

  const [searchQuery, setSearchQuery] = useState("");
  // Kablo ailesine göre filtreleme ("all", "current", "general", "custom" veya family_key)
  const [selectedFamilyTab, setSelectedFamilyTab] = useState<string>("all");

  // Mevcut tüm şablonları al (yerleşik + yerel hafızadaki özeller)
  const allTemplates = useMemo(() => {
    return getSavedTableTemplates();
  }, [isOpen]);

  if (!isOpen) return null;

  // Bölüm rozeti ve metni
  const getSectionBadge = (secKey?: string) => {
    switch (secKey) {
      case "teknik_ozellikler":
        return {
          label: isTr ? "Teknik" : "Technical",
          color: "bg-cyan-50 text-cyan-800 border-cyan-200",
          icon: <Cpu className="w-3 h-3 text-cyan-600" />,
        };
      case "elektriksel_ozellikler":
        return {
          label: isTr ? "Elektriksel" : "Electrical",
          color: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <Zap className="w-3 h-3 text-amber-600" />,
        };
      case "kablo_yapisi":
        return {
          label: isTr ? "Katman Yapısı" : "Construction",
          color: "bg-indigo-50 text-indigo-800 border-indigo-200",
          icon: <ShieldCheck className="w-3 h-3 text-indigo-600" />,
        };
      case "mekanik_ozellikler":
        return {
          label: isTr ? "Mekanik" : "Mechanical",
          color: "bg-rose-50 text-rose-800 border-rose-200",
          icon: <Activity className="w-3 h-3 text-rose-600" />,
        };
      case "standartlar":
        return {
          label: isTr ? "Standartlar" : "Standards",
          color: "bg-teal-50 text-teal-800 border-teal-200",
          icon: <CheckCircle2 className="w-3 h-3 text-teal-600" />,
        };
      case "kullanim_alanlari":
        return {
          label: isTr ? "Kullanım" : "Applications",
          color: "bg-blue-50 text-blue-800 border-blue-200",
          icon: <Sliders className="w-3 h-3 text-blue-600" />,
        };
      case "uygulama":
        return {
          label: isTr ? "Uygulama" : "Application",
          color: "bg-blue-50 text-blue-800 border-blue-200",
          icon: <Sliders className="w-3 h-3 text-blue-600" />,
        };
      case "markalama_paketleme":
        return {
          label: isTr ? "Markalama" : "Marking",
          color: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <Package className="w-3 h-3 text-amber-600" />,
        };
      case "varyasyonlar":
      default:
        return {
          label: isTr ? "Varyasyon" : "Variation",
          color: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: <TableIcon className="w-3 h-3 text-emerald-600" />,
        };
    }
  };

  // Filtrelenmiş şablon listesi (Kablo ailesi ve arama bazlı)
  const filteredTemplates = allTemplates.filter((tpl) => {
    // Arama metni
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = tpl.name.toLowerCase().includes(q);
      const matchDesc = tpl.description?.toLowerCase().includes(q);
      const matchCols = tpl.columns.some(
        (c) => c.title.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)
      );
      if (!matchName && !matchDesc && !matchCols) {
        return false;
      }
    }

    // Kablo Ailesi sekmesi
    if (selectedFamilyTab === "current") {
      if (currentFamilyKey && tpl.familyKey !== currentFamilyKey) return false;
    } else if (selectedFamilyTab === "general") {
      if (tpl.familyKey) return false;
    } else if (selectedFamilyTab === "custom") {
      if (tpl.isBuiltIn) return false;
    } else if (selectedFamilyTab !== "all") {
      if (tpl.familyKey !== selectedFamilyTab) return false;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      {/* Kompakt Modal Kutusu */}
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* Başlık Çubuğu */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {isTr ? "Tablo Şablonu Seç" : "Select Table Template"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isTr ? "Eklenecek Bölüm:" : "Target Section:"}{" "}
                <span className="text-emerald-700 font-semibold">
                  {targetSectionTitle || targetSectionKey}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToDesigner && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToDesigner();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold text-xs transition cursor-pointer shadow-xs"
                title={isTr ? "Tablo Tasarımcısı ve AI Şablon Üreticiye Git" : "Go to Table Designer & AI Generator"}
              >
                <Bot className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">{isTr ? "AI / Kod ile Üret" : "AI Generator"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Arama ve Kategori Filtre Hapları */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5 shrink-0">
          {/* Arama Kutusu */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTr ? "Kayıtlı tablolarda ara..." : "Search templates..."}
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Kablo Ailesi Filtre Butonları */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedFamilyTab("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer whitespace-nowrap ${
                selectedFamilyTab === "all"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {isTr ? "Tüm Aileler" : "All Families"} ({allTemplates.length})
            </button>

            {currentFamilyKey && (
              <button
                type="button"
                onClick={() => setSelectedFamilyTab("current")}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  selectedFamilyTab === "current"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Layers className="w-3 h-3 text-emerald-700" />
                <span>
                  {families.find((f) => f.family_key === currentFamilyKey)?.display_name || (isTr ? "Mevcut Aile" : "Current Family")}
                </span>
              </button>
            )}

            {families
              .filter((f) => f.family_key !== currentFamilyKey)
              .map((f) => (
                <button
                  key={f.family_key}
                  type="button"
                  onClick={() => setSelectedFamilyTab(f.family_key)}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    selectedFamilyTab === f.family_key
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>{f.display_name}</span>
                </button>
              ))}

            <button
              type="button"
              onClick={() => setSelectedFamilyTab("general")}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                selectedFamilyTab === "general"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>{isTr ? "Genel Şablonlar" : "General"}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFamilyTab("custom")}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                selectedFamilyTab === "custom"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Bookmark className="w-3 h-3 text-purple-600" />
              <span>{isTr ? "Özel" : "Custom"}</span>
            </button>
          </div>
        </div>

        {/* Şablon Listesi */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredTemplates.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs space-y-3">
              <TableIcon className="w-9 h-9 mx-auto opacity-30 text-emerald-600" />
              <p className="text-slate-600 font-medium">
                {isTr ? "Kayıtlı tablo şablonu bulunamadı." : "No table templates found."}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const fallbackTpl = getDefaultEmptyTemplate(targetSectionKey);
                    onSelectTemplate(fallbackTpl);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isTr ? "Temel Tablo Oluştur ve Ekle" : "Create & Add Basic Table"}</span>
                </button>
                {onNavigateToDesigner && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToDesigner();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-200 transition cursor-pointer"
                  >
                    <span>{isTr ? "Tasarımcıda Şablon Oluştur" : "Design in Table Designer"}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredTemplates.map((tpl) => {
              const badge = getSectionBadge(tpl.sectionKey);
              const famObj = families.find((f) => f.family_key === tpl.familyKey);

              return (
                <div
                  key={tpl.id}
                  onClick={() => {
                    onSelectTemplate(tpl);
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/20 transition flex items-center justify-between gap-3 cursor-pointer group shadow-xs"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition truncate">
                        {tpl.name}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-semibold ${badge.color}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      {famObj ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-semibold">
                          <Layers className="w-2.5 h-2.5" />
                          <span>{famObj.display_name}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                          {isTr ? "Genel" : "General"}
                        </span>
                      )}
                      {!tpl.isBuiltIn && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-semibold">
                          {isTr ? "Özel" : "Custom"}
                        </span>
                      )}
                    </div>

                    {tpl.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {tpl.description}
                      </p>
                    )}

                    {/* Sütunlar özeti */}
                    <div className="flex items-center gap-1 overflow-hidden text-[10px] text-slate-500">
                      <span className="text-slate-600 font-semibold">
                        {tpl.columns.length} {isTr ? "sütun:" : "cols:"}
                      </span>
                      <span className="truncate text-slate-700 font-mono">
                        {tpl.columns.map((c) => c.title).join(" • ")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTemplate(tpl);
                      onClose();
                    }}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-emerald-600 group-hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isTr ? "Ekle" : "Add"}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Alt Çubuğu */}
        <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-slate-500">
            {filteredTemplates.length} {isTr ? "şablon listeleniyor" : "templates shown"}
          </span>

          {onNavigateToDesigner && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToDesigner();
              }}
              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold transition cursor-pointer"
            >
              {isTr ? "Tablo Tasarımcısı'na Git ->" : "Go to Table Designer ->"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
