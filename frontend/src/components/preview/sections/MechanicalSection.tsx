import React from "react";
import { EnvironmentalSpecs, MechanicalSpecRawItem } from "../../../types/cable";

interface MechanicalSectionProps {
  env: EnvironmentalSpecs;
  rawMech?: MechanicalSpecRawItem[];
  lang?: "tr" | "en";
  primaryColor?: string;
  tintColor?: string;
}

export const MechanicalSection: React.FC<MechanicalSectionProps> = ({
  env,
  rawMech = [],
  lang = "tr",
  primaryColor = "#508234",
  tintColor = "#D3DFCA",
}) => {
  const isTr = lang === "tr";

  // Check if we have specific raw mechanical properties from non-fiber cables
  const hasRawMech = rawMech && rawMech.length > 0;

  return (
    <div className="mb-3 transition-all duration-200">
      <div
        className="text-white text-[8pt] font-bold px-2 py-0.5 mb-0.5 flex items-center justify-between"
        style={{ backgroundColor: primaryColor }}
      >
        <span>{isTr ? "Mekanik ve Çevresel Özellikler" : "Mechanical & Environmental Specs"}</span>
        <span className="text-[6.5pt] opacity-80 uppercase tracking-wider font-mono">
          {isTr ? "Ortak Bölüm" : "Common Section"}
        </span>
      </div>

      <table className="w-full border-collapse text-[7pt]">
        <thead>
          <tr className="text-white" style={{ backgroundColor: primaryColor }}>
            <th colSpan={2} className="border border-white p-0.5 text-center w-[35%]">
              {isTr ? "Minimum Bükme Yarıçapı" : "Bending Radius"}
            </th>
            <th colSpan={4} className="border border-white p-0.5 text-center">
              {isTr ? "Sıcaklık Aralığı" : "Temperature Range"}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-slate-900 border-b border-white" style={{ backgroundColor: tintColor }}>
            <td
              className="border border-white p-0.5 font-semibold text-white w-[14%]"
              style={{ backgroundColor: primaryColor }}
            >
              {isTr ? "Hareketli" : "Flexible"}
            </td>
            <td className="border border-white p-0.5 text-center w-[21%]">
              {env.bukme_yaricapi_hareketli || "15 x D"}
            </td>
            <td
              className="border border-white p-0.5 font-semibold text-white w-[14%]"
              style={{ backgroundColor: primaryColor }}
            >
              {isTr ? "Depolama" : "Storage"}
            </td>
            <td className="border border-white p-0.5 text-center w-[18%]">
              {env.depolama_sicakligi || "-40°C ~ +70°C"}
            </td>
            <td
              className="border border-white p-0.5 font-semibold text-white w-[14%]"
              style={{ backgroundColor: primaryColor }}
            >
              {isTr ? "Kurulum" : "Installation"}
            </td>
            <td className="border border-white p-0.5 text-center w-[19%]">
              {env.kurulum_sicakligi || "-10°C ~ +60°C"}
            </td>
          </tr>
          <tr className="text-slate-900" style={{ backgroundColor: tintColor }}>
            <td
              className="border border-white p-0.5 font-semibold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {isTr ? "Sabit" : "Fixed"}
            </td>
            <td className="border border-white p-0.5 text-center">
              {env.bukme_yaricapi_sabit || "10 x D"}
            </td>
            <td
              className="border border-white p-0.5 font-semibold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {isTr ? "Taşıma" : "Transport"}
            </td>
            <td className="border border-white p-0.5 text-center">
              {env.tasima_sicakligi || "-40°C ~ +70°C"}
            </td>
            <td
              className="border border-white p-0.5 font-semibold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {isTr ? "Çalışma" : "Operating"}
            </td>
            <td className="border border-white p-0.5 text-center">
              {env.calisma_sicakligi || "-30°C ~ +70°C"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Ekstra Ham Mekanik Bilgiler Varsa Göster */}
      {hasRawMech && (
        <div className="mt-1 flex flex-wrap gap-2 text-[6.8pt] bg-slate-100 p-1 rounded-xs border border-slate-200">
          {rawMech.map((m, idx) => (
            <span key={idx} className="inline-flex items-center gap-1">
              <span className="font-semibold text-slate-700">{m.ozellik_adi}:</span>
              <span className="font-mono text-slate-900">{m.deger}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
