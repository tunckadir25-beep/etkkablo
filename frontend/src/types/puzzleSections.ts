import { PuzzleSectionConfig, PuzzleSectionId } from "./cable";

export const MASTER_PUZZLE_SECTIONS: Record<PuzzleSectionId, {
  title_tr: string;
  title_en: string;
  description_tr: string;
  isCommon: boolean;
  defaultOrder: number;
}> = {
  kullanim_alanlari: {
    title_tr: "Kullanım Alanları",
    title_en: "Applications",
    description_tr: "Kablo çalışma alanları, bina içi/dışı tesisat ve endüstriyel uygulama açıklamaları.",
    isCommon: true,
    defaultOrder: 1,
  },
  kablo_yapisi: {
    title_tr: "Kablo Yapısı (Katmanlar)",
    title_en: "Cable Construction",
    description_tr: "İletken, izole, ekran, zırh ve dış kılıf katman tanımları.",
    isCommon: true,
    defaultOrder: 2,
  },
  teknik_ozellikler: {
    title_tr: "Teknik Özellikler",
    title_en: "Technical Specifications",
    description_tr: "Çalışma voltajı, test gerilimi, dielektrik dayanımı ve kablo ailesine özel teknik parametreler.",
    isCommon: false,
    defaultOrder: 3,
  },
  elektriksel_ozellikler: {
    title_tr: "Elektriksel Özellikler",
    title_en: "Electrical Specifications",
    description_tr: "İletken direnci, empedans, izolasyon direnci ve kapasite değer tablosu.",
    isCommon: false,
    defaultOrder: 4,
  },
  mekanik_ozellikler: {
    title_tr: "Mekanik ve Çevresel Özellikler",
    title_en: "Mechanical & Environmental Specs",
    description_tr: "Bükülme yarıçapı (sabit/hareketli), çalışma ve depolama sıcaklık aralıkları.",
    isCommon: true,
    defaultOrder: 5,
  },
  uygulama: {
    title_tr: "Uygulama",
    title_en: "Application & Installation",
    description_tr: "Kurulum, bükme yarıçapları, çekme kuvvetleri ve kablo çekim şartları.",
    isCommon: false,
    defaultOrder: 6,
  },
  markalama_paketleme: {
    title_tr: "Markalama, Paketleme, Sevk Boyları",
    title_en: "Marking, Packaging & Delivery Lengths",
    description_tr: "Dış kılıf metin markalaması, makara tipi ve standart sevk uzunlukları.",
    isCommon: false,
    defaultOrder: 7,
  },
  standartlar: {
    title_tr: "Standartlar ve Uygunluk",
    title_en: "Standards & Compliance",
    description_tr: "Üretim, alev geciktiricilik (IEC 60332), duman ve halojen standart rozetleri.",
    isCommon: true,
    defaultOrder: 8,
  },
  varyasyonlar: {
    title_tr: "Boyutlar ve Ağırlıklar Tablosu",
    title_en: "Dimensions & Weights Table",
    description_tr: "Part numaraları, per/damar sayısı, kesit, dış çap, bakır ve toplam ağırlık matrisi.",
    isCommon: true,
    defaultOrder: 9,
  },
};

/**
 * 12 Kablo Ailesine Özel Bölüm Yapılandırma Kuralları
 * Kullanıcının ilettiği kesin aile listesine göre belirlenmiştir.
 */
export const FAMILY_SECTION_RULES: Record<string, PuzzleSectionId[]> = {
  // 1. Fiber Optik
  fiber_optik: [
    "kullanim_alanlari",
    "kablo_yapisi",
    "mekanik_ozellikler",
    "uygulama",
    "markalama_paketleme",
    "standartlar",
    "varyasyonlar",
  ],

  // 2. Harici Telefon Kabloları (Yalnızca Teknik Özellikler)
  harici_telefon: [
    "kullanim_alanlari",
    "kablo_yapisi",
    "teknik_ozellikler",
    "varyasyonlar",
  ],

  // 3. Dahili Telefon Kabloları
  dahili_telefon: [
    "kullanim_alanlari",
    "kablo_yapisi",
    "teknik_ozellikler",
    "mekanik_ozellikler",
    "standartlar",
    "varyasyonlar",
  ],

  // 4. Data/Lan Kabloları (Teknik + Mekanik + Standartlar + Elektriksel)
  data_lan: [
    "kullanim_alanlari",
    "kablo_yapisi",
    "teknik_ozellikler",
    "mekanik_ozellikler",
    "standartlar",
    "elektriksel_ozellikler",
    "varyasyonlar",
  ],

  // 5. Sinyal Kontrol Kabloları
  sinyal_kontrol: [
    "kullanim_alanlari",
    "kablo_yapisi",
    "teknik_ozellikler",
    "mekanik_ozellikler",
    "standartlar",
    "varyasyonlar",
  ],

  // 6. Enstrümantasyon Kabloları
  enstrumantasyon: [
    "kullanim_alanlari",
    "kablo_yapisi",
    "teknik_ozellikler",
    "mekanik_ozellikler",
    "standartlar",
    "varyasyonlar",
  ],

  // 7. Kontrol Kabloları
  kontrol: [
    "kullanim_alanlari",
    "kablo_yapisi",
    "teknik_ozellikler",
    "mekanik_ozellikler",
    "standartlar",
    "varyasyonlar",
  ],

  // 8. Yangın Alarm Kabloları
  yangin_alarm: [
    "kullanim_alanlari",
    "kablo_yapisi",
    "teknik_ozellikler",
    "mekanik_ozellikler",
    "standartlar",
    "varyasyonlar",
  ],

  // 9. Yangına Dayanıklı Kablolar
  yangina_dayanikli: [
    "kullanim_alanlari",
    "kablo_yapisi",
    "teknik_ozellikler",
    "mekanik_ozellikler",
    "standartlar",
    "varyasyonlar",
  ],
  yangina_dayanikli_enerji: [
    "kullanim_alanlari",
    "kablo_yapisi",
    "teknik_ozellikler",
    "mekanik_ozellikler",
    "standartlar",
    "varyasyonlar",
  ],

  // 10. Solar Kablolar
  solar: [
    "kullanim_alanlari",
    "kablo_yapisi",
    "teknik_ozellikler",
    "mekanik_ozellikler",
    "standartlar",
    "varyasyonlar",
  ],

  // 11. Koaksiyel Kablo
  koaksiyel: [
    "kullanim_alanlari",
    "kablo_yapisi",
    "teknik_ozellikler",
    "mekanik_ozellikler",
    "standartlar",
    "varyasyonlar",
  ],

  // 12. CCTV Kablo
  cctv: [
    "kullanim_alanlari",
    "kablo_yapisi",
    "teknik_ozellikler",
    "mekanik_ozellikler",
    "standartlar",
    "varyasyonlar",
  ],

  // Desteklenen Diğer Kataloglar
  bina_otomasyon: [
    "kullanim_alanlari",
    "kablo_yapisi",
    "teknik_ozellikler",
    "mekanik_ozellikler",
    "standartlar",
    "varyasyonlar",
  ],
  silikon: [
    "kullanim_alanlari",
    "kablo_yapisi",
    "teknik_ozellikler",
    "mekanik_ozellikler",
    "standartlar",
    "varyasyonlar",
  ],
};

export function getDefaultPuzzleSections(
  familyKey: string,
  customDefaults?: PuzzleSectionId[]
): PuzzleSectionConfig[] {
  const normalize = (k?: string) =>
    (k || "")
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

  // Doğrudan eşleşme veya semantik eşleşme
  let ruleIds = FAMILY_SECTION_RULES[rawKey];
  if (!ruleIds) {
    if (rawKey.includes("fiber")) ruleIds = FAMILY_SECTION_RULES["fiber_optik"];
    else if (rawKey.includes("harici") && rawKey.includes("telefon")) ruleIds = FAMILY_SECTION_RULES["harici_telefon"];
    else if (rawKey.includes("dahili") && rawKey.includes("telefon")) ruleIds = FAMILY_SECTION_RULES["dahili_telefon"];
    else if (rawKey.includes("lan") || rawKey.includes("data")) ruleIds = FAMILY_SECTION_RULES["data_lan"];
    else if (rawKey.includes("sinyal")) ruleIds = FAMILY_SECTION_RULES["sinyal_kontrol"];
    else if (rawKey.includes("enstruman")) ruleIds = FAMILY_SECTION_RULES["enstrumantasyon"];
    else if (rawKey.includes("solar")) ruleIds = FAMILY_SECTION_RULES["solar"];
    else if (rawKey.includes("koaksiyel") || rawKey.includes("coax")) ruleIds = FAMILY_SECTION_RULES["koaksiyel"];
    else if (rawKey.includes("cctv")) ruleIds = FAMILY_SECTION_RULES["cctv"];
    else if (rawKey.includes("yangin") && rawKey.includes("alarm")) ruleIds = FAMILY_SECTION_RULES["yangin_alarm"];
    else if (rawKey.includes("yangin") || rawKey.includes("dayanikli")) ruleIds = FAMILY_SECTION_RULES["yangina_dayanikli"];
    else if (rawKey.includes("kontrol")) ruleIds = FAMILY_SECTION_RULES["kontrol"];
    else ruleIds = FAMILY_SECTION_RULES["kontrol"];
  }

  // Aileye özel yapılandırma kuralı varsa daima aile kuralı önceliklidir
  const activeIds: PuzzleSectionId[] =
    ruleIds && ruleIds.length > 0 ? ruleIds : (customDefaults && customDefaults.length > 0 ? customDefaults : FAMILY_SECTION_RULES["kontrol"]);

  const allMasterIds: PuzzleSectionId[] = [
    "kullanim_alanlari",
    "kablo_yapisi",
    "teknik_ozellikler",
    "elektriksel_ozellikler",
    "mekanik_ozellikler",
    "uygulama",
    "markalama_paketleme",
    "standartlar",
    "varyasyonlar",
  ];

  // Aktif bölümler tam olarak ailenin kural sırasına göre
  const activeConfigs: PuzzleSectionConfig[] = activeIds
    .filter((id) => MASTER_PUZZLE_SECTIONS[id])
    .map((id, index) => {
      const meta = MASTER_PUZZLE_SECTIONS[id];
      return {
        id,
        title_tr: meta.title_tr,
        title_en: meta.title_en,
        description_tr: meta.description_tr,
        isCommon: meta.isCommon,
        enabled: true,
        order: index + 1,
      };
    });

  // Bu ailede pasif tutulacak kalan bölümler (kullanıcı yapboz yöneticisinden dilediğinde açabilir)
  const inactiveIds = allMasterIds.filter((id) => !activeIds.includes(id));
  const inactiveConfigs: PuzzleSectionConfig[] = inactiveIds
    .filter((id) => MASTER_PUZZLE_SECTIONS[id])
    .map((id, index) => {
      const meta = MASTER_PUZZLE_SECTIONS[id];
      return {
        id,
        title_tr: meta.title_tr,
        title_en: meta.title_en,
        description_tr: meta.description_tr,
        isCommon: meta.isCommon,
        enabled: false,
        order: activeConfigs.length + index + 1,
      };
    });

  return [...activeConfigs, ...inactiveConfigs];
}
