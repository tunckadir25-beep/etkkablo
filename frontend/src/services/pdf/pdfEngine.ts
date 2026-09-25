import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CableData, CableVariation, PuzzleSectionConfig } from "../../types/cable";
import { getDefaultPuzzleSections } from "../../types/puzzleSections";
import { SectionTableInstance } from "../../types/tableTemplates";
import { ETK_LOGO_BASE64 } from "./etkLogoBase64";
import { getFamilyColor } from "../../utils/cableColors";

// Türkçe TrueType Font Bellek Önbelleği (Arial & Arial-Bold)
let fontCache: { normal: string; bold: string } | null = null;

async function ensureTurkishFonts(doc: jsPDF): Promise<boolean> {
  if (!fontCache && typeof fetch !== "undefined") {
    try {
      const [resNormal, resBold] = await Promise.all([
        fetch("/fonts/arial.ttf"),
        fetch("/fonts/arialbd.ttf"),
      ]);
      if (resNormal.ok && resBold.ok) {
        const [bufNormal, bufBold] = await Promise.all([
          resNormal.arrayBuffer(),
          resBold.arrayBuffer(),
        ]);

        const toBinary = (buffer: ArrayBuffer) => {
          let binary = "";
          const bytes = new Uint8Array(buffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return binary;
        };

        fontCache = {
          normal: toBinary(bufNormal),
          bold: toBinary(bufBold),
        };
      }
    } catch (e) {
      console.warn("Could not load Turkish fonts", e);
    }
  }

  if (fontCache) {
    try {
      doc.addFileToVFS("Arial.ttf", fontCache.normal);
      doc.addFont("Arial.ttf", "Arial", "normal");
      doc.addFileToVFS("Arial-Bold.ttf", fontCache.bold);
      doc.addFont("Arial-Bold.ttf", "Arial", "bold");
      return true;
    } catch (e) {
      console.warn("Could not register fonts in jsPDF", e);
    }
  }
  return false;
}

// Kurumsal Renk Paleti (ETK Corporate Colors)
export const CORPORATE_COLORS = {
  primaryGreen: [80, 130, 52] as [number, number, number],   // #508234 (Fiber)
  tintGreen: [211, 223, 202] as [number, number, number],     // #D3DFCA
  primaryBlue: [0, 132, 182] as [number, number, number],     // #0084B6 (Bakır / Data / Kontrol)
  tintBlue: [225, 240, 248] as [number, number, number],      // #E1F0F8
  white: [255, 255, 255] as [number, number, number],
  darkText: [15, 23, 42] as [number, number, number],         // #0F172A
  mutedText: [100, 116, 139] as [number, number, number],    // #64748B
  boxBg: [11, 15, 25] as [number, number, number],           // #0B0F19
  boxBorder: [226, 232, 240] as [number, number, number],    // #E2E8F0
};

// Resim Yükleme Yardımcısı
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Yardımcı Fonksiyon: Kullanıcı Tarafından Eklenen Özel Tabloyu PDF'e Çiz
function renderDynamicTableToPdf(
  doc: jsPDF,
  tableInst: SectionTableInstance,
  defaultTitle: string,
  startY: number,
  primaryColor: [number, number, number],
  tintColor: [number, number, number],
  margin: number,
  isTr: boolean,
  mainFont: string = "Arial",
  headerTextColor: [number, number, number] = CORPORATE_COLORS.white
): number {
  const rawRows = tableInst.data || [];
  const activeRows = rawRows.filter((r: any) => r.include !== false && r.dahil !== false);
  if (activeRows.length === 0) return startY;

  let cols = (tableInst.columns || []).filter(
    (c: any) => c.key !== "id" && c.key !== "include" && c.key !== "dahil"
  );
  if (cols.length === 0 && activeRows.length > 0) {
    cols = Object.keys(activeRows[0])
      .filter((k) => k !== "id" && k !== "include" && k !== "dahil")
      .map((k) => ({ key: k, title: k, align: "center" as const }));
  }
  if (cols.length === 0) return startY;

  const tableTitle = tableInst.title || defaultTitle;
  const headLabels = cols.map((c, idx) => {
    const isBlank = idx === 0 && ((c as any).hideHeader || tableInst.blankCornerHeader || !c.title || !String(c.title).trim());
    if (isBlank) return "";
    return (c as any).title || (c as any).labelTr || c.key;
  });

  const columnStyles: Record<number, any> = {};
  cols.forEach((c, idx) => {
    const isFirstColBlank = idx === 0 && ((c as any).hideHeader || tableInst.blankCornerHeader || !c.title || !String(c.title).trim());
    const isLabel = c.role === "label" || isFirstColBlank;
    columnStyles[idx] = {
      halign: c.align || (idx === 0 ? "left" : "center"),
      fontStyle: isLabel || idx === 0 ? "bold" : "normal",
    };
  });

  // 1. Başlık Katmanları (Head Rows)
  const headRows: any[] = [
    [
      {
        content: tableTitle,
        colSpan: cols.length,
        styles: {
          fillColor: primaryColor,
          textColor: headerTextColor,
          fontStyle: "bold",
          halign: "left",
          fontSize: 7.2,
          cellPadding: 1.3,
        },
      },
    ],
  ];

  // Çatı Başlık (Super Header) varsa ekle
  if (tableInst.superHeaderTitle) {
    if (tableInst.superHeaderStartCol && tableInst.superHeaderColSpan) {
      const startIdx = cols.findIndex((c: any) => c.key === tableInst.superHeaderStartCol);
      if (startIdx !== -1) {
        const colSpan = Math.max(1, Math.min(tableInst.superHeaderColSpan, cols.length - startIdx));
        const preSpan = startIdx;
        const postSpan = cols.length - (startIdx + colSpan);

        const superHeaderRow: any[] = [];
        if (preSpan > 0) {
          superHeaderRow.push({
            content: "",
            colSpan: preSpan,
            styles: {
              fillColor: CORPORATE_COLORS.white,
              lineWidth: 0.2,
              lineColor: CORPORATE_COLORS.white,
            },
          });
        }
        superHeaderRow.push({
          content: tableInst.superHeaderTitle,
          colSpan: colSpan,
          styles: {
            fillColor: primaryColor,
            textColor: headerTextColor,
            fontStyle: "bold",
            halign: "center",
            fontSize: 6.8,
            cellPadding: 1.2,
          },
        });
        if (postSpan > 0) {
          superHeaderRow.push({
            content: "",
            colSpan: postSpan,
            styles: {
              fillColor: CORPORATE_COLORS.white,
              lineWidth: 0.2,
              lineColor: CORPORATE_COLORS.white,
            },
          });
        }
        headRows.push(superHeaderRow);
      } else {
        // Fallback: İlk sütun hariç kalanları kapla
        const hasLabelCol = cols[0]?.role === "label";
        if (hasLabelCol) {
          headRows.push([
            {
              content: "",
              colSpan: 1,
              styles: {
                fillColor: CORPORATE_COLORS.white,
                lineWidth: 0.2,
                lineColor: CORPORATE_COLORS.white,
              },
            },
            {
              content: tableInst.superHeaderTitle,
              colSpan: cols.length - 1,
              styles: {
                fillColor: primaryColor,
                textColor: headerTextColor,
                fontStyle: "bold",
                halign: "center",
                fontSize: 6.8,
                cellPadding: 1.2,
              },
            },
          ]);
        } else {
          headRows.push([
            {
              content: tableInst.superHeaderTitle,
              colSpan: cols.length,
              styles: {
                fillColor: primaryColor,
                textColor: headerTextColor,
                fontStyle: "bold",
                halign: "center",
                fontSize: 6.8,
                cellPadding: 1.2,
              },
            },
          ]);
        }
      }
    } else {
      const hasLabelCol = cols[0]?.role === "label";
      if (hasLabelCol) {
        headRows.push([
          {
            content: "",
            colSpan: 1,
            styles: {
              fillColor: CORPORATE_COLORS.white,
              lineWidth: 0.2,
              lineColor: CORPORATE_COLORS.white,
            },
          },
          {
            content: tableInst.superHeaderTitle,
            colSpan: cols.length - 1,
            styles: {
              fillColor: primaryColor,
              textColor: headerTextColor,
              fontStyle: "bold",
              halign: "center",
              fontSize: 6.8,
              cellPadding: 1.2,
            },
          },
        ]);
      } else {
        headRows.push([
          {
            content: tableInst.superHeaderTitle,
            colSpan: cols.length,
            styles: {
              fillColor: primaryColor,
              textColor: headerTextColor,
              fontStyle: "bold",
              halign: "center",
              fontSize: 6.8,
              cellPadding: 1.2,
            },
          },
        ]);
      }
    }
  }

  // Kolon Başlık Satırı (showHeaderRow !== false ise)
  if (tableInst.showHeaderRow !== false) {
    headRows.push(
      headLabels.map((h, idx) => {
        const isBlank = idx === 0 && (
          (cols[0] as any)?.hideHeader ||
          tableInst.blankCornerHeader ||
          !h ||
          !String(h).trim()
        );
        if (isBlank) {
          return {
            content: "",
            styles: {
              fillColor: CORPORATE_COLORS.white,
              lineColor: CORPORATE_COLORS.white,
              lineWidth: 0,
            },
          };
        }
        return {
          content: h,
          styles: {
            fillColor: primaryColor,
            textColor: headerTextColor,
            fontStyle: "bold",
            halign: columnStyles[idx]?.halign || "center",
            fontSize: 6.8,
            cellPadding: 1.2,
          },
        };
      })
    );
  }

  // 2. Tablo Gövdesi (Body Rows)
  const bodyRows: any[] = activeRows.map((row: any, rIdx: number) => {
    // Grup / Ara Başlık Satırı
    if (row.isGroupHeader) {
      const indentSpaces = row.indent ? "    " : "";
      const titleText = indentSpaces + (row.title || row[cols[0]?.key] || "");
      return [
        {
          content: titleText,
          colSpan: 1,
          styles: {
            fillColor: [226, 232, 240], // Soft slate grey #e2e8f0
            textColor: CORPORATE_COLORS.darkText,
            fontStyle: "bold",
            halign: "left",
            fontSize: 6.8,
            cellPadding: 1.2,
          },
        },
        ...cols.slice(1).map(() => ({
          content: "",
          styles: {
            fillColor: CORPORATE_COLORS.white,
            cellPadding: 1.2,
          },
        })),
      ];
    }

    // Normal Veri Satırı
    const striping = tableInst.stripingMode || (tableInst.layoutMode === "matrix" || tableInst.superHeaderTitle ? "filled_only" : "zebra");

    return cols.map((c, idx) => {
      const val = row[c.key];
      const hasValue = val !== undefined && val !== null && String(val).trim() !== "";
      const text = val !== undefined && val !== null ? String(val) : "";
      const isFirstColBlank = idx === 0 && ((c as any).hideHeader || tableInst.blankCornerHeader || !c.title || !String(c.title).trim());
      const isLabel = c.role === "label" || isFirstColBlank;

      let cellBg: any = CORPORATE_COLORS.white;
      let cellTextColor: any = CORPORATE_COLORS.darkText;
      if (isLabel) {
        cellBg = primaryColor;
        cellTextColor = headerTextColor;
      } else if (striping === "filled_only") {
        cellBg = hasValue ? [241, 245, 249] : CORPORATE_COLORS.white;
      } else if (striping === "zebra") {
        cellBg = rIdx % 2 === 0 ? CORPORATE_COLORS.white : tintColor;
      } else {
        cellBg = CORPORATE_COLORS.white;
      }

      return {
        content: text,
        styles: {
          halign: c.align || (idx === 0 && !c.align ? "left" : "center"),
          fillColor: cellBg,
          textColor: cellTextColor,
          fontStyle: isLabel ? "bold" : "normal",
        },
      };
    });
  });

  autoTable(doc, {
    startY,
    margin: { left: margin, right: margin, bottom: 18 },
    head: headRows,
    body: bodyRows,
    theme: "grid",
    styles: {
      font: mainFont,
      fontSize: 6.8,
      lineColor: CORPORATE_COLORS.white,
      lineWidth: 0.3,
      cellPadding: 1.3,
      textColor: CORPORATE_COLORS.darkText,
    },
    headStyles: {
      font: mainFont,
      fontStyle: "bold",
    },
    columnStyles,
  });

  return (doc as any).lastAutoTable.finalY + 2.5;
}

/**
 * Tablo satırından kullanıcı metnini akıllıca ayıklayan yardımcı.
 * Kolon anahtarı ne olursa olsun (alan_adi, col_1, tanim, vb.) doğru değeri döner.
 */
function extractRowTextValue(row: any): string {
  if (!row) return "";
  if (typeof row === "string") return row.trim();
  if (typeof row !== "object") return String(row).trim();

  // 1. Bilinen standart anahtarlar
  const priorityKeys = [
    "alan_adi",
    "kullanim_alani",
    "madde",
    "tanim",
    "aciklama",
    "deger",
    "parametre",
    "text",
    "value",
    "baslik",
  ];
  for (const k of priorityKeys) {
    if (typeof row[k] === "string" && row[k].trim()) return row[k].trim();
  }

  // 2. col_1, col_2, col_0 gibi özel sütun anahtarları
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith("col_") && typeof v === "string" && v.trim()) {
      return v.trim();
    }
  }

  // 3. Metadata harici ilk anlamlı metin alanı
  const metaKeys = new Set(["id", "sira", "include", "dahil", "key", "_id", "templateId", "instanceId"]);
  for (const [k, v] of Object.entries(row)) {
    if (!metaKeys.has(k) && typeof v === "string" && v.trim()) {
      return v.trim();
    }
  }
  return "";
}

/**
 * Kablo katman satırından Katman Adı ve Tanımını akıllıca ayıklayan yardımcı.
 */
function extractLayerRow(row: any, idx: number): { label: string; desc: string } {
  if (!row) return { label: `Katman ${idx + 1}`, desc: "" };
  if (typeof row === "string") return { label: `Katman ${idx + 1}`, desc: row };

  let label = row.katman_adi || row.katman || row.label || row.title || "";
  let desc = row.tanim || row.aciklama || row.desc || row.description || row.deger || "";

  if (!label || !desc) {
    const stringEntries = Object.entries(row).filter(
      ([k, v]) => !["id", "sira", "include", "dahil", "order"].includes(k) && typeof v === "string" && (v as string).trim()
    );
    if (!label && stringEntries.length >= 1) {
      label = stringEntries[0][1] as string;
    }
    if (!desc && stringEntries.length >= 2) {
      desc = stringEntries[1][1] as string;
    }
  }

  return {
    label: label || `Katman ${idx + 1}`,
    desc: desc,
  };
}

export async function generateTdsPdf(
  data: CableData | any,
  activeVariationsList?: CableVariation[],
  lang: "tr" | "en" = "tr",
  puzzleSections?: PuzzleSectionConfig[],
  sectionTables?: Record<string, SectionTableInstance[]>
): Promise<void> {
  const familyColors = getFamilyColor(data.family_key, data.kategori);
  const isFiber = data.family_key === "fiber_optik";
  const primaryColor = familyColors.primaryRgb;
  const tintColor = familyColors.tintRgb;
  const headerTextColor = familyColors.headerTextRgb;

  // A4 Portrait Vektörel Belge (210 mm x 297 mm)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const hasArial = await ensureTurkishFonts(doc);
  const mainFont = hasArial ? "Arial" : "helvetica";
  doc.setFont(mainFont, "normal");

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186 mm
  let currentY = margin;

  const isTr = lang === "tr";

  // Sayfa 2 varyasyon verilerini hazırla (Tablo Şema Mantığı)
  const isVariationsActive = isFiber || (puzzleSections || []).find((s) => s.id === "varyasyonlar")?.enabled !== false;
  const variationTables = sectionTables?.["varyasyonlar"] || [];
  const legacyVariations = (activeVariationsList || data.varyasyonlar || []).filter(
    (v: CableVariation) => v.include !== false && (v as any).dahil !== false
  );
  const hasVariationData = isVariationsActive && (
    sectionTables
      ? variationTables.some((t) => (t.data || []).some((r: any) => r.include !== false && r.dahil !== false))
      : (variationTables.some((t) => (t.data || []).some((r: any) => r.include !== false && r.dahil !== false)) || legacyVariations.length > 0)
  );
  const totalPages = hasVariationData ? 2 : 1;

  // =========================================================================
  // SAYFA 1: ANTET VE KURUMSAL BAŞLIK
  // =========================================================================

  // 1. Üst Başlık & Logo & Kurumsal Aksan Çizgisi
  const logoW = 25;
  const logoH = 9;
  let lineStartX = margin + logoW + 3;

  try {
    doc.addImage(ETK_LOGO_BASE64, "PNG", margin, currentY - 2.5, logoW, logoH);
  } catch (_) {
    doc.setFontSize(15);
    doc.setFont(mainFont, "bold");
    doc.setTextColor(...primaryColor);
    doc.text("ETK KABLO", margin, currentY + 3.8);
    const textW = doc.getTextWidth("ETK KABLO");
    lineStartX = margin + textW + 3;
  }

  // Aksan Çizgisi
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.8);
  doc.line(lineStartX, currentY + 2.6, pageWidth - margin - 36, currentY + 2.6);

  // RoHS / REACH / CE Rozetleri (Sağ Üst)
  doc.setFontSize(7.2);
  doc.setFont(mainFont, "bold");
  doc.setTextColor(...CORPORATE_COLORS.mutedText);
  doc.text("RoHS   REACH   CE", pageWidth - margin - 32, currentY + 2.8);
  // CE kutucuğu
  doc.setDrawColor(...CORPORATE_COLORS.mutedText);
  doc.setLineWidth(0.2);
  doc.rect(pageWidth - margin - 8, currentY + 0.5, 7.5, 3.2, "S");

  currentY += 8.5;

  // Kategori Başlığı
  doc.setFontSize(9.5);
  doc.setFont(mainFont, "bold");
  doc.setTextColor(71, 85, 105);
  doc.text((data.kategori || (isFiber ? "Fiber Optik Kablolar" : "Kablo Grubu")).toUpperCase(), margin, currentY);
  currentY += 4.5;

  // Ürün Kodu / Modeli
  doc.setFontSize(13.5);
  doc.setFont(mainFont, "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(data.urun_kodu || "ETK CABLE", margin, currentY);
  currentY += 4.8;

  // Standart Kodu
  if (data.standart_kodu && data.standart_kodu.trim() !== "-") {
    doc.setFontSize(8.5);
    doc.setFont(mainFont, "bold");
    doc.setTextColor(51, 65, 85);
    doc.text(data.standart_kodu, margin, currentY);
    currentY += 4.0;
  }

  // Ürün Açıklaması
  if (data.urun_aciklamasi && data.urun_aciklamasi.trim() !== "-") {
    doc.setFontSize(7.5);
    doc.setFont(mainFont, "normal");
    doc.setTextColor(71, 85, 105);
    const descLines = doc.splitTextToSize(data.urun_aciklamasi, contentWidth);
    doc.text(descLines, margin, currentY);
    currentY += descLines.length * 3.4 + 2.5;
  } else {
    currentY += 1.5;
  }

  // =========================================================================
  // GÖRSELLER BÖLÜMÜ (3D RENDER & KESİT GÖRSELİ)
  // Canlı önizlemedeki 2 eşit karanlık kutu
  // =========================================================================
  const imageBoxW = (contentWidth - 5) / 2; // 90.5 mm
  const imageBoxH = 23; // 23 mm
  const sideRenderSrc = isFiber ? "/assets/fiber_side_render.jpeg" : "/assets/copper_side_render.jpeg";
  const crossSectionSrc = isFiber ? "/assets/fiber_cross_section.jpeg" : "/assets/copper_cross_section.jpeg";

  try {
    const [renderImg, crossImg] = await Promise.all([
      loadImage(sideRenderSrc),
      loadImage(crossSectionSrc),
    ]);

    // Sol Kutu: Render
    doc.setFillColor(...CORPORATE_COLORS.boxBg);
    doc.roundedRect(margin, currentY, imageBoxW, imageBoxH, 1, 1, "F");
    doc.setDrawColor(...CORPORATE_COLORS.boxBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, currentY, imageBoxW, imageBoxH, 1, 1, "S");

    if (renderImg) {
      const maxW = imageBoxW - 4;
      const maxH = imageBoxH - 4;
      const scale = Math.min(maxW / renderImg.width, maxH / renderImg.height);
      const drawW = renderImg.width * scale;
      const drawH = renderImg.height * scale;
      const drawX = margin + (imageBoxW - drawW) / 2;
      const drawY = currentY + (imageBoxH - drawH) / 2;
      doc.addImage(renderImg, "JPEG", drawX, drawY, drawW, drawH);
    }

    // Sağ Kutu: Kesit
    const rightBoxX = margin + imageBoxW + 5;
    doc.setFillColor(...CORPORATE_COLORS.boxBg);
    doc.roundedRect(rightBoxX, currentY, imageBoxW, imageBoxH, 1, 1, "F");
    doc.setDrawColor(...CORPORATE_COLORS.boxBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(rightBoxX, currentY, imageBoxW, imageBoxH, 1, 1, "S");

    if (crossImg) {
      const maxW = imageBoxW - 4;
      const maxH = imageBoxH - 4;
      const scale = Math.min(maxW / crossImg.width, maxH / crossImg.height);
      const drawW = crossImg.width * scale;
      const drawH = crossImg.height * scale;
      const drawX = rightBoxX + (imageBoxW - drawW) / 2;
      const drawY = currentY + (imageBoxH - drawH) / 2;
      doc.addImage(crossImg, "JPEG", drawX, drawY, drawW, drawH);
    }
  } catch (err) {
    // Resim yüklenemezse arka plan kutularını çiz
    doc.setFillColor(...CORPORATE_COLORS.boxBg);
    doc.roundedRect(margin, currentY, imageBoxW, imageBoxH, 1, 1, "F");
    doc.roundedRect(margin + imageBoxW + 5, currentY, imageBoxW, imageBoxH, 1, 1, "F");
  }

  currentY += imageBoxH + 3.0;

  // =========================================================================
  // SABİT TEMEL BÖLÜMLER (YAN YANA): KULLANIM ALANLARI & KABLO KATMAN YAPISI
  // Her kablo ailesinde (Fiber ve Bakır) canlı önizleme ile birebir 2 sütun
  // =========================================================================
  const usageList: string[] = (data.kullanim_alanlari || []).map(extractRowTextValue).filter(Boolean);
  const constructionList: any[] = (data.kablo_yapisi || []).map(extractLayerRow).filter((item) => item.label || item.desc);

  if (usageList.length > 0 || constructionList.length > 0) {
    const hasBoth = usageList.length > 0 && constructionList.length > 0;
    const colGap = hasBoth ? 5 : 0;
    const colWidth = hasBoth ? (contentWidth - colGap) / 2 : contentWidth;
    const bannerHeight = 4.5;
    const startSectionY = currentY;

    // Sol Başlık Bandı: Kullanım Alanları
    if (usageList.length > 0) {
      doc.setFillColor(...primaryColor);
      doc.rect(margin, startSectionY, colWidth, bannerHeight, "F");
      doc.setFontSize(7.8);
      doc.setFont(mainFont, "bold");
      doc.setTextColor(...headerTextColor);
      doc.text(isTr ? "Kullanım Alanları" : "Applications", margin + 2.5, startSectionY + 3.2);

      doc.setFontSize(6.0);
      doc.setFont(mainFont, "normal");
      doc.text(isTr ? "ORTAK BÖLÜM" : "COMMON SECTION", margin + colWidth - 2.5, startSectionY + 3.2, { align: "right" });
    }

    // Sağ Başlık Bandı: Kablo Yapısı
    if (constructionList.length > 0) {
      const rightColX = hasBoth ? margin + colWidth + colGap : margin;
      doc.setFillColor(...primaryColor);
      doc.rect(rightColX, startSectionY, colWidth, bannerHeight, "F");
      doc.setFontSize(7.8);
      doc.setFont(mainFont, "bold");
      doc.setTextColor(...headerTextColor);
      doc.text(isTr ? "Kablo Yapısı" : "Cable Construction", rightColX + 2.5, startSectionY + 3.2);

      doc.setFontSize(6.0);
      doc.setFont(mainFont, "normal");
      doc.text(isTr ? "ORTAK BÖLÜM" : "COMMON SECTION", rightColX + colWidth - 2.5, startSectionY + 3.2, { align: "right" });
    }

    currentY += bannerHeight + 1.8;

    // Sol Kolon: Madde İşaretli Liste
    let leftY = currentY;
    if (usageList.length > 0) {
      doc.setFontSize(7.0);
      doc.setTextColor(...CORPORATE_COLORS.darkText);
      usageList.forEach((item: string) => {
        doc.setFont(mainFont, "bold");
        doc.text("•", margin + 1.5, leftY);
        doc.setFont(mainFont, "normal");
        const lines = doc.splitTextToSize(item, colWidth - 6);
        doc.text(lines, margin + 4.5, leftY);
        leftY += lines.length * 3.1;
      });
    }

    // Sağ Kolon: Numaralı Katman Listesi
    let rightY = currentY;
    if (constructionList.length > 0) {
      const rightColX = hasBoth ? margin + colWidth + colGap : margin;
      doc.setFontSize(7.0);
      doc.setTextColor(...CORPORATE_COLORS.darkText);
      constructionList.forEach((layer: any, idx: number) => {
        const layerTitle = layer.label || (typeof layer === "string" ? layer : `Katman ${idx + 1}`);
        const layerDesc = layer.desc ? `: ${layer.desc}` : "";
        const fullText = `${idx + 1}. ${layerTitle}${layerDesc}`;
        const lines = doc.splitTextToSize(fullText, colWidth - 3);
        doc.setFont(mainFont, "normal");
        doc.text(lines, rightColX + 1.5, rightY);
        rightY += lines.length * 3.1;
      });
    }

    currentY = Math.max(usageList.length > 0 ? leftY : currentY, constructionList.length > 0 ? rightY : currentY) + 2.5;
  }

  // =========================================================================
  // DİNAMİK BÖLÜMLER (TEKNİK / ELEKTRİKSEL / MEKANİK / STANDARTLAR)
  // Canlı önizleme ile tam uyumlu resmi ETK şablonları
  // =========================================================================
  const mechTests = data.mekanik_testler || [];
  const env = data.uygulama_cevre || {};
  const stds = data.standartlar || [];
  const techSpecs = data.teknik_ozellikler || data.elektriksel_ozellikler || [];
  const elecSpecs = data.elektriksel_ozellikler || [];

  if (sectionTables) {
    // =======================================================================
    // TABLO ANAHTAR ŞEMA MİMARİSİ:
    // Tablo şablonu tanımlanmadıysa veya tablosu silindiyse bölüm PDF'te
    // KESİNLİKLE GÖZÜKMEZ! (Sistem nereye yerleşeceğini bilemez mantığı)
    // Tablo şablonu tanımlandıysa, doğrudan tablonun o anki aktif sütunları basılır.
    // Kullanıcı tabloda bir sütunu sildiyse PDF çıktısına ASLA yansımaz.
    // =======================================================================
    const activePuzzle = (puzzleSections || getDefaultPuzzleSections(data.family_key, data.varsayilan_bolumler))
      .filter((s) => s.enabled && s.id !== "varyasyonlar" && s.id !== "kullanim_alanlari" && s.id !== "kablo_yapisi")
      .sort((a, b) => a.order - b.order);

    for (const sec of activePuzzle) {
      const secTables = sectionTables[sec.id] || [];
      if (secTables.length === 0) continue; // Tablo şablonu tanımlı değilse basılmaz

      for (const inst of secTables) {
        currentY = renderDynamicTableToPdf(
          doc,
          inst,
          isTr ? sec.title_tr : sec.title_en,
          currentY,
          primaryColor,
          tintColor,
          margin,
          isTr,
          mainFont
        );
      }
    }
  } else if (isFiber) {
    // -----------------------------------------------------------------------
    // DURUM 1: FIBER OPTİK
    // -----------------------------------------------------------------------
    // 1. IEC 60794 Mekanik Testler Tablosu
    if (mechTests.length > 0) {
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin, bottom: 18 },
        head: [
          [
            {
              content: isTr ? "Mekanik ve Çevresel Özellikler (IEC 60794-1-2)" : "Mechanical & Environmental Specs (IEC 60794)",
              colSpan: 4,
              styles: {
                fillColor: primaryColor,
                textColor: CORPORATE_COLORS.white,
                fontStyle: "bold",
                halign: "left",
                fontSize: 7.5,
                cellPadding: 1.3,
              },
            },
          ],
          [
            { content: isTr ? "Test Standardı & Parametre" : "Parameter", styles: { halign: "left" } },
            { content: isTr ? "Test Standardı" : "Standard", styles: { halign: "center" } },
            { content: isTr ? "Şartname Değeri" : "Specification", styles: { halign: "center" } },
            { content: isTr ? "Kabul Kriteri" : "Criteria", styles: { halign: "center" } },
          ],
        ],
        body: mechTests.map((t: any) => [
          t.test_parametre || "-",
          t.test_standardi || "-",
          t.sartname_degeri || "-",
          t.kabul_kriteri || "-",
        ]),
        theme: "grid",
        styles: {
          font: mainFont,
          fontSize: 6.8,
          textColor: CORPORATE_COLORS.darkText,
          lineColor: CORPORATE_COLORS.white,
          lineWidth: 0.3,
          cellPadding: 1.2,
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: CORPORATE_COLORS.white,
          fontStyle: "bold",
          fontSize: 6.8,
        },
        columnStyles: {
          0: { halign: "left", fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold", cellWidth: 52 },
          1: { halign: "center", fillColor: tintColor, cellWidth: 40 },
          2: { halign: "center", fillColor: tintColor, cellWidth: 46 },
          3: { halign: "center", fillColor: tintColor, cellWidth: 48 },
        },
      });
      currentY = (doc as any).lastAutoTable.finalY + 2.5;
    }

    // 2. Asimetrik Sıcaklık ve Bükülme Tablosu
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 18 },
      head: [
        [
          {
            content: isTr ? "Bükülme ve Sıcaklık Parametreleri" : "Bending & Temperature Parameters",
            colSpan: 6,
            styles: {
              fillColor: primaryColor,
              textColor: CORPORATE_COLORS.white,
              fontStyle: "bold",
              halign: "left",
              fontSize: 7.5,
              cellPadding: 1.3,
            },
          },
        ],
        [
          { content: isTr ? "Minimum Bükme Yarıçapı" : "Bending Radius", colSpan: 2, styles: { halign: "center" } },
          { content: isTr ? "Sıcaklık Aralığı" : "Temperature Range", colSpan: 4, styles: { halign: "center" } },
        ],
      ],
      body: [
        [
          { content: isTr ? "Hareketli" : "Flexible", styles: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold" } },
          { content: env.bukme_yaricapi_hareketli || "15 x D", styles: { halign: "center", fillColor: tintColor } },
          { content: isTr ? "Depolama" : "Storage", styles: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold" } },
          { content: env.depolama_sicakligi || "-40°C ~ +70°C", styles: { halign: "center", fillColor: tintColor } },
          { content: isTr ? "Kurulum" : "Installation", styles: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold" } },
          { content: env.kurulum_sicakligi || "-10°C ~ +60°C", styles: { halign: "center", fillColor: tintColor } },
        ],
        [
          { content: isTr ? "Sabit" : "Fixed", styles: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold" } },
          { content: env.bukme_yaricapi_sabit || "10 x D", styles: { halign: "center", fillColor: tintColor } },
          { content: isTr ? "Taşıma" : "Transport", styles: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold" } },
          { content: env.tasima_sicakligi || "-40°C ~ +70°C", styles: { halign: "center", fillColor: tintColor } },
          { content: isTr ? "Çalışma" : "Operating", styles: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold" } },
          { content: env.calisma_sicakligi || "-30°C ~ +70°C", styles: { halign: "center", fillColor: tintColor } },
        ],
      ],
      theme: "grid",
      styles: { font: mainFont, fontSize: 6.8, lineColor: CORPORATE_COLORS.white, lineWidth: 0.3, cellPadding: 1.2 },
      headStyles: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold", fontSize: 6.8 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 2.5;

    // 3. Test Standartları Rozet Şeridi
    if (stds.length > 0) {
      const displayStds = stds.slice(0, 6);
      const stdHeaders = displayStds.map((s: any) => s.test_adi);
      const stdValues = displayStds.map((s: any) => s.standart_kodu);
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin, bottom: 18 },
        head: [
          [
            {
              content: isTr ? "Standartlar ve Uygunluk" : "Standards & Compliance",
              colSpan: stdHeaders.length,
              styles: {
                fillColor: primaryColor,
                textColor: CORPORATE_COLORS.white,
                fontStyle: "bold",
                halign: "left",
                fontSize: 7.5,
                cellPadding: 1.3,
              },
            },
          ],
          stdHeaders.map((h: string) => ({
            content: h,
            styles: { halign: "center", fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold", fontSize: 6.8, cellPadding: 1.2 },
          })),
        ],
        body: [stdValues],
        theme: "grid",
        styles: { font: mainFont, fontSize: 6.8, halign: "center", lineColor: CORPORATE_COLORS.white, lineWidth: 0.3, cellPadding: 1.2 },
        bodyStyles: { fillColor: tintColor, textColor: CORPORATE_COLORS.darkText },
      });
      currentY = (doc as any).lastAutoTable.finalY + 2.5;
    }
  } else {
    // -----------------------------------------------------------------------
    // DURUM 2: BAKIR / HABERLEŞME / KONTROL / DATA
    // -----------------------------------------------------------------------
    const activePuzzle = (puzzleSections || getDefaultPuzzleSections(data.family_key, data.varsayilan_bolumler))
      .filter((s) => s.enabled && s.id !== "varyasyonlar" && s.id !== "kullanim_alanlari" && s.id !== "kablo_yapisi")
      .sort((a, b) => a.order - b.order);

    for (const sec of activePuzzle) {
      // Eğer kullanıcı bu bölüme ekstra/özel tablo eklediyse onu dinamik bas
      const customTables = sectionTables?.[sec.id] || [];
      const hasCustomTable = customTables.length > 0 && customTables[0].data && customTables[0].data.length > 0;

      if (sec.id === "elektriksel_ozellikler") {
        if (hasCustomTable && customTables[0].columns.length > 3) {
          for (const inst of customTables) {
            currentY = renderDynamicTableToPdf(doc, inst, isTr ? sec.title_tr : sec.title_en, currentY, primaryColor, tintColor, margin, isTr, mainFont, headerTextColor);
          }
        } else {
          // Canlı Önizleme ile Birebir: Elektriksel Parametreler (20°C) Tablosu
          const e = elecSpecs[0] || {};
          autoTable(doc, {
            startY: currentY,
            margin: { left: margin, right: margin, bottom: 18 },
            head: [
              [
                {
                  content: isTr ? "Elektriksel Özellikler (20°C)" : "Electrical Specifications (at 20°C)",
                  colSpan: 4,
                  styles: {
                    fillColor: primaryColor,
                    textColor: CORPORATE_COLORS.white,
                    fontStyle: "bold",
                    halign: "left",
                    fontSize: 7.5,
                    cellPadding: 1.3,
                  },
                },
              ],
            ],
            body: [
              [
                isTr ? "İletken DC Direnci" : "Conductor Resistance",
                e.iletken_direnci_ohm_km ? `${e.iletken_direnci_ohm_km} Ω/km` : "Max. 94 Ω/km",
                isTr ? "İzolasyon Direnci" : "Insulation Resistance",
                e.izolasyon_direnci_mohm_km ? `${e.izolasyon_direnci_mohm_km} MΩ·km` : "Min. 5000 MΩ·km",
              ],
              [
                isTr ? "Karakteristik Empedans" : "Characteristic Impedance",
                e.karakteristik_empedans_ohm || "100 ± 5 Ω",
                isTr ? "Yayılma Hızı (NVP)" : "Velocity of Propagation",
                e.yayilma_hizi || "%67-69",
              ],
              [
                isTr ? "Karşılıklı Kapasitans" : "Mutual Capacitance",
                e.efektif_kapasite_nf_m ? `${e.efektif_kapasite_nf_m} nF/km` : "Max. 56 nF/km",
                isTr ? "Test Gerilimi" : "Test Voltage",
                e.test_voltaji_v ? `${e.test_voltaji_v} V` : "1000 V",
              ],
            ],
            theme: "grid",
            styles: { fontSize: 6.8, lineColor: CORPORATE_COLORS.white, lineWidth: 0.3, cellPadding: 1.2 },
            columnStyles: {
              0: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold", cellWidth: 46 },
              1: { fillColor: tintColor, textColor: CORPORATE_COLORS.darkText, halign: "center", cellWidth: 47 },
              2: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold", cellWidth: 46 },
              3: { fillColor: tintColor, textColor: CORPORATE_COLORS.darkText, halign: "center", cellWidth: 47 },
            },
          });
          currentY = (doc as any).lastAutoTable.finalY + 2.5;
        }
      } else if (sec.id === "teknik_ozellikler") {
        if (hasCustomTable && customTables[0].columns.length > 0) {
          for (const inst of customTables) {
            currentY = renderDynamicTableToPdf(doc, inst, isTr ? sec.title_tr : sec.title_en, currentY, primaryColor, tintColor, margin, isTr, mainFont, headerTextColor);
          }
        } else if (techSpecs.length > 0) {
          const displaySpecs = techSpecs.slice(0, 6);
          autoTable(doc, {
            startY: currentY,
            margin: { left: margin, right: margin, bottom: 18 },
            head: [
              [
                {
                  content: isTr ? "Teknik Özellikler" : "Technical Specifications",
                  colSpan: 5,
                  styles: {
                    fillColor: primaryColor,
                    textColor: CORPORATE_COLORS.white,
                    fontStyle: "bold",
                    halign: "left",
                    fontSize: 7.5,
                    cellPadding: 1.3,
                  },
                },
              ],
              [
                isTr ? "Kesit / Çap" : "Cross Section",
                isTr ? "İletken Direnci (Ω/km)" : "Conductor Res.",
                isTr ? "İzolasyon Direnci (MΩ·km)" : "Insulation Res.",
                isTr ? "Çalışma Voltajı (V)" : "Operating Volt.",
                isTr ? "Test Voltajı (V)" : "Test Voltage",
              ],
            ],
            body: displaySpecs.map((s: any, i: number) => [
              s.kesit_veya_cap || s.kesit || (i === 0 ? "Standart" : "-"),
              s.iletken_direnci_ohm_km || "-",
              s.izolasyon_direnci_mohm_km || "-",
              s.calisma_voltaji_v || "-",
              s.test_voltaji_v || "-",
            ]),
            theme: "grid",
            styles: { fontSize: 6.8, halign: "center", lineColor: CORPORATE_COLORS.white, lineWidth: 0.3, cellPadding: 1.2 },
            headStyles: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold" },
            alternateRowStyles: { fillColor: tintColor },
          });
          currentY = (doc as any).lastAutoTable.finalY + 2.5;
        }
      } else if (sec.id === "mekanik_ozellikler") {
        if (hasCustomTable && customTables[0].columns.length > 0) {
          for (const inst of customTables) {
            currentY = renderDynamicTableToPdf(doc, inst, isTr ? sec.title_tr : sec.title_en, currentY, primaryColor, tintColor, margin, isTr, mainFont, headerTextColor);
          }
        } else {
          // Canlı Önizleme ile Birebir: Minimum Bükme Yarıçapı & Sıcaklık Aralığı Asimetrik Tablosu
          autoTable(doc, {
            startY: currentY,
            margin: { left: margin, right: margin, bottom: 18 },
            head: [
              [
                {
                  content: isTr ? "Mekanik ve Çevresel Özellikler" : "Mechanical & Environmental Specs",
                  colSpan: 6,
                  styles: {
                    fillColor: primaryColor,
                    textColor: CORPORATE_COLORS.white,
                    fontStyle: "bold",
                    halign: "left",
                    fontSize: 7.5,
                    cellPadding: 1.3,
                  },
                },
              ],
              [
                { content: isTr ? "Minimum Bükme Yarıçapı" : "Bending Radius", colSpan: 2, styles: { halign: "center" } },
                { content: isTr ? "Sıcaklık Aralığı" : "Temperature Range", colSpan: 4, styles: { halign: "center" } },
              ],
            ],
            body: [
              [
                { content: isTr ? "Hareketli" : "Flexible", styles: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold" } },
                { content: env.bukme_yaricapi_hareketli || "15 x D", styles: { halign: "center", fillColor: tintColor } },
                { content: isTr ? "Depolama" : "Storage", styles: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold" } },
                { content: env.depolama_sicakligi || "-40°C ~ +70°C", styles: { halign: "center", fillColor: tintColor } },
                { content: isTr ? "Kurulum" : "Installation", styles: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold" } },
                { content: env.kurulum_sicakligi || "-10°C ~ +60°C", styles: { halign: "center", fillColor: tintColor } },
              ],
              [
                { content: isTr ? "Sabit" : "Fixed", styles: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold" } },
                { content: env.bukme_yaricapi_sabit || "10 x D", styles: { halign: "center", fillColor: tintColor } },
                { content: isTr ? "Taşıma" : "Transport", styles: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold" } },
                { content: env.tasima_sicakligi || "-40°C ~ +70°C", styles: { halign: "center", fillColor: tintColor } },
                { content: isTr ? "Çalışma" : "Operating", styles: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold" } },
                { content: env.calisma_sicakligi || "-30°C ~ +70°C", styles: { halign: "center", fillColor: tintColor } },
              ],
            ],
            theme: "grid",
            styles: { fontSize: 6.8, lineColor: CORPORATE_COLORS.white, lineWidth: 0.3, cellPadding: 1.2 },
            headStyles: { fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold", fontSize: 6.8 },
          });
          currentY = (doc as any).lastAutoTable.finalY + 2.5;
        }
      } else if (sec.id === "standartlar") {
        if (hasCustomTable && customTables[0].columns.length > 0) {
          for (const inst of customTables) {
            currentY = renderDynamicTableToPdf(doc, inst, isTr ? sec.title_tr : sec.title_en, currentY, primaryColor, tintColor, margin, isTr, mainFont, headerTextColor);
          }
        } else if (stds.length > 0) {
          // Canlı Önizleme ile Birebir: Standartlar Rozet Şeridi
          const displayStds = stds.slice(0, 6);
          const stdHeaders = displayStds.map((s: any) => s.test_adi);
          const stdValues = displayStds.map((s: any) => s.standart_kodu);
          autoTable(doc, {
            startY: currentY,
            margin: { left: margin, right: margin, bottom: 18 },
            head: [
              [
                {
                  content: isTr ? "Standartlar ve Uygunluk" : "Standards & Compliance",
                  colSpan: stdHeaders.length,
                  styles: {
                    fillColor: primaryColor,
                    textColor: CORPORATE_COLORS.white,
                    fontStyle: "bold",
                    halign: "left",
                    fontSize: 7.5,
                    cellPadding: 1.3,
                  },
                },
              ],
              stdHeaders.map((h: string) => ({
                content: h,
                styles: { halign: "center", fillColor: primaryColor, textColor: CORPORATE_COLORS.white, fontStyle: "bold", fontSize: 6.8, cellPadding: 1.2 },
              })),
            ],
            body: [stdValues],
            theme: "grid",
            styles: { fontSize: 6.8, halign: "center", lineColor: CORPORATE_COLORS.white, lineWidth: 0.3, cellPadding: 1.2 },
            bodyStyles: { fillColor: tintColor, textColor: CORPORATE_COLORS.darkText },
          });
          currentY = (doc as any).lastAutoTable.finalY + 2.5;
        }
      } else if (hasCustomTable) {
        for (const inst of customTables) {
          currentY = renderDynamicTableToPdf(doc, inst, isTr ? sec.title_tr : sec.title_en, currentY, primaryColor, tintColor, margin, isTr, mainFont, headerTextColor);
        }
      }
    }
  }

  // =========================================================================
  // SAYFA 1 ALTLIK (FOOTER)
  // Canlı önizleme ile birebir: Sol alt B248 rozeti, sağ alt Sayfa 1 / X
  // =========================================================================
  doc.setPage(1);
  const badgeWidth = 14;
  const badgeHeight = 4.5;
  doc.setFillColor(...primaryColor);
  doc.rect(margin, pageHeight - margin - badgeHeight, badgeWidth, badgeHeight, "F");
  doc.setFontSize(7.5);
  doc.setFont(mainFont, "bold");
  doc.setTextColor(...headerTextColor);
  doc.text(data.dokuman_kodu || "B248", margin + 2.5, pageHeight - margin - 1.2);

  doc.setFontSize(7.2);
  doc.setFont(mainFont, "normal");
  doc.setTextColor(...CORPORATE_COLORS.mutedText);
  doc.text(`${isTr ? "Sayfa" : "Page"} 1 / ${totalPages}`, pageWidth - margin, pageHeight - margin - 1.2, { align: "right" });

  // =========================================================================
  // SAYFA 2: VARYASYONLAR TABLOSU (BOYUTLAR VE AĞIRLIKLAR)
  // Canlı önizleme ile birebir tasarım ve sütun oranları
  // =========================================================================
  if (hasVariationData) {
    doc.addPage();
    let page2Y = margin;

    // Sayfa 2 Üst Bar & Logo
    const p2LogoW = 22;
    const p2LogoH = 8;
    const p2LogoX = pageWidth - margin - p2LogoW;

    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.8);
    doc.line(margin, page2Y + 2, p2LogoX - 3, page2Y + 2);

    try {
      doc.addImage(ETK_LOGO_BASE64, "PNG", p2LogoX, page2Y - 2.2, p2LogoW, p2LogoH);
    } catch (_) {
      doc.setFontSize(10.5);
      doc.setFont(mainFont, "bold");
      doc.setTextColor(...primaryColor);
      doc.text("ETK KABLO", p2LogoX, page2Y + 3);
    }
    page2Y += 6;

    // Ürün Başlık Bandı
    doc.setFillColor(...primaryColor);
    doc.rect(margin, page2Y, contentWidth, 5.5, "F");
    doc.setFontSize(9.5);
    doc.setTextColor(...headerTextColor);
    doc.text(data.urun_kodu || "ETK CABLE", margin + 4, page2Y + 3.9);
    page2Y += 7.5;

    if (sectionTables && variationTables.length > 0) {
      // TABLO ŞEMA MİMARİSİ: YALNIZCA KULLANICININ AKTİF SÜTUNLARI VE VERİLERİ BASILIR
      for (const varTable of variationTables) {
        const rawRows = varTable.data || [];
        const activeRows = rawRows.filter((r: any) => r.include !== false && r.dahil !== false);
        if (activeRows.length === 0) continue;

        // Silinen bir sütun varTable.columns içerisinde olmayacağı için PDF'e asla dahil edilmez!
        const cols = (varTable.columns || []).filter(
          (c: any) => c.key !== "id" && c.key !== "include" && c.key !== "dahil"
        );
        if (cols.length === 0) continue;

        const headLabels = cols.map((c: any) => c.title || c.key);
        const bodyRows = activeRows.map((row: any) =>
          cols.map((c) => {
            const val = row[c.key];
            return val !== undefined && val !== null && val !== "" ? String(val) : "-";
          })
        );

        const columnStyles: Record<number, any> = {};
        cols.forEach((c, idx) => {
          columnStyles[idx] = {
            halign: c.align || (idx === 0 ? "center" : "center"),
            fontStyle: idx === 0 ? "bold" : "normal",
          };
        });

        autoTable(doc, {
          startY: page2Y,
          margin: { left: margin, right: margin, bottom: 18 },
          head: [headLabels],
          body: bodyRows,
          theme: "grid",
          styles: {
            font: mainFont,
            fontSize: 7.0,
            halign: "center",
            lineColor: CORPORATE_COLORS.white,
            lineWidth: 0.3,
            cellPadding: 1.5,
            textColor: CORPORATE_COLORS.darkText,
          },
          headStyles: {
            fillColor: primaryColor,
            textColor: CORPORATE_COLORS.white,
            fontStyle: "bold",
            fontSize: 7.0,
          },
          alternateRowStyles: {
            fillColor: tintColor,
          },
          columnStyles,
        });

        page2Y = (doc as any).lastAutoTable.finalY + 4;
      }
    } else {
      // Legacy fallback
      const firstVarTable = variationTables[0];
      const isCustomVarColumns = firstVarTable && firstVarTable.columns && (
        firstVarTable.columns.some((c) => c.isCustom) ||
        (isFiber && firstVarTable.columns.length !== 6) ||
        (!isFiber && firstVarTable.columns.length !== 7)
      );

      if (isCustomVarColumns && firstVarTable) {
        renderDynamicTableToPdf(
          doc,
          firstVarTable,
          isTr ? "Boyutlar ve Varyasyonlar" : "Dimensions & Variations",
          page2Y,
          primaryColor,
          tintColor,
          margin,
          isTr,
          mainFont
        );
      } else {
        // Varyasyon Tablosu Sütunları (Fiber vs Bakır)
        const varHeaders = isFiber
          ? [
              isTr ? "Part Numarası" : "Part Number",
              isTr ? "Lif / Kesit" : "Fiber / Section",
              isTr ? "Fiber / Per" : "Cores / Pairs",
              isTr ? "Dış Çap (mm)" : "Diameter (mm)",
              isTr ? "Toplam Ağ. (kg/km)" : "Total Wt (kg/km)",
              isTr ? "Sevk Boyu (m)" : "Length (m)",
            ]
          : [
              isTr ? "Part Numarası" : "Part Number",
              isTr ? "Kesit / Damar" : "Section",
              isTr ? "Per / Damar" : "Pairs / Cores",
              isTr ? "Dış Çap (mm)" : "Diameter (mm)",
              isTr ? "Bakır Ağ. (kg/km)" : "Cu Wt (kg/km)",
              isTr ? "Toplam Ağ. (kg/km)" : "Total Wt (kg/km)",
              isTr ? "Sevk Boyu (m)" : "Length (m)",
            ];

        // Satır Verileri
        const rowsSource = legacyVariations.length > 0
          ? legacyVariations
          : (variationTables[0]?.data || []).filter((v: any) => v.include !== false && v.dahil !== false);

        const varRows = rowsSource.map((v: any) => {
          if (isFiber) {
            return [
              v.part_numarasi || "-",
              v.lif_cinsi || v.kesit || "-",
              v.fiber_sayisi || v.per_sayisi || "-",
              String(v.dis_cap_mm || "-"),
              String(v.toplam_agirlik_kg_km || "-"),
              v.sevk_boyu_m || "500/1000",
            ];
          } else {
            return [
              v.part_numarasi || "-",
              v.kesit || v.lif_cinsi || "-",
              v.per_sayisi || v.fiber_sayisi || "-",
              String(v.dis_cap_mm || "-"),
              v.bakir_agirligi_kg_km ? String(v.bakir_agirligi_kg_km) : "-",
              String(v.toplam_agirlik_kg_km || "-"),
              v.sevk_boyu_m || "500/1000",
            ];
          }
        });

        const columnStyles = isFiber
          ? {
              0: { halign: "center" as const, fontStyle: "bold" as const, cellWidth: 42 },
              1: { halign: "center" as const, cellWidth: 34 },
              2: { halign: "center" as const, cellWidth: 24 },
              3: { halign: "center" as const, cellWidth: 28 },
              4: { halign: "center" as const, cellWidth: 28 },
              5: { halign: "center" as const, cellWidth: 30 },
            }
          : {
              0: { halign: "center" as const, fontStyle: "bold" as const, cellWidth: 38 },
              1: { halign: "center" as const, cellWidth: 28 },
              2: { halign: "center" as const, cellWidth: 22 },
              3: { halign: "center" as const, cellWidth: 24 },
              4: { halign: "center" as const, cellWidth: 24 },
              5: { halign: "center" as const, cellWidth: 25 },
              6: { halign: "center" as const, cellWidth: 25 },
            };

        autoTable(doc, {
          startY: page2Y,
          margin: { left: margin, right: margin, bottom: 18 },
          head: [varHeaders],
          body: varRows,
          theme: "grid",
          styles: {
            fontSize: 7.0,
            halign: "center",
            lineColor: CORPORATE_COLORS.white,
            lineWidth: 0.3,
            cellPadding: 1.5,
            textColor: CORPORATE_COLORS.darkText,
          },
          headStyles: {
            fillColor: primaryColor,
            textColor: CORPORATE_COLORS.white,
            fontStyle: "bold",
            fontSize: 7.0,
          },
          alternateRowStyles: {
            fillColor: tintColor,
          },
          columnStyles,
        });
      }
    }

    // Sayfa 2 Altlık (Footer)
    const lastPage = doc.getNumberOfPages();
    doc.setPage(lastPage);

    // Sol: Sayfa 2 / 2
    doc.setFontSize(7.2);
    doc.setFont(mainFont, "normal");
    doc.setTextColor(...CORPORATE_COLORS.mutedText);
    doc.text(`${isTr ? "Sayfa" : "Page"} 2 / 2`, margin, pageHeight - margin - 1.2);

    // Sağ Alt Belge Kodu Rozeti (B249)
    doc.setFillColor(...primaryColor);
    doc.rect(pageWidth - margin - badgeWidth, pageHeight - margin - badgeHeight, badgeWidth, badgeHeight, "F");
    doc.setFontSize(7.5);
    doc.setFont(mainFont, "bold");
    doc.setTextColor(...CORPORATE_COLORS.white);
    doc.text("B249", pageWidth - margin - badgeWidth + 3, pageHeight - margin - 1.2);
  }

  // Tarayıcıda Doğrudan İndirme
  const sanitizedTitle = (data.urun_kodu || "Kablo").replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`${sanitizedTitle}_TDS.pdf`);
}
