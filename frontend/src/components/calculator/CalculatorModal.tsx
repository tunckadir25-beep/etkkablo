import React, { useState } from "react";
import { estimateCalculation } from "../../services/api";
import { CableVariation, CalculationResponse } from "../../types/cable";
import { Calculator, Check, X, Shield, Cpu, Scale, Ruler } from "lucide-react";

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVariation: (variation: CableVariation) => void;
  lang?: "tr" | "en";
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  onClose,
  onAddVariation,
  lang = "tr",
}) => {
  const [pairCount, setPairCount] = useState<number>(4);
  const [crossSection, setCrossSection] = useState<number>(0.8);
  const [isArmored, setIsArmored] = useState<boolean>(false);
  const [isPimf, setIsPimf] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<CalculationResponse | null>(null);

  if (!isOpen) return null;

  const isTr = lang === "tr";

  const handleCalculate = async () => {
    try {
      setLoading(true);
      const res = await estimateCalculation({
        pair_count: pairCount,
        cross_section: crossSection,
        is_armored: isArmored,
        is_pimf: isPimf,
      });
      setResult(res);
    } catch (err: any) {
      alert(`Hesaplama hatası: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToGrid = () => {
    if (!result) return;
    onAddVariation({
      part_numarasi: result.part_no,
      kesit: `${pairCount}x2x${crossSection.toFixed(2)} mm`,
      per_sayisi: pairCount,
      dis_cap_mm: result.outer_diameter_mm.toFixed(1),
      bakir_agirligi_kg_km: result.copper_weight_kg_km.toFixed(1),
      toplam_agirlik_kg_km: Math.round(result.total_weight_kg_km).toString(),
      sevk_boyu_m: result.packing,
      include: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Başlık */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isTr ? "Fiziksel Kablo Hesaplayıcı Motoru" : "Physical Cable Dimension Calculator"}
              </h3>
              <p className="text-xs text-slate-500">
                {isTr ? "ETK Kablo analitik çap ve bakır ağırlığı formülü" : "ETK Cable analytical weight & diameter engine"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Alanı */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {isTr ? "Per Sayısı (Çift)" : "Pair Count"}
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={pairCount}
                onChange={(e) => setPairCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {isTr ? "İletken Kesiti (mm²)" : "Cross Section (mm²)"}
              </label>
              <input
                type="number"
                step="0.05"
                min={0.1}
                value={crossSection}
                onChange={(e) => setCrossSection(parseFloat(e.target.value) || 0.5)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:border-slate-300 transition">
              <input
                type="checkbox"
                checked={isArmored}
                onChange={(e) => setIsArmored(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 border-slate-300 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  {isTr ? "Çelik Tel Zırhlı" : "Armored (SWA)"}
                </span>
                <span className="text-[10px] text-slate-500">
                  {isTr ? "+İç kılıf ve zırh payı" : "+Inner sheath & armor"}
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:border-slate-300 transition">
              <input
                type="checkbox"
                checked={isPimf}
                onChange={(e) => setIsPimf(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 border-slate-300 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  {isTr ? "PiMF Ekranlı" : "PiMF Shielded"}
                </span>
                <span className="text-[10px] text-slate-500">
                  {isTr ? "Her pere toprak teli" : "Drain wire per pair"}
                </span>
              </div>
            </label>
          </div>

          <button
            type="button"
            onClick={handleCalculate}
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <Calculator className="w-4 h-4" />
            {loading ? (isTr ? "Hesaplanıyor..." : "Calculating...") : (isTr ? "Parametreleri Hesapla" : "Run Calculation")}
          </button>

          {/* Sonuç Kartı */}
          {result && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3 animate-in fade-in">
              <div className="text-xs font-bold text-emerald-800 font-mono">
                {result.part_no}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <Ruler className="w-4 h-4 text-cyan-600 mx-auto mb-1" />
                  <div className="text-xs font-bold text-slate-900">{result.outer_diameter_mm} mm</div>
                  <div className="text-[10px] text-slate-500">{isTr ? "Dış Çap" : "Diameter"}</div>
                </div>

                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <Scale className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                  <div className="text-xs font-bold text-slate-900">{result.copper_weight_kg_km}</div>
                  <div className="text-[10px] text-slate-500">{isTr ? "Bakır (kg/km)" : "Copper Wt"}</div>
                </div>

                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <Scale className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <div className="text-xs font-bold text-slate-900">{result.total_weight_kg_km}</div>
                  <div className="text-[10px] text-slate-500">{isTr ? "Toplam (kg/km)" : "Total Wt"}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyToGrid}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                {isTr ? "Bu Varyasyonu Tabloya Ekle" : "Append to Variations Table"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
