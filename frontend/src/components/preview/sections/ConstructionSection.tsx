import React from "react";
import { CableLayer } from "../../../types/cable";

interface ConstructionSectionProps {
  layers: CableLayer[];
  lang?: "tr" | "en";
  primaryColor?: string;
}

export const ConstructionSection: React.FC<ConstructionSectionProps> = ({
  layers,
  lang = "tr",
  primaryColor = "#508234",
}) => {
  const isTr = lang === "tr";
  if (!layers || layers.length === 0) return null;

  return (
    <div className="mb-3 transition-all duration-200">
      <div
        className="text-white text-[8pt] font-bold px-2 py-0.5 mb-1 flex items-center justify-between"
        style={{ backgroundColor: primaryColor }}
      >
        <span>{isTr ? "Kablo Yapısı" : "Cable Construction"}</span>
        <span className="text-[6.5pt] opacity-80 uppercase tracking-wider font-mono">
          {isTr ? "Ortak Bölüm" : "Common Section"}
        </span>
      </div>
      <ul className="text-[7.2pt] text-slate-800 space-y-0.5">
        {layers.map((layer, idx) => {
          const label = isTr ? (layer.label || `Katman ${idx + 1}`) : (layer.label_en || layer.label || `Layer ${idx + 1}`);
          const desc = isTr ? layer.desc : (layer.desc_en || layer.desc);
          return (
            <li key={idx} className="leading-snug">
              <span className="font-semibold text-slate-950">
                {idx + 1}. {label}:
              </span>{" "}
              {desc}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
