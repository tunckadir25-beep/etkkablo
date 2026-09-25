import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  TableTemplate,
  TableColumnDef,
  getSavedTableTemplates,
  saveCustomTableTemplate,
  deleteCustomTableTemplate,
  getDefaultEmptyTemplate,
  setFamilyDefaultTemplate,
  getFamilyTemplateMap,
  BUILT_IN_TABLE_TEMPLATES,
} from "../../types/tableTemplates";
import { FamilySummary, PuzzleSectionConfig } from "../../types/cable";
import { getFamilyColor } from "../../utils/cableColors";
import {
  Table as TableIcon,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  BookmarkCheck,
  Copy,
  Layers,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bot,
  Code2,
  CheckCircle2,
  ArrowRight,
  FileJson,
  BookOpen,
  Download,
  AlertCircle,
  Upload,
  Clipboard,
} from "lucide-react";

interface TableDesignerProps {
  families: FamilySummary[];
  lang?: "tr" | "en";
  availableSections?: PuzzleSectionConfig[];
  onAddCustomSection?: (titleTr: string, titleEn?: string) => string;
}

export const TableDesigner: React.FC<TableDesignerProps> = ({
  families,
  lang = "tr",
  availableSections = [],
  onAddCustomSection,
}) => {
  const isTr = lang === "tr";

  // Kablo Ailesi Filtresi ("all", "general" veya belirli family_key)
  const [selectedFamily, setSelectedFamily] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Şablonlar ve Varsayılanlar
  const [templates, setTemplates] = useState<TableTemplate[]>(() => getSavedTableTemplates());
  const [familyDefaultMap, setFamilyDefaultMap] = useState<Record<string, string>>(() => getFamilyTemplateMap());

  // Düzenleme / Yeni Oluşturma Durumu
  const [editingTemplate, setEditingTemplate] = useState<TableTemplate | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newColTitle, setNewColTitle] = useState<string>("");
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Dinamik / Özel Bölüm Ekleme Durumu
  const [userAddedSections, setUserAddedSections] = useState<Array<{ key: string; label: string; isCustom?: boolean }>>([]);
  const [isAddingNewSectionInline, setIsAddingNewSectionInline] = useState<boolean>(false);
  const [inlineSectionName, setInlineSectionName] = useState<string>("");

  // AI Asistanı & JSON İçe / Dışa Aktarma Durumları
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiModalTab, setAiModalTab] = useState<"prompt" | "import" | "export">("prompt");
  const [pastedJsonCode, setPastedJsonCode] = useState<string>("");
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [copiedExport, setCopiedExport] = useState<boolean>(false);
  const [exportTemplateId, setExportTemplateId] = useState<string>("");
  const [importSectionOverride, setImportSectionOverride] = useState<string>("");
  const [importFamilyOverride, setImportFamilyOverride] = useState<string | undefined>(undefined);
  const [sanitizeValuesOnImport, setSanitizeValuesOnImport] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Esc tuşu ile modalı kapatma
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAiModalOpen) {
        setIsAiModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAiModalOpen]);

  // Yeni Özel Bölüm Ekleme Fonksiyonu
  const handleAddInlineSection = () => {
    const trimmed = inlineSectionName.trim();
    if (!trimmed) return;
    let newKey: string;
    if (onAddCustomSection) {
      newKey = onAddCustomSection(trimmed, trimmed);
    } else {
      newKey = `ozel_${Date.now()}`;
    }
    const newEntry = {
      key: newKey,
      label: `${trimmed} (${isTr ? "Özel Bölüm" : "Custom"})`,
      isCustom: true,
    };
    setUserAddedSections((prev) => [...prev, newEntry]);
    if (editingTemplate) {
      setEditingTemplate({ ...editingTemplate, sectionKey: newKey });
    }
    setInlineSectionName("");
    setIsAddingNewSectionInline(false);
    setToastNotice(isTr ? `"${trimmed}" bölümü oluşturuldu ve seçildi.` : `"${trimmed}" section created and selected.`);
    setTimeout(() => setToastNotice(null), 3000);
  };

  // Dinamik Bölümler Listesi (Standart + Belgedeki Özel Bölümler + Yeni Eklenenler)
  const sectionsList = useMemo(() => {
    const baseList: Array<{ key: string; label: string; isCustom?: boolean }> = [
      { key: "varyasyonlar", label: isTr ? "Boyutlar ve Varyasyonlar" : "Dimensions & Variations" },
      { key: "teknik_ozellikler", label: isTr ? "Teknik Özellikler" : "Technical Specifications" },
      { key: "elektriksel_ozellikler", label: isTr ? "Elektriksel Özellikler" : "Electrical Specifications" },
      { key: "mekanik_ozellikler", label: isTr ? "Mekanik ve Çevresel" : "Mechanical & Environmental" },
      { key: "uygulama", label: isTr ? "Uygulama" : "Application" },
      { key: "markalama_paketleme", label: isTr ? "Markalama, Paketleme ve Sevk Boyları" : "Marking, Packaging & Drum Lengths" },
      { key: "standartlar", label: isTr ? "Standartlar ve Uygunluk" : "Standards & Compliance" },
      { key: "kablo_yapisi", label: isTr ? "Kablo Yapısı ve Katmanlar" : "Cable Construction & Layers" },
      { key: "kullanim_alanlari", label: isTr ? "Kullanım Alanları" : "Application Areas" },
    ];

    const knownKeys = new Set(baseList.map((s) => s.key));

    // 1. Belgede mevcut bölümler (özellikle sonradan eklenmiş tüm özel alanlar)
    if (availableSections && availableSections.length > 0) {
      availableSections.forEach((sec) => {
        if (!knownKeys.has(sec.id)) {
          knownKeys.add(sec.id);
          const rawTitle = isTr ? (sec.title_tr || sec.id) : (sec.title_en || sec.title_tr || sec.id);
          baseList.push({
            key: sec.id,
            label: sec.isCustom ? `${rawTitle} (${isTr ? "Özel Bölüm" : "Custom"})` : rawTitle,
            isCustom: sec.isCustom,
          });
        }
      });
    }

    // 2. Kullanıcının bu ekranda doğrudan eklediği özel bölümler
    userAddedSections.forEach((sec) => {
      if (!knownKeys.has(sec.key)) {
        knownKeys.add(sec.key);
        baseList.push(sec);
      }
    });

    // 3. Şablonlarda kayıtlı olabilecek diğer özel bölümler
    templates.forEach((tpl) => {
      if (tpl.sectionKey && !knownKeys.has(tpl.sectionKey)) {
        knownKeys.add(tpl.sectionKey);
        baseList.push({
          key: tpl.sectionKey,
          label: `${tpl.sectionKey} (${isTr ? "Özel Alan" : "Custom"})`,
          isCustom: true,
        });
      }
    });

    return baseList;
  }, [isTr, availableSections, templates, userAddedSections]);

  // Aile Bazında Şablon Sayıları
  const familyCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: templates.length,
      general: templates.filter((t) => !t.familyKey).length,
    };
    families.forEach((f) => {
      counts[f.family_key] = templates.filter((t) => t.familyKey === f.family_key).length;
    });
    return counts;
  }, [templates, families]);

  // Filtrelenmiş Şablonlar (SADECE kablo ailesi ve arama bazlı, bölüm bazlı DEĞİL)
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      // 1. Kablo Ailesi Kontrolü
      if (selectedFamily === "general") {
        if (tpl.familyKey) return false;
      } else if (selectedFamily !== "all") {
        if (tpl.familyKey !== selectedFamily) return false;
      }

      // 2. Arama Kontrolü
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = tpl.name.toLowerCase().includes(q);
        const matchDesc = tpl.description?.toLowerCase().includes(q);
        const matchCols = tpl.columns.some((c) => c.title.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchCols) return false;
      }

      return true;
    });
  }, [templates, selectedFamily, searchQuery]);

  // Yeni Şablon Tasarlamaya Başla
  const handleStartNew = () => {
    const targetFamily = selectedFamily !== "all" && selectedFamily !== "general" ? selectedFamily : undefined;
    const famObj = families.find((f) => f.family_key === targetFamily);
    const defaultCols = getDefaultEmptyTemplate("varyasyonlar").columns.map((c) => ({ ...c }));
    const fresh: TableTemplate = {
      id: `tpl_${Date.now()}`,
      name: isTr
        ? famObj
          ? `${famObj.display_name} Tablosu`
          : "Yeni Tablo Şablonu"
        : "New Table Template",
      sectionKey: "varyasyonlar",
      familyKey: targetFamily,
      isBuiltIn: false,
      columns: defaultCols.length > 0 ? defaultCols : [
        { key: "col_1", title: isTr ? "Parametre 1" : "Param 1", align: "left", width: "min-w-[120px]" },
        { key: "col_2", title: isTr ? "Değer / Birim" : "Value / Unit", align: "center", width: "min-w-[100px]" },
      ],
    };
    setEditingTemplate(fresh);
    setIsCreatingNew(true);
  };

  // Mevcut Şablonu Düzenlemeye Başla
  const handleStartEdit = (tpl: TableTemplate) => {
    setEditingTemplate(JSON.parse(JSON.stringify(tpl)));
    setIsCreatingNew(false);
  };

  // Şablonu Klonla
  const handleClone = (tpl: TableTemplate) => {
    const cloned: TableTemplate = {
      ...JSON.parse(JSON.stringify(tpl)),
      id: `tpl_${Date.now()}`,
      name: `${tpl.name} (${isTr ? "Kopya" : "Copy"})`,
      isBuiltIn: false,
    };
    saveCustomTableTemplate(cloned);
    setTemplates(getSavedTableTemplates());
    setToastNotice(isTr ? `"${cloned.name}" oluşturuldu.` : `"${cloned.name}" created.`);
    setTimeout(() => setToastNotice(null), 3000);
  };

  // Şablonu Sil (Onaylı)
  const handleDelete = (id: string) => {
    const toDelete = templates.find((t) => t.id === id);
    const confirmMsg = isTr
      ? `"${toDelete?.name || "Şablon"}" silinsin mi?`
      : `Delete template "${toDelete?.name || "template"}"?`;
    if (window.confirm(confirmMsg)) {
      deleteCustomTableTemplate(id);
      setTemplates(getSavedTableTemplates());
      setFamilyDefaultMap(getFamilyTemplateMap());
      setToastNotice(isTr ? "Şablon silindi." : "Template deleted.");
      setTimeout(() => setToastNotice(null), 3000);
    }
  };

  // Bir Aile İçin Varsayılan Olarak Ata
  const handleSetDefault = (tpl: TableTemplate, famKey: string) => {
    setFamilyDefaultTemplate(famKey, tpl.sectionKey || "varyasyonlar", tpl.id);
    setFamilyDefaultMap(getFamilyTemplateMap());
    const famObj = families.find((f) => f.family_key === famKey);
    setToastNotice(
      isTr
        ? `"${tpl.name}", ${famObj?.display_name || famKey} ailesinin varsayılanı yapıldı.`
        : `"${tpl.name}" set as default for ${famObj?.display_name || famKey}.`
    );
    setTimeout(() => setToastNotice(null), 3500);
  };

  // Tasarım Editöründe Sütun Ekle
  const handleAddColumnToEditor = () => {
    if (!editingTemplate || !newColTitle.trim()) return;
    const colKey = `col_${Date.now()}`;
    const newCol: TableColumnDef = {
      key: colKey,
      title: newColTitle.trim(),
      align: "center",
      width: "min-w-[100px]",
      isCustom: true,
    };
    setEditingTemplate({
      ...editingTemplate,
      columns: [...editingTemplate.columns, newCol],
    });
    setNewColTitle("");
  };

  // Tasarım Editöründe Sütun Sil
  const handleRemoveColumnFromEditor = (idx: number) => {
    if (!editingTemplate || editingTemplate.columns.length <= 1) return;
    const nextCols = [...editingTemplate.columns];
    nextCols.splice(idx, 1);
    setEditingTemplate({ ...editingTemplate, columns: nextCols });
  };

  // Tasarım Editöründe Sütun Sırala
  const handleMoveColumnInEditor = (idx: number, dir: "left" | "right") => {
    if (!editingTemplate) return;
    const targetIdx = dir === "left" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= editingTemplate.columns.length) return;
    const nextCols = [...editingTemplate.columns];
    const temp = nextCols[idx];
    nextCols[idx] = nextCols[targetIdx];
    nextCols[targetIdx] = temp;
    setEditingTemplate({ ...editingTemplate, columns: nextCols });
  };

  // Tasarım Editöründe Sütun Hizalamasını Değiştir
  const handleToggleAlign = (idx: number) => {
    if (!editingTemplate) return;
    const nextCols = [...editingTemplate.columns];
    const cur = nextCols[idx].align || "left";
    const nextAlign = cur === "left" ? "center" : cur === "center" ? "right" : "left";
    nextCols[idx] = { ...nextCols[idx], align: nextAlign };
    setEditingTemplate({ ...editingTemplate, columns: nextCols });
  };

  // Tasarım Editöründe Sütun Rolünü Değiştir (Etiket / Değer)
  const handleToggleColumnRole = (idx: number) => {
    if (!editingTemplate) return;
    const nextCols = [...editingTemplate.columns];
    const cur = nextCols[idx].role || "value";
    nextCols[idx] = {
      ...nextCols[idx],
      role: cur === "value" ? "label" : "value",
    };
    setEditingTemplate({ ...editingTemplate, columns: nextCols });
  };

  // Tasarım Editöründe Sütun Başlığını Değiştir
  const handleUpdateColumnTitle = (idx: number, newTitle: string) => {
    if (!editingTemplate) return;
    const nextCols = [...editingTemplate.columns];
    const isFirstCol = idx === 0;
    const isBlank = isFirstCol && (!newTitle || !newTitle.trim());
    nextCols[idx] = {
      ...nextCols[idx],
      title: newTitle,
      hideHeader: isFirstCol ? (isBlank ? true : nextCols[idx].hideHeader) : nextCols[idx].hideHeader,
    };
    setEditingTemplate({
      ...editingTemplate,
      blankCornerHeader: isFirstCol ? (isBlank ? true : editingTemplate.blankCornerHeader) : editingTemplate.blankCornerHeader,
      columns: nextCols,
    });
  };

  // Tasarım Editöründe Canlı Önizleme Satır Hücresini / Başlığını Değiştir
  const handleUpdateRowCell = (rIdx: number, colKey: string, val: string) => {
    if (!editingTemplate) return;
    const currentRows = editingTemplate.defaultRows && editingTemplate.defaultRows.length > 0
      ? [...editingTemplate.defaultRows]
      : [
          { id: 1, [colKey]: val },
          { id: 2 }
        ];
    const row = { ...(currentRows[rIdx] || { id: rIdx + 1 }), [colKey]: val };
    currentRows[rIdx] = row;
    setEditingTemplate({ ...editingTemplate, defaultRows: currentRows });
  };

  // Tasarım Editöründe Yeni Satır Ekle
  const handleAddDefaultRow = () => {
    if (!editingTemplate) return;
    const currentRows = editingTemplate.defaultRows ? [...editingTemplate.defaultRows] : [];
    const newRow: any = { id: Date.now() };
    editingTemplate.columns.forEach((c) => {
      newRow[c.key] = c.role === "label" ? (isTr ? `Parametre ${currentRows.length + 1}` : `Param ${currentRows.length + 1}`) : "";
    });
    setEditingTemplate({ ...editingTemplate, defaultRows: [...currentRows, newRow] });
  };

  // Tasarım Editöründe Grup Başlığı / Alt Grup Ekle
  const handleAddGroupHeader = (isSubGroup: boolean = false) => {
    if (!editingTemplate) return;
    const currentRows = editingTemplate.defaultRows ? [...editingTemplate.defaultRows] : [];
    const newGroupRow: any = {
      id: Date.now(),
      isGroupHeader: true,
      title: isSubGroup
        ? (isTr ? "Yeni Alt Grup Başlığı" : "New Sub Group Header")
        : (isTr ? "Yeni Ana Başlık / Grup" : "New Section Header"),
      indent: isSubGroup,
    };
    setEditingTemplate({ ...editingTemplate, defaultRows: [...currentRows, newGroupRow] });
  };

  // Grup Başlığı Metnini Güncelle
  const handleUpdateGroupTitle = (rIdx: number, newTitle: string) => {
    if (!editingTemplate || !editingTemplate.defaultRows) return;
    const currentRows = [...editingTemplate.defaultRows];
    currentRows[rIdx] = { ...currentRows[rIdx], title: newTitle };
    setEditingTemplate({ ...editingTemplate, defaultRows: currentRows });
  };

  // Grup Başlığı Girintisini Değiştir (Ana Başlık <-> Alt Grup)
  const handleToggleGroupIndent = (rIdx: number) => {
    if (!editingTemplate || !editingTemplate.defaultRows) return;
    const currentRows = [...editingTemplate.defaultRows];
    const cur = currentRows[rIdx];
    currentRows[rIdx] = { ...cur, indent: !cur.indent };
    setEditingTemplate({ ...editingTemplate, defaultRows: currentRows });
  };

  // Satırı Yukarı/Aşağı Taşı
  const handleMoveRowInEditor = (rIdx: number, dir: "up" | "down") => {
    if (!editingTemplate || !editingTemplate.defaultRows) return;
    const targetIdx = dir === "up" ? rIdx - 1 : rIdx + 1;
    if (targetIdx < 0 || targetIdx >= editingTemplate.defaultRows.length) return;
    const currentRows = [...editingTemplate.defaultRows];
    const temp = currentRows[rIdx];
    currentRows[rIdx] = currentRows[targetIdx];
    currentRows[targetIdx] = temp;
    setEditingTemplate({ ...editingTemplate, defaultRows: currentRows });
  };

  // Tasarım Editöründe Satır Sil
  const handleRemoveDefaultRow = (rIdx: number) => {
    if (!editingTemplate || !editingTemplate.defaultRows) return;
    const currentRows = [...editingTemplate.defaultRows];
    currentRows.splice(rIdx, 1);
    setEditingTemplate({ ...editingTemplate, defaultRows: currentRows });
  };

  // Hızlı Şablon Kalıbı Uygula (Önceden Tanımlı Mimari)
  const handleApplyPreset = (presetType: "temperature" | "properties" | "matrix" | "standard" | "iec_mechanical") => {
    if (!editingTemplate) return;
    if (presetType === "temperature") {
      setEditingTemplate({
        ...editingTemplate,
        name: isTr ? "Sıcaklık Aralığı Tablosu" : "Temperature Range Table",
        superHeaderTitle: isTr ? "Sıcaklık Aralığı" : "Temperature Range",
        showHeaderRow: false,
        columns: [
          { key: "label_1", title: isTr ? "Durum 1" : "Condition 1", align: "left", role: "label" },
          { key: "val_1", title: isTr ? "Değer 1" : "Value 1", align: "center", role: "value" },
          { key: "label_2", title: isTr ? "Durum 2" : "Condition 2", align: "left", role: "label" },
          { key: "val_2", title: isTr ? "Değer 2" : "Value 2", align: "center", role: "value" },
        ],
        defaultRows: [
          { id: 1, label_1: isTr ? "Depolama Sıcaklığı" : "Storage Temp", val_1: "", label_2: isTr ? "Çalışma Sıcaklığı" : "Operating Temp", val_2: "" },
          { id: 2, label_1: isTr ? "Kurulum Sıcaklığı" : "Installation Temp", val_1: "", label_2: isTr ? "Taşıma Sıcaklığı" : "Transport Temp", val_2: "" },
        ],
      });
    } else if (presetType === "properties") {
      setEditingTemplate({
        ...editingTemplate,
        name: isTr ? "Markalama ve Paketleme Tablosu" : "Marking & Packaging Table",
        superHeaderTitle: "",
        showHeaderRow: false,
        columns: [
          { key: "ozellik", title: isTr ? "Özellik / Parametre" : "Property", align: "left", role: "label" },
          { key: "deger", title: isTr ? "Açıklama / Şartname" : "Description", align: "left", role: "value" },
        ],
        defaultRows: [
          { id: 1, ozellik: isTr ? "Markalama Metni" : "Sheath Marking", deger: "" },
          { id: 2, ozellik: isTr ? "Paketleme Şekli" : "Packing Type", deger: "" },
          { id: 3, ozellik: isTr ? "Sevk Boyları" : "Delivery Lengths", deger: "" },
        ],
      });
    } else if (presetType === "matrix") {
      setEditingTemplate({
        ...editingTemplate,
        name: isTr ? "Elektriksel Matris Tablosu" : "Electrical Matrix Table",
        superHeaderTitle: isTr ? "İletken Çapı" : "Conductor Diameter",
        superHeaderStartCol: "d_040",
        superHeaderColSpan: 7,
        showHeaderRow: true,
        columns: [
          { key: "param", title: isTr ? "Parametre & Test" : "Parameter", align: "left", role: "label" },
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
          { id: 2, param: "Maksimum Ortalama", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
          { id: 3, param: "Maksimum Bireysel", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
          { id: 4, param: "İzolasyon Direnci MΩ/km (500 V DC)", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
          { id: 5, isGroupHeader: true, title: "Efektif Kapasite nF/km (800 Hz)", indent: false },
          { id: 6, param: "Maksimum Ortalama", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
          { id: 7, param: "Maksimum Bireysel", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
          { id: 8, isGroupHeader: true, title: "Kapasite Dengesizliği pF/500 m", indent: false },
          { id: 9, isGroupHeader: true, title: "Perler Arası", indent: true },
          { id: 10, param: "Maksimum Ortalama", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
          { id: 11, param: "Maksimum Bireysel", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
          { id: 12, isGroupHeader: true, title: "Komşu Dörtler Arası", indent: true },
          { id: 13, param: "Maksimum Ortalama", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
          { id: 14, param: "Maksimum Bireysel", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
          { id: 15, isGroupHeader: true, title: "Ekrana Karşı", indent: true },
          { id: 16, param: "Maksimum Ortalama", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
          { id: 17, param: "Maksimum Bireysel", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
          { id: 18, isGroupHeader: true, title: "Dielektrik Kuvveti", indent: false },
          { id: 19, isGroupHeader: true, title: "V (DC, 1 dakika)", indent: true },
          { id: 20, param: "Per - Per", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
          { id: 21, param: "Per - Ekran", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
          { id: 22, isGroupHeader: true, title: "V (DC, 3 Saniye)", indent: true },
          { id: 23, param: "Per - Ekran", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
        ],
      });
    } else if (presetType === "standard") {
      setEditingTemplate({
        ...editingTemplate,
        name: isTr ? "Standart Varyasyon Tablosu" : "Standard Variations Table",
        superHeaderTitle: "",
        showHeaderRow: true,
        columns: [
          { key: "part_no", title: isTr ? "Part No" : "Part No", align: "left", role: "value" },
          { key: "kesit", title: isTr ? "Kesit / Tip" : "Type", align: "left", role: "value" },
          { key: "damar", title: isTr ? "Damar / Fiber" : "Count", align: "center", role: "value" },
          { key: "cap", title: isTr ? "Dış Çap (mm)" : "Outer Dia", align: "right", role: "value" },
          { key: "agirlik", title: isTr ? "Ağırlık (kg/km)" : "Weight", align: "right", role: "value" },
        ],
        defaultRows: [],
      });
    } else if (presetType === "iec_mechanical") {
      setEditingTemplate({
        ...editingTemplate,
        name: isTr ? "Mekanik ve Çevresel Özellikler (IEC 60794-1-2)" : "Mechanical & Environmental Specs (IEC)",
        sectionKey: "mekanik_ozellikler",
        superHeaderTitle: "",
        showHeaderRow: true,
        blankCornerHeader: true,
        stripingMode: "zebra",
        columns: [
          { key: "param", title: "", align: "left", role: "label", hideHeader: true },
          { key: "standart", title: isTr ? "Test Standardı" : "Test Standard", align: "center", role: "value" },
          { key: "sartname", title: isTr ? "Şartname Değeri" : "Specification", align: "center", role: "value" },
          { key: "kabul", title: isTr ? "Kabul Kriteri" : "Acceptance Criteria", align: "center", role: "value" },
        ],
        defaultRows: [
          { id: 1, param: "Maksimum Germe Kuvveti ²", standart: "IEC 60794-1-2-E1", sartname: "1.0 x W(N), min. 1200 N", kabul: "Fiber uzaması ≤ 0.33%" },
          { id: 2, param: "Maksimum Çalışma Kuvveti", standart: "IEC 60794-1-2-E1", sartname: "0.5 x W(N), min. 600 N", kabul: "Δα ≤ 0.05 dB, fiber uzaması yok" },
          { id: 3, param: "Ezme Mukavemeti", standart: "IEC 60794-1-2-E3", sartname: "3000 N / 100 mm, maks. 15 min", kabul: "Δα ≤ 0.05 dB, hasar yok" },
          { id: 4, param: "Darbe Mukavemeti", standart: "IEC 60794-1-2-E4", sartname: "10 Nm, 3 darbe, R= 300 mm", kabul: "Δα ≤ 0.05 dB test sonrası" },
          { id: 5, param: "Burulma Dayanımı", standart: "IEC 60794-1-2-E7", sartname: "1 m. 100N, +/- 180°, 10 çevrim", kabul: "Δα ≤ 0.05 dB, hasar yok" },
          { id: 6, param: "Tekrar Eden Bükülme", standart: "IEC 60794-1-2-E6", sartname: "R=20x D, 100 N, 35 çevrim", kabul: "Hasar yok" },
          { id: 7, param: "Bükülme Çapı", standart: "IEC 60794-1-2-E11", sartname: "R=20x D, 4 döndürme, 3 çevrim", kabul: "Δα ≤ 0.05 dB, hasar yok" },
          { id: 8, param: "Sıcaklık Döngüsü", standart: "IEC 60794-1-2-F1", sartname: "-20°C to +70°C", kabul: "Δα ≤ 0.05 dB/km" },
          { id: 9, param: "Su Sızdırmazlık", standart: "IEC 60794-1-2-F5B", sartname: "Numune= 3 m, su sütunu= 1 m", kabul: "24 saat sonrası su sızdırmazlık." }
        ],
      });
    }
  };

  // Tasarlanan Şablonu Kaydet
  const handleSaveEditor = () => {
    if (!editingTemplate || !editingTemplate.name.trim()) return;
    const toSave: TableTemplate = {
      ...editingTemplate,
      id: editingTemplate.isBuiltIn ? `tpl_custom_${Date.now()}` : editingTemplate.id,
      isBuiltIn: false,
    };
    saveCustomTableTemplate(toSave);
    setTemplates(getSavedTableTemplates());

    // Eğer bir aileye atanmışsa varsayılan yap
    if (toSave.familyKey) {
      setFamilyDefaultTemplate(toSave.familyKey, toSave.sectionKey || "varyasyonlar", toSave.id);
      setFamilyDefaultMap(getFamilyTemplateMap());
    }

    setEditingTemplate(null);
    setIsCreatingNew(false);
    setToastNotice(isTr ? `"${toSave.name}" şablonu kaydedildi.` : `"${toSave.name}" template saved.`);
    setTimeout(() => setToastNotice(null), 3500);
  };

  // Yapay Zekaya Gönderilecek Optimize Master Prompt
  const masterAiPromptText = useMemo(() => {
    return `Sen bir Kıdemli Frontend Veri Mimarı ve ETK Kablo Sistemleri Teknik Tablo Şablonu Uzmanısın.
Görseldeki/fotoğraftaki teknik veri tablosunu dikkatle analiz et ve ETK Kablo Şablon Formatına BİREBİR UYGUN bir JSON çıktısı üret.

### SİSTEM VE MİMARİ KURALLARI:
1. YALNIZCA geçerli bir JSON çıktısı ver. Yanıtını \`\`\`json ve \`\`\` blokları içerisine al. JSON dışında hiçbir selamlama, önsöz veya açıklama yazma.

2. KRİTİK ŞABLON KURALI (DEĞER HÜCRELERİNİ BOŞ BIRAK):
   - Sen bir "ŞABLON İSKELETİ" (Skeleton Template) çıkarıyorsun.
   - Tablonun sütun başlıklarını, grup/alt grup başlıklarını ve sol taraftaki test / parametre adlarını eksiksiz çıkar.
   - ANCAK değer hücrelerine ("role": "value" sütunlarına ait alanlara) ASLA fotoğraftaki ölçüm / test sayısal değerlerini GÖMME!
   - Tüm değer hücrelerini daima BOŞ DİZE "" (empty string) olarak tanımla. Gerçek değerler, tablo belgeye eklendiğinde kablonun veritabanından dinamik olarak çekilir.

3. TABLO ÖZELLİKLERİ (ÜST DÜZEY):
   - "name": (ZORUNLU) Tablonun başlığı (örn: "Elektriksel Özellikler - İletken Çapı Matrisi")
   - "sectionKey": (ZORUNLU) Tablonun ait olduğu bölüm. Geçerli Değerler:
     "elektriksel_ozellikler" | "teknik_ozellikler" | "varyasyonlar" | "mekanik_ozellikler" | "standartlar" | "kullanim_alanlari" | "kablo_yapisi" | "uygulama" | "markalama_paketleme"
   - "familyKey": (İSTEĞE BAĞLI) Hangi kablo ailesiyle ilişkili. Geçerli Değerler:
     "fiber_optik" | "harici_telefon" | "dahili_telefon" | "data_lan" | "sinyal_kontrol" | "enstrumantasyon" | "kontrol" | "yangin_alarm" | "yangina_dayanikli" | "solar" | "koaksiyel" | "cctv" | "bina_otomasyon" | "silikon"
     Tüm aileler için geçerliyse bu alanı ekleme (undefined kalır).
   - "layoutMode": Tablo düzeni. Geçerli Değerler:
     "grid": Standart tablo (varsayılan). Teknik özellikler, boyutlar gibi düz tablolar.
     "matrix": Matris tablo. Çatı başlıklı, çok sütunlu ölçüm matrisleri (İletken Çapı, Test Sonuçları vb.)
     "key_value": Özellik-değer listesi. Sol taraf parametre, sağ taraf değer (Markalama, Paketleme gibi tablolar)
   - "stripingMode": Satır renklendirme modu. Geçerli Değerler:
     "zebra": Klasik çift/tek satır renklendirmesi. Grid ve key_value düzenlerde kullanılır.
     "filled_only": Yalnızca dolu hücreleri renklendir, boş hücreler beyaz kalır. Matris tablolarda kullanılır.
     "plain": Renklendirme yok, tüm satırlar beyaz.
   - "showHeaderRow": (boolean) Sütun başlık satırı gösterilsin mi? Standart tablolarda true, bazı key_value listelerinde false yapılabilir.

4. ÇATI BAŞLIK (SUPER HEADER) ÖZELLİKLERİ:
   Tablonun sütun başlıkları üzerinde birleştirilmiş tek büyük çatı başlık varsa (colspan başlık):
   - "superHeaderTitle": Çatı başlığın metni (örn: "İletken Çapı", "Sıcaklık Aralığı")
   - "superHeaderStartCol": Çatı başlığın hangi sütunun key değerinden başlayacağı (örn: "d_040")
   - "superHeaderColSpan": Çatı başlığın kaç sütunu kaplayacağı (sayı, örn: 4, 7)
   Çatı başlık yoksa bu üç alanı hiç ekleme.

5. BOŞ ÜST KÖŞE BAŞLIĞI (BLANK CORNER HEADER):
   Görseldeki tablonun sol üst köşesi boşsa (İlk sütunun üstünde başlık kutusu yoksa):
   - "blankCornerHeader": true
   - İlk sütunun "title" değerini "" (boş dize) yap.
   - İlk sütuna "hideHeader": true ekle.
   Sistem bu durumda ilk sütunun başlık hücresini şeffaf/renksiz bırakır ama parametreleri kurumsal dolgulu etiket olarak çizer.

6. SÜTUNLAR ("columns"):
   Her sütun objesi:
   { "key": string, "title": string, "align": "left" | "center" | "right", "role": "label" | "value" }
   - "key": ASCII harf, rakam ve alt çizgi (örn: "param", "d_040", "kesit", "cap"). Türkçe karakter kullanma.
   - "title": Sütun başlığı metni. Sol üst köşe boşsa ilk sütunda "" olmalıdır. Görsel başlığı OLMAYAN sütunlarda da "" olmalıdır.
   - "align": "left" (parametre/etiket sütunları), "center" veya "right" (sayısal sütunlar).
   - "role": "label" veya "value". KRİTİK: "role": "label" SADECE ilk sütunda değil, HERHANGİ BİR sütunda olabilir! Bir tablo "Etiket | Değer | Etiket | Değer" şeklinde çift etiket-değer düzenine sahip olabilir. Görselde koyu/dolgulu arka planlı her sütunu "role": "label" yap.
   - İSTEĞE BAĞLI "width": Sütun genişliği yüzdesi (örn: "35%", "20%"). Belirtilmezse otomatik eşit dağılım yapılır.
   - İSTEĞE BAĞLI "hideHeader": true → Sütunun başlık hücresini gizler (blankCornerHeader ile birlikte kullanılır).

7. SATIRLAR ("defaultRows"):
   a) Ana Grup Başlığı (koyu şerit, tüm satırı kaplar):
      { "id": 1, "isGroupHeader": true, "title": "İletken Direnci Ω/km (20 °C)", "indent": false }
   b) Alt Grup Başlığı (girintili ara başlık):
      { "id": 2, "isGroupHeader": true, "title": "Perler Arası", "indent": true }
   c) Veri Satırı (parametre adını yaz, TÜM değer alanlarını "" yap):
      { "id": 3, "param": "Maksimum Ortalama", "d_040": "", "d_050": "", "d_060": "" }

### ÖRNEK 1 — MATRİS TABLOSU (Çatı başlıklı, çok sütunlu ölçüm matrisi):
\`\`\`json
{
  "name": "Elektriksel Özellikler - İletken Çapı Matrisi",
  "sectionKey": "elektriksel_ozellikler",
  "layoutMode": "matrix",
  "stripingMode": "filled_only",
  "superHeaderTitle": "İletken Çapı",
  "superHeaderStartCol": "d_040",
  "superHeaderColSpan": 4,
  "showHeaderRow": true,
  "columns": [
    { "key": "param", "title": "Parametre & Test", "align": "left", "role": "label" },
    { "key": "d_040", "title": "0.40 mm", "align": "center", "role": "value" },
    { "key": "d_050", "title": "0.50 mm", "align": "center", "role": "value" },
    { "key": "d_060", "title": "0.60 mm", "align": "center", "role": "value" },
    { "key": "d_070", "title": "0.70 mm", "align": "center", "role": "value" }
  ],
  "defaultRows": [
    { "id": 1, "isGroupHeader": true, "title": "İletken Direnci Ω/km (20 °C)", "indent": false },
    { "id": 2, "param": "Maksimum Ortalama", "d_040": "", "d_050": "", "d_060": "", "d_070": "" },
    { "id": 3, "param": "Tek Damar", "d_040": "", "d_050": "", "d_060": "", "d_070": "" },
    { "id": 4, "isGroupHeader": true, "title": "İzolasyon Direnci MΩ·km", "indent": false },
    { "id": 5, "param": "Minimum", "d_040": "", "d_050": "", "d_060": "", "d_070": "" }
  ]
}
\`\`\`

### ÖRNEK 2 — BOŞ KÖŞE BAŞLIKLI PARAMETRE TABLOSU (IEC Mekanik Test vb.):
\`\`\`json
{
  "name": "Mekanik ve Çevresel Özellikler (IEC 60794-1-2)",
  "sectionKey": "mekanik_ozellikler",
  "layoutMode": "grid",
  "stripingMode": "zebra",
  "showHeaderRow": true,
  "blankCornerHeader": true,
  "columns": [
    { "key": "param", "title": "", "align": "left", "role": "label", "hideHeader": true },
    { "key": "standart", "title": "Test Standardı", "align": "center", "role": "value" },
    { "key": "sartname", "title": "Şartname Değeri", "align": "center", "role": "value" },
    { "key": "kabul", "title": "Kabul Kriteri", "align": "center", "role": "value" }
  ],
  "defaultRows": [
    { "id": 1, "param": "Maksimum Germe Kuvveti", "standart": "", "sartname": "", "kabul": "" },
    { "id": 2, "param": "Maksimum Çalışma Kuvveti", "standart": "", "sartname": "", "kabul": "" },
    { "id": 3, "param": "Ezme Mukavemeti", "standart": "", "sartname": "", "kabul": "" }
  ]
}
\`\`\`

### ÖRNEK 3 — KEY-VALUE (ÖZELLİK-DEĞER) TABLOSU (Markalama, Paketleme vb.):
\`\`\`json
{
  "name": "Markalama, Paketleme ve Sevk Boyları",
  "sectionKey": "markalama_paketleme",
  "layoutMode": "key_value",
  "stripingMode": "zebra",
  "showHeaderRow": false,
  "columns": [
    { "key": "ozellik", "title": "Özellik", "align": "left", "role": "label", "width": "35%" },
    { "key": "deger", "title": "Tanım / Şartname", "align": "left", "role": "value" }
  ],
  "defaultRows": [
    { "id": 1, "ozellik": "Markalama Standardı", "deger": "" },
    { "id": 2, "ozellik": "Paketleme Tipi", "deger": "" },
    { "id": 3, "ozellik": "Standart Sevk Boyu", "deger": "" }
  ]
}
\`\`\`

### ÖRNEK 4 — ÇİFT ETİKET-DEĞER TABLOSU (Sıcaklık Aralığı, ikişerli gruplar):
Bu düzende tabloda sütunlar "Etiket | Değer | Etiket | Değer" biçiminde yan yana çift çift gider.
Sütun başlıkları görselde yoksa "showHeaderRow": false yap. Çatı başlık varsa "superHeader" tanımla.
\`\`\`json
{
  "name": "Sıcaklık Aralığı",
  "sectionKey": "mekanik_ozellikler",
  "layoutMode": "grid",
  "stripingMode": "zebra",
  "showHeaderRow": false,
  "blankCornerHeader": true,
  "superHeaderTitle": "Sıcaklık Aralığı",
  "superHeaderStartCol": "deger_1",
  "superHeaderColSpan": 3,
  "columns": [
    { "key": "param_1", "title": "", "align": "left", "role": "label", "hideHeader": true },
    { "key": "deger_1", "title": "", "align": "center", "role": "value" },
    { "key": "param_2", "title": "", "align": "left", "role": "label" },
    { "key": "deger_2", "title": "", "align": "center", "role": "value" }
  ],
  "defaultRows": [
    { "id": 1, "param_1": "Depolama", "deger_1": "", "param_2": "Kurulum", "deger_2": "" },
    { "id": 2, "param_1": "Taşıma", "deger_1": "", "param_2": "Çalışma", "deger_2": "" }
  ]
}
\`\`\`

Şimdi ekteki tablonun tam JSON çıktısını yukarıdaki formatta üret:`;
  }, []);

  // Yapıştırılan JSON Kodunu Ayrıştır ve Doğrula
  const jsonValidation = useMemo(() => {
    const trimmed = pastedJsonCode.trim();
    if (!trimmed) {
      return { hasInput: false, isValid: false, errorMessage: null as string | null, template: null as TableTemplate | null };
    }

    try {
      let clean = trimmed;
      // Markdown bloklarını ayıkla (```json ... ``` veya ``` ...)
      const codeBlockMatch = clean.match(/```(?:json)?([\s\S]*?)```/i);
      if (codeBlockMatch) {
        clean = codeBlockMatch[1].trim();
      } else if (clean.startsWith("```")) {
        clean = clean.replace(/^```[a-z]*\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      }

      // İlk ve son süslü parantez arasını al
      const firstBrace = clean.indexOf("{");
      const lastBrace = clean.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
      }

      // LLM'lerin sık yaptığı sondaki virgül (trailing comma) hatalarını temizle
      clean = clean.replace(/,\s*([}\]])/g, "$1");

      const obj = JSON.parse(clean);
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
        return {
          hasInput: true,
          isValid: false,
          errorMessage: isTr
            ? "JSON çıktısı geçerli bir nesne ({ ... }) formatında olmalıdır."
            : "JSON output must be a valid object ({ ... }).",
          template: null,
        };
      }

      if (!obj.name || typeof obj.name !== "string" || !obj.name.trim()) {
        return {
          hasInput: true,
          isValid: false,
          errorMessage: isTr
            ? "Zorunlu alan eksik: 'name' (tablo başlığı) belirtilmelidir."
            : "Missing required field: 'name' (table title) must be provided.",
          template: null,
        };
      }

      if (!Array.isArray(obj.columns) || obj.columns.length === 0) {
        return {
          hasInput: true,
          isValid: false,
          errorMessage: isTr
            ? "Zorunlu alan eksik: 'columns' dizisinde en az 1 sütun tanımlanmalıdır."
            : "Missing required field: 'columns' array must contain at least 1 column.",
          template: null,
        };
      }

      const hasBlankCornerIntended =
        obj.blankCornerHeader === true ||
        (Array.isArray(obj.columns) && (obj.columns[0]?.title === "" || obj.columns[0]?.hideHeader === true));

      const columns: TableColumnDef[] = obj.columns.map((c: any, idx: number) => {
        const titleExplicitlySet = c.title !== undefined && c.title !== null;
        const rawTitle = titleExplicitlySet ? String(c.title).trim() : "";
        const isFirstCol = idx === 0;
        const isBlankCorner = isFirstCol && (hasBlankCornerIntended || c.hideHeader === true || rawTitle === "");
        // Kasıtlı olarak boş gönderilen başlıkları koru, sadece tanımsız olanları fallback yap
        const finalTitle = rawTitle === ""
          ? (isFirstCol ? "" : (titleExplicitlySet ? "" : `Sütun ${idx + 1}`))
          : rawTitle;
        const isLabelRole = c.role === "label" || isBlankCorner;
        return {
          key: c.key ? String(c.key).trim() : `col_${idx + 1}`,
          title: finalTitle,
          align: c.align === "center" || c.align === "right" ? c.align : "left",
          role: isLabelRole ? "label" : "value",
          width: c.width || undefined,
          hideHeader: isBlankCorner || (isLabelRole && !isFirstCol && finalTitle === ""),
          isCustom: true,
        };
      });

      const labelColKeys = new Set(
        columns.filter((c) => c.role === "label").map((c) => c.key)
      );
      if (labelColKeys.size === 0 && columns.length > 0) {
        labelColKeys.add(columns[0].key);
      }

      const defaultRows = Array.isArray(obj.defaultRows)
        ? obj.defaultRows.map((r: any, idx: number) => {
            if (r.isGroupHeader) {
              return {
                id: r.id !== undefined ? r.id : Date.now() + idx,
                isGroupHeader: true,
                title: r.title !== undefined ? String(r.title) : undefined,
                indent: !!r.indent,
              };
            }
            const rowObj: any = {
              id: r.id !== undefined ? r.id : Date.now() + idx,
            };

            columns.forEach((col) => {
              if (labelColKeys.has(col.key)) {
                // Etiket / parametre sütunları: Her zaman metni koru
                rowObj[col.key] =
                  r[col.key] !== undefined
                    ? String(r[col.key])
                    : col.key === columns[0].key
                    ? (r.param || r.parametre || r.title || "")
                    : "";
              } else {
                // Değer sütunları: sanitizeValuesOnImport seçiliyse boşalt ("")
                if (sanitizeValuesOnImport) {
                  rowObj[col.key] = "";
                } else {
                  rowObj[col.key] = r[col.key] !== undefined && r[col.key] !== null ? String(r[col.key]) : "";
                }
              }
            });

            return rowObj;
          })
        : [];

      const parsed: TableTemplate = {
        id: obj.id && !obj.id.startsWith("tpl_custom") ? `tpl_custom_${Date.now()}` : (obj.id || `tpl_custom_${Date.now()}`),
        name: String(obj.name).trim(),
        sectionKey: obj.sectionKey || "elektriksel_ozellikler",
        familyKey: obj.familyKey || undefined,
        superHeaderTitle: obj.superHeaderTitle ? String(obj.superHeaderTitle).trim() : undefined,
        superHeaderStartCol: obj.superHeaderStartCol ? String(obj.superHeaderStartCol).trim() : undefined,
        superHeaderColSpan: obj.superHeaderColSpan !== undefined && !isNaN(Number(obj.superHeaderColSpan)) ? Number(obj.superHeaderColSpan) : undefined,
        showHeaderRow: obj.showHeaderRow !== false,
        blankCornerHeader: hasBlankCornerIntended,
        layoutMode: obj.layoutMode || (obj.superHeaderTitle ? "matrix" : "grid"),
        stripingMode: obj.stripingMode || (obj.superHeaderTitle ? "filled_only" : "zebra"),
        columns,
        defaultRows,
        isBuiltIn: false,
      };

      return {
        hasInput: true,
        isValid: true,
        errorMessage: null,
        template: parsed,
      };
    } catch (err: any) {
      return {
        hasInput: true,
        isValid: false,
        errorMessage: isTr
          ? `JSON sözdizimi hatası: ${err?.message || "Geçersiz sözdizimi."}`
          : `JSON syntax error: ${err?.message || "Invalid syntax."}`,
        template: null,
      };
    }
  }, [pastedJsonCode, isTr, sanitizeValuesOnImport]);

  const parsedAiTemplate = jsonValidation.template;

  // Prompt Kopyalama
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(masterAiPromptText);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch (err) {
      console.error("Prompt kopyalanamadı:", err);
    }
  };

  // Dışa Aktarma JSON Kopyalama
  const handleCopyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportJsonString);
      setCopiedExport(true);
      setTimeout(() => setCopiedExport(false), 2500);
    } catch (err) {
      console.error("JSON kopyalanamadı:", err);
    }
  };

  // Panodan Doğrudan Yapıştırma
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedJsonCode(text);
      }
    } catch (err) {
      console.error("Panodan okunamadı:", err);
    }
  };

  // Örnek JSON Yükleme
  const handleLoadSampleJson = () => {
    const sample = {
      name: "Elektriksel Özellikler - İletken Çapı Matrisi",
      sectionKey: "elektriksel_ozellikler",
      superHeaderTitle: "İletken Çapı",
      superHeaderStartCol: "d_040",
      superHeaderColSpan: 7,
      showHeaderRow: true,
      stripingMode: "filled_only",
      layoutMode: "matrix",
      columns: [
        { key: "param", title: "Parametre & Test", align: "left", role: "label" },
        { key: "d_040", title: "0.40 mm", align: "center", role: "value" },
        { key: "d_050", title: "0.50 mm", align: "center", role: "value" },
        { key: "d_060", title: "0.60 mm", align: "center", role: "value" },
        { key: "d_063", title: "0.63 mm", align: "center", role: "value" },
        { key: "d_065", title: "0.65 mm", align: "center", role: "value" },
        { key: "d_080", title: "0.80 mm", align: "center", role: "value" },
        { key: "d_090", title: "0.90 mm", align: "center", role: "value" }
      ],
      defaultRows: [
        { id: 1, isGroupHeader: true, title: "İletken Direnci Ω/km (20 °C)", indent: false },
        { id: 2, param: "Maksimum Ortalama", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
        { id: 3, param: "Maksimum Bireysel", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
        { id: 4, param: "İzolasyon Direnci MΩ/km (500 V DC)", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
        { id: 5, isGroupHeader: true, title: "Efektif Kapasite nF/km (800 Hz)", indent: false },
        { id: 6, param: "Maksimum Ortalama", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" },
        { id: 7, param: "Maksimum Bireysel", d_040: "", d_050: "", d_060: "", d_063: "", d_065: "", d_080: "", d_090: "" }
      ]
    };
    setPastedJsonCode(JSON.stringify(sample, null, 2));
  };

  // IEC Mekanik Test Örnek JSON Yükleme (Sol Üst Köşe Boş)
  const handleLoadIecSampleJson = () => {
    const sample = {
      name: "Mekanik ve Çevresel Özellikler (IEC 60794-1-2)",
      sectionKey: "mekanik_ozellikler",
      showHeaderRow: true,
      blankCornerHeader: true,
      stripingMode: "zebra",
      columns: [
        { key: "param", title: "", align: "left", role: "label", hideHeader: true },
        { key: "standart", title: "Test Standardı", align: "center", role: "value" },
        { key: "sartname", title: "Şartname Değeri", align: "center", role: "value" },
        { key: "kabul", title: "Kabul Kriteri", align: "center", role: "value" }
      ],
      defaultRows: [
        { id: 1, param: "Maksimum Germe Kuvveti ²", standart: "IEC 60794-1-2-E1", sartname: "1.0 x W(N), min. 1200 N", kabul: "Fiber uzaması ≤ 0.33%" },
        { id: 2, param: "Maksimum Çalışma Kuvveti", standart: "IEC 60794-1-2-E1", sartname: "0.5 x W(N), min. 600 N", kabul: "Δα ≤ 0.05 dB, fiber uzaması yok" },
        { id: 3, param: "Ezme Mukavemeti", standart: "IEC 60794-1-2-E3", sartname: "3000 N / 100 mm, maks. 15 min", kabul: "Δα ≤ 0.05 dB, hasar yok" },
        { id: 4, param: "Darbe Mukavemeti", standart: "IEC 60794-1-2-E4", sartname: "10 Nm, 3 darbe, R= 300 mm", kabul: "Δα ≤ 0.05 dB test sonrası" },
        { id: 5, param: "Burulma Dayanımı", standart: "IEC 60794-1-2-E7", sartname: "1 m. 100N, +/- 180°, 10 çevrim", kabul: "Δα ≤ 0.05 dB, hasar yok" },
        { id: 6, param: "Tekrar Eden Bükülme", standart: "IEC 60794-1-2-E6", sartname: "R=20x D, 100 N, 35 çevrim", kabul: "Hasar yok" },
        { id: 7, param: "Bükülme Çapı", standart: "IEC 60794-1-2-E11", sartname: "R=20x D, 4 döndürme, 3 çevrim", kabul: "Δα ≤ 0.05 dB, hasar yok" },
        { id: 8, param: "Sıcaklık Döngüsü", standart: "IEC 60794-1-2-F1", sartname: "-20°C to +70°C", kabul: "Δα ≤ 0.05 dB/km" },
        { id: 9, param: "Su Sızdırmazlık", standart: "IEC 60794-1-2-F5B", sartname: "Numune= 3 m, su sütunu= 1 m", kabul: "24 saat sonrası su sızdırmazlık." }
      ]
    };
    setPastedJsonCode(JSON.stringify(sample, null, 2));
  };

  // JSON Dosyası Yükleme
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) setPastedJsonCode(content);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Dışa Aktarılan Şablonu .json Dosyası Olarak İndir
  const handleDownloadExport = () => {
    if (!activeExportTemplate || !exportJsonString) return;
    const blob = new Blob([exportJsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = activeExportTemplate.name.toLowerCase().replace(/[^a-z0-9_-]/gi, "_") || "template";
    a.href = url;
    a.download = `${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // AI Şablonunu Kaydet ve Editörde Aç
  const handleSaveImportedTemplate = (openInEditor: boolean = true) => {
    if (!parsedAiTemplate) return;
    const toSave: TableTemplate = {
      ...parsedAiTemplate,
      sectionKey: importSectionOverride || parsedAiTemplate.sectionKey,
      familyKey: importFamilyOverride !== undefined ? (importFamilyOverride || undefined) : parsedAiTemplate.familyKey,
    };
    saveCustomTableTemplate(toSave);
    setTemplates(getSavedTableTemplates());
    if (openInEditor) {
      setEditingTemplate(toSave);
    }
    setIsAiModalOpen(false);
    setPastedJsonCode("");
    setImportSectionOverride("");
    setImportFamilyOverride(undefined);
    setToastNotice(
      isTr
        ? `"${toSave.name}" şablonu başarıyla içe aktarıldı ${openInEditor ? "ve düzenleyiciye yüklendi!" : "ve kütüphaneye eklendi."}`
        : `"${toSave.name}" template imported ${openInEditor ? "and loaded into editor!" : "and added to library."}`
    );
    setTimeout(() => setToastNotice(null), 3500);
  };

  // Dışa Aktarılacak Şablon
  const activeExportTemplate = useMemo(() => {
    const targetId = exportTemplateId || templates[0]?.id;
    return templates.find((t) => t.id === targetId) || templates[0] || null;
  }, [exportTemplateId, templates]);

  const exportJsonString = useMemo(() => {
    if (!activeExportTemplate) return "";
    return JSON.stringify(activeExportTemplate, null, 2);
  }, [activeExportTemplate]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in">
      {/* BAŞLIK KARTI */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
              <TableIcon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {isTr ? "Tablo Tasarımcısı & Şablon Yöneticisi" : "Table Designer & Template Manager"}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 max-w-2xl">
            {isTr
              ? "Kablo ailelerine ve teknik bölümlere özel tablo sütunları tasarlayın, hizalamaları belirleyin ve varsayılan tablo şablonlarını yönetin."
              : "Design dedicated table columns per cable family and section, set alignments and manage defaults."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => {
              setIsAiModalOpen(true);
              setAiModalTab("prompt");
            }}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold text-xs shadow-xs transition cursor-pointer"
            title={isTr ? "Fotoğraftan veya yapay zekadan JSON kod ile şablon üret" : "Generate template with AI or JSON code"}
          >
            <Bot className="w-4 h-4 text-emerald-700" />
            <span>{isTr ? "AI / Kod ile Şablon Üret" : "AI / Code Generator"}</span>
          </button>

          <button
            type="button"
            onClick={handleStartNew}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isTr ? "Yeni Tablo Tasarla" : "Create New Table"}</span>
          </button>
        </div>
      </div>

      {/* BİLDİRİM TOAST */}
      {toastNotice && (
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg animate-in fade-in shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastNotice}</span>
        </div>
      )}

      {/* SADECE KABLO AİLELERİNE GÖRE FİLTRELEME ÇUBUĞU */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Başlık ve İkon */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 shrink-0">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>{isTr ? "Kablo Ailesine Göre Filtrele:" : "Filter by Cable Family:"}</span>
          </div>

          {/* Hızlı Arama Kutusu */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTr ? "Şablon veya sütun ara..." : "Search template or column..."}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs pl-3 pr-7 py-1.5 rounded-lg outline-none focus:border-emerald-500 focus:bg-white placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Kablo Aileleri Sekmeleri / Butonları */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {/* Tüm Aileler Butonu */}
          <button
            type="button"
            onClick={() => {
              setSelectedFamily("all");
              setEditingTemplate(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedFamily === "all"
                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <span>{isTr ? "Tüm Aileler" : "All Families"}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedFamily === "all" ? "bg-emerald-700/80 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              {familyCounts.all || 0}
            </span>
          </button>

          {/* Her Bir Kablo Ailesi */}
          {families.map((f) => {
            const isSelected = selectedFamily === f.family_key;
            const count = familyCounts[f.family_key] || 0;
            const famColor = getFamilyColor(f.family_key, f.display_name);
            return (
              <button
                key={f.family_key}
                type="button"
                onClick={() => {
                  setSelectedFamily(f.family_key);
                  setEditingTemplate(null);
                }}
                style={isSelected ? { backgroundColor: famColor.primary, color: famColor.headerTextColor, borderColor: famColor.primary } : undefined}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? "shadow-xs font-semibold"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200"
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: famColor.primary }} />
                <span>{f.display_name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? "bg-black/20 text-inherit font-bold" : "bg-slate-200 text-slate-600"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          {/* Genel / Aile Atanmamış Butonu */}
          {familyCounts.general > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedFamily("general");
                setEditingTemplate(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                selectedFamily === "general"
                  ? "bg-cyan-600 text-white shadow-xs font-semibold"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200"
              }`}
            >
              <span>{isTr ? "Genel / Ortak" : "General / Common"}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedFamily === "general" ? "bg-cyan-700/80 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                {familyCounts.general}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ================== ŞABLON DÜZENLEME ALANI (EĞER AÇIKSA) ================== */}
      {editingTemplate && (
        <div className="bg-white border-2 border-emerald-500/40 rounded-xl p-6 shadow-md space-y-5 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                {isCreatingNew
                  ? (isTr ? "Yeni Tablo Şablonu Tasarla" : "Design New Table Template")
                  : (isTr ? `Şablonu Düzenle: ${editingTemplate.name}` : `Edit Template: ${editingTemplate.name}`)}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setEditingTemplate(null)}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* HIZLI ŞABLON KALIPLARI (PRESETS) */}
          <div className="flex items-center gap-1.5 flex-wrap p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600 mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isTr ? "Hızlı Şablon Kalıbı:" : "Quick Preset:"}</span>
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset("standard")}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition cursor-pointer border border-slate-200 shadow-xs"
            >
              {isTr ? "+ Standart Varyasyon" : "+ Standard Variations"}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("temperature")}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition cursor-pointer border border-emerald-200 shadow-xs"
            >
              {isTr ? "+ 2x2 Sıcaklık Aralığı" : "+ 2x2 Temp Range"}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("properties")}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-cyan-50 hover:bg-cyan-100 text-cyan-800 transition cursor-pointer border border-cyan-200 shadow-xs"
            >
              {isTr ? "+ 2 Kolonlu Markalama / Özellik" : "+ 2-Col Properties"}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("matrix")}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 transition cursor-pointer border border-amber-200 shadow-xs"
            >
              {isTr ? "+ Matris (İletken Çapları)" : "+ Matrix (Conductor Dia)"}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("iec_mechanical")}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 hover:bg-purple-100 text-purple-800 transition cursor-pointer border border-purple-200 shadow-xs flex items-center gap-1"
            >
              <span>{isTr ? "+ IEC Mekanik Test (Köşe Boş)" : "+ IEC Mechanical (Blank Corner)"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 mb-1 font-medium">{isTr ? "Şablon Adı" : "Template Name"}</label>
              <input
                type="text"
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg outline-none focus:border-emerald-500 text-xs"
                placeholder={isTr ? "Örn: Özel 12 Damar Yanmaz Tablo..." : "Template name..."}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-600 font-semibold text-xs">
                  {isTr ? "Uygulanacağı Bölüm" : "Target Section"}
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewSectionInline(!isAddingNewSectionInline)}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                >
                  {isAddingNewSectionInline ? (isTr ? "Vazgeç" : "Cancel") : (isTr ? "+ Özel Alan Ekle" : "+ Add Custom")}
                </button>
              </div>

              {!isAddingNewSectionInline ? (
                <select
                  value={editingTemplate.sectionKey || "varyasyonlar"}
                  onChange={(e) => {
                    if (e.target.value === "__new_custom__") {
                      setIsAddingNewSectionInline(true);
                    } else {
                      setEditingTemplate({ ...editingTemplate, sectionKey: e.target.value });
                    }
                  }}
                  className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg outline-none focus:border-emerald-500 text-xs cursor-pointer shadow-2xs"
                >
                  {sectionsList.map((sec) => (
                    <option key={sec.key} value={sec.key}>
                      {sec.label}
                    </option>
                  ))}
                  <option value="__new_custom__" className="text-emerald-700 font-semibold">
                    {isTr ? "+ Yeni Bir Özel Bölüm/Alan Tanımla..." : "+ Add New Custom Section..."}
                  </option>
                </select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={inlineSectionName}
                    onChange={(e) => setInlineSectionName(e.target.value)}
                    placeholder={isTr ? "Yeni bölüm adı (örn: Optik Özellikler)" : "Section name (e.g. Optical Specs)"}
                    className="flex-1 bg-white border border-emerald-500 text-slate-900 px-2.5 py-1.5 rounded-lg outline-none text-xs shadow-2xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddInlineSection();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddInlineSection}
                    disabled={!inlineSectionName.trim()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition"
                  >
                    {isTr ? "Ekle" : "Add"}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">{isTr ? "İlişkili Kablo Ailesi" : "Associated Family"}</label>
              <select
                value={editingTemplate.familyKey || ""}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, familyKey: e.target.value || undefined })}
                className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg outline-none focus:border-emerald-500 text-xs cursor-pointer"
              >
                <option value="">{isTr ? "Genel / Belirtilmemiş" : "General / None"}</option>
                {families.map((f) => (
                  <option key={f.family_key} value={f.family_key}>
                    {f.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ÇATI BAŞLIK VE GÖRÜNÜM AYARLARI */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block text-slate-600 mb-1 font-medium">
                {isTr ? "Çatı Başlık (Super Header)" : "Super Header"}
              </label>
              <input
                type="text"
                value={editingTemplate.superHeaderTitle || ""}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, superHeaderTitle: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-1.5 rounded-lg outline-none focus:border-emerald-500 text-xs"
                placeholder={isTr ? "Örn: Sıcaklık Aralığı veya İletken Çapı" : "e.g. Temperature Range..."}
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                {isTr ? "Sütunların üzerinde birleşik bant başlık." : "Overarching merged banner."}
              </span>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">
                {isTr ? "Başlangıç Sütunu (Start Col)" : "Start Column"}
              </label>
              <select
                value={editingTemplate.superHeaderStartCol || ""}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, superHeaderStartCol: e.target.value || undefined })}
                disabled={!editingTemplate.superHeaderTitle}
                className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-1.5 rounded-lg outline-none focus:border-emerald-500 text-xs disabled:opacity-50 cursor-pointer"
              >
                <option value="">{isTr ? "Varsayılan (İlk Değer Sütunu)" : "Default (First Value Col)"}</option>
                {editingTemplate.columns.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.key} ({c.title})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {isTr ? "Çatı başlığın başlayacağı sütun." : "Column where super header begins."}
              </span>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">
                {isTr ? "Kapsama Sütun Sayısı (ColSpan)" : "ColSpan"}
              </label>
              <input
                type="number"
                min={1}
                max={editingTemplate.columns.length}
                value={editingTemplate.superHeaderColSpan || ""}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, superHeaderColSpan: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                disabled={!editingTemplate.superHeaderTitle}
                className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-1.5 rounded-lg outline-none focus:border-emerald-500 text-xs disabled:opacity-50"
                placeholder={isTr ? `Varsayılan (${Math.max(1, editingTemplate.columns.length - 1)})` : "e.g. 2, 4"}
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                {isTr ? "Kaç sütun boyunca birleştirileceği." : "Number of columns to span."}
              </span>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">
                {isTr ? "Satır Zemin Stili" : "Row Shading Style"}
              </label>
              <select
                value={editingTemplate.stripingMode || (editingTemplate.superHeaderTitle ? "filled_only" : "zebra")}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, stripingMode: e.target.value as any })}
                className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-1.5 rounded-lg outline-none focus:border-emerald-500 text-xs cursor-pointer"
              >
                <option value="zebra">{isTr ? "Klasik Zebra (Çift/Tek Satır)" : "Classic Zebra (Even/Odd)"}</option>
                <option value="filled_only">{isTr ? "Sadece Dolu Hücreler (Matris Stili)" : "Filled Cells Only (Matrix Style)"}</option>
                <option value="plain">{isTr ? "Düz Beyaz (Renklendirme Yok)" : "Plain White (No Shading)"}</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {isTr ? "Matris tablolarda boş hücrelerin saf beyaz kalmasını sağlar." : "Controls whether empty cells stay pure white."}
              </span>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={editingTemplate.showHeaderRow !== false}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, showHeaderRow: e.target.checked })}
                  className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
                />
                <span>{isTr ? "Sütun Başlık Satırını Göster (th)" : "Show Column Header Row"}</span>
              </label>
              <span className="text-[10px] text-slate-500 mt-1 pl-6">
                {isTr ? "İşaret kaldırılırsa doğrudan etiket-değer satırları başlar." : "Uncheck for property-value tables without a top header row."}
              </span>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={editingTemplate.blankCornerHeader === true || editingTemplate.columns[0]?.hideHeader === true || !editingTemplate.columns[0]?.title?.trim()}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEditingTemplate({
                      ...editingTemplate,
                      blankCornerHeader: checked,
                      columns: editingTemplate.columns.map((c, i) =>
                        i === 0 ? { ...c, hideHeader: checked, title: checked ? "" : (c.title || (isTr ? "Parametre" : "Parameter")) } : c
                      ),
                    });
                  }}
                  className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
                />
                <span>{isTr ? "Sol Üst Köşe Boş / Renksiz" : "Blank Corner Header"}</span>
              </label>
              <span className="text-[10px] text-slate-500 mt-1 pl-6">
                {isTr ? "İlk sütunun başlık kutusu renksiz kalır; altındaki parametreler kurumsal yeşil olur." : "Corner cell stays blank; parameter rows become green."}
              </span>
            </div>
          </div>

          {/* Sütun Düzenleyici */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>{isTr ? "Tablo Sütunları, Rol ve Hizalama" : "Columns, Role & Alignment"} ({editingTemplate.columns.length})</span>
              <span className="text-slate-500 text-[11px] font-normal">{isTr ? "Rolü değiştirmek için [Etiket]/[Değer] etiketine tıklayın." : "Click [Label]/[Value] to toggle role."}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              {editingTemplate.columns.map((col, cIdx) => {
                const isLabel = col.role === "label";

                return (
                  <div
                    key={col.key}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs shadow-xs transition ${
                      isLabel
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-medium"
                        : "bg-white border-slate-200 text-slate-800"
                    }`}
                  >
                    {/* Rol Butonu (Etiket vs Değer) */}
                    <button
                      type="button"
                      onClick={() => handleToggleColumnRole(cIdx)}
                      title={isTr ? "Rolü değiştir (Etiket / Değer)" : "Toggle role (Label / Value)"}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition ${
                        isLabel
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200"
                      }`}
                    >
                      {isLabel ? (isTr ? "ETİKET" : "LABEL") : (isTr ? "DEĞER" : "VAL")}
                    </button>

                    {/* İlk Sütun İçin Köşe Boş / Renksiz Butonu */}
                    {cIdx === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const isBlankNow = col.hideHeader === true || editingTemplate.blankCornerHeader === true || !col.title?.trim();
                          const nextVal = !isBlankNow;
                          setEditingTemplate({
                            ...editingTemplate,
                            blankCornerHeader: nextVal,
                            columns: editingTemplate.columns.map((c, i) =>
                              i === 0 ? { ...c, hideHeader: nextVal, title: nextVal ? "" : (c.title || (isTr ? "Parametre" : "Parameter")) } : c
                            ),
                          });
                        }}
                        title={isTr ? "İlk sütunun üstünü renksiz/boş yap (IEC ve Matris test tabloları)" : "Toggle blank corner cell"}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition ${
                          col.hideHeader === true || editingTemplate.blankCornerHeader === true || !col.title?.trim()
                            ? "bg-purple-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200"
                        }`}
                      >
                        {col.hideHeader === true || editingTemplate.blankCornerHeader === true || !col.title?.trim()
                          ? (isTr ? "KÖŞE: BOŞ" : "CORNER: BLANK")
                          : (isTr ? "KÖŞE: DOLU" : "CORNER: FILLED")}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleAlign(cIdx)}
                      title={isTr ? `Hizalama: ${col.align || "left"}` : `Align: ${col.align || "left"}`}
                      className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded cursor-pointer transition"
                    >
                      {col.align === "center" ? (
                        <AlignCenter className="w-3.5 h-3.5" />
                      ) : col.align === "right" ? (
                        <AlignRight className="w-3.5 h-3.5" />
                      ) : (
                        <AlignLeft className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <input
                      type="text"
                      value={col.title}
                      placeholder={cIdx === 0 ? (isTr ? "(Boş / Şeffaf)" : "(Blank Header)") : (isTr ? "Başlık..." : "Title...")}
                      onChange={(e) => handleUpdateColumnTitle(cIdx, e.target.value)}
                      className="bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 text-slate-900 font-semibold text-xs px-1 py-0.5 outline-none min-w-[65px] max-w-[130px] hover:border-slate-400 transition"
                      title={isTr ? "Sütun adını değiştirmek için doğrudan buraya yazın (İlk sütun boş bırakılırsa PDF ve önizlemede ilk sütunun üstü boş kalır)" : "Type to rename column (Leave empty for blank corner header)"}
                    />

                    <div className="flex items-center gap-0.5 ml-1">
                      <button
                        type="button"
                        onClick={() => handleMoveColumnInEditor(cIdx, "left")}
                        disabled={cIdx === 0}
                        className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveColumnInEditor(cIdx, "right")}
                        disabled={cIdx === editingTemplate.columns.length - 1}
                        className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                      {editingTemplate.columns.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveColumnFromEditor(cIdx)}
                          className="p-0.5 text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                          title={isTr ? "Sütunu sil" : "Remove column"}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Yeni Sütun Ekleme Kutusu */}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddColumnToEditor();
                  }}
                  placeholder={isTr ? "Yeni Sütun Adı..." : "New Column..."}
                  className="px-2.5 py-1.5 bg-white border border-dashed border-slate-300 text-slate-900 text-xs rounded-lg outline-none focus:border-emerald-500 w-36"
                />
                <button
                  type="button"
                  onClick={handleAddColumnToEditor}
                  disabled={!newColTitle.trim()}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white disabled:opacity-30 text-slate-700 rounded-lg text-xs cursor-pointer transition flex items-center gap-1 font-medium border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isTr ? "Ekle" : "Add"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Canlı Tablo Önizlemesi */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 block">{isTr ? "Canlı Izgara Önizlemesi" : "Live Grid Preview"}:</span>
            <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  {/* Çatı Başlık (Varsa) */}
                  {editingTemplate.superHeaderTitle && (() => {
                    const totalColsWithAction = editingTemplate.columns.length + 1;
                    if (editingTemplate.superHeaderStartCol && editingTemplate.superHeaderColSpan) {
                      const startIdx = editingTemplate.columns.findIndex((c) => c.key === editingTemplate.superHeaderStartCol);
                      if (startIdx !== -1) {
                        const colSpan = Math.max(1, Math.min(editingTemplate.superHeaderColSpan, editingTemplate.columns.length - startIdx));
                        const preSpan = startIdx;
                        const postSpan = editingTemplate.columns.length - (startIdx + colSpan) + 1;
                        return (
                          <tr
                            className="font-bold border-b"
                            style={{
                              backgroundColor: getFamilyColor(editingTemplate.familyKey).primary,
                              color: getFamilyColor(editingTemplate.familyKey).headerTextColor,
                            }}
                          >
                            {preSpan > 0 && <th colSpan={preSpan} className="bg-white border-r border-slate-200" />}
                            <th colSpan={colSpan} className="px-3 py-1.5 text-center text-xs tracking-wide">
                              {editingTemplate.superHeaderTitle}
                            </th>
                            {postSpan > 0 && <th colSpan={postSpan} className="bg-white border-l border-slate-200" />}
                          </tr>
                        );
                      }
                    }
                    // Fallback
                    const hasLabelCol = editingTemplate.columns[0]?.role === "label";
                    return (
                      <tr
                        className="font-bold border-b"
                        style={{
                          backgroundColor: getFamilyColor(editingTemplate.familyKey).primary,
                          color: getFamilyColor(editingTemplate.familyKey).headerTextColor,
                        }}
                      >
                        {hasLabelCol && <th colSpan={1} className="bg-white border-r border-slate-200" />}
                        <th
                          colSpan={hasLabelCol ? editingTemplate.columns.length : totalColsWithAction}
                          className="px-3 py-1.5 text-center text-xs tracking-wide"
                        >
                          {editingTemplate.superHeaderTitle}
                        </th>
                        {hasLabelCol && <th className="w-8 bg-white border-l border-slate-200" />}
                      </tr>
                    );
                  })()}

                  {/* Sütun Başlıkları (showHeaderRow true ise) */}
                  {editingTemplate.showHeaderRow !== false && (
                    <tr className="border-b border-slate-200 font-semibold text-slate-700">
                      {editingTemplate.columns.map((c, cIdx) => {
                        const isFirstCol = cIdx === 0;
                        const isFirstColBlank = isFirstCol && (
                          c.hideHeader === true ||
                          editingTemplate.blankCornerHeader === true ||
                          !c.title ||
                          !c.title.trim()
                        );

                        if (isFirstColBlank) {
                          return (
                            <th
                              key={c.key}
                              className="px-2 py-1.5 bg-white border-0"
                              style={{ backgroundColor: "#ffffff", border: "none" }}
                            >
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={c.title}
                                  placeholder={isTr ? "(Renksiz / Boş Köşe)" : "(Blank Corner)"}
                                  onChange={(e) => handleUpdateColumnTitle(cIdx, e.target.value)}
                                  className="w-full bg-transparent text-slate-400 placeholder-slate-400/80 font-normal italic text-xs px-1 py-0.5 outline-none hover:bg-slate-50 focus:bg-white focus:border-b focus:border-emerald-500 rounded transition"
                                  title={isTr ? "İlk sütunun üstü boş/şeffaf kalacaktır. Başlık vermek isterseniz yazabilirsiniz." : "Top of first column stays blank/colorless. Type to set header."}
                                />
                                {c.title && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateColumnTitle(cIdx, "")}
                                    className="text-slate-400 hover:text-rose-500 text-[10px] p-0.5"
                                    title={isTr ? "Başlığı temizle" : "Clear title"}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </th>
                          );
                        }

                        return (
                          <th
                            key={c.key}
                            className={`px-2 py-1.5 bg-slate-100 border-r border-slate-200 ${
                              c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : "text-left"
                            }`}
                          >
                            <input
                              type="text"
                              value={c.title}
                              placeholder={isTr ? "Sütun Adı..." : "Column..."}
                              onChange={(e) => handleUpdateColumnTitle(cIdx, e.target.value)}
                              className={`w-full bg-transparent text-slate-800 font-semibold text-xs px-1 py-0.5 outline-none hover:bg-slate-200/60 focus:bg-white focus:border-b focus:border-emerald-500 rounded transition ${
                                c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : "text-left"
                              }`}
                            />
                          </th>
                        );
                      })}
                      <th className="w-8 px-1 py-1 bg-slate-100"></th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {(editingTemplate.defaultRows && editingTemplate.defaultRows.length > 0
                    ? editingTemplate.defaultRows
                    : [
                        { id: 1 },
                        { id: 2 }
                      ]
                  ).map((row: any, rIdx: number) => {
                    if (row.isGroupHeader) {
                      return (
                        <tr
                          key={row.id || rIdx}
                          className="bg-slate-100 hover:bg-slate-200/60 transition border-y border-slate-200 group"
                        >
                          <td
                            colSpan={editingTemplate.columns.length}
                            className="px-3 py-1.5"
                          >
                            <div className={`flex items-center gap-2.5 ${row.indent ? "pl-8" : "pl-1"}`}>
                              {/* Ana Başlık / Alt Grup Geçiş Butonu */}
                              <button
                                type="button"
                                onClick={() => handleToggleGroupIndent(rIdx)}
                                title={isTr ? "Tıklayarak Ana Başlık / Alt Grup arasında geçiş yapın" : "Toggle Main Header / Sub Group"}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition cursor-pointer flex items-center gap-1 shadow-xs ${
                                  row.indent
                                    ? "bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100"
                                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                                }`}
                              >
                                <span>{row.indent ? (isTr ? "ALT GRUP" : "SUB GROUP") : (isTr ? "ANA BAŞLIK" : "MAIN HEADER")}</span>
                              </button>

                              {/* Başlık Metni Girişi */}
                              <input
                                type="text"
                                value={row.title || ""}
                                onChange={(e) => handleUpdateGroupTitle(rIdx, e.target.value)}
                                placeholder={isTr ? "Bölüm veya grup başlığını yazın..." : "Section or group title..."}
                                className="bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 text-slate-900 font-bold text-xs px-1 py-0.5 outline-none flex-1 transition"
                              />
                            </div>
                          </td>
                          <td className="w-16 px-1 py-1 text-center bg-slate-50 border-slate-200">
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleMoveRowInEditor(rIdx, "up")}
                                disabled={rIdx === 0}
                                className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-0.5 cursor-pointer"
                                title={isTr ? "Yukarı taşı" : "Move up"}
                              >
                                <ChevronLeft className="w-3 h-3 rotate-90" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveRowInEditor(rIdx, "down")}
                                disabled={!editingTemplate.defaultRows || rIdx === editingTemplate.defaultRows.length - 1}
                                className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-0.5 cursor-pointer"
                                title={isTr ? "Aşağı taşı" : "Move down"}
                              >
                                <ChevronRight className="w-3 h-3 rotate-90" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveDefaultRow(rIdx)}
                                className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer ml-0.5"
                                title={isTr ? "Başlığı sil" : "Delete header"}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // Normal Veri Satırı
                    return (
                      <tr
                        key={row.id || rIdx}
                        className={`group hover:bg-slate-50 transition ${
                          rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                        }`}
                      >
                        {editingTemplate.columns.map((c, cIdx) => {
                          const isFirstColBlank = cIdx === 0 && (
                            c.hideHeader === true ||
                            editingTemplate.blankCornerHeader === true ||
                            !c.title ||
                            !c.title.trim()
                          );
                          const isLabel = c.role === "label" || isFirstColBlank;
                          const cellVal = row[c.key] !== undefined ? row[c.key] : "";
                          const isHighlightLabel = isFirstColBlank;
                          return (
                            <td
                              key={c.key}
                              className={`p-1 border-r border-slate-200 ${
                                isHighlightLabel
                                  ? "bg-emerald-700 text-white font-bold"
                                  : isLabel
                                  ? "bg-emerald-50/70 text-emerald-900 font-bold"
                                  : "text-slate-800"
                              }`}
                            >
                              <input
                                type="text"
                                value={cellVal}
                                onChange={(e) => handleUpdateRowCell(rIdx, c.key, e.target.value)}
                                placeholder={isLabel ? (isTr ? `Parametre ${rIdx + 1}` : `Param ${rIdx + 1}`) : (isTr ? `Değer ${rIdx + 1}` : `Value ${rIdx + 1}`)}
                                className={`w-full bg-transparent px-2 py-1 outline-none rounded border border-transparent focus:border-emerald-500 focus:bg-white focus:text-slate-900 transition text-[11px] ${
                                  isHighlightLabel
                                    ? "font-bold text-white placeholder-emerald-200"
                                    : isLabel
                                    ? "font-semibold text-emerald-900 placeholder-emerald-600/50"
                                    : "text-slate-800 placeholder-slate-400"
                                } ${c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : "text-left"}`}
                              />
                            </td>
                          );
                        })}
                        <td className="w-16 px-1 py-1 text-center bg-slate-50 border-slate-200">
                          <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() => handleMoveRowInEditor(rIdx, "up")}
                              disabled={rIdx === 0}
                              className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-0.5 cursor-pointer"
                              title={isTr ? "Yukarı taşı" : "Move up"}
                            >
                              <ChevronLeft className="w-3 h-3 rotate-90" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveRowInEditor(rIdx, "down")}
                              disabled={!editingTemplate.defaultRows || rIdx === editingTemplate.defaultRows.length - 1}
                              className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-0.5 cursor-pointer"
                              title={isTr ? "Aşağı taşı" : "Move down"}
                            >
                              <ChevronRight className="w-3 h-3 rotate-90" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveDefaultRow(rIdx)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer ml-0.5"
                              title={isTr ? "Satırı sil" : "Delete row"}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border-t border-slate-200 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleAddDefaultRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-800 text-xs font-semibold cursor-pointer transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isTr ? "Yeni Satır Ekle" : "Add Row"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddGroupHeader(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold cursor-pointer transition shadow-xs"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isTr ? "Ana Başlık Ekle" : "Add Section Header"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddGroupHeader(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-cyan-50 border border-slate-200 text-cyan-800 text-xs font-semibold cursor-pointer transition shadow-xs"
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-600" />
                    <span>{isTr ? "Alt Grup Başlığı Ekle" : "Add Sub Group Header"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {isTr
                    ? "İpucu: Başlık butonuna tıklayarak Ana Başlık ile Alt Grup arasında hızlıca geçiş yapabilirsiniz."
                    : "Tip: Click header badge to switch between Main Header and Sub Group."}
                </p>
              </div>
            </div>
          </div>

          {/* Alt Butonlar */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setEditingTemplate(null)}
              className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer text-xs"
            >
              {isTr ? "Vazgeç" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleSaveEditor}
              disabled={!editingTemplate.name.trim()}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isTr ? "Şablonu Kaydet" : "Save Template"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ================== ŞABLON KARTLARI LİSTESİ ================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((tpl) => {
          const mapKey = tpl.familyKey ? `${tpl.sectionKey || "varyasyonlar"}_${tpl.familyKey}` : "";
          const isFamilyDefault = mapKey && familyDefaultMap[mapKey] === tpl.id;
          const secObj = sectionsList.find((s) => s.key === (tpl.sectionKey || "varyasyonlar"));
          const famObj = families.find((f) => f.family_key === tpl.familyKey);

          return (
            <div
              key={tpl.id}
              className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl p-5 shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 transition group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5">
                    {/* Rozetler: Bölüm ve Kablo Ailesi */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                        {secObj?.label || tpl.sectionKey || "Tablo"}
                      </span>
                      {famObj ? (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-semibold border flex items-center gap-1"
                          style={{
                            backgroundColor: getFamilyColor(famObj.family_key).tint,
                            borderColor: getFamilyColor(famObj.family_key).primary,
                            color: getFamilyColor(famObj.family_key).primary,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: getFamilyColor(famObj.family_key).primary }}
                          />
                          <span>{famObj.display_name}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {isTr ? "Genel / Ortak" : "General"}
                        </span>
                      )}
                      {tpl.isBuiltIn && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                          {isTr ? "Yerleşik" : "Built-in"}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{tpl.name}</span>
                    </h4>
                    {tpl.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">{tpl.description}</p>
                    )}
                  </div>

                  {isFamilyDefault && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shrink-0 flex items-center gap-1">
                      <BookmarkCheck className="w-3 h-3 text-emerald-600" />
                      <span>{isTr ? "Varsayılan" : "Default"}</span>
                    </span>
                  )}
                </div>

                {/* Sütun Önizleme Etiketleri */}
                <div className="mt-3.5 space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                    {isTr ? "Sütunlar" : "Columns"} ({tpl.columns.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {tpl.columns.map((c) => (
                      <span
                        key={c.key}
                        className="px-2 py-0.5 bg-slate-50 text-slate-700 rounded text-[10px] border border-slate-200"
                      >
                        {c.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Aksiyon Butonları */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs flex-wrap">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(tpl)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 transition cursor-pointer font-medium text-xs"
                    title={isTr ? "Şablonu Düzenle" : "Edit Template"}
                  >
                    <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isTr ? "Düzenle" : "Edit"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClone(tpl)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-700 hover:bg-slate-100 transition cursor-pointer"
                    title={isTr ? "Şablonu Klonla" : "Clone Template"}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportTemplateId(tpl.id);
                      setAiModalTab("export");
                      setIsAiModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-slate-100 transition cursor-pointer"
                    title={isTr ? "Şablonun JSON Kodunu Gör / Kopyala" : "View / Copy Template JSON"}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tpl.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer font-medium text-xs"
                    title={isTr ? "Bu Şablonu Sil" : "Delete Template"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isTr ? "Sil" : "Delete"}</span>
                  </button>
                </div>

                {tpl.familyKey && !isFamilyDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(tpl, tpl.familyKey!)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-emerald-600 transition cursor-pointer flex items-center gap-1"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>{isTr ? "Varsayılan Yap" : "Set Default"}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
            <TableIcon className="w-8 h-8 text-slate-400 stroke-1 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {isTr ? "Bu filtreye uygun şablon bulunamadı." : "No templates found for this filter."}
            </p>
            <button
              type="button"
              onClick={handleStartNew}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isTr ? "Hemen Yeni Şablon Oluştur" : "Create New Template Now"}</span>
            </button>
          </div>
        )}
      </div>

      {/* ================== AI ASİSTANI & JSON İÇE / DIŞA AKTARMA MODALI ================== */}
      {isAiModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAiModalOpen(false);
          }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-slate-900/10 overflow-hidden animate-in zoom-in-95">
            {/* Modal Üst Başlık Barı */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 shrink-0 shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 truncate">
                    <span>{isTr ? "AI & JSON Şablon Stüdyosu" : "AI & JSON Template Studio"}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                      v3.0 Pro
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {isTr
                      ? "Teknik katalog tablolarını yapay zeka ile şablona dönüştürün veya JSON ile yönetin"
                      : "Convert catalog tables to templates with AI or manage via JSON"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                title={isTr ? "Kapat (Esc)" : "Close (Esc)"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Gizli Dosya Girişi */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,application/json"
              className="hidden"
            />

            {/* Sekme Butonları (Segmented Tab Bar) */}
            <div className="px-6 pt-3 pb-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2 flex-wrap shrink-0">
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                <button
                  type="button"
                  onClick={() => setAiModalTab("prompt")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition cursor-pointer ${
                    aiModalTab === "prompt"
                      ? "bg-cyan-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>{isTr ? "1. AI Prompt Rehberi" : "1. AI Prompt Guide"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAiModalTab("import")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition cursor-pointer relative ${
                    aiModalTab === "import"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>{isTr ? "2. JSON İçe Aktar & Üret" : "2. Import JSON"}</span>
                  {pastedJsonCode.trim() && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        jsonValidation.isValid ? "bg-emerald-400" : "bg-rose-400"
                      } animate-pulse`}
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAiModalTab("export")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition cursor-pointer ${
                    aiModalTab === "export"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isTr ? "3. JSON Dışa Aktar" : "3. Export JSON"}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 hidden sm:block font-medium">
                {aiModalTab === "prompt" && (isTr ? "Görselden Tablo Çıkarımı" : "Extract table from images")}
                {aiModalTab === "import" && (isTr ? "Otomatik Sözdizimi & Şema Doğrulama" : "Live syntax validation")}
                {aiModalTab === "export" && (isTr ? "Şablon Paylaşımı & Yedekleme" : "Template backup & sharing")}
              </div>
            </div>

            {/* MODAL GÖVDE İÇERİĞİ */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* ================== TAB 1: AI PROMPT REHBERİ ================== */}
              {aiModalTab === "prompt" && (
                <div className="space-y-5 animate-in fade-in">
                  {/* 3 Adımlı Akış Kartları */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-200">
                          {isTr ? "ADIM 1" : "STEP 1"}
                        </span>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {isTr ? "Promptu Kopyalayın" : "Copy the Prompt"}
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {isTr
                          ? "Aşağıdaki optimize edilmiş master sistem promptunu tek tuşla panoya alın."
                          : "Copy the optimized master system prompt with one click."}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {isTr ? "ADIM 2" : "STEP 2"}
                        </span>
                        <Bot className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {isTr ? "Yapay Zekaya Gönderin" : "Send to AI"}
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {isTr
                          ? "ChatGPT, Gemini veya Claude'a gidin; tablo ekran görüntüsünü veya metnini prompt ile birlikte gönderin."
                          : "Upload table screenshot or text to ChatGPT/Gemini/Claude along with the prompt."}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                          {isTr ? "ADIM 3" : "STEP 3"}
                        </span>
                        <FileJson className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {isTr ? "JSON'ı Buraya Yapıştırın" : "Paste JSON Here"}
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {isTr
                          ? "AI'ın ürettiği ```json kod bloğunu kopyalayın ve 'JSON İçe Aktar' sekmesine yapıştırın."
                          : "Copy the JSON code block from AI and paste it into the 'Import JSON' tab."}
                      </p>
                    </div>
                  </div>

                  {/* Master Prompt Metin Kutusu */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-800">
                          {isTr ? "ETK Kablo Teknik Tablo Master Promptu" : "ETK Cable Master Table Prompt"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          copiedPrompt
                            ? "bg-emerald-600 text-white"
                            : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs"
                        }`}
                      >
                        {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPrompt ? (isTr ? "Kopyalandı!" : "Copied!") : (isTr ? "Promptu Kopyala" : "Copy Prompt")}</span>
                      </button>
                    </div>

                    <div className="p-4 max-h-[300px] overflow-y-auto font-mono text-[11px] text-slate-700 bg-slate-50/70 leading-relaxed whitespace-pre-wrap select-all">
                      {masterAiPromptText}
                    </div>
                  </div>

                  {/* Hızlı Eylem Butonu */}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                      <span>{isTr ? "AI yanıtınız hazır mı?" : "Have the AI response ready?"}</span>
                    </p>

                    <button
                      type="button"
                      onClick={() => setAiModalTab("import")}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition cursor-pointer"
                    >
                      <span>{isTr ? "JSON Kodunu Yapıştırmaya Geç" : "Proceed to Paste JSON"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ================== TAB 2: JSON İÇE AKTAR & ÜRET ================== */}
              {aiModalTab === "import" && (
                <div className="space-y-4 animate-in fade-in">
                  {/* Üst Eylem Araç Çubuğu */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-cyan-600" />
                      <span>{isTr ? "Yapay Zeka JSON Kodunu Yapıştırın:" : "Paste AI JSON Code:"}</span>
                    </label>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleLoadIecSampleJson}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold text-[11px] border border-purple-300 shadow-xs transition cursor-pointer"
                        title={isTr ? "IEC Mekanik Testler (Sol üst köşesi boş ve renksiz) örneğini yükle" : "Load IEC Mechanical Test sample (Blank corner)"}
                      >
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span>{isTr ? "IEC Test Örneği (Köşe Boş)" : "IEC Sample (Blank Corner)"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleLoadSampleJson}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-cyan-700 font-medium text-[11px] border border-slate-200 shadow-2xs transition cursor-pointer"
                        title={isTr ? "Test için hazır elektrik matrisi örneği yükle" : "Load sample electrical matrix"}
                      >
                        <Sparkles className="w-3 h-3 text-cyan-600" />
                        <span>{isTr ? "Elektrik Matrisi JSON" : "Electrical Matrix"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-700 font-medium text-[11px] border border-slate-200 shadow-2xs transition cursor-pointer"
                        title={isTr ? "Panodan metni yapıştır" : "Paste from clipboard"}
                      >
                        <Clipboard className="w-3 h-3 text-emerald-600" />
                        <span>{isTr ? "Panodan Yapıştır" : "Paste"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-700 font-medium text-[11px] border border-slate-200 shadow-2xs transition cursor-pointer"
                        title={isTr ? "Bilgisayardan .json dosyası seç" : "Upload .json file"}
                      >
                        <Upload className="w-3 h-3 text-indigo-600" />
                        <span>{isTr ? "Dosyadan Yükle" : "Upload File"}</span>
                      </button>

                      {pastedJsonCode && (
                        <button
                          type="button"
                          onClick={() => setPastedJsonCode("")}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-[11px] border border-rose-200 transition cursor-pointer"
                          title={isTr ? "Metni temizle" : "Clear code"}
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>{isTr ? "Temizle" : "Clear"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* JSON Kod Metin Alanı */}
                  <div
                    className="relative"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file && (file.name.endsWith(".json") || file.type.includes("json"))) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const content = ev.target?.result as string;
                          if (content) setPastedJsonCode(content);
                        };
                        reader.readAsText(file);
                      }
                    }}
                  >
                    <textarea
                      value={pastedJsonCode}
                      onChange={(e) => setPastedJsonCode(e.target.value)}
                      placeholder={
                        isTr
                          ? '{\n  "name": "Teknik Tablo Başlığı",\n  "sectionKey": "elektriksel_ozellikler",\n  "columns": [\n    { "key": "param", "title": "Parametre", "align": "left", "role": "label" },\n    { "key": "val_1", "title": "Değer", "align": "center", "role": "value" }\n  ],\n  "defaultRows": [...]\n}'
                          : 'Paste template JSON code here or drag & drop a .json file...'
                      }
                      rows={8}
                      className={`w-full p-3.5 bg-slate-50 rounded-xl font-mono text-xs text-slate-900 placeholder-slate-400 border focus:bg-white focus:outline-none focus:ring-2 transition resize-y ${
                        !pastedJsonCode.trim()
                          ? "border-slate-300 focus:border-cyan-500 focus:ring-cyan-500/20"
                          : jsonValidation.isValid
                          ? "border-emerald-500 focus:border-emerald-600 focus:ring-emerald-500/20"
                          : "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      }`}
                      spellCheck={false}
                    />
                  </div>

                  {/* Canlı Doğrulama ve Durum Kutusu */}
                  {!pastedJsonCode.trim() && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        {isTr
                          ? "Yapay zekanın yanıtındaki ```json { ... } ``` bloğunu doğrudan yapıştırabilirsiniz. Markdown işaretleri ve kod blokları otomatik temizlenir."
                          : "You can paste the entire markdown code block from AI. Code fences are automatically sanitized."}
                      </span>
                    </div>
                  )}

                  {jsonValidation.hasInput && !jsonValidation.isValid && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold text-rose-900">
                          {isTr ? "JSON Sözdizimi veya Şema Hatası:" : "Invalid JSON Syntax or Schema:"}
                        </span>
                        <p className="font-mono text-[11px] text-rose-700 leading-relaxed">
                          {jsonValidation.errorMessage}
                        </p>
                      </div>
                    </div>
                  )}

                  {jsonValidation.isValid && jsonValidation.template && (
                    <div className="space-y-3.5 animate-in fade-in">
                      {/* Başarı Özeti Rozetleri */}
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-xs font-bold text-emerald-950">
                              {isTr ? "Kusursuz Şablon Ayrıştırıldı:" : "Template Validated Successfully:"}{" "}
                              <span className="text-slate-900 font-semibold">
                                {jsonValidation.template.name}
                              </span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                              {jsonValidation.template.columns.length} {isTr ? "sütun" : "cols"}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 font-semibold border border-cyan-200">
                              {jsonValidation.template.defaultRows?.length || 0} {isTr ? "satır" : "rows"}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold border border-purple-200">
                              {jsonValidation.template.layoutMode || "matrix"}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
                              {jsonValidation.template.stripingMode || "filled_only"}
                            </span>
                          </div>
                        </div>

                        {/* Ön Kayıt Ayarları: Bölüm ve Kablo Ailesi Seçimi */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200">
                          <div>
                            <label className="block text-[11px] font-semibold text-emerald-950 mb-1">
                              {isTr ? "Eklenecek / Hedef Bölüm:" : "Target Section:"}
                            </label>
                            <select
                              value={importSectionOverride || jsonValidation.template.sectionKey || "elektriksel_ozellikler"}
                              onChange={(e) => setImportSectionOverride(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer shadow-2xs"
                            >
                              {sectionsList.map((s) => (
                                <option key={s.key} value={s.key}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-emerald-950 mb-1">
                              {isTr ? "İlişkili Kablo Ailesi:" : "Associated Cable Family:"}
                            </label>
                            <select
                              value={
                                importFamilyOverride !== undefined
                                  ? importFamilyOverride
                                  : jsonValidation.template.familyKey || ""
                              }
                              onChange={(e) => setImportFamilyOverride(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer shadow-2xs"
                            >
                              <option value="">{isTr ? "Genel (Tüm Kablo Aileleri)" : "General (All Families)"}</option>
                              {families.map((f) => (
                                <option key={f.family_key} value={f.family_key}>
                                  {f.display_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Değerleri Temizleme Seçeneği */}
                        <div className="pt-2 border-t border-emerald-200">
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-emerald-950 select-none">
                            <input
                              type="checkbox"
                              checked={sanitizeValuesOnImport}
                              onChange={(e) => setSanitizeValuesOnImport(e.target.checked)}
                              className="w-4 h-4 rounded text-emerald-600 border-emerald-300 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="font-semibold">
                              {isTr
                                ? "Örnek ölçüm/test değerlerini temizle (Yalnızca parametre başlıkları ve şablon iskeletini sakla)"
                                : "Clear sample measurement values (Keep parameter labels and skeleton only)"}
                            </span>
                          </label>
                          <p className="text-[10px] text-emerald-700 pl-6 mt-0.5">
                            {isTr
                              ? "İşaretli olduğunda, örnek değerler silinir. Tablo belgeye eklendiğinde kablonun gerçek verileri otomatik bağlanır, veri yoksa boş kalır."
                              : "When checked, sample values are stripped. When added to document, real cable data connects automatically or remains empty."}
                          </p>
                        </div>
                      </div>

                      {/* CANLI MİNİ TABLO ÖNİZLEMESİ */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold flex items-center gap-1.5 text-slate-700">
                            <Layers className="w-3.5 h-3.5 text-cyan-600" />
                            <span>{isTr ? "Canlı Tablo Önizlemesi:" : "Live Table Preview:"}</span>
                          </span>
                          <span>
                            {jsonValidation.template.columns.map((c) => c.title).join(" • ")}
                          </span>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs max-h-[220px] overflow-y-auto text-xs">
                          <table className="w-full border-collapse">
                            {/* Süper Başlık (Çatı Başlık) Varsa */}
                            {jsonValidation.template.superHeaderTitle && (
                              <thead>
                                <tr className="bg-emerald-600 text-white font-bold border-b border-emerald-700">
                                  {jsonValidation.template.columns[0]?.role === "label" && jsonValidation.template.columns.length > 1 ? (
                                    <>
                                      <th className="py-1.5 px-3 bg-white border-r border-slate-200"></th>
                                      <th
                                        colSpan={jsonValidation.template.columns.length - 1}
                                        className="py-1.5 px-3 text-center tracking-wider text-[11px] uppercase bg-emerald-600 text-white"
                                      >
                                        {jsonValidation.template.superHeaderTitle}
                                      </th>
                                    </>
                                  ) : (
                                    <th
                                      colSpan={jsonValidation.template.columns.length}
                                      className="py-1.5 px-3 text-center tracking-wider text-[11px] uppercase bg-emerald-600 text-white"
                                    >
                                      {jsonValidation.template.superHeaderTitle}
                                    </th>
                                  )}
                                </tr>
                              </thead>
                            )}

                            {/* Sütun Başlıkları */}
                            {jsonValidation.template.showHeaderRow !== false && (
                              <thead className="border-b border-slate-200 text-slate-700">
                                <tr>
                                  {jsonValidation.template.columns.map((col, idx) => {
                                    const isFirstBlank = idx === 0 && (
                                      col.hideHeader === true ||
                                      jsonValidation.template?.blankCornerHeader === true ||
                                      !col.title ||
                                      !col.title.trim()
                                    );

                                    if (isFirstBlank) {
                                      return (
                                        <th
                                          key={col.key || idx}
                                          className="py-2 px-3 bg-white border-0"
                                          style={{ backgroundColor: "#ffffff", border: "none" }}
                                        />
                                      );
                                    }

                                    return (
                                      <th
                                        key={col.key || idx}
                                        className={`py-2 px-3 text-[11px] font-semibold bg-slate-50 border-r border-slate-200 last:border-r-0 ${
                                          col.align === "center"
                                            ? "text-center"
                                            : col.align === "right"
                                            ? "text-right"
                                            : "text-left"
                                        }`}
                                      >
                                        {col.title}
                                      </th>
                                    );
                                  })}
                                </tr>
                              </thead>
                            )}

                            {/* Satırlar Önizlemesi (İlk 6 Satır) */}
                            <tbody className="divide-y divide-slate-100">
                              {(jsonValidation.template.defaultRows || []).slice(0, 6).map((row, rIdx) => {
                                if (row.isGroupHeader) {
                                  return (
                                    <tr
                                      key={row.id || rIdx}
                                      className="bg-slate-100 font-bold text-slate-900"
                                    >
                                      <td
                                        colSpan={jsonValidation.template!.columns.length}
                                        className={`py-1.5 px-3 text-[11px] ${
                                          row.indent ? "pl-7 text-cyan-700 font-semibold" : "text-emerald-700 uppercase tracking-wide"
                                        }`}
                                      >
                                        {row.title || (isTr ? "Grup Başlığı" : "Group Header")}
                                      </td>
                                    </tr>
                                  );
                                }

                                const isNoHeader = jsonValidation.template!.showHeaderRow === false;

                                return (
                                  <tr
                                    key={row.id || rIdx}
                                    className={rIdx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}
                                  >
                                    {jsonValidation.template!.columns.map((col, cIdx) => {
                                      const isFirstColBlank = cIdx === 0 && (
                                        col.hideHeader === true ||
                                        jsonValidation.template!.blankCornerHeader === true ||
                                        !col.title ||
                                        !col.title.trim()
                                      );
                                      const isLabel = col.role === "label" || isFirstColBlank;
                                      const val = row[col.key];
                                      const hasVal = val !== undefined && val !== "";

                                      let cellClass = "text-slate-700 font-mono";
                                      if (isLabel) {
                                        cellClass = isNoHeader || isFirstColBlank
                                          ? "bg-emerald-700 text-white font-bold tracking-tight"
                                          : "bg-emerald-50/80 text-emerald-900 font-bold";
                                      }

                                      return (
                                        <td
                                          key={col.key || cIdx}
                                          className={`py-1.5 px-3 text-[11px] border-r border-slate-100 last:border-r-0 ${cellClass} ${
                                            col.align === "center"
                                              ? "text-center"
                                              : col.align === "right"
                                              ? "text-right"
                                              : "text-left"
                                          }`}
                                        >
                                          {hasVal ? (
                                            String(val)
                                          ) : isLabel ? (
                                            <span className="opacity-40 italic">Parametre</span>
                                          ) : (
                                            <span className={isLabel && isNoHeader ? "text-emerald-200" : "text-slate-400"}>-</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>

                          {(jsonValidation.template.defaultRows?.length || 0) > 6 && (
                            <div className="py-2 px-3 text-center text-[10px] text-slate-500 bg-slate-50 border-t border-slate-200">
                              + {(jsonValidation.template.defaultRows?.length || 0) - 6}{" "}
                              {isTr ? "satır daha mevcut" : "more rows available"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* İçe Aktarma Alt Eylem Butonları */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsAiModalOpen(false)}
                      className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition cursor-pointer"
                    >
                      {isTr ? "Vazgeç" : "Cancel"}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!jsonValidation.isValid}
                        onClick={() => handleSaveImportedTemplate(false)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                          jsonValidation.isValid
                            ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs"
                            : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        }`}
                        title={isTr ? "Tasarımcıyı açmadan sadece şablon kütüphanesine ekle" : "Save to template library only"}
                      >
                        {isTr ? "Kütüphaneye Ekle" : "Save to Library"}
                      </button>

                      <button
                        type="button"
                        disabled={!jsonValidation.isValid}
                        onClick={() => handleSaveImportedTemplate(true)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition shadow-md cursor-pointer ${
                          jsonValidation.isValid
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-700/20"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isTr ? "Şablonu Kaydet ve Düzenle" : "Save & Open in Designer"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ================== TAB 3: JSON DIŞA AKTAR ================== */}
              {aiModalTab === "export" && (
                <div className="space-y-4 animate-in fade-in">
                  {/* Şablon Seçim Açılır Menüsü */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        {isTr ? "Dışa Aktarılacak Şablon:" : "Select Template to Export:"}
                      </label>
                      <select
                        value={activeExportTemplate?.id || ""}
                        onChange={(e) => setExportTemplateId(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-amber-500 min-w-[260px] cursor-pointer shadow-2xs"
                      >
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name} ({tpl.columns.length} {isTr ? "sütun" : "cols"})
                          </option>
                        ))}
                      </select>
                    </div>

                    {activeExportTemplate && (
                      <div className="flex items-center gap-1.5 flex-wrap self-end">
                        <span className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                          {activeExportTemplate.sectionKey}
                        </span>
                        {activeExportTemplate.familyKey && (
                          <span className="text-[10px] px-2 py-1 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 font-medium">
                            {families.find((f) => f.family_key === activeExportTemplate.familyKey)?.display_name || activeExportTemplate.familyKey}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          {activeExportTemplate.columns.length} {isTr ? "Sütun" : "Cols"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* JSON Kod Görüntüleyici */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                    <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-600 font-semibold">
                        {activeExportTemplate?.name || "template"}.json
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {exportJsonString.length} bytes
                      </span>
                    </div>

                    <pre className="p-4 max-h-[320px] overflow-y-auto font-mono text-xs text-slate-800 leading-relaxed select-all bg-white">
                      {exportJsonString}
                    </pre>
                  </div>

                  {/* Dışa Aktarma Eylem Butonları */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsAiModalOpen(false)}
                      className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition cursor-pointer"
                    >
                      {isTr ? "Kapat" : "Close"}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyExport}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          copiedExport
                            ? "bg-emerald-600 text-white"
                            : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs"
                        }`}
                      >
                        {copiedExport ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedExport ? (isTr ? "Kopyalandı!" : "Copied!") : (isTr ? "JSON Kodunu Kopyala" : "Copy JSON")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadExport}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isTr ? ".json Dosyası İndir" : "Download .json File"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

