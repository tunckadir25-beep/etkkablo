import React from "react";
import { ElectricalSpecItem } from "../../../types/cable";

interface TechnicalSpecsSectionProps {
  specs: (ElectricalSpecItem | any)[];
  familyName?: string;
  lang?: "tr" | "en";
  primaryColor?: string;
  tintColor?: string;
}

export const TechnicalSpecsSection: React.FC<TechnicalSpecsSectionProps> = ({
  specs,
  familyName = "Kablo",
  lang = "tr",
  primaryColor = "#508234",
  tintColor = "#D3DFCA",
}) => {
  const isTr = lang === "tr";
  if (!specs || specs.length === 0) return null;

  // Harici telefon gibi bazı ailelerde "diger_elektriksel" JSON formatında tablo içerir
  const firstWithDiger = specs.find((s) => s.diger_elektriksel && s.diger_elektriksel.trim().startsWith("{"));
  let parsedCustomMatrix: { [key: string]: string }[] = [];

  if (firstWithDiger) {
    try {
      parsedCustomMatrix = specs
        .filter((s) => s.diger_elektriksel && s.diger_elektriksel.trim().startsWith("{"))
        .map((s) => {
          try {
            return JSON.parse(s.diger_elektriksel);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } catch {
      parsedCustomMatrix = [];
    }
  }

  // Custom matrix parsed (örn. Harici Telefon Parametre / Çap tablosu)
  if (parsedCustomMatrix.length > 0) {
    const keys = Object.keys(parsedCustomMatrix[0] || {});
    const paramKey = keys[0] || "Parametre";
    const colKeys = keys.slice(1);

    return (
      <div className="mb-3 transition-all duration-200">
        <div
          className="text-white text-[8pt] font-bold px-2 py-0.5 mb-0.5 flex items-center justify-between"
          style={{ backgroundColor: primaryColor }}
        >
          <span>{isTr ? "Teknik ve Elektriksel Özellikler" : "Technical & Electrical Specs"}</span>
          <span className="text-[6.5pt] opacity-80 uppercase tracking-wider font-mono">
            {isTr ? "Teknik Özellikler Bölümü" : "Technical Specs Section"}
          </span>
        </div>
        <table className="w-full border-collapse text-[6.8pt]">
          <thead>
            <tr className="text-white" style={{ backgroundColor: primaryColor }}>
              <th className="border border-white p-1 text-left w-[42%]">{paramKey}</th>
              {colKeys.map((c, i) => (
                <th key={i} className="border border-white p-1 text-center">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsedCustomMatrix.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-white"
                style={{ backgroundColor: idx % 2 === 0 ? tintColor : "#FFFFFF" }}
              >
                <td className="border border-white p-1 font-semibold text-slate-900">{row[paramKey]}</td>
                {colKeys.map((c, i) => (
                  <td key={i} className="border border-white p-1 text-center text-slate-900 font-mono">
                    {row[c] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Standart format: Kesit / Çap bazlı teknik ve elektriksel parametreler
  const displaySpecs = specs.slice(0, 6);

  return (
    <div className="mb-3 transition-all duration-200">
      <div
        className="text-white text-[8pt] font-bold px-2 py-0.5 mb-0.5 flex items-center justify-between"
        style={{ backgroundColor: primaryColor }}
      >
        <span>{isTr ? "Teknik Özellikler" : "Technical Specifications"}</span>
        <span className="text-[6.5pt] opacity-80 uppercase tracking-wider font-mono">
          {familyName}
        </span>
      </div>

      <table className="w-full border-collapse text-[6.8pt]">
        <thead>
          <tr className="text-white" style={{ backgroundColor: primaryColor }}>
            <th className="border border-white p-1 text-center w-[16%]">{isTr ? "Kesit / Çap" : "Cross Section"}</th>
            <th className="border border-white p-1 text-center w-[21%]">{isTr ? "İletken Direnci" : "Conductor Res."}</th>
            <th className="border border-white p-1 text-center w-[21%]">{isTr ? "İzolasyon Direnci" : "Insulation Res."}</th>
            <th className="border border-white p-1 text-center w-[21%]">{isTr ? "Çalışma Voltajı" : "Operating Volt."}</th>
            <th className="border border-white p-1 text-center w-[21%]">{isTr ? "Test Voltajı" : "Test Voltage"}</th>
          </tr>
        </thead>
        <tbody>
          {displaySpecs.map((s, idx) => {
            const kesit = s.kesit_veya_cap || s.kesit || (idx === 0 ? "Standart" : `-`);
            const direnç = s.iletken_direnci_ohm_km ? `${s.iletken_direnci_ohm_km} Ω/km` : "-";
            const izolasyon = s.izolasyon_direnci_mohm_km ? `${s.izolasyon_direnci_mohm_km} MΩ·km` : "-";
            const voltaj = s.calisma_voltaji_v ? `${s.calisma_voltaji_v} V` : "-";
            const testV = s.test_voltaji_v ? `${s.test_voltaji_v} V` : "-";

            return (
              <tr
                key={idx}
                className="border-b border-white"
                style={{ backgroundColor: idx % 2 === 0 ? tintColor : "#FFFFFF" }}
              >
                <td className="border border-white p-1 text-center font-bold text-slate-900 bg-slate-50/50">
                  {kesit}
                </td>
                <td className="border border-white p-1 text-center text-slate-800 font-mono">{direnç}</td>
                <td className="border border-white p-1 text-center text-slate-800 font-mono">{izolasyon}</td>
                <td className="border border-white p-1 text-center text-slate-800 font-mono">{voltaj}</td>
                <td className="border border-white p-1 text-center text-slate-800 font-mono">{testV}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
