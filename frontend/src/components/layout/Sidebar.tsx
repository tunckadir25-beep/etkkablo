import React, { useState } from "react";
import { FamilySummary, ProductSummary } from "../../types/cable";
import { Search, Cable, Layers, ChevronRight } from "lucide-react";
import { getFamilyColor } from "../../utils/cableColors";

interface SidebarProps {
  families: FamilySummary[];
  products: ProductSummary[];
  selectedFamily: string;
  selectedProductId: number | null;
  onSelectFamily: (key: string) => void;
  onSelectProduct: (id: number) => void;
  onSearch: (query: string) => void;
  lang?: "tr" | "en";
}

export const Sidebar: React.FC<SidebarProps> = ({
  families,
  products,
  selectedFamily,
  selectedProductId,
  onSelectFamily,
  onSelectProduct,
  onSearch,
  lang = "tr",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const isTr = lang === "tr";

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onSearch(val);
  };

  return (
    <aside className="w-80 h-[calc(100vh-4rem)] bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-xs">
      {/* Arama Alanı */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50/50">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isTr ? "Kablo ara (örn. EIB, Cat 6, Fiber)..." : "Search cable models..."}
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20 shadow-xs"
          />
        </div>
      </div>

      {/* 15 Aile Seçici (Yatay / Dikey Scroll) */}
      <div className="px-3 py-2 border-b border-slate-200 flex gap-1.5 overflow-x-auto no-scrollbar bg-slate-50/30">
        <button
          type="button"
          onClick={() => onSelectFamily("")}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
            selectedFamily === ""
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
          }`}
        >
          {isTr ? "Tümü" : "All"}
        </button>

        {families.map((fam) => {
          const famColor = getFamilyColor(fam.family_key, fam.display_name);
          const isSelected = selectedFamily === fam.family_key;
          return (
            <button
              key={fam.family_key}
              type="button"
              onClick={() => onSelectFamily(fam.family_key)}
              style={isSelected ? { backgroundColor: famColor.primary, color: famColor.headerTextColor } : undefined}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? "shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: famColor.primary }}
              />
              <span>{isTr ? fam.display_name.split(" ")[0] : fam.display_en.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Ürün Listesi */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>{isTr ? "Katalog Ürünleri" : "Catalog Products"}</span>
          <span className="font-semibold text-slate-500">{products.length} {isTr ? "Kablo" : "Items"}</span>
        </div>

        {products.map((p) => {
          const isSelected = p.id === selectedProductId;
          return (
            <div
              key={p.id}
              onClick={() => onSelectProduct(p.id)}
              className={`p-2.5 rounded-lg transition cursor-pointer flex items-center justify-between group ${
                isSelected
                  ? "bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold shadow-xs"
                  : "hover:bg-slate-50 text-slate-700 border border-transparent"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate flex items-center gap-1.5">
                  <Cable className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="truncate">{p.urun_kodu}</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                  {p.kategori}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 font-medium">
                  <Layers className="w-2.5 h-2.5 text-slate-400" />
                  {p.variation_count}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 transition ${isSelected ? "text-emerald-600" : "text-slate-300 group-hover:text-slate-500"}`} />
              </div>
            </div>
          );
        })}

        {products.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-400">
            {isTr ? "Eşleşen kablo bulunamadı." : "No matching cables found."}
          </div>
        )}
      </div>
    </aside>
  );
};
