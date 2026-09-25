import React, { useEffect, useState } from "react";
import { API_BASE, fetchFamilies, fetchProductDetail, fetchProducts } from "./services/api";
import { generateTdsPdf } from "./services/pdf/pdfEngine";
import {
  ETK_LOGO_SVG,
  COPPER_SIDE_RENDER,
  COPPER_CROSS_SECTION,
  FIBER_SIDE_RENDER,
  FIBER_CROSS_SECTION,
} from "./services/pdf/cableAssetsBase64";
import { CableVariation, FamilySummary, ProductDetail, ProductSummary, PuzzleSectionConfig, PuzzleSectionId } from "./types/cable";
import { getDefaultPuzzleSections } from "./types/puzzleSections";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { DynamicTable } from "./components/variations/VariationsTable";
import { TableDesigner } from "./components/designer/TableDesigner";
import { SelectTableModal } from "./components/modals/SelectTableModal";
import {
  TableTemplate,
  TableColumnDef,
  SectionTableInstance,
  createTableInstance,
  getTemplateForFamily,
  matchDataToTemplate,
} from "./types/tableTemplates";
import { CalculatorModal } from "./components/calculator/CalculatorModal";
import { TdsLivePreview } from "./components/preview/TdsLivePreview";
import { EditorSectionCard } from "./components/sections/EditorSectionCard";
import {
  Edit3,
  Eye,
  Sliders,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Cpu,
  Zap,
  Activity,
  Table,
  Plus,
  Download,
  Printer,
  Sparkles,
  FolderPlus,
  EyeOff,
  Trash2,
  Package,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const getDefaultUsageAreas = (familyKey?: string): string[] => {
  const map: Record<string, string[]> = {
    fiber_optik: [
      "Telekomünikasyon şebekeleri ve veri omurga hatlarında",
      "Bina içi (indoor) ve bina dışı (outdoor) kanal veya boru içi tesisatlarda",
      "Yüksek bant genişliği ve elektromanyetik parazitsiz uzun mesafe iletiminde",
    ],
    data_lan: [
      "Yapısal kablolama sistemlerinde ve veri merkezlerinde (Data Center)",
      "100/1000 Base-T Gigabit Ethernet ve yüksek hızlı ağ bağlantılarında",
      "Ofis, konut ve kampüs yerel alan ağları (LAN) altyapısında",
    ],
    yangina_dayanikli: [
      "Hastaneler, alışveriş merkezleri, havaalanları ve yüksek yapılı binalarda",
      "Yangın anında en az 180 dakika (FE180 / PH120) fonksiyon sürdürmesi gereken acil durum hatlarında",
      "Yangın alarm, acil aydınlatma, anons ve duman tahliye sistemlerinde",
    ],
    yangina_dayanikli_enerji: [
      "Hastaneler, alışveriş merkezleri ve tüneller gibi can güvenliğinin kritik olduğu tesislerde",
      "0.6/1 kV acil durum besleme ve yangın anında çalışması gereken enerji devrelerinde",
      "Alev altında devre bütünlüğünü koruyan enerji iletim hatlarında",
    ],
    yangin_alarm: [
      "Sabit bina içi yangın ihbar ve dedektör sistemlerinde",
      "Acil durum sinyal ve güvenlik devrelerinde",
      "Yangın anında zehirli gaz ve duman çıkarmayan (HFFR / LSZH) ortamlarda",
    ],
    sinyal_kontrol: [
      "Endüstriyel otomasyon ve proses kontrol tesisatlarında",
      "İmalat hatları, takım tezgahları ve montaj bantlarında",
      "Kuru ve nemli ortamlarda esnek veya sabit sinyal bağlantılarında",
    ],
    kontrol: [
      "Fabrika ve endüstriyel tesis kontrol panolarında",
      "Ölçüm, kontrol ve regülasyon devrelerinde",
      "Mekanik zorlanmaların orta derecede olduğu sabit tesisatlarda",
    ],
    enstrumantasyon: [
      "Petrokimya tesisleri, enerji santralleri ve rafinerilerde",
      "Analog ve dijital sinyallerin hassas ölçüm ve aktarım devrelerinde",
      "Dış elektromanyetik gürültülere karşı ekranlı veri iletiminde",
    ],
    bina_otomasyon: [
      "Akıllı bina yönetim sistemleri ve KNX / EIB bus haberleşme hatlarında",
      "Aydınlatma, iklimlendirme ve perde/panjur otomasyon sistemlerinde",
      "Sensör ve aktüatör bağlantılarında sabit iç mekan tesisatlarında",
    ],
    dahili_telefon: [
      "Bina içi telefon santralleri ve abone dağıtım hatlarında",
      "İç mekan analog/dijital ses ve sinyalizasyon şebekelerinde",
      "Bina içi zayıf akım sabit tesisatlarında",
    ],
    harici_telefon: [
      "Şehirlerarası ve yerel yeraltı telefon şebekelerinde",
      "Kablo kanallarında ve doğrudan toprak altına gömülerek",
      "Neme ve suya karşı dayanıklı dış ortam abone dağıtım hatlarında",
    ],
    koaksiyel: [
      "Kablo TV, uydu anten ve merkezi TV dağıtım sistemlerinde (SMATV / CATV)",
      "CCTV kapalı devre güvenlik ve kamera izleme sistemlerinde",
      "Yüksek frekanslı video ve RF sinyal iletiminde",
    ],
    cctv: [
      "CCTV kapalı devre kamera ve güvenlik izleme sistemlerinde",
      "Video, ses ve besleme geriliminin tek kabloyla iletiminde",
      "Bina içi ve bina dışı güvenlik izleme hatlarında",
    ],
    solar: [
      "Fotovoltaik (PV) güneş enerjisi panelleri ve dizi bağlantılarında",
      "Açık hava, UV ve doğrudan güneş ışığına maruz kalan solar tesisatlarda",
      "Inverter ve dağıtım kutusu ara bağlantılarında",
    ],
    silikon: [
      "Yüksek sıcaklığa maruz kalan fırın, döküm ve kimya tesislerinde",
      "Aşırı sıcaklık değişimlerinin olduğu ortamlarda (-60°C ile +180°C)",
      "Aydınlatma armatürleri ve ısıtıcı cihaz bağlantılarında",
    ],
  };
  return (familyKey && map[familyKey]) || [
    "Bina içi ve bina dışı haberleşme şebekelerinde",
    "Sabit tesisatlarda ses, sinyal ve veri iletiminde",
    "Endüstriyel tesisler ve bina yönetim altyapılarında",
  ];
};

export const App: React.FC = () => {
  const [lang, setLang] = useState<"tr" | "en">("tr");
  const [families, setFamilies] = useState<FamilySummary[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [currentProduct, setCurrentProduct] = useState<ProductDetail | null>(null);
  const [variations, setVariations] = useState<CableVariation[]>([]);
  const [techSpecs, setTechSpecs] = useState<any[]>([]);
  const [elecSpecs, setElecSpecs] = useState<any[]>([]);
  const [puzzleSections, setPuzzleSections] = useState<PuzzleSectionConfig[]>([]);

  // Sabit Tablolar (Kullanım Alanları & Kablo Katman Yapısı)
  const [usageTableRows, setUsageTableRows] = useState<any[]>([]);
  const [layerTableRows, setLayerTableRows] = useState<any[]>([]);

  // Her alana birden fazla tablo eklenebilir olmasını sağlayan durum
  const [sectionTables, setSectionTables] = useState<Record<string, SectionTableInstance[]>>({});
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState<boolean>(false);
  const [modalTargetSection, setModalTargetSection] = useState<{ key: string; title: string } | null>(null);

  const [activeTab, setActiveTab] = useState<"editor" | "designer" | "preview">("editor");
  const [isCalcOpen, setIsCalcOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Yeni bölüm ekleme formu durumu
  const [isAddingSection, setIsAddingSection] = useState<boolean>(false);
  const [newSectionTitleTr, setNewSectionTitleTr] = useState<string>("");
  const [newSectionTitleEn, setNewSectionTitleEn] = useState<string>("");

  const isTr = lang === "tr";
  const isFiber = currentProduct?.family_key === "fiber_optik";

  // İlk Yükleme: Aileleri ve Ürünleri Çek
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const fams = await fetchFamilies();
      setFamilies(fams);
      const prods = await fetchProducts();
      setProducts(prods);
      if (prods.length > 0) {
        loadProduct(prods[0].id);
      }
    } catch (err) {
      console.error("Başlangıç verisi yüklenemedi:", err);
    }
  };

  // Ürün Detayını Yükle
  const loadProduct = async (id: number) => {
    try {
      setSelectedProductId(id);
      const detail = await fetchProductDetail(id);

      // Sabit Kullanım Alanları ve Katman Yapısı Hazırlığı (Daima Dolu Gelmesi İçin)
      const defaultUsage = getDefaultUsageAreas(detail.family_key);
      const rawUsages = (detail.kullanim_alanlari && detail.kullanim_alanlari.length > 0)
        ? detail.kullanim_alanlari
        : defaultUsage;

      const usageRows = rawUsages.map((area: string, idx: number) => ({
        id: idx + 1,
        sira: idx + 1,
        alan_adi: typeof area === "string" ? area : (area as any).alan_adi || (area as any).tanim || Object.values(area)[0] || "",
      }));
      setUsageTableRows(usageRows);

      const rawLayers = (detail.kablo_yapisi && detail.kablo_yapisi.length > 0)
        ? detail.kablo_yapisi
        : [
            { order: 1, label: isTr ? "İletken" : "Conductor", desc: isTr ? "Som elektrolitik bakır tel" : "Solid bare copper" },
            { order: 2, label: isTr ? "Yalıtkan" : "Insulation", desc: isTr ? "Solid polietilen (PE)" : "Solid polyethylene (PE)" },
            { order: 3, label: isTr ? "Dış Kılıf" : "Outer Sheath", desc: isTr ? "PVC veya HFFR bileşik" : "PVC or HFFR compound" },
          ];

      const layerRows = rawLayers.map((l: any, idx: number) => ({
        id: idx + 1,
        sira: l.order || idx + 1,
        katman_adi: l.label || (isTr ? `Katman ${idx + 1}` : `Layer ${idx + 1}`),
        tanim: l.desc || "",
      }));
      setLayerTableRows(layerRows);

      detail.kullanim_alanlari = rawUsages;
      detail.kablo_yapisi = rawLayers.map((r: any, i: number) => ({
        order: i + 1,
        label: r.label || r.katman_adi || "",
        desc: r.desc || r.tanim || "",
      }));
      setCurrentProduct(detail);

      // Kablo ailesine özgü kurallara göre aktif ve sıralı bölümleri belirle
      const defaultSections = getDefaultPuzzleSections(detail.family_key, detail.varsayilan_bolumler);
      setPuzzleSections(defaultSections);
      const activeSectionIds = new Set(defaultSections.filter((s) => s.enabled).map((s) => s.id));

      const initialTables: Record<string, SectionTableInstance[]> = {};

      // 1. Teknik Özellikler Tablosu (Yalnızca ailenin aktif bölümleri arasındaysa)
      if (activeSectionIds.has("teknik_ozellikler")) {
        const tplTech = getTemplateForFamily(detail.family_key, "teknik_ozellikler", true);
        if (tplTech) {
          initialTables["teknik_ozellikler"] = [
            createTableInstance(
              tplTech,
              isTr ? "Teknik Özellikler" : "Technical Specifications",
              matchDataToTemplate(detail.teknik_ozellikler || [], tplTech)
            ),
          ];
        } else {
          initialTables["teknik_ozellikler"] = [];
        }
      } else {
        initialTables["teknik_ozellikler"] = [];
      }

      // 2. Elektriksel Özellikler Tablosu (Yalnızca ailenin aktif bölümleri arasındaysa)
      if (activeSectionIds.has("elektriksel_ozellikler")) {
        const tplElec = getTemplateForFamily(detail.family_key, "elektriksel_ozellikler", true);
        if (tplElec) {
          const elecSource =
            detail.family_key === "data_lan" && detail.lan_frekans_performansi && detail.lan_frekans_performansi.length > 0
              ? detail.lan_frekans_performansi
              : (detail.elektriksel_ozellikler || []);
          initialTables["elektriksel_ozellikler"] = [
            createTableInstance(
              tplElec,
              isTr ? "Elektriksel Özellikler" : "Electrical Specifications",
              matchDataToTemplate(elecSource, tplElec)
            ),
          ];
        } else {
          initialTables["elektriksel_ozellikler"] = [];
        }
      } else {
        initialTables["elektriksel_ozellikler"] = [];
      }

      // 3. Boyutlar ve Varyasyonlar Tablosu (Sayfa 2 - Her kabloda aktif)
      const tplVar = getTemplateForFamily(detail.family_key, "varyasyonlar", true);
      if (tplVar) {
        initialTables["varyasyonlar"] = [
          createTableInstance(
            tplVar,
            isTr ? "Boyutlar ve Ağırlıklar" : "Dimensions & Weights",
            matchDataToTemplate(detail.varyasyonlar || [], tplVar)
          ),
        ];
      } else {
        initialTables["varyasyonlar"] = [];
      }

      // 4. Mekanik ve Çevresel Özellikler Tablosu (Yalnızca ailenin aktif bölümleri arasındaysa)
      if (activeSectionIds.has("mekanik_ozellikler")) {
        const tplMech = getTemplateForFamily(detail.family_key, "mekanik_ozellikler", true);
        if (tplMech) {
          const mechRows: any[] = [];
          const env = detail.uygulama_cevre || {};
          if (env.bukme_yaricapi_hareketli) {
            mechRows.push({ id: mechRows.length + 1, parametre: isTr ? "Bükme Yarıçapı (Hareketli)" : "Bending (Flexible)", deger: env.bukme_yaricapi_hareketli, birim_standart: "mm" });
          }
          if (env.bukme_yaricapi_sabit) {
            mechRows.push({ id: mechRows.length + 1, parametre: isTr ? "Bükme Yarıçapı (Sabit)" : "Bending (Fixed)", deger: env.bukme_yaricapi_sabit, birim_standart: "mm" });
          }
          if (env.calisma_sicakligi) {
            mechRows.push({ id: mechRows.length + 1, parametre: isTr ? "Çalışma Sıcaklığı" : "Operating Temperature", deger: env.calisma_sicakligi, birim_standart: "°C" });
          }
          if (env.depolama_sicakligi) {
            mechRows.push({ id: mechRows.length + 1, parametre: isTr ? "Depolama Sıcaklığı" : "Storage Temperature", deger: env.depolama_sicakligi, birim_standart: "°C" });
          }
          if (env.kurulum_sicakligi) {
            mechRows.push({ id: mechRows.length + 1, parametre: isTr ? "Kurulum Sıcaklığı" : "Installation Temperature", deger: env.kurulum_sicakligi, birim_standart: "°C" });
          }
          if (env.tasima_sicakligi) {
            mechRows.push({ id: mechRows.length + 1, parametre: isTr ? "Taşıma Sıcaklığı" : "Transport Temperature", deger: env.tasima_sicakligi, birim_standart: "°C" });
          }
          if (detail.mekanik_testler && detail.mekanik_testler.length > 0) {
            detail.mekanik_testler.forEach((mt: any) => {
              mechRows.push({ id: mechRows.length + 1, parametre: mt.test_parametre, deger: mt.sartname_degeri || mt.kabul_kriteri || "", birim_standart: mt.test_standardi || "" });
            });
          }
          initialTables["mekanik_ozellikler"] = [
            createTableInstance(
              tplMech,
              isTr ? "Mekanik ve Çevresel Özellikler" : "Mechanical & Environmental Specs",
              matchDataToTemplate(mechRows, tplMech)
            ),
          ];
        } else {
          initialTables["mekanik_ozellikler"] = [];
        }
      } else {
        initialTables["mekanik_ozellikler"] = [];
      }

      // 5. Standartlar Tablosu: Kablonun datasına %100 sadık kalarak dinamik oluştur
      if (activeSectionIds.has("standartlar")) {
        const rawStds = detail.standartlar || [];
        const hasStdCode = detail.standart_kodu && detail.standart_kodu.trim() && detail.standart_kodu !== "-";

        // Kablonun sahip olduğu standartları sırasıyla topla
        const cableStandards: Array<{ test_adi: string; standart_kodu: string }> = [];

        // Standartlar listesinde üretim standardı var mı?
        const hasProdInList = rawStds.some((s: any) => {
          const t = (s.test_adi || "").toLowerCase();
          return t.includes("üretim") || t.includes("uretim") || t.includes("referans") || t.includes("standard");
        });

        if (hasStdCode && !hasProdInList) {
          cableStandards.push({
            test_adi: isTr ? "Üretim Standardları" : "Production Standards",
            standart_kodu: detail.standart_kodu.trim(),
          });
        }

        rawStds.forEach((s: any) => {
          let title = (s.test_adi || "").trim();
          // Bozuk encoding temizliği
          const lower = title.toLowerCase();
          if (lower.includes("retim") || lower.includes("referans")) title = isTr ? "Üretim Standardları" : "Production Standards";
          else if (lower.includes("duman")) title = isTr ? "Duman Yoğunluk Testi" : "Smoke Density Test";
          else if (lower.includes("korozif") || lower.includes("nd") || lower.includes("ndrc") || lower.includes("gaz")) title = isTr ? "Korozif Gaz Testi" : "Corrosive Gas Test";
          else if (lower.includes("halojen")) title = isTr ? "Halojensizlik Testi" : "Halogen-Free Test";
          else if (lower.includes("yay")) title = isTr ? "Alev Yayılım Testi" : "Flame Propagation Test";
          else if (lower.includes("geciktirici") || lower.includes("alev")) title = isTr ? "Alev Geciktiricilik Testi" : "Flame Retardancy Test";
          else if (lower.includes("fe180")) title = isTr ? "Devre Bütünlüğü Testi (FE180)" : "Circuit Integrity (FE180)";
          else if (lower.includes("ph120") || lower.includes("ok testi")) title = isTr ? "Şok Testi ile Devre Bütünlüğü (PH120)" : "Circuit Integrity with Shock (PH120)";
          else if (lower.includes("dayan")) title = isTr ? "Yangına Dayanım Testi" : "Fire Resistance Test";

          const code = (s.standart_kodu || "").trim();
          if (code && code !== "-") {
            cableStandards.push({
              test_adi: title,
              standart_kodu: code,
            });
          }
        });

        if (cableStandards.length > 0) {
          // Kabloda hangi testler varsa YALNIZCA o testleri sütun yap
          const dynamicColumns: TableColumnDef[] = cableStandards.map((std, idx) => ({
            key: `std_col_${idx}`,
            title: std.test_adi,
            align: "center",
            role: "value",
          }));

          const dynamicRow: any = { id: 1 };
          cableStandards.forEach((std, idx) => {
            dynamicRow[`std_col_${idx}`] = std.standart_kodu;
          });

          const dynamicTemplate: TableTemplate = {
            id: `tpl_dynamic_std_${detail.id}`,
            name: isTr ? "Standartlar ve Uygunluk" : "Standards & Compliance",
            sectionKey: "standartlar",
            familyKey: detail.family_key,
            description: "Kablonun katalog verisindeki gerçek standart ve testleri",
            showHeaderRow: true,
            layoutMode: "grid",
            stripingMode: "zebra",
            columns: dynamicColumns,
            defaultRows: [dynamicRow],
          };

          initialTables["standartlar"] = [
            createTableInstance(
              dynamicTemplate,
              isTr ? "Standartlar ve Uygunluk" : "Standards & Compliance",
              [dynamicRow]
            ),
          ];
        } else {
          initialTables["standartlar"] = [];
        }
      } else {
        initialTables["standartlar"] = [];
      }

      // 6. Uygulama Tablosu (Fiber Optik vb.)
      if (activeSectionIds.has("uygulama")) {
        const tplUyg = getTemplateForFamily(detail.family_key, "uygulama", true);
        if (tplUyg) {
          const uygRows: any[] = [];
          const env = detail.uygulama_cevre || {};
          if (env.kurulum_sicakligi) uygRows.push({ id: uygRows.length + 1, parametre: isTr ? "Kurulum Sıcaklığı" : "Installation Temp", deger: env.kurulum_sicakligi });
          if (env.calisma_sicakligi) uygRows.push({ id: uygRows.length + 1, parametre: isTr ? "Çalışma Sıcaklığı" : "Operating Temp", deger: env.calisma_sicakligi });
          if (env.depolama_sicakligi) uygRows.push({ id: uygRows.length + 1, parametre: isTr ? "Depolama Sıcaklığı" : "Storage Temp", deger: env.depolama_sicakligi });
          if (env.tasima_sicakligi) uygRows.push({ id: uygRows.length + 1, parametre: isTr ? "Taşıma Sıcaklığı" : "Transport Temp", deger: env.tasima_sicakligi });
          initialTables["uygulama"] = [
            createTableInstance(
              tplUyg,
              isTr ? "Uygulama" : "Application",
              matchDataToTemplate(uygRows, tplUyg)
            ),
          ];
        } else {
          initialTables["uygulama"] = [];
        }
      } else {
        initialTables["uygulama"] = [];
      }

      // 7. Markalama, Paketleme, Sevk Boyları Tablosu (Fiber Optik vb.)
      if (activeSectionIds.has("markalama_paketleme")) {
        const tplMark = getTemplateForFamily(detail.family_key, "markalama_paketleme", true);
        if (tplMark) {
          const markRows: any[] = [];
          if (detail.markalama_metni) {
            markRows.push({ id: 1, ozellik: isTr ? "Kablo Markalaması" : "Cable Marking", deger: detail.markalama_metni });
          }
          if (detail.paketleme_tipi) {
            markRows.push({ id: 2, ozellik: isTr ? "Paketleme" : "Packaging", deger: detail.paketleme_tipi });
          }
          if (detail.sevk_boyu) {
            markRows.push({ id: 3, ozellik: isTr ? "Sevk Boyu" : "Delivery Length", deger: detail.sevk_boyu });
          }
          initialTables["markalama_paketleme"] = [
            createTableInstance(
              tplMark,
              isTr ? "Markalama, Paketleme, Sevk Boyları" : "Marking, Packaging & Drum Lengths",
              matchDataToTemplate(markRows, tplMark)
            ),
          ];
        } else {
          initialTables["markalama_paketleme"] = [];
        }
      } else {
        initialTables["markalama_paketleme"] = [];
      }

      setSectionTables(initialTables);
      setVariations(detail.varyasyonlar || []);
      setTechSpecs(detail.teknik_ozellikler || []);
      setElecSpecs(detail.elektriksel_ozellikler || []);
    } catch (err) {
      console.error("Ürün detayı alınamadı:", err);
    }
  };

  // Tablo Verilerini Ürün Detayı ile Senkronize Etme Yardımcısı
  const syncSectionToProduct = (targetKey: string, updatedTables: SectionTableInstance[]) => {
    const allRows = updatedTables.flatMap((t) => t.data);
    if (targetKey === "varyasyonlar") {
      setVariations(allRows);
      if (currentProduct) setCurrentProduct((p) => (p ? { ...p, varyasyonlar: allRows } : null));
    } else if (targetKey === "teknik_ozellikler") {
      setTechSpecs(allRows);
      if (currentProduct) setCurrentProduct((p) => (p ? { ...p, teknik_ozellikler: allRows } : null));
    } else if (targetKey === "elektriksel_ozellikler") {
      setElecSpecs(allRows);
      if (currentProduct) setCurrentProduct((p) => (p ? { ...p, elektriksel_ozellikler: allRows } : null));
    } else if (targetKey === "kablo_yapisi") {
      const updatedLayers = allRows.map((r, idx) => {
        let label = r.katman_adi || r.katman || r.label || r.title || "";
        let desc = r.tanim || r.aciklama || r.desc || r.description || r.deger || "";
        if (!label && !desc) {
          const stringVals = Object.entries(r).filter(
            ([k, v]) => !["id", "sira", "include", "dahil"].includes(k) && typeof v === "string" && (v as string).trim()
          );
          if (stringVals.length >= 1) label = stringVals[0][1] as string;
          if (stringVals.length >= 2) desc = stringVals[1][1] as string;
        }
        return {
          order: Number(r.sira) || idx + 1,
          label: label || `Katman ${idx + 1}`,
          desc: desc || "",
        };
      });
      if (currentProduct) setCurrentProduct((p) => (p ? { ...p, kablo_yapisi: updatedLayers } : null));
    } else if (targetKey === "mekanik_ozellikler") {
      const newEnv = { ...(currentProduct?.uygulama_cevre || {}) };
      allRows.forEach((r) => {
        const param = (r.parametre || r.test_parametre || Object.values(r)[0] || "").toString().toLowerCase();
        const val = (r.deger || r.sartname_degeri || Object.values(r)[1] || "").toString();
        if (param.includes("hareketli")) newEnv.bukme_yaricapi_hareketli = val;
        else if (param.includes("sabit")) newEnv.bukme_yaricapi_sabit = val;
        else if (param.includes("çalışma") || param.includes("calisma") || param.includes("operating")) newEnv.calisma_sicakligi = val;
        else if (param.includes("depolama") || param.includes("storage")) newEnv.depolama_sicakligi = val;
        else if (param.includes("kurulum") || param.includes("installation")) newEnv.kurulum_sicakligi = val;
        else if (param.includes("taşıma") || param.includes("tasima") || param.includes("transport")) newEnv.tasima_sicakligi = val;
      });
      if (currentProduct) setCurrentProduct((p) => (p ? { ...p, uygulama_cevre: newEnv } : null));
    } else if (targetKey === "standartlar") {
      const updatedStds = allRows.map((r) => ({
        test_adi: r.test_adi || r.parametre || Object.values(r)[0] || "",
        standart_kodu: r.standart_kodu || r.deger || Object.values(r)[1] || "",
      }));
      if (currentProduct) setCurrentProduct((p) => (p ? { ...p, standartlar: updatedStds } : null));
    } else if (targetKey === "markalama_paketleme") {
      allRows.forEach((r) => {
        const ozellik = (r.ozellik || r.parametre || "").toString().toLowerCase();
        const val = (r.deger || r.tanim || "").toString();
        if (ozellik.includes("marka")) {
          if (currentProduct) setCurrentProduct((p) => (p ? { ...p, markalama_metni: val } : null));
        } else if (ozellik.includes("paket")) {
          if (currentProduct) setCurrentProduct((p) => (p ? { ...p, paketleme_tipi: val } : null));
        } else if (ozellik.includes("sevk") || ozellik.includes("boy")) {
          if (currentProduct) setCurrentProduct((p) => (p ? { ...p, sevk_boyu: val } : null));
        }
      });
    }
  };

  // Sabit Kullanım Alanları Tablosu Değişikliği
  const handleUsageTableChange = (newRows: any[]) => {
    setUsageTableRows(newRows);
    const newAreas = newRows
      .map((r) => (typeof r === "string" ? r : r.alan_adi || r.kullanim_alani || Object.values(r)[1] || Object.values(r)[0] || "").toString().trim())
      .filter(Boolean);
    setCurrentProduct((prev) => (prev ? { ...prev, kullanim_alanlari: newAreas } : null));
  };

  // Sabit Kablo Katman Yapısı Tablosu Değişikliği
  const handleLayerTableChange = (newRows: any[]) => {
    setLayerTableRows(newRows);
    const newLayers = newRows.map((r, i) => ({
      order: i + 1,
      label: (r.katman_adi || r.label || `Katman ${i + 1}`).toString().trim(),
      desc: (r.tanim || r.desc || "").toString().trim(),
    }));
    setCurrentProduct((prev) => (prev ? { ...prev, kablo_yapisi: newLayers } : null));
  };

  // Aile Filtreleme
  const handleSelectFamily = async (famKey: string) => {
    setSelectedFamily(famKey);
    try {
      const prods = await fetchProducts(famKey || undefined);
      setProducts(prods);
      if (prods.length > 0) {
        loadProduct(prods[0].id);
      }
    } catch (err) {
      console.error("Filtreleme hatası:", err);
    }
  };

  // Hızlı Arama
  const handleSearch = async (query: string) => {
    try {
      const prods = await fetchProducts(selectedFamily || undefined, query);
      setProducts(prods);
      if (prods.length > 0 && !prods.some((p) => p.id === selectedProductId)) {
        loadProduct(prods[0].id);
      }
    } catch (err) {
      console.error("Arama hatası:", err);
    }
  };

  // Tablo Ekleme Modalını Aç
  const handleOpenAddTableModal = (sectionKey: string, sectionTitle: string) => {
    setModalTargetSection({ key: sectionKey, title: sectionTitle });
    setIsAddTableModalOpen(true);
  };

  // Modal'dan Seçilen Şablonu İlgili Bölüme Yeni Tablo Olarak Ekle
  const handleSelectTemplateFromModal = (template: TableTemplate) => {
    if (!modalTargetSection) return;
    const targetKey = modalTargetSection.key;

    // Aktif kablodan ilgili bölümün ham verilerini çek
    let rawSectionData: any[] = [];
    if (targetKey === "teknik_ozellikler") {
      rawSectionData = currentProduct?.teknik_ozellikler || techSpecs || [];
    } else if (targetKey === "elektriksel_ozellikler") {
      const elecSource =
        currentProduct?.family_key === "data_lan" && currentProduct?.lan_frekans_performansi && currentProduct.lan_frekans_performansi.length > 0
          ? currentProduct.lan_frekans_performansi
          : (currentProduct?.elektriksel_ozellikler || elecSpecs || []);
      rawSectionData = elecSource;
    } else if (targetKey === "varyasyonlar") {
      rawSectionData = currentProduct?.varyasyonlar || variations || [];
    } else if (targetKey === "mekanik_ozellikler") {
      const mechRows: any[] = [];
      const env = currentProduct?.uygulama_cevre || {};
      if (env.bukme_yaricapi_hareketli) {
        mechRows.push({ id: mechRows.length + 1, parametre: isTr ? "Bükme Yarıçapı (Hareketli)" : "Bending (Flexible)", deger: env.bukme_yaricapi_hareketli, birim_standart: "mm" });
      }
      if (env.bukme_yaricapi_sabit) {
        mechRows.push({ id: mechRows.length + 1, parametre: isTr ? "Bükme Yarıçapı (Sabit)" : "Bending (Fixed)", deger: env.bukme_yaricapi_sabit, birim_standart: "mm" });
      }
      if (env.calisma_sicakligi) {
        mechRows.push({ id: mechRows.length + 1, parametre: isTr ? "Çalışma Sıcaklığı" : "Operating Temperature", deger: env.calisma_sicakligi, birim_standart: "°C" });
      }
      if (env.depolama_sicakligi) {
        mechRows.push({ id: mechRows.length + 1, parametre: isTr ? "Depolama Sıcaklığı" : "Storage Temperature", deger: env.depolama_sicakligi, birim_standart: "°C" });
      }
      if (env.kurulum_sicakligi) {
        mechRows.push({ id: mechRows.length + 1, parametre: isTr ? "Kurulum Sıcaklığı" : "Installation Temperature", deger: env.kurulum_sicakligi, birim_standart: "°C" });
      }
      if (env.tasima_sicakligi) {
        mechRows.push({ id: mechRows.length + 1, parametre: isTr ? "Taşıma Sıcaklığı" : "Transport Temperature", deger: env.tasima_sicakligi, birim_standart: "°C" });
      }
      if (currentProduct?.mekanik_testler && currentProduct.mekanik_testler.length > 0) {
        currentProduct.mekanik_testler.forEach((mt: any) => {
          mechRows.push({ id: mechRows.length + 1, parametre: mt.test_parametre, deger: mt.sartname_degeri || mt.kabul_kriteri || "", birim_standart: mt.test_standardi || "" });
        });
      }
      rawSectionData = mechRows;
    } else if (targetKey === "standartlar") {
      rawSectionData = (currentProduct?.standartlar || []).map((s: any, idx: number) => ({
        id: idx + 1,
        test_adi: s.test_adi || "",
        standart_kodu: s.standart_kodu || "",
      }));
    } else if (targetKey === "kablo_yapisi") {
      rawSectionData = layerTableRows && layerTableRows.length > 0 ? layerTableRows : (currentProduct?.kablo_yapisi || []).map((l: any, idx: number) => ({
        id: idx + 1,
        sira: l.order || idx + 1,
        katman_adi: l.label || (isTr ? `Katman ${idx + 1}` : `Layer ${idx + 1}`),
        tanim: l.desc || "",
      }));
    } else if (targetKey === "kullanim_alanlari") {
      rawSectionData = usageTableRows && usageTableRows.length > 0 ? usageTableRows : (currentProduct?.kullanim_alanlari || []).map((u: any, idx: number) => ({
        id: idx + 1,
        sira: idx + 1,
        alan_adi: typeof u === "string" ? u : u.alan_adi || u.kullanim_alani || "",
      }));
    } else if (currentProduct && (currentProduct as any)[targetKey]) {
      const customVal = (currentProduct as any)[targetKey];
      if (Array.isArray(customVal)) {
        rawSectionData = customVal;
      }
    }

    // Şablon iskeleti ile kablodaki gerçek verileri akıllıca eşleştir:
    // Eğer kabloda veri varsa çeker, veri yoksa değer hücreleri tamamen boş kalır
    const matchedData = matchDataToTemplate(rawSectionData, template);
    const newInst = createTableInstance(template, undefined, matchedData);

    setSectionTables((prev) => {
      const existing = prev[targetKey] || [];
      const updated = [...existing, newInst];
      syncSectionToProduct(targetKey, updated);
      return { ...prev, [targetKey]: updated };
    });

    setSaveToast(isTr ? `Tablo eklendi: ${template.name}` : `Table added: ${template.name}`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Tekil Tablo Örneğini Bölümden Kaldırma
  const handleRemoveTableInstance = (sectionKey: string, instanceId: string) => {
    setSectionTables((prev) => {
      const existing = prev[sectionKey] || [];
      const updated = existing.filter((t) => t.instanceId !== instanceId);
      syncSectionToProduct(sectionKey, updated);
      return { ...prev, [sectionKey]: updated };
    });

    setSaveToast(isTr ? "Tablo bölümden kaldırıldı." : "Table removed from section.");
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Tablo Hücre Verisi Değişimi
  const handleTableDataChange = (sectionKey: string, instanceId: string, newData: any[]) => {
    setSectionTables((prev) => {
      const existing = prev[sectionKey] || [];
      const updated = existing.map((t) =>
        t.instanceId === instanceId ? { ...t, data: newData } : t
      );
      syncSectionToProduct(sectionKey, updated);
      return { ...prev, [sectionKey]: updated };
    });
  };

  // Tablo Sütun Yapısı Değişimi (Sütun silme/ekleme/taşıma)
  const handleTableColumnsChange = (sectionKey: string, instanceId: string, newCols: any[]) => {
    setSectionTables((prev) => {
      const existing = prev[sectionKey] || [];
      const updated = existing.map((t) => {
        if (t.instanceId !== instanceId) return t;
        const isCornerBlank = newCols[0]?.hideHeader === true || !newCols[0]?.title || !newCols[0]?.title.trim();
        return {
          ...t,
          columns: newCols,
          blankCornerHeader: t.blankCornerHeader !== undefined ? t.blankCornerHeader : isCornerBlank,
        };
      });
      syncSectionToProduct(sectionKey, updated);
      return { ...prev, [sectionKey]: updated };
    });
  };

  // Tablo Başlığı Değişimi
  const handleUpdateTableTitle = (sectionKey: string, instanceId: string, newTitle: string) => {
    setSectionTables((prev) => {
      const existing = prev[sectionKey] || [];
      return {
        ...prev,
        [sectionKey]: existing.map((t) =>
          t.instanceId === instanceId ? { ...t, title: newTitle } : t
        ),
      };
    });
  };

  // Hesaplayıcıdan Varyasyon Ekleme
  const handleAddCalculatedVariation = (newVar: CableVariation) => {
    setSectionTables((prev) => {
      const existing = prev["varyasyonlar"] || [];
      if (existing.length === 0) {
        const tpl = getTemplateForFamily(currentProduct?.family_key, "varyasyonlar");
        const newInst = createTableInstance(tpl, undefined, [newVar]);
        return { ...prev, varyasyonlar: [newInst] };
      } else {
        const first = existing[0];
        const updatedFirst = { ...first, data: [newVar, ...first.data] };
        return { ...prev, varyasyonlar: [updatedFirst, ...existing.slice(1)] };
      }
    });
    setVariations((prev) => [newVar, ...prev]);
    setSaveToast(isTr ? "Hesaplanan varyasyon tabloya eklendi!" : "Calculated variation added to grid!");
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Bölüm Göz Kapatma / Açma (Aktif / Pasif)
  const handleToggleSection = (id: PuzzleSectionId) => {
    setPuzzleSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
    const target = puzzleSections.find((s) => s.id === id);
    const willBeEnabled = target ? !target.enabled : true;
    setSaveToast(
      willBeEnabled
        ? (isTr ? "Bölüm aktif edildi ve listeye dahil edildi." : "Section enabled.")
        : (isTr ? "Bölüm gizlendi ve sayfanın en altına taşındı." : "Section hidden and moved to bottom.")
    );
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Dinamik Bölümü Yukarı Taşıma (Sadece aktif bölümler arasında)
  const handleMoveDynamicSectionUp = (secId: PuzzleSectionId) => {
    setPuzzleSections((prev) => {
      const activeDynList = prev
        .filter((s) => s.id !== "kullanim_alanlari" && s.id !== "kablo_yapisi" && s.enabled)
        .sort((a, b) => a.order - b.order);
      const currentIdx = activeDynList.findIndex((s) => s.id === secId);
      if (currentIdx <= 0) return prev;
      const targetSecId = activeDynList[currentIdx - 1].id;

      const copy = [...prev];
      const idxA = copy.findIndex((s) => s.id === secId);
      const idxB = copy.findIndex((s) => s.id === targetSecId);
      if (idxA === -1 || idxB === -1) return prev;
      const tempOrder = copy[idxA].order;
      copy[idxA].order = copy[idxB].order;
      copy[idxB].order = tempOrder;
      return copy.map((s) => ({ ...s }));
    });
  };

  // Dinamik Bölümü Aşağı Taşıma (Sadece aktif bölümler arasında)
  const handleMoveDynamicSectionDown = (secId: PuzzleSectionId) => {
    setPuzzleSections((prev) => {
      const activeDynList = prev
        .filter((s) => s.id !== "kullanim_alanlari" && s.id !== "kablo_yapisi" && s.enabled)
        .sort((a, b) => a.order - b.order);
      const currentIdx = activeDynList.findIndex((s) => s.id === secId);
      if (currentIdx === -1 || currentIdx >= activeDynList.length - 1) return prev;
      const targetSecId = activeDynList[currentIdx + 1].id;

      const copy = [...prev];
      const idxA = copy.findIndex((s) => s.id === secId);
      const idxB = copy.findIndex((s) => s.id === targetSecId);
      if (idxA === -1 || idxB === -1) return prev;
      const tempOrder = copy[idxA].order;
      copy[idxA].order = copy[idxB].order;
      copy[idxB].order = tempOrder;
      return copy.map((s) => ({ ...s }));
    });
  };

  // Yeni Boş Özel Bölüm Ekleme
  const handleCreateCustomSection = () => {
    const titleTr = newSectionTitleTr.trim();
    if (!titleTr) return;
    const titleEn = newSectionTitleEn.trim() || titleTr;
    const secId = `ozel_${Date.now()}`;
    const maxOrder = puzzleSections.reduce((max, s) => Math.max(max, s.order || 0), 0);

    const newSec: PuzzleSectionConfig = {
      id: secId,
      title_tr: titleTr,
      title_en: titleEn,
      enabled: true,
      order: maxOrder + 1,
      isCustom: true,
    };

    setPuzzleSections((prev) => [...prev, newSec]);
    setSectionTables((prev) => ({
      ...prev,
      [secId]: [],
    }));

    setNewSectionTitleTr("");
    setNewSectionTitleEn("");
    setIsAddingSection(false);

    setSaveToast(isTr ? `Yeni bölüm oluşturuldu: ${titleTr}` : `New section created: ${titleTr}`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Özel Bölümü Silme
  const handleDeleteCustomSection = (secId: PuzzleSectionId) => {
    if (!window.confirm(isTr ? "Bu bölümü silmek istediğinize emin misiniz?" : "Are you sure you want to delete this section?")) {
      return;
    }
    setPuzzleSections((prev) => prev.filter((s) => s.id !== secId));
    setSectionTables((prev) => {
      const copy = { ...prev };
      delete copy[secId];
      return copy;
    });
    setSaveToast(isTr ? "Bölüm silindi." : "Section deleted.");
    setTimeout(() => setSaveToast(null), 2500);
  };

  // ─── DOM → Standalone HTML Serializer ──────────────────────────────────────
  // Tarayıcının render ettiği önizlemeyi (CSS dahil) alır ve Playwright için
  // tam bağımsız bir HTML dökümanı üretir. PDF = önizlemenin birebir kopyası.

  const buildStandaloneHtml = async (): Promise<string> => {
    const container = document.getElementById("tds-document-container");
    if (!container) throw new Error("Önizleme bulunamadı (#tds-document-container)");

    // 1) Tüm CSS kurallarını topla (Tailwind + özel stiller)
    let extractedCss = "";
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            extractedCss += rule.cssText + "\n";
          }
        } catch {
          // cross-origin stylesheet, atla
        }
      }
    } catch {
      // izin yok, atla
    }

    // 2) DOM klonu al ve baskı/PDF için temizle
    const clone = container.cloneNode(true) as HTMLElement;
    clone.id = "tds-document-container";
    clone.className = "tds-doc-print-container";
    clone.style.margin = "0";
    clone.style.padding = "0";
    clone.style.width = "210mm";
    clone.style.display = "block";

    // Her sayfa düğümünün ekran/UI stillerini kaldırıp saf A4 baskı stilleri tanımla
    const pages = Array.from(clone.querySelectorAll<HTMLElement>("[data-tds-page]"));
    pages.forEach((page, idx) => {
      page.classList.remove("shadow-xl", "border", "border-slate-300", "rounded-sm", "mx-auto");
      page.style.width = "210mm";
      page.style.minHeight = "297mm";
      page.style.maxHeight = "297mm";
      page.style.margin = "0";
      page.style.padding = "12mm";
      page.style.border = "none";
      page.style.boxShadow = "none";
      page.style.borderRadius = "0";
      page.style.backgroundColor = "#ffffff";
      page.style.boxSizing = "border-box";
      page.style.display = "flex";
      page.style.flexDirection = "column";
      page.style.justifyContent = "space-between";
      page.style.overflow = "hidden";
      if (idx === pages.length - 1) {
        page.style.breakAfter = "auto";
        page.style.pageBreakAfter = "auto";
      } else {
        page.style.breakAfter = "page";
        page.style.pageBreakAfter = "always";
      }
    });

    // 3) Görselleri %100 kesin base64 data URI'ya dönüştür
    const imgs = Array.from(clone.querySelectorAll<HTMLImageElement>("img"));
    await Promise.all(
      imgs.map(async (img) => {
        const currentSrc = img.getAttribute("src") || img.src || "";
        if (currentSrc.startsWith("data:")) return;

        // Logo eşleştirmesi
        if (currentSrc.includes("etk-logo") || currentSrc.includes("etk_logo")) {
          img.setAttribute("src", ETK_LOGO_SVG);
          return;
        }

        // Kablo görselleri eşleştirmesi
        if (currentSrc.includes("copper_side")) {
          img.setAttribute("src", COPPER_SIDE_RENDER);
          return;
        }
        if (currentSrc.includes("copper_cross")) {
          img.setAttribute("src", COPPER_CROSS_SECTION);
          return;
        }
        if (currentSrc.includes("fiber_side")) {
          img.setAttribute("src", FIBER_SIDE_RENDER);
          return;
        }
        if (currentSrc.includes("fiber_cross")) {
          img.setAttribute("src", FIBER_CROSS_SECTION);
          return;
        }

        // Orijinal DOM'da yüklü olan görselleri canvas ile kayıpsız dönüştür
        const originalImgs = Array.from(document.querySelectorAll<HTMLImageElement>("#tds-document-container img"));
        const match = originalImgs.find(
          (orig) => orig.getAttribute("src") === img.getAttribute("src") || orig.src === img.src
        );
        if (match && match.complete && match.naturalWidth > 0 && match.naturalHeight > 0) {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = match.naturalWidth;
            canvas.height = match.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(match, 0, 0);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
              if (dataUrl && dataUrl.startsWith("data:")) {
                img.setAttribute("src", dataUrl);
                return;
              }
            }
          } catch {
            // canvas tainted
          }
        }

        // FileReader ile güvenli dönüştür (call stack taşma hatası vermez)
        try {
          const fetchUrl = img.src || currentSrc;
          const res = await fetch(fetchUrl);
          if (res.ok) {
            const blob = await res.blob();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            if (dataUrl && dataUrl.startsWith("data:")) {
              img.setAttribute("src", dataUrl);
            }
          }
        } catch (e) {
          console.warn("Görsel dönüştürülemedi:", currentSrc, e);
        }
      })
    );

    // 4) A4 Baskı ve PDF Sayfa Düzeni (Önizleme ile piksel piksele birebir)
    const printOverrideCss = `
      @page {
        size: 210mm 297mm;
        margin: 0mm;
      }
      *, *::before, *::after {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 210mm !important;
        background: #ffffff !important;
        background-color: #ffffff !important;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        -webkit-font-smoothing: antialiased;
      }
      #tds-document-container, .tds-doc-print-container {
        margin: 0 !important;
        padding: 0 !important;
        width: 210mm !important;
        display: block !important;
        gap: 0 !important;
      }
      [data-tds-page], #tds-page-1, #tds-page-2 {
        width: 210mm !important;
        height: 297mm !important;
        min-height: 297mm !important;
        max-height: 297mm !important;
        margin: 0 !important;
        padding: 12mm !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background: #ffffff !important;
        background-color: #ffffff !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: always !important;
        break-after: page !important;
        overflow: hidden !important;
      }
      [data-tds-page]:last-child, #tds-page-2:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    `;

    // 5) Google Fonts linki
    const googleFonts = `<link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap">`;

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  ${googleFonts}
  <style>
    ${extractedCss}
    ${printOverrideCss}
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`;
  };

  // ─── Vektörel PDF Çıktısı Üret (DOM → Playwright) ─────────────────────────
  const handleExportPdf = async () => {
    if (!currentProduct) return;
    try {
      setIsExporting(true);

      const standaloneHtml = await buildStandaloneHtml();

      const safeName = (currentProduct.urun_kodu || "Kablo").replace(/[^\w\-.]/g, "_");

      const response = await fetch(`${API_BASE}/export/pdf/from-html`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: standaloneHtml,
          urun_kodu: currentProduct.urun_kodu,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}_TDS.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      // Fallback: backend erişilemiyorsa eski jsPDF motoru
      console.warn("Backend PDF hatası, fallback'e geçiliyor:", err.message);
      try {
        await generateTdsPdf(currentProduct, variations, lang, puzzleSections, sectionTables);
      } catch (fallbackErr: any) {
        alert(`PDF üretilirken hata oluştu: ${fallbackErr.message}`);
      }
    } finally {
      setIsExporting(false);
    }
  };
  // Bölümlerde birden çok tabloyu ve boş durumu render eden fonksiyon
  const renderSectionTablesContent = (sectionKey: string, sectionTitle: string, isFiberCable = false) => {
    const tables = sectionTables[sectionKey] || [];
    const isFixedSection = sectionKey === "kullanim_alanlari" || sectionKey === "kablo_yapisi";

    if (tables.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-300 hover:border-emerald-500/50 rounded-xl bg-slate-50/70 transition text-center group">
          <Table className="w-7 h-7 text-slate-400 group-hover:text-emerald-600 mb-2 transition" />
          <p className="text-xs text-slate-500 mb-3">
            {isTr ? "Bu bölüme henüz bir tablo eklenmedi." : "No table added to this section yet."}
          </p>
          <button
            type="button"
            onClick={() => handleOpenAddTableModal(sectionKey, sectionTitle)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isTr ? "Tablo Ekle" : "Add Table"}
          </button>
        </div>
      );
    }

    const secConfig = puzzleSections.find((s) => s.id === sectionKey);
    const layout = secConfig?.layout || "stacked";

    const handleToggleLayout = (e: React.MouseEvent) => {
      e.stopPropagation();
      setPuzzleSections((prev) =>
        prev.map((s) => (s.id === sectionKey ? { ...s, layout: layout === "stacked" ? "side_by_side" : "stacked" } : s))
      );
    };

    const layoutToggle = !isFixedSection && tables.length >= 2 && (
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={handleToggleLayout}
            className={`px-3 py-1 text-[11px] font-medium rounded-md transition ${layout !== "side_by_side" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {isTr ? "Alt Alta" : "Stacked"}
          </button>
          <button
            type="button"
            onClick={handleToggleLayout}
            className={`px-3 py-1 text-[11px] font-medium rounded-md transition ${layout === "side_by_side" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {isTr ? "Yan Yana" : "Side by Side"}
          </button>
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        {layoutToggle}
        <div className={layout === "side_by_side" && tables.length >= 2 ? "grid grid-cols-1 xl:grid-cols-2 gap-4 items-start" : "space-y-6"}>
        {tables.map((tableInst, tIdx) => (
          <div key={tableInst.instanceId} className="space-y-2">
            {!isFixedSection && tables.length > 1 && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {tableInst.title || `${isTr ? "Tablo" : "Table"} ${tIdx + 1}`}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                    {tableInst.data.length} {isTr ? "satır" : "rows"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTableInstance(sectionKey, tableInst.instanceId)}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600 px-2 py-0.5 rounded bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                    title={isTr ? "Tabloyu Kaldır" : "Remove Table"}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{isTr ? "Kaldır" : "Remove"}</span>
                  </button>
                </div>
              </div>
            )}
            <DynamicTable
              tableId={tableInst.instanceId}
              title={tableInst.title}
              onTitleChange={(newTitle) => handleUpdateTableTitle(sectionKey, tableInst.instanceId, newTitle)}
              initialTemplate={{
                id: tableInst.templateId,
                name: tableInst.title,
                sectionKey: sectionKey,
                columns: tableInst.columns,
                superHeaderTitle: tableInst.superHeaderTitle,
                superHeaderStartCol: tableInst.superHeaderStartCol,
                superHeaderColSpan: tableInst.superHeaderColSpan,
                showHeaderRow: tableInst.showHeaderRow,
                blankCornerHeader: tableInst.blankCornerHeader,
                layoutMode: tableInst.layoutMode,
                stripingMode: tableInst.stripingMode,
              }}
              sectionKey={sectionKey}
              sectionTitle={tableInst.title}
              initialData={tableInst.data}
              isFiber={isFiberCable}
              familyKey={currentProduct?.family_key}
              familyName={currentProduct?.kategori}
              lang={lang}
              onChange={(newData) => handleTableDataChange(sectionKey, tableInst.instanceId, newData)}
              onColumnsChange={(newCols) => handleTableColumnsChange(sectionKey, tableInst.instanceId, newCols)}
              onRemoveTable={() => handleRemoveTableInstance(sectionKey, tableInst.instanceId)}
              onOpenCalculator={sectionKey === "varyasyonlar" ? () => setIsCalcOpen(true) : undefined}
              showIncludeCheckbox={sectionKey === "varyasyonlar"}
              isFixed={isFixedSection}
            />
          </div>
        ))}
        </div>

        {/* Bölüme 2., 3. vb. Tablo Ekleme Butonu (Sabit bölümlerde gizlenir) */}
        {!isFixedSection && (
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {tables.length} {isTr ? "tablo tanımlı" : "tables configured"}
            </span>
            <button
              type="button"
              onClick={() => handleOpenAddTableModal(sectionKey, sectionTitle)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isTr ? "Bu Bölüme Tablo Ekle" : "Add Table to Section"}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Üst Header */}
      <Header
        lang={lang}
        onLangChange={setLang}
        productTitle={currentProduct?.urun_kodu}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sol Sidebar: 15 Aile & Arama */}
        <Sidebar
          families={families}
          products={products}
          selectedFamily={selectedFamily}
          selectedProductId={selectedProductId}
          onSelectFamily={handleSelectFamily}
          onSelectProduct={loadProduct}
          onSearch={handleSearch}
          lang={lang}
        />

        {/* Ana Çalışma Alanı */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50/60">
          {/* Çalışma Alanı Üst Sekmeleri (Editör / Canlı Önizleme / Tablo Tasarımcısı) */}
          <div className="h-12 border-b border-slate-200 bg-white/90 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("editor")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === "editor"
                    ? "bg-white text-emerald-700 border border-slate-200 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                {isTr ? "Mühendislik Editörü" : "Engineering Workspace"}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("designer")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === "designer"
                    ? "bg-white text-emerald-700 border border-slate-200 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                {isTr ? "Tablo Tasarımcısı" : "Table Designer"}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === "preview"
                    ? "bg-white text-emerald-700 border border-slate-200 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                {isTr ? "Canlı TDS Önizleme" : "Live TDS Preview (A4)"}
              </button>
            </div>

            {/* Bildirim Toast */}
            {saveToast && (
              <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                {saveToast}
              </div>
            )}
          </div>

          {/* İçerik Gövdesi */}
          <div className="flex-1 p-6">
            {activeTab === "designer" ? (
              /* ================== TABLO TASARIM SAYFASI ================== */
              <div className="max-w-7xl mx-auto">
                <TableDesigner
                  families={families}
                  lang={lang}
                  availableSections={puzzleSections}
                  onAddCustomSection={(titleTr, titleEn) => {
                    const secId = `ozel_${Date.now()}`;
                    const maxOrder = puzzleSections.reduce((max, s) => Math.max(max, s.order || 0), 0);
                    const newSec: PuzzleSectionConfig = {
                      id: secId,
                      title_tr: titleTr,
                      title_en: titleEn || titleTr,
                      enabled: true,
                      order: maxOrder + 1,
                      isCustom: true,
                    };
                    setPuzzleSections((prev) => [...prev, newSec]);
                    setSectionTables((prev) => ({ ...prev, [secId]: [] }));
                    return secId;
                  }}
                />
              </div>
            ) : !currentProduct ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                {isTr ? "Katalogdan bir kablo modeli seçiniz." : "Select a cable model from the catalog."}
              </div>
            ) : activeTab === "editor" ? (
              /* ================== EDITÖR SEKMESİ ================== */
              <div className="max-w-6xl mx-auto space-y-6">
                {/* 1. Künye ve Genel Özellikler Sabit Kartı */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      {isTr ? "Kablo Tanımı ve Standart Bilgileri" : "Cable Identification & Standards"}
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                      ID: {currentProduct.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {isTr ? "Kablo Adı / Modeli" : "Cable Model"}
                      </label>
                      <input
                        type="text"
                        value={currentProduct.urun_kodu}
                        onChange={(e) =>
                          setCurrentProduct({ ...currentProduct, urun_kodu: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {isTr ? "Standart Kodu" : "Standard Reference"}
                      </label>
                      <input
                        type="text"
                        value={currentProduct.standart_kodu || ""}
                        onChange={(e) =>
                          setCurrentProduct({ ...currentProduct, standart_kodu: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {isTr ? "Belge Kodu (Doküman No)" : "Document Number"}
                      </label>
                      <input
                        type="text"
                        value={currentProduct.dokuman_kodu || "B248"}
                        onChange={(e) =>
                          setCurrentProduct({ ...currentProduct, dokuman_kodu: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      {isTr ? "Ürün Açıklaması" : "Product Description"}
                    </label>
                    <textarea
                      rows={2}
                      value={currentProduct.urun_aciklamasi || ""}
                      onChange={(e) =>
                        setCurrentProduct({ ...currentProduct, urun_aciklamasi: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* 2. Sabit Temel Bölümler (Yan Yana): Kullanım Alanları & Kablo Katman Yapısı */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Sol: Kullanım Alanları Tablosu */}
                  <EditorSectionCard
                    title={isTr ? "Kullanım Alanları" : "Applications"}
                    badge={isTr ? "Sabit Temel Bölüm" : "Fixed Core Section"}
                    icon={<Sliders className="w-4 h-4 text-emerald-600" />}
                    enabled={true}
                    hideControls={true}
                    lang={lang}
                  >
                    <DynamicTable
                      tableId="table_kullanim_alanlari"
                      title={isTr ? "Kullanım Alanları" : "Applications"}
                      initialTemplate={{
                        id: "tpl_kullanim_alanlari",
                        name: isTr ? "Kullanım Alanları" : "Applications",
                        sectionKey: "kullanim_alanlari",
                        columns: [
                          { key: "sira", title: "No", align: "center", width: "w-16" },
                          { key: "alan_adi", title: isTr ? "Kullanım Alanı / Uygulama Yeri" : "Application Area / Usage", align: "left" },
                        ],
                      }}
                      sectionKey="kullanim_alanlari"
                      sectionTitle={isTr ? "Kullanım Alanları" : "Applications"}
                      initialData={usageTableRows}
                      isFiber={isFiber}
                      familyKey={currentProduct.family_key}
                      familyName={currentProduct.kategori}
                      lang={lang}
                      onChange={handleUsageTableChange}
                      isFixed={true}
                      showIncludeCheckbox={false}
                    />
                  </EditorSectionCard>

                  {/* Sağ: Kablo Katman Yapısı Tablosu */}
                  <EditorSectionCard
                    title={isTr ? "Kablo Katman Yapısı" : "Construction Layers"}
                    badge={isTr ? "Sabit Temel Bölüm" : "Fixed Core Section"}
                    icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
                    enabled={true}
                    hideControls={true}
                    lang={lang}
                  >
                    <DynamicTable
                      tableId="table_kablo_yapisi"
                      title={isTr ? "Kablo Katman Yapısı" : "Construction Layers"}
                      initialTemplate={{
                        id: "tpl_kablo_yapisi",
                        name: isTr ? "Kablo Katman Yapısı" : "Construction Layers",
                        sectionKey: "kablo_yapisi",
                        columns: [
                          { key: "sira", title: "No", align: "center", width: "w-16" },
                          { key: "katman_adi", title: isTr ? "Katman Adı" : "Layer Name", align: "left", width: "w-44", role: "label" },
                          { key: "tanim", title: isTr ? "Katman Tanımı / Malzeme" : "Description / Material", align: "left" },
                        ],
                      }}
                      sectionKey="kablo_yapisi"
                      sectionTitle={isTr ? "Kablo Katman Yapısı" : "Construction Layers"}
                      initialData={layerTableRows}
                      isFiber={isFiber}
                      familyKey={currentProduct.family_key}
                      familyName={currentProduct.kategori}
                      lang={lang}
                      onChange={handleLayerTableChange}
                      isFixed={true}
                      showIncludeCheckbox={false}
                    />
                  </EditorSectionCard>
                </div>

                {/* 3. DİNAMİK YAPBOZ BÖLÜM KUTULARI */}
                <div className="space-y-4">
                  {(() => {
                    const dynamicList = puzzleSections.filter(
                      (sec) => sec.id !== "kullanim_alanlari" && sec.id !== "kablo_yapisi"
                    );

                    // KURAL: Eğer bir bölüm gizliyse (enabled: false) otomatik olarak sayfanın en altına insin!
                    const sortedDynamicList = [...dynamicList].sort((a, b) => {
                      if (a.enabled && !b.enabled) return -1;
                      if (!a.enabled && b.enabled) return 1;
                      return a.order - b.order;
                    });

                    const activeDynCount = sortedDynamicList.filter((s) => s.enabled).length;
                    const firstHiddenIdx = sortedDynamicList.findIndex((s) => !s.enabled);

                    return sortedDynamicList.map((sec, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === activeDynCount - 1;
                      const isFirstHidden = idx === firstHiddenIdx;

                      const renderCard = () => {
                        switch (sec.id) {
                          case "teknik_ozellikler":
                            return (
                              <EditorSectionCard
                                key={sec.id}
                                title={isTr ? "Teknik Özellikler" : "Technical Specifications"}
                                badge={isTr ? "Teknik Tablo" : "Technical Grid"}
                                icon={<Cpu className="w-4 h-4 text-cyan-400" />}
                                enabled={sec.enabled}
                                isFirst={isFirst}
                                isLast={isLast}
                                onMoveUp={() => handleMoveDynamicSectionUp(sec.id)}
                                onMoveDown={() => handleMoveDynamicSectionDown(sec.id)}
                                onToggle={() => handleToggleSection(sec.id)}
                                lang={lang}
                              >
                                {renderSectionTablesContent("teknik_ozellikler", isTr ? "Teknik Özellikler" : "Technical Specs", isFiber)}
                              </EditorSectionCard>
                            );

                          case "elektriksel_ozellikler":
                            return (
                              <EditorSectionCard
                                key={sec.id}
                                title={isTr ? "Elektriksel Özellikler" : "Electrical Specifications"}
                                badge={isTr ? "Elektriksel Tablo" : "Electrical Grid"}
                                icon={<Zap className="w-4 h-4 text-amber-400" />}
                                enabled={sec.enabled}
                                isFirst={isFirst}
                                isLast={isLast}
                                onMoveUp={() => handleMoveDynamicSectionUp(sec.id)}
                                onMoveDown={() => handleMoveDynamicSectionDown(sec.id)}
                                onToggle={() => handleToggleSection(sec.id)}
                                lang={lang}
                              >
                                {renderSectionTablesContent("elektriksel_ozellikler", isTr ? "Elektriksel Özellikler" : "Electrical Specs", isFiber)}
                              </EditorSectionCard>
                            );

                          case "mekanik_ozellikler":
                            return (
                              <EditorSectionCard
                                key={sec.id}
                                title={isTr ? "Mekanik ve Çevresel Özellikler" : "Mechanical & Environmental Specs"}
                                badge={isTr ? "Mekanik Tablo" : "Mechanical Grid"}
                                icon={<Activity className="w-4 h-4 text-emerald-400" />}
                                enabled={sec.enabled}
                                isFirst={isFirst}
                                isLast={isLast}
                                onMoveUp={() => handleMoveDynamicSectionUp(sec.id)}
                                onMoveDown={() => handleMoveDynamicSectionDown(sec.id)}
                                onToggle={() => handleToggleSection(sec.id)}
                                lang={lang}
                              >
                                {renderSectionTablesContent("mekanik_ozellikler", isTr ? "Mekanik ve Çevresel Özellikler" : "Mechanical & Environmental Specs", isFiber)}
                              </EditorSectionCard>
                            );

                          case "standartlar":
                            return (
                              <EditorSectionCard
                                key={sec.id}
                                title={isTr ? "Standartlar ve Uygunluk" : "Standards & Compliance"}
                                badge={isTr ? "Standart Tablosu" : "Standards Grid"}
                                icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                enabled={sec.enabled}
                                isFirst={isFirst}
                                isLast={isLast}
                                onMoveUp={() => handleMoveDynamicSectionUp(sec.id)}
                                onMoveDown={() => handleMoveDynamicSectionDown(sec.id)}
                                onToggle={() => handleToggleSection(sec.id)}
                                lang={lang}
                              >
                                {renderSectionTablesContent("standartlar", isTr ? "Standartlar ve Uygunluk" : "Standards & Compliance", isFiber)}
                              </EditorSectionCard>
                            );

                          case "uygulama":
                            return (
                              <EditorSectionCard
                                key={sec.id}
                                title={isTr ? "Uygulama" : "Application"}
                                badge={isTr ? "Uygulama Tablosu" : "Application Grid"}
                                icon={<Sliders className="w-4 h-4 text-blue-400" />}
                                enabled={sec.enabled}
                                isFirst={isFirst}
                                isLast={isLast}
                                onMoveUp={() => handleMoveDynamicSectionUp(sec.id)}
                                onMoveDown={() => handleMoveDynamicSectionDown(sec.id)}
                                onToggle={() => handleToggleSection(sec.id)}
                                lang={lang}
                              >
                                {renderSectionTablesContent("uygulama", isTr ? "Uygulama" : "Application", false)}
                              </EditorSectionCard>
                            );

                          case "markalama_paketleme":
                            return (
                              <EditorSectionCard
                                key={sec.id}
                                title={isTr ? "Markalama, Paketleme, Sevk Boyları" : "Marking, Packaging & Drum Lengths"}
                                badge={isTr ? "Markalama Tablosu" : "Marking Grid"}
                                icon={<Package className="w-4 h-4 text-amber-500" />}
                                enabled={sec.enabled}
                                isFirst={isFirst}
                                isLast={isLast}
                                onMoveUp={() => handleMoveDynamicSectionUp(sec.id)}
                                onMoveDown={() => handleMoveDynamicSectionDown(sec.id)}
                                onToggle={() => handleToggleSection(sec.id)}
                                lang={lang}
                              >
                                {renderSectionTablesContent("markalama_paketleme", isTr ? "Markalama, Paketleme, Sevk Boyları" : "Marking, Packaging & Drum Lengths", false)}
                              </EditorSectionCard>
                            );

                          case "varyasyonlar":
                            return (
                              <EditorSectionCard
                                key={sec.id}
                                title={isTr ? "Boyutlar ve Ağırlıklar Tablosu (Varyasyonlar)" : "Dimensions & Weights Table"}
                                badge={isTr ? "Sayfa 2 Tablosu" : "Page 2 Grid"}
                                icon={<Table className="w-4 h-4 text-emerald-400" />}
                                enabled={sec.enabled}
                                isFirst={isFirst}
                                isLast={isLast}
                                onMoveUp={() => handleMoveDynamicSectionUp(sec.id)}
                                onMoveDown={() => handleMoveDynamicSectionDown(sec.id)}
                                onToggle={() => handleToggleSection(sec.id)}
                                lang={lang}
                              >
                                {renderSectionTablesContent("varyasyonlar", isTr ? "Boyutlar ve Ağırlıklar" : "Dimensions & Weights", isFiber)}
                              </EditorSectionCard>
                            );

                          default:
                            // Kullanıcı tarafından eklenen özel bölümler
                            return (
                              <EditorSectionCard
                                key={sec.id}
                                title={isTr ? sec.title_tr : sec.title_en}
                                badge={isTr ? "Özel Bölüm" : "Custom Section"}
                                icon={<FolderPlus className="w-4 h-4 text-purple-400" />}
                                enabled={sec.enabled}
                                isFirst={isFirst}
                                isLast={isLast}
                                onMoveUp={() => handleMoveDynamicSectionUp(sec.id)}
                                onMoveDown={() => handleMoveDynamicSectionDown(sec.id)}
                                onToggle={() => handleToggleSection(sec.id)}
                                onDelete={() => handleDeleteCustomSection(sec.id)}
                                lang={lang}
                              >
                                {renderSectionTablesContent(sec.id, isTr ? sec.title_tr : sec.title_en, isFiber)}
                              </EditorSectionCard>
                            );
                        }
                      };

                      return (
                        <React.Fragment key={sec.id}>
                          {isFirstHidden && (
                            <div className="pt-4 pb-2 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-500">
                              <div className="flex items-center gap-2">
                                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                <span>{isTr ? "Gizlenen Bölümler (PDF Çıktısına Dahil Edilmez - Sayfanın En Altında)" : "Hidden Sections (Excluded from PDF - At Bottom)"}</span>
                              </div>
                              <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-500">
                                {sortedDynamicList.length - activeDynCount} {isTr ? "gizli" : "hidden"}
                              </span>
                            </div>
                          )}
                          {renderCard()}
                        </React.Fragment>
                      );
                    });
                  })()}

                  {/* En Alta Yeni Bölüm Ekleme Alanı */}
                  <div className="pt-2">
                    {!isAddingSection ? (
                      <button
                        type="button"
                        onClick={() => setIsAddingSection(true)}
                        className="w-full py-3.5 px-4 rounded-xl border border-dashed border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/30 text-slate-600 hover:text-emerald-700 transition flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer group shadow-xs"
                      >
                        <Plus className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
                        <span>{isTr ? "Sayfanın En Altına Yeni Bölüm Ekle" : "Add New Section to Bottom"}</span>
                      </button>
                    ) : (
                      <div className="p-4 bg-white border border-emerald-300 rounded-xl shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FolderPlus className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-xs font-bold text-slate-800">
                              {isTr ? "Yeni Boş Bölüm Oluştur" : "Create New Custom Section"}
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsAddingSection(false)}
                            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              {isTr ? "Bölüm Başlığı (Türkçe) *" : "Section Title (Turkish) *"}
                            </label>
                            <input
                              type="text"
                              placeholder={isTr ? "Örn: Ek Mekanik Testler" : "e.g. Additional Tests"}
                              value={newSectionTitleTr}
                              onChange={(e) => setNewSectionTitleTr(e.target.value)}
                              autoFocus
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              {isTr ? "Bölüm Başlığı (İngilizce - Opsiyonel)" : "Section Title (English - Optional)"}
                            </label>
                            <input
                              type="text"
                              placeholder={isTr ? "Örn: Additional Tests" : "e.g. Additional Specs"}
                              value={newSectionTitleEn}
                              onChange={(e) => setNewSectionTitleEn(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddingSection(false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                          >
                            {isTr ? "İptal" : "Cancel"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateCustomSection}
                            disabled={!newSectionTitleTr.trim()}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isTr ? "Bölümü Oluştur" : "Create Section"}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ================== CANLI TDS ÖNİZLEME (A4) ================== */
              <div className="py-2 flex flex-col items-center">
                {/* Canlı Önizleme Eylem Çubuğu */}
                <div className="w-full max-w-[210mm] mb-4 bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        {isTr ? "Canlı Vektörel TDS Belgesi Önizlemesi" : "Live Vector TDS Document Preview"}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {isTr ? "Baskıya hazır A4 standardı (210 x 297 mm)" : "Print-ready A4 standard (210 x 297 mm)"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition border border-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{isTr ? "Yazdır" : "Print"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      disabled={isExporting}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                      {isExporting ? (
                        <Sparkles className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>{isTr ? "Vektörel PDF İndir (A4)" : "Download Vector PDF (A4)"}</span>
                    </button>
                  </div>
                </div>

                {currentProduct && (
                  <TdsLivePreview
                    data={currentProduct}
                    variations={variations}
                    puzzleSections={puzzleSections}
                    lang={lang}
                    sectionTables={sectionTables}
                  />
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Fiziksel Kablo Hesaplayıcı Modalı */}
      <CalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        onAddVariation={handleAddCalculatedVariation}
        lang={lang}
      />

      {/* Tablo Şablonu Seç ve Ekle Modalı */}
      <SelectTableModal
        isOpen={isAddTableModalOpen}
        onClose={() => setIsAddTableModalOpen(false)}
        onSelectTemplate={handleSelectTemplateFromModal}
        targetSectionKey={modalTargetSection?.key || "varyasyonlar"}
        targetSectionTitle={modalTargetSection?.title}
        currentFamilyKey={currentProduct?.family_key}
        families={families}
        lang={lang}
        onNavigateToDesigner={() => setActiveTab("designer")}
      />
    </div>
  );
};
