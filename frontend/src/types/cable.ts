export interface CableVariation {
  id?: string | number;
  part_numarasi: string;
  lif_cinsi?: string;
  fiber_sayisi?: number | string;
  per_sayisi?: number | string;
  kesit?: string;
  dis_cap_mm: number | string;
  bakir_agirligi_kg_km?: number | string;
  toplam_agirlik_kg_km: number | string;
  sevk_boyu_m?: string;
  include?: boolean;
  [key: string]: any;
}

export interface CableLayer {
  order: number;
  label: string;
  desc: string;
  label_en?: string;
  desc_en?: string;
}

export interface MechanicalTest {
  test_parametre: string;
  test_standardi: string;
  sartname_degeri: string;
  kabul_kriteri: string;
  include?: boolean;
}

export interface StandardTest {
  test_adi: string;
  standart_kodu: string;
  include?: boolean;
}

export interface EnvironmentalSpecs {
  bukme_yaricapi_hareketli?: string;
  bukme_yaricapi_sabit?: string;
  depolama_sicakligi?: string;
  kurulum_sicakligi?: string;
  tasima_sicakligi?: string;
  calisma_sicakligi?: string;
  markalama_standardi?: string;
  paketleme_tipi?: string;
  sevk_boylari?: string;
}

export type PuzzleSectionId =
  | "kullanim_alanlari"
  | "kablo_yapisi"
  | "mekanik_ozellikler"
  | "standartlar"
  | "teknik_ozellikler"
  | "elektriksel_ozellikler"
  | "varyasyonlar"
  | "uygulama"
  | "markalama_paketleme"
  | (string & {});

export interface PuzzleSectionConfig {
  id: PuzzleSectionId;
  title_tr: string;
  title_en: string;
  enabled: boolean;
  order: number;
  description_tr?: string;
  isCommon?: boolean;
  isCustom?: boolean;
  layout?: "stacked" | "side_by_side";
}

export interface ElectricalSpecItem {
  urun_id?: number;
  kesit_veya_cap?: string;
  iletken_direnci_ohm_km?: string;
  izolasyon_direnci_mohm_km?: string;
  efektif_kapasite_nf_m?: string;
  karakteristik_empedans_ohm?: string;
  calisma_voltaji_v?: string;
  test_voltaji_v?: string;
  yayilma_hizi?: string;
  diger_elektriksel?: string;
  [key: string]: any;
}

export interface MechanicalSpecRawItem {
  ozellik_adi: string;
  deger: string;
  [key: string]: any;
}

export interface ProductDetail {
  id: number;
  urun_kodu: string;
  kategori: string;
  family_key: string;
  standart_kodu?: string;
  urun_aciklamasi?: string;
  dokuman_kodu?: string;
  kullanim_alanlari: string[];
  kablo_yapisi: CableLayer[];
  mekanik_testler: MechanicalTest[];
  uygulama_cevre: EnvironmentalSpecs;
  standartlar: StandardTest[];
  varyasyonlar: CableVariation[];
  elektriksel_ozellikler?: ElectricalSpecItem[];
  mekanik_ozellikler_ham?: MechanicalSpecRawItem[];
  teknik_ozellikler?: any[];
  lan_frekans_performansi?: any[];
  varsayilan_bolumler?: PuzzleSectionId[];
  markalama_metni?: string;
  paketleme_tipi?: string;
  sevk_boyu?: string;
}

export type CableData = ProductDetail;

export interface ProductSummary {
  id: number;
  urun_kodu: string;
  kategori: string;
  standart_kodu?: string;
  urun_aciklamasi?: string;
  dokuman_kodu?: string;
  variation_count: number;
  family_key: string;
}

export interface FamilySummary {
  family_key: string;
  display_name: string;
  display_en: string;
  product_count: number;
  variation_count: number;
  primary_color: string;
  tint_color: string;
  icon: string;
}

export interface CalculationRequest {
  pair_count: number;
  cross_section: number;
  is_armored: boolean;
  is_pimf: boolean;
  inner_sheath_thickness?: number;
  armor_wire_diameter?: number;
  outer_sheath_thickness?: number;
  part_prefix?: string;
}

export interface CalculationResponse {
  part_no: string;
  copper_weight_kg_km: number;
  outer_diameter_mm: number;
  total_weight_kg_km: number;
  packing: string;
  formula_breakdown: {
    pair_count: number;
    cores_total: number;
    cross_section: number;
    bundling_factor: number;
    is_armored: boolean;
    is_pimf: boolean;
  };
}
