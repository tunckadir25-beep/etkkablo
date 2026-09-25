import React from "react";
import { StandardTest } from "../../../types/cable";

interface StandardsSectionProps {
  standards: StandardTest[];
  lang?: "tr" | "en";
  primaryColor?: string;
  tintColor?: string;
}

export const StandardsSection: React.FC<StandardsSectionProps> = ({
  standards,
  lang = "tr",
  primaryColor = "#508234",
  tintColor = "#D3DFCA",
}) => {
  const isTr = lang === "tr";
  if (!standards || standards.length === 0) return null;

  const displayList = standards.slice(0, 6);

  return (
    <div className="mb-3 transition-all duration-200">
      <div
        className="text-white text-[8pt] font-bold px-2 py-0.5 mb-0.5 flex items-center justify-between"
        style={{ backgroundColor: primaryColor }}
      >
        <span>{isTr ? "Standartlar ve Uygunluk" : "Standards & Compliance"}</span>
        <span className="text-[6.5pt] opacity-80 uppercase tracking-wider font-mono">
          {isTr ? "Ortak Bölüm" : "Common Section"}
        </span>
      </div>
      <table className="w-full border-collapse text-[7pt]">
        <thead>
          <tr className="text-white" style={{ backgroundColor: primaryColor }}>
            {displayList.map((s, idx) => (
              <th key={idx} className="border border-white p-0.5 text-center font-bold">
                {s.test_adi}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="text-slate-900" style={{ backgroundColor: tintColor }}>
            {displayList.map((s, idx) => (
              <td key={idx} className="border border-white p-0.5 text-center font-medium">
                {s.standart_kodu}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
