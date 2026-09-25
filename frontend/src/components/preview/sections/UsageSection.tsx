import React from "react";

interface UsageSectionProps {
  items: string[];
  lang?: "tr" | "en";
  primaryColor?: string;
}

export const UsageSection: React.FC<UsageSectionProps> = ({
  items,
  lang = "tr",
  primaryColor = "#508234",
}) => {
  const isTr = lang === "tr";
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-3 transition-all duration-200">
      <div
        className="text-white text-[8pt] font-bold px-2 py-0.5 mb-1 flex items-center justify-between"
        style={{ backgroundColor: primaryColor }}
      >
        <span>{isTr ? "Kullanım Alanları" : "Applications"}</span>
        <span className="text-[6.5pt] opacity-80 uppercase tracking-wider font-mono">
          {isTr ? "Ortak Bölüm" : "Common Section"}
        </span>
      </div>
      <ul className="text-[7.2pt] text-slate-800 space-y-0.5 list-disc pl-3">
        {items.map((item, idx) => (
          <li key={idx} className="leading-snug">
            {typeof item === "string" ? item : ((item as any)?.alan_adi || (item as any)?.tanim || (item as any)?.aciklama || Object.values(item as any)[0] || "")}
          </li>
        ))}
      </ul>
    </div>
  );
};
