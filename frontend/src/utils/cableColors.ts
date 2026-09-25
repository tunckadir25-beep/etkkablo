/**
 * ETK Kablo - Kablo Aileleri Kurumsal Renk Sistemi
 * Kullanıcının belirlediği 12 kablo ailesine özel renk paleti
 */

export interface FamilyColorDef {
  primary: string; // Hex kodu (örn: "#619a41")
  primaryRgb: [number, number, number]; // [r, g, b]
  tint: string; // Açık pastel ton (Zebra ve arka plan)
  tintRgb: [number, number, number];
  headerTextColor: string; // "#ffffff" veya "#0f172a"
  headerTextRgb: [number, number, number];
  nameTr: string;
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return [r, g, b];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function computeTintColor(
  rgb: [number, number, number],
  blend: number = 0.86
): { hex: string; rgb: [number, number, number] } {
  const tr = Math.round(rgb[0] + (255 - rgb[0]) * blend);
  const tg = Math.round(rgb[1] + (255 - rgb[1]) * blend);
  const tb = Math.round(rgb[2] + (255 - rgb[2]) * blend);
  return {
    hex: rgbToHex(tr, tg, tb),
    rgb: [tr, tg, tb],
  };
}

export function getContrastTextColor(
  rgb: [number, number, number]
): { hex: string; rgb: [number, number, number] } {
  // WCAG bağıl parlaklık yaklaşımı
  const luminance = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  if (luminance > 165) {
    return { hex: "#0f172a", rgb: [15, 23, 42] };
  }
  return { hex: "#ffffff", rgb: [255, 255, 255] };
}

function buildColorDef(primaryHex: string, nameTr: string): FamilyColorDef {
  const primaryRgb = hexToRgb(primaryHex);
  const tint = computeTintColor(primaryRgb);
  const text = getContrastTextColor(primaryRgb);
  return {
    primary: primaryHex.toLowerCase(),
    primaryRgb,
    tint: tint.hex,
    tintRgb: tint.rgb,
    headerTextColor: text.hex,
    headerTextRgb: text.rgb,
    nameTr,
  };
}

/**
 * 12 Kablo Ailesinin Birebir Tanımları
 */
export const CABLE_FAMILY_COLORS: Record<string, FamilyColorDef> = {
  fiber_optik: buildColorDef("#619a41", "Fiber Optik"),
  harici_telefon: buildColorDef("#2a2c2c", "Harici Telefon Kabloları"),
  dahili_telefon: buildColorDef("#b9bebc", "Dahili Telefon Kabloları"),
  data_lan: buildColorDef("#1e8fbf", "Data/Lan Kabloları"),
  sinyal_kontrol: buildColorDef("#d9a1a7", "Sinyal Kontrol Kabloları"),
  enstrumantasyon: buildColorDef("#f5b619", "Enstrümantasyon Kabloları"),
  kontrol: buildColorDef("#76689b", "Kontrol Kabloları"),
  yangin_alarm: buildColorDef("#a82623", "Yangın Alarm Kabloları"),
  yangina_dayanikli: buildColorDef("#ef6c22", "Yangına Dayanıklı Kabloları"),
  yangina_dayanikli_enerji: buildColorDef("#ef6c22", "Yangına Dayanıklı Enerji Kabloları"),
  solar: buildColorDef("#ed7d31", "Solar Kablolar"),
  koaksiyel: buildColorDef("#7f4d26", "Koaksiyel Kablo"),
  cctv: buildColorDef("#8b8c8f", "CCTV Kablo"),

  // Desteklenen diğer katalog aileleri için eşleştirmeler
  bina_otomasyon: buildColorDef("#1e8fbf", "Bina Otomasyon Kabloları"),
  silikon: buildColorDef("#ef6c22", "Silikon Kablolar"),
  general: buildColorDef("#1e8fbf", "Genel / Ortak"),
};

/**
 * Aile anahtarı, kategori adı veya etiket ne olursa olsun doğru rengi bulan fonksiyon
 */
export function getFamilyColor(
  familyKey?: string,
  categoryOrTitle?: string
): FamilyColorDef {
  const defaultColor = CABLE_FAMILY_COLORS["data_lan"];

  if (!familyKey && !categoryOrTitle) return defaultColor;

  const normalize = (str?: string) =>
    (str || "")
      .toLowerCase()
      .trim()
      .replace(/[\s\-\_\/]+/g, "_")
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");

  const rawKey = normalize(familyKey);
  const rawCat = normalize(categoryOrTitle);

  // 1. Doğrudan anahtar eşleşmesi
  if (rawKey && CABLE_FAMILY_COLORS[rawKey]) {
    return CABLE_FAMILY_COLORS[rawKey];
  }

  // 2. Semantik anahtar kelime eşleşmesi
  const checkString = `${rawKey} ${rawCat}`;

  if (checkString.includes("fiber")) return CABLE_FAMILY_COLORS["fiber_optik"];
  if (checkString.includes("harici_telefon") || (checkString.includes("harici") && checkString.includes("telefon")))
    return CABLE_FAMILY_COLORS["harici_telefon"];
  if (checkString.includes("dahili_telefon") || (checkString.includes("dahili") && checkString.includes("telefon")))
    return CABLE_FAMILY_COLORS["dahili_telefon"];
  if (checkString.includes("data") || checkString.includes("lan") || checkString.includes("ethernet") || checkString.includes("cat"))
    return CABLE_FAMILY_COLORS["data_lan"];
  if (checkString.includes("sinyal")) return CABLE_FAMILY_COLORS["sinyal_kontrol"];
  if (checkString.includes("enstruman") || checkString.includes("instrument"))
    return CABLE_FAMILY_COLORS["enstrumantasyon"];
  if (checkString.includes("kontrol") || checkString.includes("kumanda"))
    return CABLE_FAMILY_COLORS["kontrol"];
  if (checkString.includes("yangin_alarm") || (checkString.includes("yangin") && checkString.includes("alarm")))
    return CABLE_FAMILY_COLORS["yangin_alarm"];
  if (checkString.includes("yangina_dayanikli") || checkString.includes("dayanikli"))
    return CABLE_FAMILY_COLORS["yangina_dayanikli"];
  if (checkString.includes("solar") || checkString.includes("pv"))
    return CABLE_FAMILY_COLORS["solar"];
  if (checkString.includes("koaksiyel") || checkString.includes("coax"))
    return CABLE_FAMILY_COLORS["koaksiyel"];
  if (checkString.includes("cctv") || checkString.includes("guvenlik"))
    return CABLE_FAMILY_COLORS["cctv"];
  if (checkString.includes("bina") || checkString.includes("otomasyon") || checkString.includes("knx") || checkString.includes("eib"))
    return CABLE_FAMILY_COLORS["bina_otomasyon"];
  if (checkString.includes("silikon")) return CABLE_FAMILY_COLORS["silikon"];

  return defaultColor;
}
