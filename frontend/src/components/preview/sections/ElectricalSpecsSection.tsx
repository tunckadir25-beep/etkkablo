import React from "react";
import { ElectricalSpecItem } from "../../../types/cable";

interface ElectricalSpecsSectionProps {
  specs: ElectricalSpecItem[];
  lang?: "tr" | "en";
  primaryColor?: string;
  tintColor?: string;
}

export const ElectricalSpecsSection: React.FC<ElectricalSpecsSectionProps> = ({
  specs,
  lang = "tr",
  primaryColor = "#0084B6",
  tintColor = "#E1F0F8",
}) => {
  const isTr = lang === "tr";
  if (!specs || specs.length === 0) return null;

  const item = specs[0] || {};
  let extraParsed: Record<string, string> = {};
  if (item.diger_elektriksel) {
    try {
      extraParsed = JSON.parse(item.diger_elektriksel);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mb-3 transition-all duration-200">
      <div
        className="text-white text-[8pt] font-bold px-2 py-0.5 mb-0.5 flex items-center justify-between"
        style={{ backgroundColor: primaryColor }}
      >
        <span>{isTr ? "Elektriksel Özellikler (20°C)" : "Electrical Specifications (at 20°C)"}</span>
        <span className="text-[6.5pt] opacity-80 uppercase tracking-wider font-mono">
          {isTr ? "Data / LAN & Çok Damarlı" : "Data / LAN & High Performance"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[6.8pt] bg-slate-50 p-2 border border-slate-200 rounded-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
          <span className="text-slate-600 font-medium">{isTr ? "İletken DC Direnci" : "Conductor DC Resistance"}:</span>
          <span className="font-mono font-bold text-slate-900">{item.iletken_direnci_ohm_km ? `${item.iletken_direnci_ohm_km} Ω/km` : "Max. 94 Ω/km"}</span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
          <span className="text-slate-600 font-medium">{isTr ? "İzolasyon Direnci" : "Insulation Resistance"}:</span>
          <span className="font-mono font-bold text-slate-900">{item.izolasyon_direnci_mohm_km ? `${item.izolasyon_direnci_mohm_km} MΩ·km` : "Min. 5000 MΩ·km"}</span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
          <span className="text-slate-600 font-medium">{isTr ? "Karşılıklı Kapasitans" : "Mutual Capacitance"}:</span>
          <span className="font-mono font-bold text-slate-900">{item.efektif_kapasite_nf_m ? `${item.efektif_kapasite_nf_m} nF/km` : "Max. 56 nF/km"}</span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
          <span className="text-slate-600 font-medium">{isTr ? "Karakteristik Empedans" : "Characteristic Impedance"}:</span>
          <span className="font-mono font-bold text-slate-900">{item.karakteristik_empedans_ohm || "100 ± 5 Ω"}</span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
          <span className="text-slate-600 font-medium">{isTr ? "Yayılma Hızı (NVP)" : "Velocity of Propagation (NVP)"}:</span>
          <span className="font-mono font-bold text-slate-900">{item.yayilma_hizi || "%67 - 69"}</span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
          <span className="text-slate-600 font-medium">{isTr ? "Test Gerilimi" : "Test Voltage"}:</span>
          <span className="font-mono font-bold text-slate-900">{item.test_voltaji_v ? `${item.test_voltaji_v} V DC` : "1000 V DC"}</span>
        </div>

        {Object.entries(extraParsed).map(([k, v], i) => (
          <div key={i} className="flex items-center justify-between border-b border-slate-200 pb-0.5">
            <span className="text-slate-600 font-medium">{k}:</span>
            <span className="font-mono font-bold text-slate-900">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
