export interface TableColumnDef {
  key: string;
  title: string;
  align: "left" | "center" | "right";
  width?: string;
  isCustom?: boolean;
  role?: "label" | "value"; // "label": Koyu arkaplanlı etiket hücresi (Örn: Depolama, Markalama), "value": Açık arkaplanlı değer hücresi
  hideHeader?: boolean; // İlk sütunun başlık hücresini şeffaf/renksiz ve boş bırakma
}

export type TableStripingMode = "zebra" | "filled_only" | "plain";

export interface TableTemplate {
  id: string;
  name: string;
  sectionKey?: string; // Hangi bölüme ait (örn: "varyasyonlar", "teknik_ozellikler", "elektriksel_ozellikler", vb.)
  familyKey?: string; // Hangi kablo ailesiyle ilişkili (örn: "fiber_optik", "data_lan", "kontrol", vb.)
  columns: TableColumnDef[];
  isBuiltIn?: boolean;
  description?: string;
  superHeaderTitle?: string; // Tablo üstü birleştirilmiş çatı başlık (Örn: "Sıcaklık Aralığı" veya "İletken Çapı")
  superHeaderStartCol?: string; // Çatı başlığın hangi sütun key'inden başlayacağı (Örn: "param2" veya "d_040")
  superHeaderColSpan?: number; // Çatı başlığın kaç sütun boyunca birleştirileceği (Örn: 2, 4, 7)
  showHeaderRow?: boolean; // Kolon başlık satırı (th) gösterilsin mi? (Markalama/Özellik tablosunda false yapılır)
  blankCornerHeader?: boolean; // Sol üst köşe hücresini tamamen renksiz ve boş bırakma
  layoutMode?: "grid" | "matrix" | "key_value"; // Düzen tipi
  stripingMode?: TableStripingMode; // "zebra" (even-odd) | "filled_only" (sadece dolu hücreler) | "plain" (düz beyaz)
  defaultRows?: any[]; // Şablonun başlangıç satırları ve satır başlıkları
}

export interface SectionTableInstance {
  instanceId: string;
  templateId: string;
  title: string;
  sectionKey: string;
  columns: TableColumnDef[];
  data: any[];
  superHeaderTitle?: string;
  superHeaderStartCol?: string;
  superHeaderColSpan?: number;
  showHeaderRow?: boolean;
  blankCornerHeader?: boolean;
  layoutMode?: "grid" | "matrix" | "key_value";
  stripingMode?: TableStripingMode;
}

export function createTableInstance(
  template: TableTemplate,
  customTitle?: string,
  initialRows?: any[]
): SectionTableInstance {
  let initialData: any[];

  if (initialRows && initialRows.length > 0) {
    initialData = initialRows;
  } else if (template.defaultRows && template.defaultRows.length > 0) {
    // Şablon iskeletini koru: Tüm ETİKET sütunlarını sakla, DEĞER sütunlarını boşalt ("")
    const labelColKeys = new Set(
      template.columns.filter((c, idx) => c.role === "label" || (idx === 0 && (!c.title || !c.title.trim()))).map((c) => c.key)
    );
    if (labelColKeys.size === 0 && template.columns.length > 0) {
      labelColKeys.add(template.columns[0].key);
    }

    initialData = template.defaultRows.map((r: any, rIdx: number) => {
      if (r.isGroupHeader) {
        return {
          id: r.id || rIdx + 1,
          isGroupHeader: true,
          title: r.title || "",
          indent: !!r.indent,
        };
      }
      const cleaned: any = { id: r.id || rIdx + 1 };
      template.columns.forEach((col) => {
        if (labelColKeys.has(col.key)) {
          cleaned[col.key] =
            r[col.key] !== undefined
              ? r[col.key]
              : col.key === template.columns[0]?.key
              ? (r.param || r.parametre || r.title || "")
              : "";
        } else {
          cleaned[col.key] = r[col.key] !== undefined ? r[col.key] : "";
        }
      });
      return cleaned;
    });
  } else {
    const initialRow: any = { id: 1 };
    template.columns.forEach((c) => {
      initialRow[c.key] = "";
    });
    if (template.sectionKey === "varyasyonlar") {
      initialRow.dahil = true;
    }
    initialData = [initialRow];
  }

  return {
    instanceId: `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    templateId: template.id,
    title: customTitle || template.name,
    sectionKey: template.sectionKey || "varyasyonlar",
    columns: template.columns.map((c) => ({ ...c })),
    data: initialData,
    superHeaderTitle: template.superHeaderTitle,
    superHeaderStartCol: template.superHeaderStartCol,
    superHeaderColSpan: template.superHeaderColSpan,
    showHeaderRow: template.showHeaderRow !== false,
    blankCornerHeader:
      template.blankCornerHeader !== undefined
        ? template.blankCornerHeader
        : (template.columns[0]?.hideHeader === true || !template.columns[0]?.title || !template.columns[0]?.title.trim()),
    layoutMode: template.layoutMode || "grid",
    stripingMode: template.stripingMode || (template.superHeaderTitle ? "filled_only" : "zebra"),
  };
}

// ==================== SİSTEM YERLEŞİK ŞABLONLARI ====================
export const BUILT_IN_TABLE_TEMPLATES: TableTemplate[] = [
  {
    id: "tpl_harici_telefon_teknik",
    name: "Harici Telefon Teknik Özellikler",
    sectionKey: "teknik_ozellikler",
    familyKey: "harici_telefon",
    description: "KPD-PAP / PD-PAP Harici Telefon Kabloları İletken Çapı Bazlı Elektriksel ve Teknik Özellikler Matrisi",
    superHeaderTitle: "İletken Çapı",
    superHeaderStartCol: "d_040",
    superHeaderColSpan: 7,
    showHeaderRow: true,
    blankCornerHeader: true,
    layoutMode: "matrix",
    stripingMode: "filled_only",
    columns: [
      { key: "param", title: "", align: "left", role: "label", hideHeader: true },
      { key: "d_040", title: "0.40 mm", align: "center", role: "value" },
      { key: "d_050", title: "0.50 mm", align: "center", role: "value" },
      { key: "d_060", title: "0.60 mm", align: "center", role: "value" },
      { key: "d_063", title: "0.63 mm", align: "center", role: "value" },
      { key: "d_065", title: "0.65 mm", align: "center", role: "value" },
      { key: "d_080", title: "0.80 mm", align: "center", role: "value" },
      { key: "d_090", title: "0.90 mm", align: "center", role: "value" },
    ],
    defaultRows: [
      { id: 1, isGroupHeader: true, title: "İletken Direnci Ω/km (20 °C)", indent: false },
      { id: 2, param: "Maksimum Ortalama", d_040: "139,4", d_050: "89,4", d_060: "62,1", d_063: "58", d_065: "57", d_080: "35", d_090: "27,6" },
      { id: 3, param: "Maksimum Bireysel", d_040: "146,6", d_050: "93", d_060: "64,6", d_063: "60", d_065: "58", d_080: "37", d_090: "28,8" },
      { id: 4, param: "İzolasyon Direnci MΩ/km (500 V DC)", d_040: ">10000", d_050: ">10000", d_060: ">15000", d_063: ">15000", d_065: ">15000", d_080: ">15000", d_090: ">15000" },
      { id: 5, isGroupHeader: true, title: "Efektif Kapasite nF/km (800 Hz)", indent: false },
      { id: 6, param: "Maksimum Ortalama", d_040: "50", d_050: "50", d_060: "45", d_063: "45", d_065: "45", d_080: "45", d_090: "45" },
      { id: 7, param: "Maksimum Bireysel", d_040: "56", d_050: "56", d_060: "51", d_063: "51", d_065: "51", d_080: "51", d_090: "51" },
      { id: 8, isGroupHeader: true, title: "Kapasite Dengesizliği pF/500 m", indent: false },
      { id: 9, isGroupHeader: true, title: "Perler Arası", indent: true },
      { id: 10, param: "Maksimum Ortalama", d_040: "125", d_050: "125", d_060: "60", d_063: "60", d_065: "60", d_080: "60", d_090: "60" },
      { id: 11, param: "Maksimum Bireysel", d_040: "350", d_050: "350", d_060: "325", d_063: "325", d_065: "325", d_080: "325", d_090: "325" },
      { id: 12, isGroupHeader: true, title: "Komşu Dörtler Arası", indent: true },
      { id: 13, param: "Maksimum Ortalama", d_040: "125", d_050: "125", d_060: "60", d_063: "60", d_065: "60", d_080: "60", d_090: "60" },
      { id: 14, param: "Maksimum Bireysel", d_040: "275", d_050: "275", d_060: "270", d_063: "270", d_065: "270", d_080: "270", d_090: "270" },
      { id: 15, isGroupHeader: true, title: "Ekrana Karşı", indent: true },
      { id: 16, param: "Maksimum Ortalama", d_040: "500", d_050: "500", d_060: "325", d_063: "325", d_065: "325", d_080: "325", d_090: "325" },
      { id: 17, param: "Maksimum Bireysel", d_040: "2000", d_050: "2000", d_060: "1300", d_063: "1300", d_065: "1300", d_080: "1300", d_090: "1300" },
      { id: 18, isGroupHeader: true, title: "Dielektrik Kuvveti", indent: false },
      { id: 19, isGroupHeader: true, title: "V (DC, 1 dakika)", indent: true },
      { id: 20, param: "Per - Per", d_040: "1400", d_050: "1400", d_060: "2000", d_063: "2000", d_065: "2000", d_080: "2400", d_090: "3000" },
      { id: 21, param: "Per - Ekran", d_040: "1400", d_050: "1400", d_060: "2000", d_063: "2000", d_065: "2000", d_080: "2400", d_090: "3000" },
      { id: 22, isGroupHeader: true, title: "V (DC, 3 Saniye)", indent: true },
      { id: 23, param: "Per - Ekran", d_040: "9000", d_050: "9000", d_060: "9000", d_063: "9000", d_065: "9000", d_080: "9000", d_090: "9000" },
    ],
  },
  {
    id: "tpl_harici_telefon_varyasyon",
    name: "Harici Telefon Boyutlar ve Ağırlıklar",
    sectionKey: "varyasyonlar",
    familyKey: "harici_telefon",
    description: "KPD-PAP / PD-PAP Boyutlar, Ağırlıklar ve Sevk Makara Boyları Tablosu",
    showHeaderRow: true,
    layoutMode: "grid",
    stripingMode: "zebra",
    columns: [
      { key: "part_numarasi", title: "Part Numarası", align: "left" },
      { key: "per_sayisi", title: "Per Sayısı", align: "center" },
      { key: "kesit", title: "İletken Çapı (mm)", align: "center" },
      { key: "dis_cap_mm", title: "Ortalama Dış Çap (mm)", align: "right" },
      { key: "bakir_agirligi_kg_km", title: "Bakır Ağırlığı (kg/km)", align: "right" },
      { key: "toplam_agirlik_kg_km", title: "Ortalama Ağırlık (kg/km)", align: "right" },
      { key: "sevk_boyu_m", title: "Makara Boyu (m)", align: "center" },
    ],
  },
  {
    id: "tpl_dahili_telefon_teknik",
    name: "Dahili Telefon Teknik Özellikler",
    sectionKey: "teknik_ozellikler",
    familyKey: "dahili_telefon",
    description: "PD-APH Dahili Telefon Kabloları İletken Çapı Bazlı Elektriksel ve Teknik Özellikler Tablosu",
    showHeaderRow: true,
    layoutMode: "grid",
    stripingMode: "zebra",
    columns: [
      { key: "kesit", title: "İletken Çapı", align: "center", role: "label" },
      { key: "iletken_direnci", title: "İletken Direnci Ω/km (20 °C)", align: "center", role: "value" },
      { key: "izolasyon_direnci", title: "İzolasyon Direnci MΩ/km", align: "center", role: "value" },
      { key: "efektif_kapasite", title: "Efektif Kapasite nF/km", align: "center", role: "value" },
      { key: "kapasite_dengesizligi", title: "Kapasite Dengesizliği pF/500 m", align: "center", role: "value" },
      { key: "test_voltaji", title: "Test Voltajı V (DC. 1 dakika)", align: "center", role: "value" },
    ],
    defaultRows: [
      { id: 1, kesit: "0.40 mm", iletken_direnci: "146.6", izolasyon_direnci: "5000", efektif_kapasite: "56", kapasite_dengesizligi: "400", test_voltaji: "1000" },
      { id: 2, kesit: "0.50 mm", iletken_direnci: "93", izolasyon_direnci: "5000", efektif_kapasite: "56", kapasite_dengesizligi: "400", test_voltaji: "1000" },
      { id: 3, kesit: "0.60 mm", iletken_direnci: "64.6", izolasyon_direnci: "5000", efektif_kapasite: "51", kapasite_dengesizligi: "400", test_voltaji: "1000" },
      { id: 4, kesit: "0.80 mm", iletken_direnci: "37", izolasyon_direnci: "5000", efektif_kapasite: "51", kapasite_dengesizligi: "400", test_voltaji: "1000" },
      { id: 5, kesit: "0.90 mm", iletken_direnci: "28.8", izolasyon_direnci: "5000", efektif_kapasite: "51", kapasite_dengesizligi: "400", test_voltaji: "1000" },
    ],
  },
  {
    id: "tpl_dahili_telefon_mekanik",
    name: "Dahili Telefon Mekanik Özellikler",
    sectionKey: "mekanik_ozellikler",
    familyKey: "dahili_telefon",
    description: "Bükülme Yarıçapı ve Çalışma Sıcaklık Aralığı Tablosu",
    showHeaderRow: true,
    layoutMode: "grid",
    stripingMode: "zebra",
    columns: [
      { key: "bukulme_yaricapi", title: "Bükülme Yarıçapı", align: "center", role: "value" },
      { key: "sicaklik_araligi", title: "Sıcaklık Aralığı Çalışma", align: "center", role: "value" },
    ],
    defaultRows: [
      { id: 1, bukulme_yaricapi: "10xD mm", sicaklik_araligi: "-30°C ~ +70°C" },
    ],
  },
  {
    id: "tpl_dahili_telefon_standartlar",
    name: "Dahili Telefon Standartlar ve Testler",
    sectionKey: "standartlar",
    familyKey: "dahili_telefon",
    description: "Duman Yoğunluk, Korozif Gaz ve Alev Geciktiricilik Test Standartları",
    showHeaderRow: true,
    layoutMode: "grid",
    stripingMode: "zebra",
    columns: [
      { key: "duman_yogunluk", title: "Duman Yoğunluk Testi", align: "center", role: "value" },
      { key: "korozif_gaz", title: "Korozif Gaz Testi", align: "center", role: "value" },
      { key: "alev_geciktiricilik", title: "Alev Geciktiricilik Testi", align: "center", role: "value" },
    ],
    defaultRows: [
      {
        id: 1,
        duman_yogunluk: "IEC 61034-2, VDE 0482-1034-2, EN 61034-2",
        korozif_gaz: "IEC 60754-2, VDE 0482-267-2-3, EN 50267-2-3",
        alev_geciktiricilik: "IEC 60332-1-2, VDE 0482-332-1-2, EN 60332-1-2",
      },
    ],
  },
  {
    id: "tpl_dahili_telefon_varyasyon",
    name: "Dahili Telefon Boyutlar ve Ağırlıklar",
    sectionKey: "varyasyonlar",
    familyKey: "dahili_telefon",
    description: "PD-APH Boyutlar, Ağırlıklar ve Sevk Makara Boyları Tablosu",
    showHeaderRow: true,
    layoutMode: "grid",
    stripingMode: "zebra",
    columns: [
      { key: "part_numarasi", title: "Part Numarası", align: "left" },
      { key: "per_sayisi", title: "Per Sayısı", align: "center" },
      { key: "kesit", title: "İletken Çapı (mm)", align: "center" },
      { key: "dis_cap_mm", title: "Ortalama Dış Çap (mm)", align: "right" },
      { key: "bakir_agirligi_kg_km", title: "Bakır Ağırlığı (kg/km)", align: "right" },
      { key: "toplam_agirlik_kg_km", title: "Ortalama Ağırlık (kg/km)", align: "right" },
      { key: "sevk_boyu_m", title: "Makara Boyu (m)", align: "center" },
    ],
  },
  {
    id: "tpl_data_lan_teknik",
    name: "Data/LAN Genel Teknik Özellikler",
    sectionKey: "teknik_ozellikler",
    familyKey: "data_lan",
    description: "Cat 5e/6/6A/7 İletken ve İzolasyon Direnci, Kapasite, Voltaj ve Empedans Değerleri",
    showHeaderRow: true,
    layoutMode: "grid",
    stripingMode: "zebra",
    columns: [
      { key: "iletken_direnci", title: "İletken Direnci Ω/km", align: "center", role: "value" },
      { key: "izolasyon_direnci", title: "İzolasyon Direnci MΩxkm (500 V DC)", align: "center", role: "value" },
      { key: "efektif_kapasite", title: "Efektif Kapasite nF/km", align: "center", role: "value" },
      { key: "direnc_dengesizligi", title: "Direnç Dengesizliği", align: "center", role: "value" },
      { key: "yayilma_hizi", title: "Yayılma Hızı", align: "center", role: "value" },
      { key: "calisma_voltaji", title: "Çalışma Voltajı V", align: "center", role: "value" },
      { key: "test_voltaji", title: "Test Voltajı V", align: "center", role: "value" },
      { key: "karakteristik_empedans", title: "Karakteristik Empedans Ω", align: "center", role: "value" },
    ],
    defaultRows: [
      {
        id: 1,
        iletken_direnci: "94",
        izolasyon_direnci: "5000",
        efektif_kapasite: "56",
        direnc_dengesizligi: "%2",
        yayilma_hizi: "%67-69",
        calisma_voltaji: "250",
        test_voltaji: "1200",
        karakteristik_empedans: "100±%15, 1-100 MHz",
      },
    ],
  },
  {
    id: "tpl_data_lan_elektriksel",
    name: "Data/LAN Yüksek Frekans İletim Performansı",
    sectionKey: "elektriksel_ozellikler",
    familyKey: "data_lan",
    description: "Frekans Bazlı Ek Kaybı, NEXT, PSNEXT, ELFEXT, PSELFEXT ve Dönüş Kaybı Tablosu",
    showHeaderRow: true,
    layoutMode: "grid",
    stripingMode: "zebra",
    columns: [
      { key: "frekans_mhz", title: "Frekans MHz", align: "center", role: "label" },
      { key: "ek_kaybi", title: "Ek Kaybı dB/100m (Max.)", align: "center", role: "value" },
      { key: "next_kaybi", title: "NEXT Kaybı dB (Min.)", align: "center", role: "value" },
      { key: "psnext_kaybi", title: "PSNEXT Kaybı dB (Min.)", align: "center", role: "value" },
      { key: "elfext_kaybi", title: "ELFEXT dB/100m (Min.)", align: "center", role: "value" },
      { key: "pselfext_kaybi", title: "PSELFEXT dB/100m (Min.)", align: "center", role: "value" },
      { key: "donus_kaybi", title: "Dönüş Kaybı (RL) dB (Min.)", align: "center", role: "value" },
    ],
    defaultRows: [
      { id: 1, frekans_mhz: "0.772", ek_kaybi: "1.8", next_kaybi: "67", psnext_kaybi: "64", elfext_kaybi: "66", pselfext_kaybi: "66", donus_kaybi: "-" },
      { id: 2, frekans_mhz: "1", ek_kaybi: "2", next_kaybi: "65.3", psnext_kaybi: "62.3", elfext_kaybi: "63.8", pselfext_kaybi: "63.8", donus_kaybi: "23" },
      { id: 3, frekans_mhz: "4", ek_kaybi: "4.1", next_kaybi: "56.3", psnext_kaybi: "53.3", elfext_kaybi: "51.8", pselfext_kaybi: "51.8", donus_kaybi: "23" },
      { id: 4, frekans_mhz: "8", ek_kaybi: "5.8", next_kaybi: "51.8", psnext_kaybi: "48.8", elfext_kaybi: "45.7", pselfext_kaybi: "45.7", donus_kaybi: "23" },
      { id: 5, frekans_mhz: "10", ek_kaybi: "6.5", next_kaybi: "50.3", psnext_kaybi: "47.3", elfext_kaybi: "43.8", pselfext_kaybi: "43.8", donus_kaybi: "23" },
      { id: 6, frekans_mhz: "16", ek_kaybi: "8.2", next_kaybi: "47.2", psnext_kaybi: "44.2", elfext_kaybi: "39.7", pselfext_kaybi: "39.7", donus_kaybi: "23" },
      { id: 7, frekans_mhz: "20", ek_kaybi: "9.3", next_kaybi: "45.8", psnext_kaybi: "42.8", elfext_kaybi: "37.8", pselfext_kaybi: "37.8", donus_kaybi: "23" },
      { id: 8, frekans_mhz: "25", ek_kaybi: "10.4", next_kaybi: "44.3", psnext_kaybi: "41.3", elfext_kaybi: "35.8", pselfext_kaybi: "35.8", donus_kaybi: "22" },
      { id: 9, frekans_mhz: "31.25", ek_kaybi: "11.7", next_kaybi: "42.9", psnext_kaybi: "39.9", elfext_kaybi: "33.9", pselfext_kaybi: "33.9", donus_kaybi: "21" },
      { id: 10, frekans_mhz: "62.5", ek_kaybi: "17", next_kaybi: "38.4", psnext_kaybi: "35.4", elfext_kaybi: "27.9", pselfext_kaybi: "27.9", donus_kaybi: "18" },
      { id: 11, frekans_mhz: "100", ek_kaybi: "22", next_kaybi: "35.3", psnext_kaybi: "32.3", elfext_kaybi: "23.8", pselfext_kaybi: "23.8", donus_kaybi: "16" },
    ],
  },
  {
    id: "tpl_data_lan_mekanik",
    name: "Data/LAN Mekanik Özellikler",
    sectionKey: "mekanik_ozellikler",
    familyKey: "data_lan",
    description: "Bükülme Yarıçapı ve Çalışma Sıcaklık Aralığı Tablosu",
    showHeaderRow: true,
    layoutMode: "grid",
    stripingMode: "zebra",
    columns: [
      { key: "bukulme_yaricapi", title: "Bükülme Yarıçapı", align: "center", role: "value" },
      { key: "sicaklik_araligi", title: "Sıcaklık Aralığı Çalışma", align: "center", role: "value" },
    ],
    defaultRows: [
      { id: 1, bukulme_yaricapi: "8xD mm", sicaklik_araligi: "-55°C ~ +60°C" },
    ],
  },
  {
    id: "tpl_data_lan_standartlar",
    name: "Data/LAN Üretim ve Test Standartları",
    sectionKey: "standartlar",
    familyKey: "data_lan",
    description: "ANSI/TIA, IEC Üretim ve Yangın Güvenlik Test Standartları Tablosu",
    showHeaderRow: true,
    layoutMode: "grid",
    stripingMode: "zebra",
    columns: [
      { key: "uretim_standartlari", title: "Üretim Standardları", align: "center", role: "value" },
      { key: "alev_geciktiricilik", title: "Alev Geciktiricilik Testi", align: "center", role: "value" },
      { key: "duman_yogunluk", title: "Duman Yoğunluk Testi", align: "center", role: "value" },
      { key: "korozif_gaz", title: "Korozif Gaz Testi", align: "center", role: "value" },
    ],
    defaultRows: [
      {
        id: 1,
        uretim_standartlari: "ANSI/TIA-568-C.2, IEC-61156-5, IEC-11801",
        alev_geciktiricilik: "IEC 60332-1-2, EN 60332-1-2",
        duman_yogunluk: "IEC 61034-2, EN 61034-2",
        korozif_gaz: "IEC 60754-2, EN 50267-2-3",
      },
    ],
  },
  {
    id: "tpl_yangin_guvenlik_standartlar",
    name: "Yangın ve Güvenlik Test Standartları (LSZH / HFFR)",
    sectionKey: "standartlar",
    description: "Alev Geciktiricilik, Duman Yoğunluk, Halojensizlik ve Korozif Gaz Test Standartları",
    showHeaderRow: true,
    layoutMode: "grid",
    stripingMode: "zebra",
    columns: [
      { key: "duman_yogunluk", title: "Duman Yoğunluk Testi", align: "center", role: "value" },
      { key: "korozif_gaz", title: "Korozif Gaz Testi", align: "center", role: "value" },
      { key: "halojensizlik", title: "Halojensizlik Testi", align: "center", role: "value" },
      { key: "alev_geciktiricilik", title: "Alev Geciktiricilik Testi", align: "center", role: "value" },
      { key: "alev_yayilim", title: "Alev Yayılım Testi", align: "center", role: "value" },
    ],
    defaultRows: [
      {
        id: 1,
        duman_yogunluk: "IEC 61034-2, VDE 0482-1034-2, EN 61034-2",
        korozif_gaz: "IEC 60754-2, VDE 0482-267-2-3, EN 50267-2-3",
        halojensizlik: "IEC 60754-1, VDE 0482-267-2-1, EN 50267-2-1",
        alev_geciktiricilik: "IEC 60332-1-2, VDE 0482-332-1-2, EN 60332-1-2",
        alev_yayilim: "IEC 60332-3-24, VDE 0482-332-3-24, EN 60332-2-24",
      },
    ],
  },
  {
    id: "tpl_yangina_dayanikli_standartlar",
    name: "Yangına Dayanıklılık & Devre Bütünlüğü Standartları",
    sectionKey: "standartlar",
    familyKey: "yangina_dayanikli",
    description: "Devre Bütünlüğü (FE180 / PH120), Alev İletmeme ve Duman Standartları",
    showHeaderRow: true,
    layoutMode: "grid",
    stripingMode: "zebra",
    columns: [
      { key: "devre_butunlugu", title: "Devre Bütünlüğü Testi (FE180 / PH120)", align: "center", role: "value" },
      { key: "alev_geciktiricilik", title: "Alev Geciktiricilik Testi", align: "center", role: "value" },
      { key: "duman_yogunluk", title: "Duman Yoğunluk Testi", align: "center", role: "value" },
      { key: "korozif_gaz", title: "Korozif Gaz Testi", align: "center", role: "value" },
    ],
    defaultRows: [
      {
        id: 1,
        devre_butunlugu: "IEC 60331-21, DIN 4102-12, EN 50200",
        alev_geciktiricilik: "IEC 60332-1-2, IEC 60332-3-24",
        duman_yogunluk: "IEC 61034-2, EN 61034-2",
        korozif_gaz: "IEC 60754-1/2, EN 50267-2-3",
      },
    ],
  },
  {
    id: "tpl_genel_standartlar_listesi",
    name: "Standartlar ve Uygunluk Listesi (Dikey)",
    sectionKey: "standartlar",
    description: "Üretim ve Test Standartlarının Tümünü Ayrı Ayrı Satırlarda Gösteren Liste",
    showHeaderRow: true,
    layoutMode: "grid",
    stripingMode: "zebra",
    columns: [
      { key: "test_adi", title: "Standart / Test Türü", align: "left", width: "min-w-[220px]", role: "label" },
      { key: "standart_kodu", title: "Standart Kodu / Normu", align: "center", role: "value" },
    ],
    defaultRows: [
      { id: 1, test_adi: "Üretim Standardı", standart_kodu: "TSEK 116 / DIN VDE / IEC" },
      { id: 2, test_adi: "Alev Geciktiricilik Testi", standart_kodu: "IEC 60332-1-2, VDE 0482-332-1-2, EN 60332-1-2" },
      { id: 3, test_adi: "Duman Yoğunluk Testi", standart_kodu: "IEC 61034-2, VDE 0482-1034-2, EN 61034-2" },
      { id: 4, test_adi: "Korozif Gaz Testi", standart_kodu: "IEC 60754-2, VDE 0482-267-2-3, EN 50267-2-3" },
      { id: 5, test_adi: "Halojensizlik Testi", standart_kodu: "IEC 60754-1, VDE 0482-267-2-1, EN 50267-2-1" },
    ],
  },
  {
    id: "tpl_data_lan_varyasyon",
    name: "Data/LAN Boyutlar ve Ağırlıklar",
    sectionKey: "varyasyonlar",
    familyKey: "data_lan",
    description: "Cat 5e/6/6A/7/7A Boyutlar, Ağırlıklar ve Sevk Makara Boyları Tablosu",
    showHeaderRow: true,
    layoutMode: "grid",
    stripingMode: "zebra",
    columns: [
      { key: "part_numarasi", title: "Part Numarası", align: "left" },
      { key: "per_sayisi", title: "Per Sayısı", align: "center" },
      { key: "kesit", title: "İletken Çapı (mm)", align: "center" },
      { key: "dis_cap_mm", title: "Ortalama Dış Çap (mm)", align: "right" },
      { key: "bakir_agirligi_kg_km", title: "Bakır Ağırlığı (kg/km)", align: "right" },
      { key: "toplam_agirlik_kg_km", title: "Ortalama Ağırlık (kg/km)", align: "right" },
      { key: "sevk_boyu_m", title: "Makara Boyu (m)", align: "center" },
    ],
  },
];

// ==================== STORAGE VE YÖNETİM YARDIMCILARI ====================
const STORAGE_KEY_TEMPLATES = "etk_universal_table_templates_v2";
const STORAGE_KEY_FAMILY_MAP = "etk_family_table_template_map_v2";
const STORAGE_KEY_DELETED_BUILTINS = "etk_deleted_builtin_templates_v2";

/**
 * Bölüme göre sıfırdan oluşturulacak temel boş şablon
 */
export function getDefaultEmptyTemplate(sectionKey: string = "varyasyonlar"): TableTemplate {
  if (sectionKey === "varyasyonlar") {
    return {
      id: "tpl_varyasyon_varsayilan",
      name: "Varyasyon Tablosu",
      sectionKey: "varyasyonlar",
      columns: [
        { key: "part_numarasi", title: "Part Numarası", align: "left" },
        { key: "kesit", title: "Kesit / Tip", align: "left" },
        { key: "fiber_sayisi", title: "Damar / Fiber", align: "center" },
        { key: "dis_cap_mm", title: "Dış Çap (mm)", align: "right" },
        { key: "toplam_agirlik_kg_km", title: "Toplam Ağ. (kg/km)", align: "right" },
        { key: "sevk_boyu_m", title: "Sevk Boyu (m)", align: "center" },
      ],
    };
  }
  if (sectionKey === "kullanim_alanlari") {
    return {
      id: "tpl_kullanim_varsayilan",
      name: "Kullanım Alanları",
      sectionKey: "kullanim_alanlari",
      columns: [
        { key: "sira", title: "No", align: "center" },
        { key: "alan_adi", title: "Kullanım Alanı", align: "left" },
      ],
    };
  }
  if (sectionKey === "kablo_yapisi") {
    return {
      id: "tpl_kablo_varsayilan",
      name: "Kablo Katman Yapısı",
      sectionKey: "kablo_yapisi",
      columns: [
        { key: "sira", title: "No", align: "center" },
        { key: "katman_adi", title: "Katman Adı", align: "left" },
        { key: "tanim", title: "Katman Tanımı", align: "left" },
      ],
    };
  }
  if (sectionKey === "mekanik_ozellikler") {
    return {
      id: "tpl_mekanik_varsayilan",
      name: "Mekanik ve Çevresel",
      sectionKey: "mekanik_ozellikler",
      columns: [
        { key: "parametre", title: "Parametre", align: "left" },
        { key: "deger", title: "Değer", align: "center" },
        { key: "birim_standart", title: "Birim / Not", align: "center" },
      ],
    };
  }
  if (sectionKey === "standartlar") {
    return {
      id: "tpl_standartlar_varsayilan",
      name: "Standartlar ve Uygunluk",
      sectionKey: "standartlar",
      columns: [
        { key: "test_adi", title: "Test ve Standart Adı", align: "left" },
        { key: "standart_kodu", title: "Standart Referans Kodu", align: "center" },
      ],
    };
  }
  if (sectionKey === "uygulama") {
    return {
      id: "tpl_uygulama_varsayilan",
      name: "Uygulama Bilgileri",
      sectionKey: "uygulama",
      columns: [
        { key: "parametre", title: "Uygulama Parametresi", align: "left", role: "label" },
        { key: "deger", title: "Şart / Değer", align: "center", role: "value" },
      ],
    };
  }
  if (sectionKey === "markalama_paketleme") {
    return {
      id: "tpl_markalama_varsayilan",
      name: "Markalama, Paketleme ve Sevk Boyları",
      sectionKey: "markalama_paketleme",
      columns: [
        { key: "ozellik", title: "Özellik", align: "left", role: "label" },
        { key: "deger", title: "Tanım / Şartname", align: "left", role: "value" },
      ],
    };
  }
  return {
    id: `tpl_${sectionKey}_varsayilan`,
    name: "Yeni Tablo Şablonu",
    sectionKey,
    columns: [
      { key: "parametre", title: "Parametre", align: "left" },
      { key: "deger", title: "Değer", align: "center" },
    ],
  };
}

/**
 * Kaydedilmiş şablonları döner (isteğe bağlı sectionKey filtresi ile).
 */
export function getSavedTableTemplates(sectionKey?: string): TableTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    const customList: TableTemplate[] = raw ? JSON.parse(raw) : [];
    const deletedRaw = localStorage.getItem(STORAGE_KEY_DELETED_BUILTINS);
    const deletedBuiltins: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    const activeBuiltIns = BUILT_IN_TABLE_TEMPLATES.filter((b) => !deletedBuiltins.includes(b.id));
    const all = [...activeBuiltIns, ...customList];
    if (sectionKey) {
      return all.filter((t) => (t.sectionKey || "varyasyonlar") === sectionKey);
    }
    return all;
  } catch {
    return [];
  }
}

/**
 * Yeni özel şablon kaydeder veya günceller.
 */
export function saveCustomTableTemplate(template: TableTemplate): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    const customList: TableTemplate[] = raw ? JSON.parse(raw) : [];
    const index = customList.findIndex((t) => t.id === template.id);
    if (index >= 0) {
      customList[index] = template;
    } else {
      customList.push(template);
    }
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(customList));

    // Eğer silinenler arasındaysa oradan çıkart
    const deletedRaw = localStorage.getItem(STORAGE_KEY_DELETED_BUILTINS);
    if (deletedRaw) {
      const deletedBuiltins: string[] = JSON.parse(deletedRaw);
      const filtered = deletedBuiltins.filter((id) => id !== template.id);
      localStorage.setItem(STORAGE_KEY_DELETED_BUILTINS, JSON.stringify(filtered));
    }
  } catch (err) {
    console.error("Şablon kaydedilemedi:", err);
  }
}

/**
 * Şablonu siler (hem özel hem yerleşik şablonlar için kalıcı silme).
 */
export function deleteCustomTableTemplate(templateId: string): void {
  try {
    // 1. Özel şablonlardan sil
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (raw) {
      const customList: TableTemplate[] = JSON.parse(raw);
      const updated = customList.filter((t) => t.id !== templateId);
      localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(updated));
    }

    // 2. Yerleşik şablonlar listesinden silinenlere ekle
    const deletedRaw = localStorage.getItem(STORAGE_KEY_DELETED_BUILTINS);
    const deletedBuiltins: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    if (!deletedBuiltins.includes(templateId)) {
      deletedBuiltins.push(templateId);
      localStorage.setItem(STORAGE_KEY_DELETED_BUILTINS, JSON.stringify(deletedBuiltins));
    }

    // 3. Aile varsayılan haritasından kaldır
    const mapRaw = localStorage.getItem(STORAGE_KEY_FAMILY_MAP);
    if (mapRaw) {
      const map: Record<string, string> = JSON.parse(mapRaw);
      let changed = false;
      Object.keys(map).forEach((k) => {
        if (map[k] === templateId) {
          delete map[k];
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEY_FAMILY_MAP, JSON.stringify(map));
      }
    }
  } catch (err) {
    console.error("Şablon silinemedi:", err);
  }
}

/**
 * Tüm kayıtlı özel şablonları temizler.
 */
export function clearAllCustomTableTemplates(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_TEMPLATES);
    localStorage.removeItem(STORAGE_KEY_FAMILY_MAP);
  } catch (err) {
    console.error("Şablonlar temizlenemedi:", err);
  }
}

/**
 * Aile ve bölüm bazlı varsayılan şablon haritasını döner.
 */
export function getFamilyTemplateMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAMILY_MAP);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Bir kablo ailesi ve belirli bir bölüm için varsayılan şablon atar.
 */
export function setFamilyDefaultTemplate(familyKey: string, sectionKey: string, templateId: string): void {
  try {
    const map = getFamilyTemplateMap();
    const mapKey = `${sectionKey || "varyasyonlar"}_${familyKey}`;
    map[mapKey] = templateId;
    localStorage.setItem(STORAGE_KEY_FAMILY_MAP, JSON.stringify(map));
  } catch (err) {
    console.error("Aile şablonu atanamadı:", err);
  }
}

/**
 * Kablo ailesine ve bölüme göre uygun şablonu bulur:
 * 1. Kullanıcının `${sectionKey}_${familyKey}` için atadığı varsayılan var mı?
 * 2. Bölüm içindeki aile doğrudan eşleşmesi var mı? (t.familyKey === familyKey)
 * 3. Bölümün ailesiz genel şablonu var mı? (yalnızca aileye özel şablon yoksa ve ailesizse)
 * 4. Şablon tanımlanmamışsa null döner (Tablo anahtar mantığı: şablon yoksa tablo oluşmaz).
 */
export function getTemplateForFamily(
  familyKey?: string,
  sectionKey: string = "varyasyonlar",
  allowFallbackDefault: boolean = false
): TableTemplate | null {
  const sectionTemplates = getSavedTableTemplates(sectionKey);
  const map = getFamilyTemplateMap();
  const mapKey = familyKey ? `${sectionKey}_${familyKey}` : "";

  // 1. Kullanıcı özel varsayılanı (Ailenin bu bölümü için açıkça atanmış şablon)
  if (mapKey && map[mapKey]) {
    const matched = sectionTemplates.find((t) => t.id === map[mapKey]);
    if (matched) return matched;
  }

  // 2. Aile doğrudan eşleşmesi (Aynı isimli bölümler aileler arası izole tutulur)
  if (familyKey) {
    const directMatch = sectionTemplates.find((t) => t.familyKey === familyKey);
    if (directMatch) return directMatch;
  }

  // 3. Bölümün ailesiz genel şablonu (Sadece familyKey belirtilmemişse veya genel şablona izin verildiğinde)
  if (!familyKey) {
    const generalMatch = sectionTemplates.find((t) => !t.familyKey);
    if (generalMatch) {
      return generalMatch;
    }
  }

  // 4. Şablon tanımlanmamışsa
  if (allowFallbackDefault) {
    return getDefaultEmptyTemplate(sectionKey);
  }
  return null;
}

/**
 * Ürün verisini şablon sütunlarıyla akıllıca eşleştirir.
 * Şablon sütun anahtarlarıyla uyuşan veriler yerleşir; eşleşmeyenler boş kalır.
 */
export function matchDataToTemplate(rawRows: any[], template: TableTemplate): any[] {
  // DURUM 1: Şablonda hazır satır iskeleti / parametre başlıkları varsa (Örn: Matris, Sıcaklık ve Teknik Tablolar)
  if (template.defaultRows && template.defaultRows.length > 0) {
    // Sütunları etiket ve ona bağlı değer gruplarına ayır (tekil veya çoklu etiket/değer çiftleri için)
    interface LabelValueGroup {
      labelCol: TableColumnDef;
      valueCols: TableColumnDef[];
    }
    const groups: LabelValueGroup[] = [];
    let currentGroup: LabelValueGroup | null = null;

    template.columns.forEach((col, idx) => {
      const isLabel = col.role === "label" || (idx === 0 && !template.columns.some((c) => c.role === "label"));
      if (isLabel) {
        currentGroup = { labelCol: col, valueCols: [] };
        groups.push(currentGroup);
      } else {
        if (!currentGroup) {
          currentGroup = { labelCol: template.columns[0], valueCols: [] };
          groups.push(currentGroup);
        }
        currentGroup.valueCols.push(col);
      }
    });

    return template.defaultRows.map((tplRow: any, rIdx: number) => {
      // Grup başlığı ise (koyu ayırıcı şerit) olduğu gibi koru
      if (tplRow.isGroupHeader) {
        return {
          id: tplRow.id || rIdx + 1,
          isGroupHeader: true,
          title: tplRow.title || "",
          indent: !!tplRow.indent,
        };
      }

      const matchedRow: any = { id: tplRow.id || rIdx + 1 };

      // Tüm etiket sütunlarını koru, şablondaki varsayılan değerleri koru
      groups.forEach((grp) => {
        const rawLabelVal =
          tplRow[grp.labelCol.key] !== undefined
            ? tplRow[grp.labelCol.key]
            : grp.labelCol.key === template.columns[0]?.key
            ? (tplRow.param || tplRow.parametre || tplRow.title || "")
            : "";
        matchedRow[grp.labelCol.key] = rawLabelVal !== undefined && rawLabelVal !== null ? String(rawLabelVal) : "";
        grp.valueCols.forEach((vc) => {
          matchedRow[vc.key] = tplRow[vc.key] !== undefined ? tplRow[vc.key] : "";
        });
      });

      // Kabloda bu bölüm için hiç veri yoksa, varsayılan şablon değerleriyle dön
      if (!rawRows || rawRows.length === 0) {
        return matchedRow;
      }

      // Her etiket grubu için kablodaki gerçek verileri ara ve eşleştir
      groups.forEach((grp) => {
        const labelText = String(matchedRow[grp.labelCol.key] || "").toLowerCase().trim();
        if (!labelText) return;

        // rawRows içinde bu parametreye uyan kablo kaydını ara
        const matchedRawItem = rawRows.find((item: any) => {
          if (!item || typeof item !== "object") return false;
          const itemParam = (
            item.parametre ||
            item.param ||
            item.test_adi ||
            item.kesit ||
            item.kesit_veya_cap ||
            item.katman_adi ||
            item.alan_adi ||
            item[grp.labelCol.key] ||
            Object.values(item)[0] ||
            ""
          ).toString().toLowerCase().trim();
          return itemParam && (itemParam === labelText || labelText.includes(itemParam) || itemParam.includes(labelText));
        });

        if (matchedRawItem) {
          if (grp.valueCols.length === 1) {
            const singleCol = grp.valueCols[0];
            const directVal =
              matchedRawItem[singleCol.key] !== undefined && matchedRawItem[singleCol.key] !== null
                ? matchedRawItem[singleCol.key]
                : matchedRawItem.deger !== undefined
                ? matchedRawItem.deger
                : matchedRawItem.val !== undefined
                ? matchedRawItem.val
                : matchedRawItem.value !== undefined
                ? matchedRawItem.value
                : matchedRawItem.sartname_degeri !== undefined
                ? matchedRawItem.sartname_degeri
                : matchedRawItem.standart_kodu !== undefined
                ? matchedRawItem.standart_kodu
                : matchedRawItem.tanim !== undefined
                ? matchedRawItem.tanim
                : "";
            if (directVal !== "") {
              matchedRow[singleCol.key] = directVal;
            }
          } else {
            // Çoklu değer sütunları (Örn: İletken Çapı 0.40, 0.50...)
            grp.valueCols.forEach((col) => {
              if (matchedRawItem[col.key] !== undefined && matchedRawItem[col.key] !== null && matchedRawItem[col.key] !== "") {
                matchedRow[col.key] = matchedRawItem[col.key];
              } else {
                const colTitleLower = col.title.toLowerCase().trim();
                const colKeyLower = col.key.toLowerCase().trim();
                for (const [k, v] of Object.entries(matchedRawItem)) {
                  if (["id", "include", "dahil", grp.labelCol.key].includes(k)) continue;
                  const kLower = k.toLowerCase().trim();
                  if (kLower === colKeyLower || colTitleLower.includes(kLower) || kLower.includes(colTitleLower)) {
                    if (v !== undefined && v !== null && v !== "") {
                      matchedRow[col.key] = v;
                    }
                    break;
                  }
                }
              }
            });
          }
        }
      });

      return matchedRow;
    });
  }

  // DURUM 2: Şablonda hazır defaultRows yoksa (Örn: Standart Varyasyon Tablosu)
  if (!rawRows || rawRows.length === 0) {
    const emptyRow: any = { id: 1 };
    template.columns.forEach((c) => {
      emptyRow[c.key] = "";
    });
    if (template.sectionKey === "varyasyonlar") {
      emptyRow.include = true;
      emptyRow.dahil = true;
    }
    return [emptyRow];
  }

  const FIELD_ALIASES: Record<string, string[]> = {
    part_numarasi: ["part_no", "partnumarasi", "urun_kodu", "part"],
    part_no: ["part_numarasi", "partnumarasi", "urun_kodu", "part"],
    kesit: ["iletken_kesiti", "iletken_capi", "iletken_kesiti_mm2", "iletken_capi_mm", "yapilandirma_ozeti", "cap", "kesit_veya_cap"],
    per_sayisi: ["damar_sayisi", "fiber_sayisi", "damar", "per", "count", "quad_sayisi"],
    fiber_sayisi: ["per_sayisi", "damar_sayisi", "damar", "fiber", "count"],
    dis_cap_mm: ["dis_cap", "cap", "ortalama_dis_cap_mm", "outer_dia"],
    bakir_agirligi_kg_km: ["bakir_agirligi", "bakir", "cu_weight", "cu_wt"],
    toplam_agirlik_kg_km: ["toplam_agirlik", "agirlik", "ortalama_agirlik_kg_km", "tot_weight", "weight"],
    sevk_boyu_m: ["sevk_boyu", "paketleme_boyu_m", "makara_boyu_m", "makara_boyu", "sevk_boylari", "packing"],
    iletken_direnci: ["iletken_direnci_ohm_km", "direnc", "dc_resistance"],
    izolasyon_direnci: ["izolasyon_direnci_mohm_km", "insulation_resistance"],
    efektif_kapasite: ["efektif_kapasite_nf_m", "efektif_kapasite_nf_km", "kapasite"],
    kapasite_dengesizligi: ["kapasite_dengesizligi_pf_500m", "capacitance_unbalance"],
    test_voltaji: ["test_voltaji_v", "test_voltage", "dielektrik_kuvveti"],
    bukulme_yaricapi: ["bukme_yaricapi_sabit", "bukme_yaricapi_hareketli", "bending_radius"],
    sicaklik_araligi: ["calisma_sicakligi", "operating_temperature"],
    frekans_mhz: ["frekans", "freq", "mhz", "frekans_degeri"],
    ek_kaybi: ["zayiflama_db", "attenuation", "il", "insertion_loss", "ek_kaybi_db_100m"],
    next_kaybi: ["next_db", "next", "near_end_crosstalk"],
    psnext_kaybi: ["ps_next_db", "psnext_db", "psnext", "power_sum_next"],
    elfext_kaybi: ["elfext_db", "elfext", "acrf", "equal_level_far_end_crosstalk"],
    pselfext_kaybi: ["ps_elfext_db", "pselfext_db", "pselfext", "psacrf"],
    donus_kaybi: ["return_loss_db", "return_loss", "rl", "donus_kaybi_db"],
    test_adi: ["parametre", "ozellik", "test", "standart_adi", "tanim"],
    parametre: ["test_adi", "ozellik", "test", "standart_adi"],
    standart_kodu: ["deger", "kod", "norm", "standart", "value"],
    deger: ["standart_kodu", "kod", "norm", "standart"],
    uretim_standartlari: ["uretim_standart", "standart_kodu", "referans_standardi", "tasarim_standardi"],
    duman_yogunluk: ["duman_yogunlugu_testi", "duman_testi", "smoke_density", "duman_yogunlugu"],
    korozif_gaz: ["asindirici_gaz_testi", "korozif_gaz_testi", "corrosive_gas", "asit_gazi"],
    alev_geciktiricilik: ["alev_geciktiricilik_testi", "flame_retardancy", "alev_testi"],
    alev_yayilim: ["alev_yayilim_testi", "flame_propagation"],
    halojensizlik: ["halojensizlik_testi", "halogen_free"],
    devre_butunlugu: ["yangina_dayaniklilik", "devre_butunlugu_testi", "circuit_integrity", "yangin_dayanimi"],
  };

  return rawRows.map((raw: any, idx: number) => {
    const row: any = {
      id: raw.id || idx + 1,
      include: raw.include !== false,
      dahil: raw.dahil !== false,
    };

    template.columns.forEach((col) => {
      // Doğrudan anahtar eşleşmesi
      if (raw[col.key] !== undefined && raw[col.key] !== null && raw[col.key] !== "") {
        row[col.key] = raw[col.key];
        return;
      }

      // Yaygın alan ve alias eşleşmeleri
      const targetKey = col.key.toLowerCase();
      const targetTitle = col.title.toLowerCase();
      const aliases = FIELD_ALIASES[targetKey] || [];

      let matchedVal: any = undefined;
      for (const [rk, rv] of Object.entries(raw)) {
        if (["id", "include", "dahil"].includes(rk)) continue;
        if (rv === undefined || rv === null || rv === "") continue;
        const rkLower = rk.toLowerCase();
        if (rkLower === targetKey || aliases.includes(rkLower) || targetKey.includes(rkLower) || rkLower.includes(targetKey)) {
          matchedVal = rv;
          break;
        }
        if (targetTitle.includes(rkLower) || rkLower.includes(targetTitle)) {
          matchedVal = rv;
          break;
        }
      }

      row[col.key] = matchedVal !== undefined ? matchedVal : (raw[col.key] !== undefined ? raw[col.key] : "");
    });

    return row;
  });
}

