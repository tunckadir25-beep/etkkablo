import React from "react";
import { CableData, CableVariation, PuzzleSectionConfig } from "../../types/cable";
import { getDefaultPuzzleSections } from "../../types/puzzleSections";
import { SectionTableInstance } from "../../types/tableTemplates";
import { getFamilyColor } from "../../utils/cableColors";
import { UsageSection } from "./sections/UsageSection";
import { ConstructionSection } from "./sections/ConstructionSection";
import { MechanicalSection } from "./sections/MechanicalSection";
import { StandardsSection } from "./sections/StandardsSection";
import { TechnicalSpecsSection } from "./sections/TechnicalSpecsSection";
import { ElectricalSpecsSection } from "./sections/ElectricalSpecsSection";
import {
  ETK_LOGO_SVG,
  COPPER_SIDE_RENDER,
  COPPER_CROSS_SECTION,
  FIBER_SIDE_RENDER,
  FIBER_CROSS_SECTION,
} from "../../services/pdf/cableAssetsBase64";

interface TdsLivePreviewProps {
  data: CableData;
  variations: CableVariation[];
  puzzleSections?: PuzzleSectionConfig[];
  lang?: "tr" | "en";
  sectionTables?: Record<string, SectionTableInstance[]>;
}

export const TdsLivePreview: React.FC<TdsLivePreviewProps> = ({
  data,
  variations,
  puzzleSections,
  lang = "tr",
  sectionTables,
}) => {
  const isTr = lang === "tr";
  const activeVariations = (variations || []).filter((v) => v.include !== false);

  const familyColors = getFamilyColor(data.family_key, data.kategori);
  const isFiber = data.family_key === "fiber_optik";
  const primaryColor = familyColors.primary;
  const tintColor = familyColors.tint;
  const headerTextColor = familyColors.headerTextColor;

  // Puzzle section configuration
  const sections = puzzleSections || getDefaultPuzzleSections(data.family_key, data.varsayilan_bolumler);
  const enabledSections = [...sections].sort((a, b) => a.order - b.order).filter((s) => s.enabled);

  // Sabit Temel Bölümler (Her belgede sabit ve bağımsız)
  const liveUsageList: string[] = (data.kullanim_alanlari || []).map((r: any) => {
    if (typeof r === "string") return r;
    const priorityKeys = ["alan_adi", "kullanim_alani", "madde", "tanim", "aciklama", "deger"];
    for (const k of priorityKeys) {
      if (typeof r[k] === "string" && r[k].trim()) return r[k].trim();
    }
    const stringVals = Object.entries(r).filter(
      ([k, v]) => !["id", "sira", "include", "dahil"].includes(k) && typeof v === "string" && (v as string).trim()
    );
    return stringVals.length > 0 ? (stringVals[0][1] as string) : "";
  }).filter(Boolean);

  const liveConstructionList: any[] = (data.kablo_yapisi || []).map((r: any, idx: number) => {
    let label = r.katman_adi || r.katman || r.label || r.title || "";
    let desc = r.tanim || r.aciklama || r.desc || r.description || r.deger || "";
    if (!label && !desc) {
      const entries = Object.entries(r).filter(
        ([k, v]) => !["id", "sira", "include", "dahil"].includes(k) && typeof v === "string" && (v as string).trim()
      );
      if (entries.length >= 1) label = entries[0][1] as string;
      if (entries.length >= 2) desc = entries[1][1] as string;
    }
    return {
      label: label || `Katman ${idx + 1}`,
      desc: desc,
    };
  }).filter((item) => item.label || item.desc);

  const showUsage = liveUsageList.length > 0;
  const showConstr = liveConstructionList.length > 0;

  const mechTests = data.mekanik_testler || [];
  const env = data.uygulama_cevre || {};
  const stds = data.standartlar || [];
  const rawMech = data.mekanik_ozellikler_ham || [];
  const techSpecs = data.teknik_ozellikler || data.elektriksel_ozellikler || [];
  const elecSpecs = data.elektriksel_ozellikler || [];

  // Sayfa 2 varyasyon kontrolü
  const varTables = sectionTables?.["varyasyonlar"] || [];
  const activeVarTable = varTables.find((t) => (t.data || []).some((r: any) => r.include !== false && r.dahil !== false));
  const hasVariationTableData = !!activeVarTable;
  const isVariationsEnabled = isFiber || enabledSections.some((s) => s.id === "varyasyonlar");
  const showPage2 = sectionTables ? (isVariationsEnabled && hasVariationTableData) : (isVariationsEnabled && activeVariations.length > 0);

  return (
    <div id="tds-document-container" className="flex flex-col items-center gap-8 print:gap-0 print:block">
      {/* ================================================================= */}
      {/* SAYFA 1: KÜNYE VE MODÜLER BÖLÜMLER                                */}
      {/* ================================================================= */}
      <div
        id="tds-page-1"
        data-tds-page="1"
        className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white text-slate-900 shadow-xl rounded-sm p-[12mm] text-[9.5pt] leading-tight select-none border border-slate-300 font-sans print:p-[12mm] print:border-none print:shadow-none print:rounded-none print:page-break-after-always flex flex-col justify-between box-border"
        style={{ width: "210mm", minHeight: "297mm", boxSizing: "border-box" }}
      >
        <div>
          {/* Üst Başlık & Logo */}
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3 flex-1">
              <img
                src={ETK_LOGO_SVG}
                alt="ETK Kablo Logo"
                className="h-8 w-auto object-contain"
              />
              <div className="h-[2.5px] flex-1" style={{ backgroundColor: primaryColor }}></div>
            </div>
            <div className="text-[7pt] font-bold text-slate-500 tracking-wider">
              RoHS &nbsp; REACH &nbsp; <span className="border border-slate-400 px-1 py-0.5 rounded">CE</span>
            </div>
          </div>

          {/* Kategori & Model Adı */}
          <div className="mb-3">
            <div className="text-[10pt] font-bold text-slate-700 uppercase tracking-wide">
              {data.kategori || (isFiber ? "Fiber Optik Kablolar" : "Haberleşme & Kontrol Kabloları")}
            </div>
            <div className="text-[14pt] font-black text-slate-900 leading-tight">
              {data.urun_kodu}
            </div>
            {data.standart_kodu && (
              <div className="text-[8.5pt] font-bold text-slate-700 mt-0.5">
                {data.standart_kodu}
              </div>
            )}
            {data.urun_aciklamasi && (
              <div className="text-[7.8pt] text-slate-600 mt-1">
                {data.urun_aciklamasi}
              </div>
            )}
          </div>

          {/* Görseller Bölümü */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="h-24 bg-slate-950 rounded flex items-center justify-center overflow-hidden p-1 border border-slate-200">
              <img
                src={isFiber ? FIBER_SIDE_RENDER : COPPER_SIDE_RENDER}
                alt="Cable Render"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="h-24 bg-slate-950 rounded flex items-center justify-center overflow-hidden p-1 border border-slate-200">
              <img
                src={isFiber ? FIBER_CROSS_SECTION : COPPER_CROSS_SECTION}
                alt="Cross Section"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>

          {/* ============================================================== */}
          {/* DURUM 1: FIBER OPTIK (Eğer sectionTables yoksa legacy şablon)    */}
          {/* ============================================================== */}
          {isFiber && !sectionTables ? (
            <>
              {/* İki Sütunlu Yapı: Kullanım Alanları & Kablo Yapısı */}
              {(showUsage || showConstr) && (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {showUsage && <UsageSection items={liveUsageList} lang={lang} primaryColor={primaryColor} />}
                  {showConstr && <ConstructionSection layers={liveConstructionList} lang={lang} primaryColor={primaryColor} />}
                </div>
              )}

              {/* Mekanik Testler Tablosu (IEC 60794) */}
              {mechTests.length > 0 && (
                <div className="mb-3">
                  <div
                    className="text-white text-[8pt] font-bold px-2 py-0.5"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isTr ? "Mekanik ve Çevresel Özellikler" : "Mechanical & Environmental Specs"}
                  </div>
                  <table className="w-full border-collapse text-[7pt] mt-0.5">
                    <thead>
                      <tr className="text-white" style={{ backgroundColor: primaryColor }}>
                        <th className="border border-white p-1 text-left w-[32%]">{isTr ? "Test Standardı & Parametre" : "Parameter"}</th>
                        <th className="border border-white p-1 text-center w-[22%]">{isTr ? "Test Standardı" : "Standard"}</th>
                        <th className="border border-white p-1 text-center w-[23%]">{isTr ? "Şartname Değeri" : "Specification"}</th>
                        <th className="border border-white p-1 text-center w-[23%]">{isTr ? "Kabul Kriteri" : "Criteria"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mechTests.map((t, idx) => (
                        <tr key={idx} className="border-b border-white" style={{ backgroundColor: tintColor }}>
                          <td className="border border-white p-1 font-semibold text-white" style={{ backgroundColor: primaryColor }}>
                            {t.test_parametre}
                          </td>
                          <td className="border border-white p-1 text-center text-slate-900">{t.test_standardi}</td>
                          <td className="border border-white p-1 text-center text-slate-900">{t.sartname_degeri}</td>
                          <td className="border border-white p-1 text-center text-slate-900">{t.kabul_kriteri}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bükülme ve Sıcaklık Tablosu */}
              <MechanicalSection env={env} rawMech={rawMech} lang={lang} primaryColor={primaryColor} tintColor={tintColor} />

              {/* Test Standartları Rozetleri */}
              <StandardsSection standards={stds} lang={lang} primaryColor={primaryColor} tintColor={tintColor} />
            </>
          ) : (
            /* ============================================================== */
            /* DURUM 2: MODÜLER TABLO ŞEMA MİMARİSİ (ANAHTAR MANTIĞI)          */
            /* ============================================================== */
            <div className="space-y-3">
              {/* Sabit Temel Bölümler (Yan Yana): Kullanım Alanları & Kablo Yapısı */}
              {(showUsage || showConstr) && (
                <div className={`grid ${showUsage && showConstr ? "grid-cols-2" : "grid-cols-1"} gap-3 mb-1`}>
                  {showUsage && <UsageSection items={liveUsageList} lang={lang} primaryColor={primaryColor} />}
                  {showConstr && <ConstructionSection layers={liveConstructionList} lang={lang} primaryColor={primaryColor} />}
                </div>
              )}

              {enabledSections
                .filter((s) => s.id !== "kullanim_alanlari" && s.id !== "kablo_yapisi" && s.id !== "varyasyonlar")
                .map((sec) => {
                  if (sectionTables) {
                    const secTables = sectionTables[sec.id] || [];
                    // Tablo şablonu tanımlanmadıysa GÖZÜKMEMELİ (Kural)
                    if (secTables.length === 0) return null;

                    const renderSingleTable = (tableInst: SectionTableInstance) => {
                      const activeCols = tableInst.columns.filter(
                        (c: any) => c.key !== "id" && c.key !== "include" && c.key !== "dahil"
                      );
                      const activeRows = (tableInst.data || []).filter(
                        (r: any) => r.include !== false && r.dahil !== false
                      );
                      if (activeCols.length === 0 || activeRows.length === 0) return null;

                      return (
                        <div key={tableInst.instanceId} className="w-full">
                          <div
                            className="text-[8pt] font-bold px-2 py-0.5"
                            style={{ backgroundColor: primaryColor, color: headerTextColor }}
                          >
                            {tableInst.title || (isTr ? sec.title_tr : sec.title_en)}
                          </div>
                          <table className="w-full border-collapse text-[7pt] mt-0.5">
                            <thead>
                              {/* 1. Çatı Başlık (Super Header) */}
                              {tableInst.superHeaderTitle && (() => {
                                // Dinamik superHeaderStartCol ve superHeaderColSpan kontrolü
                                if (tableInst.superHeaderStartCol && tableInst.superHeaderColSpan) {
                                  const startIdx = activeCols.findIndex((c: any) => c.key === tableInst.superHeaderStartCol);
                                  if (startIdx !== -1) {
                                    const colSpan = Math.max(1, Math.min(tableInst.superHeaderColSpan, activeCols.length - startIdx));
                                    const preSpan = startIdx;
                                    const postSpan = activeCols.length - (startIdx + colSpan);

                                    return (
                                      <tr className="font-bold">
                                        {preSpan > 0 && (
                                          <th colSpan={preSpan} className="border border-white bg-white" />
                                        )}
                                        <th
                                          colSpan={colSpan}
                                          className="border border-white p-1 text-center font-bold"
                                          style={{ backgroundColor: primaryColor, color: headerTextColor }}
                                        >
                                          {tableInst.superHeaderTitle}
                                        </th>
                                        {postSpan > 0 && (
                                          <th colSpan={postSpan} className="border border-white bg-white" />
                                        )}
                                      </tr>
                                    );
                                  }
                                }

                                // Geriye dönük uyumluluk varsayılan mantığı (fallback):
                                const hasLabelPrefix = activeCols[0]?.role === "label";
                                return (
                                  <tr className="font-bold">
                                    {hasLabelPrefix && (
                                      <th className="border border-white bg-white" />
                                    )}
                                    <th
                                      colSpan={hasLabelPrefix ? activeCols.length - 1 : activeCols.length}
                                      className="border border-white p-1 text-center font-bold"
                                      style={{ backgroundColor: primaryColor, color: headerTextColor }}
                                    >
                                      {tableInst.superHeaderTitle}
                                    </th>
                                  </tr>
                                );
                              })()}

                              {/* 2. Sütun Başlıkları */}
                              {tableInst.showHeaderRow !== false && (
                                <tr>
                                  {activeCols.map((col, cIdx) => {
                                    const isFirstCol = cIdx === 0;
                                    const isFirstColBlank = isFirstCol && (
                                      col.hideHeader === true ||
                                      tableInst.blankCornerHeader === true ||
                                      !col.title ||
                                      !col.title.trim()
                                    );

                                    if (isFirstColBlank) {
                                      return (
                                        <th
                                          key={col.key}
                                          className="p-1 bg-white border-0"
                                          style={{ backgroundColor: "#FFFFFF", border: "none", borderColor: "transparent" }}
                                        />
                                      );
                                    }

                                    return (
                                      <th
                                        key={col.key}
                                        className={`border border-white p-1 ${
                                          col.align === "left" || (cIdx === 0 && !col.align) ? "text-left" : "text-center"
                                        }`}
                                        style={{ backgroundColor: primaryColor, color: headerTextColor }}
                                      >
                                        {col.title}
                                      </th>
                                    );
                                  })}
                                </tr>
                              )}
                            </thead>
                            <tbody>
                              {activeRows.map((row: any, rIdx: number) => {
                                // Eğer bu satır bir Grup / Ara Başlık Satırı ise
                                if (row.isGroupHeader) {
                                  return (
                                    <tr key={rIdx} className="border-b border-white">
                                      <td
                                        className="border border-white p-1 text-left font-bold text-slate-800 bg-slate-200"
                                        style={{ paddingLeft: row.indent ? `${row.indent * 12 + 6}px` : "6px" }}
                                      >
                                        {row.title || row[activeCols[0]?.key] || ""}
                                      </td>
                                      {activeCols.slice(1).map((col) => (
                                        <td key={col.key} className="border border-white p-1 bg-white" />
                                      ))}
                                    </tr>
                                  );
                                }

                                const striping = tableInst.stripingMode || (tableInst.layoutMode === "matrix" || tableInst.superHeaderTitle ? "filled_only" : "zebra");

                                return (
                                  <tr
                                    key={rIdx}
                                    className="border-b border-white text-slate-900"
                                  >
                                    {activeCols.map((col, cIdx) => {
                                      const isFirstCol = cIdx === 0;
                                      const isFirstColBlank = isFirstCol && (
                                        col.hideHeader === true ||
                                        tableInst.blankCornerHeader === true ||
                                        !col.title ||
                                        !col.title.trim()
                                      );
                                      const isLabel = col.role === "label" || isFirstColBlank;
                                      const val = row[col.key];
                                      const hasValue = val !== undefined && val !== null && String(val).trim() !== "";

                                      let cellBg = "#FFFFFF";
                                      let textColor = "inherit";
                                      if (isLabel) {
                                        cellBg = primaryColor;
                                        textColor = headerTextColor;
                                      } else if (striping === "filled_only") {
                                        cellBg = hasValue ? "#F1F5F9" : "#FFFFFF";
                                      } else if (striping === "zebra") {
                                        cellBg = rIdx % 2 === 0 ? "#FFFFFF" : tintColor;
                                      } else {
                                        cellBg = "#FFFFFF";
                                      }

                                      return (
                                        <td
                                          key={col.key}
                                          className={`border border-white p-1 ${
                                            isLabel ? "font-bold" : cIdx === 0 ? "font-semibold" : ""
                                          } ${
                                            col.align === "left" || (cIdx === 0 && !col.align) ? "text-left" : "text-center"
                                          }`}
                                          style={{ backgroundColor: cellBg, color: textColor }}
                                        >
                                          {val !== undefined && val !== null ? String(val) : ""}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    };

                    if (sec.layout === "side_by_side" && secTables.length >= 2) {
                      return (
                        <div key={sec.id} className="space-y-2">
                          <div className="grid grid-cols-2 gap-[12px] items-start mb-2">
                            {renderSingleTable(secTables[0])}
                            {renderSingleTable(secTables[1])}
                          </div>
                          {secTables.slice(2).map((t) => (
                            <div key={t.instanceId} className="mb-2">
                              {renderSingleTable(t)}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <div key={sec.id} className="space-y-2">
                        {secTables.map((t) => (
                          <div key={t.instanceId} className="mb-2">
                            {renderSingleTable(t)}
                          </div>
                        ))}
                      </div>
                    );
                  }

                  // Fallback: sectionTables objesi iletilmediyse eski bileşenleri kullan
                  switch (sec.id) {
                    case "teknik_ozellikler":
                      return (
                        <TechnicalSpecsSection
                          key={sec.id}
                          specs={techSpecs}
                          familyName={data.kategori}
                          lang={lang}
                          primaryColor={primaryColor}
                          tintColor={tintColor}
                        />
                      );
                    case "elektriksel_ozellikler":
                      return (
                        <ElectricalSpecsSection
                          key={sec.id}
                          specs={elecSpecs}
                          lang={lang}
                          primaryColor={primaryColor}
                          tintColor={tintColor}
                        />
                      );
                    case "mekanik_ozellikler":
                      return (
                        <MechanicalSection
                          key={sec.id}
                          env={env}
                          rawMech={rawMech}
                          lang={lang}
                          primaryColor={primaryColor}
                          tintColor={tintColor}
                        />
                      );
                    case "standartlar":
                      return (
                        <StandardsSection
                          key={sec.id}
                          standards={stds}
                          lang={lang}
                          primaryColor={primaryColor}
                          tintColor={tintColor}
                        />
                      );
                    case "uygulama":
                    case "markalama_paketleme":
                      return null;
                    default:
                      return null;
                  }
                })}
            </div>
          )}
        </div>

        {/* Belge Kodu (B248) */}
        <div className="mt-auto pt-3 flex items-center justify-between text-[7pt] text-slate-500 border-t border-slate-100">
          <div className="px-2 py-0.5 font-bold rounded-xs" style={{ backgroundColor: primaryColor, color: headerTextColor }}>
            {data.dokuman_kodu || "B248"}
          </div>
          <div>Sayfa 1 / {showPage2 ? "2" : "1"}</div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* SAYFA 2: VARYASYONLAR TABLOSU                                     */}
      {/* ================================================================= */}
      {showPage2 && (
        <div
          id="tds-page-2"
          data-tds-page="2"
          className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white text-slate-900 shadow-xl rounded-sm p-[12mm] text-[9.5pt] leading-tight select-none border border-slate-300 font-sans print:p-[12mm] print:border-none print:shadow-none print:rounded-none flex flex-col justify-between box-border"
          style={{ width: "210mm", minHeight: "297mm", boxSizing: "border-box" }}
        >
          <div>
            {/* Sayfa 2 Başlık */}
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="h-[2px] flex-1" style={{ backgroundColor: primaryColor }}></div>
              <img
                src={ETK_LOGO_SVG}
                alt="ETK Kablo Logo"
                className="h-6 w-auto object-contain"
              />
            </div>

            <div className="text-[10pt] font-bold px-3 py-1 mb-3 rounded-xs" style={{ backgroundColor: primaryColor, color: headerTextColor }}>
              {data.urun_kodu}
            </div>

            {/* Varyasyonlar Tablosu */}
            {activeVarTable ? (
              <table className="w-full border-collapse text-[7pt]">
                <thead>
                  <tr style={{ backgroundColor: primaryColor, color: headerTextColor }}>
                    {activeVarTable.columns
                      .filter((c: any) => c.key !== "id" && c.key !== "include" && c.key !== "dahil")
                      .map((c, cIdx) => (
                        <th
                          key={c.key}
                          className={`border border-white p-1 ${
                            c.align === "left" || (cIdx === 0 && !c.align) ? "text-left" : "text-center"
                          }`}
                        >
                          {c.title}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {(activeVarTable.data || [])
                    .filter((r: any) => r.include !== false && r.dahil !== false)
                    .map((v: any, idx: number) => {
                      const activeCols = activeVarTable.columns.filter(
                        (c: any) => c.key !== "id" && c.key !== "include" && c.key !== "dahil"
                      );
                      return (
                        <tr
                          key={idx}
                          className="border-b border-white text-slate-900"
                          style={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : tintColor }}
                        >
                          {activeCols.map((c, cIdx) => (
                            <td
                              key={c.key}
                              className={`border border-white p-1 ${
                                cIdx === 0 ? "font-mono font-bold text-slate-950" : ""
                              } ${
                                c.align === "left" || (cIdx === 0 && !c.align) ? "text-left" : "text-center"
                              }`}
                            >
                              {v[c.key] !== undefined && v[c.key] !== null && v[c.key] !== ""
                                ? String(v[c.key])
                                : "-"}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            ) : (
              <table className="w-full border-collapse text-[7pt]">
                <thead>
                  <tr className="text-white" style={{ backgroundColor: primaryColor }}>
                    <th className="border border-white p-1 text-center w-[25%]">{isTr ? "Part Numarası" : "Part Number"}</th>
                    <th className="border border-white p-1 text-center w-[20%]">{isTr ? "Lif / Kesit" : "Fiber / Section"}</th>
                    <th className="border border-white p-1 text-center w-[12%]">{isTr ? "Fiber / Per" : "Cores / Pairs"}</th>
                    <th className="border border-white p-1 text-center w-[15%]">{isTr ? "Dış Çap (mm)" : "Diameter (mm)"}</th>
                    <th className="border border-white p-1 text-center w-[14%]">{isTr ? "Toplam Ağ. (kg/km)" : "Total Wt"}</th>
                    <th className="border border-white p-1 text-center w-[14%]">{isTr ? "Sevk Boyu (m)" : "Length (m)"}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeVariations.map((v, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-white text-slate-900"
                      style={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : tintColor }}
                    >
                      <td className="border border-white p-1 text-center font-mono font-bold text-slate-950">
                        {v.part_numarasi}
                      </td>
                      <td className="border border-white p-1 text-center font-semibold">
                        {v.lif_cinsi || v.kesit || "-"}
                      </td>
                      <td className="border border-white p-1 text-center">
                        {v.fiber_sayisi || v.per_sayisi || "-"}
                      </td>
                      <td className="border border-white p-1 text-center">
                        {v.dis_cap_mm}
                      </td>
                      <td className="border border-white p-1 text-center font-medium">
                        {v.toplam_agirlik_kg_km}
                      </td>
                      <td className="border border-white p-1 text-center">
                        {v.sevk_boyu_m || "500/1000"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Belge Kodu (B249) */}
          <div className="mt-auto pt-3 flex items-center justify-between text-[7pt] text-slate-500 border-t border-slate-100">
            <div>Sayfa 2 / 2</div>
            <div className="text-white px-2 py-0.5 font-bold rounded-xs" style={{ backgroundColor: primaryColor }}>
              B249
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
