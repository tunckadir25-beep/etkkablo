import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { CableVariation } from "../../types/cable";
import {
  TableTemplate,
  getSavedTableTemplates,
  getTemplateForFamily,
  getFamilyTemplateMap,
  getDefaultEmptyTemplate,
} from "../../types/tableTemplates";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Table as TableIcon,
  X,
  Check,
  Copy,
  LayoutGrid,
  Trash2,
  ChevronDown,
  Layers,
  ClipboardPaste,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface ColumnDef {
  key: string;
  title: string;
  isCustom?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  role?: "label" | "value";
  hideHeader?: boolean;
}

interface CellCoord {
  r: number;
  c: number;
}

export interface DynamicTableProps {
  tableId?: string;
  initialTemplate?: TableTemplate;
  title?: string;
  onTitleChange?: (newTitle: string) => void;
  sectionKey?: string; // "varyasyonlar" | "teknik_ozellikler" | "elektriksel_ozellikler" | string
  sectionTitle?: string;
  initialData: any[];
  isFiber?: boolean;
  familyKey?: string;
  familyName?: string;
  lang?: "tr" | "en";
  onChange: (updatedVariations: any[]) => void;
  onColumnsChange?: (newColumns: ColumnDef[]) => void;
  onOpenCalculator?: () => void;
  showIncludeCheckbox?: boolean;
  onRemoveTable?: () => void;
  isFixed?: boolean;
}

export interface ParsedSmartRow {
  isGroupHeader: boolean;
  title: string;
  indent?: boolean;
  values?: string[];
}

function isValueToken(token: string): boolean {
  if (!token) return false;
  const t = token.trim();
  if (/^[><≥≤~±+-]?\s*\d+([.,]\d+)?(%|kV|V|m|mm|Ω|kΩ|MΩ)?$/i.test(t)) return true;
  if (/^\d+(\/\d+)+$/.test(t)) return true;
  if (/^\d+(x\d+)+([.,]\d+)?$/.test(t)) return true;
  if (t === "-" || t === "—" || t === "–" || t.toLowerCase() === "n/a" || t.toLowerCase() === "yok") return true;
  return false;
}

function tokenizeLine(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  if (trimmed.includes("\t")) return trimmed.split("\t").map((c) => c.trim());
  if (trimmed.includes(";")) return trimmed.split(";").map((c) => c.trim());

  const rawTokens = trimmed.split(/\s+/);
  const mergedTokens: string[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const cur = rawTokens[i];
    const next = rawTokens[i + 1];
    if (/^[><≥≤~±+-]$/.test(cur) && next && /^\d+/.test(next)) {
      mergedTokens.push(cur + next);
      i++;
    } else {
      mergedTokens.push(cur);
    }
  }
  return mergedTokens;
}

function parseSmartTableText(text: string, valColsCount: number): ParsedSmartRow[] {
  const lines = text
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const parsedItems: Array<
    | { type: "data"; title: string; values: string[] }
    | { type: "values_only"; values: string[] }
    | { type: "text_only"; text: string }
  > = [];

  for (let i = 0; i < lines.length; i++) {
    const tokens = tokenizeLine(lines[i]);
    if (tokens.length === 0) continue;

    const valCount = tokens.filter(isValueToken).length;

    // Durum 1: Satırın sonunda valColsCount kadar değer belirteci var ve başında başlık var
    if (valColsCount > 0 && tokens.length >= valColsCount) {
      const candidateVals = tokens.slice(tokens.length - valColsCount);
      const candidateValsCount = candidateVals.filter(isValueToken).length;
      if (candidateValsCount >= Math.min(valColsCount, 4)) {
        const titleTokens = tokens.slice(0, tokens.length - valColsCount);
        parsedItems.push({
          type: "data",
          title: titleTokens.join(" "),
          values: candidateVals,
        });
        continue;
      }
    }

    // Durum 2: Tüm belirteçler saf değerler (başlıksız değer satırı)
    if (valCount > 0 && (valCount === tokens.length || (valColsCount > 0 && tokens.length === valColsCount))) {
      parsedItems.push({
        type: "values_only",
        values: tokens,
      });
      continue;
    }

    // Durum 3: Saf metin (ara başlık veya alt satırın parametre adı)
    parsedItems.push({
      type: "text_only",
      text: tokens.join(" "),
    });
  }

  // İkinci geçiş: Başlık metni ile takip eden başlıksız değerleri eşleştir
  const structuredRows: ParsedSmartRow[] = [];
  for (let i = 0; i < parsedItems.length; i++) {
    const cur = parsedItems[i];
    const next = parsedItems[i + 1];

    if (cur.type === "text_only") {
      if (next && (next.type === "values_only" || (next.type === "data" && !next.title))) {
        structuredRows.push({
          isGroupHeader: false,
          title: cur.text,
          values: next.values,
        });
        i++; // takip eden değer satırı tüketildi
      } else {
        structuredRows.push({
          isGroupHeader: true,
          title: cur.text,
          indent: /^(perler|komşu|ekrana|v\s*\(|dc\s*\(|ac\s*\()/i.test(cur.text),
        });
      }
    } else if (cur.type === "data") {
      structuredRows.push({
        isGroupHeader: false,
        title: cur.title,
        values: cur.values,
      });
    } else if (cur.type === "values_only") {
      structuredRows.push({
        isGroupHeader: false,
        title: "",
        values: cur.values,
      });
    }
  }

  return structuredRows;
}

export const DynamicTable: React.FC<DynamicTableProps> = ({
  tableId,
  initialTemplate,
  title,
  onTitleChange,
  sectionKey = "varyasyonlar",
  sectionTitle,
  initialData,
  isFiber = false,
  familyKey,
  familyName,
  lang = "tr",
  onChange,
  onColumnsChange,
  showIncludeCheckbox = sectionKey === "varyasyonlar",
  onRemoveTable,
  isFixed = false,
}) => {
  const isTr = lang === "tr";
  const tableRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollAnimRef = useRef<number | null>(null);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);

  const t = {
    part_no: isTr ? "Part Numarası" : "Part Number",
    type: isTr ? (isFiber ? "Lif Cinsi" : "İletken Kesiti") : isFiber ? "Fiber Type" : "Cross Section",
    count: isTr ? (isFiber ? "Fiber Sayısı" : "Damar / Per") : isFiber ? "Fiber Count" : "Cores / Pairs",
    diameter: isTr ? "Dış Çap (mm)" : "Outer Dia (mm)",
    cu_weight: isTr ? "Bakır Ağ. (kg/km)" : "Cu Wt (kg/km)",
    tot_weight: isTr ? "Top. Ağ. (kg/km)" : "Total Wt (kg/km)",
    packing: isTr ? "Sevk Boyu (m)" : "Drum Length (m)",
    add_row: isTr ? "Yeni Satır Ekle" : "Add Row",
    add_col: isTr ? "Sütun Ekle" : "Add Column",
    col_placeholder: isTr ? "Sütun Adı..." : "Col Name...",
    move_left: isTr ? "Sola Taşı" : "Move Left",
    move_right: isTr ? "Sağa Taşı" : "Move Right",
    delete_col: isTr ? "Sütunu Kaldır" : "Remove Column",
    empty_title: isTr ? "Henüz kayıtlı varyasyon yok" : "No variations added yet",
    empty_desc: isTr
      ? "Alttaki satır ekleme butonunu kullanabilir veya Excel'den kopyaladığınız verileri (Ctrl+V) yapıştırabilirsiniz."
      : "Use the add row button below or paste rows copied from Excel (Ctrl+V).",
    copied: isTr ? "Hücreler kopyalandı (Ctrl+C)" : "Cells copied (Ctrl+C)",
  };

  const getDefaultColumns = useCallback((): ColumnDef[] => {
    if (isFiber) {
      return [
        { key: "part_numarasi", title: t.part_no, align: "left", width: "min-w-[130px]" },
        { key: "lif_cinsi", title: t.type, align: "left", width: "min-w-[120px]" },
        { key: "fiber_sayisi", title: t.count, align: "center", width: "min-w-[85px]" },
        { key: "dis_cap_mm", title: t.diameter, align: "right", width: "min-w-[85px]" },
        { key: "toplam_agirlik_kg_km", title: t.tot_weight, align: "right", width: "min-w-[95px]" },
        { key: "sevk_boyu_m", title: t.packing, align: "center", width: "min-w-[85px]" },
      ];
    } else {
      return [
        { key: "part_numarasi", title: t.part_no, align: "left", width: "min-w-[130px]" },
        { key: "kesit", title: t.type, align: "left", width: "min-w-[120px]" },
        { key: "per_sayisi", title: t.count, align: "center", width: "min-w-[85px]" },
        { key: "dis_cap_mm", title: t.diameter, align: "right", width: "min-w-[85px]" },
        { key: "bakir_agirligi_kg_km", title: t.cu_weight, align: "right", width: "min-w-[95px]" },
        { key: "toplam_agirlik_kg_km", title: t.tot_weight, align: "right", width: "min-w-[95px]" },
        { key: "sevk_boyu_m", title: t.packing, align: "center", width: "min-w-[85px]" },
      ];
    }
  }, [isFiber, t.part_no, t.type, t.count, t.diameter, t.cu_weight, t.tot_weight, t.packing]);

  // ==================== TABLO ŞABLONLARI YÖNETİMİ ====================
  const [templates, setTemplates] = useState<TableTemplate[]>(() => getSavedTableTemplates(sectionKey));
  const [activeTemplate, setActiveTemplate] = useState<TableTemplate>(() =>
    initialTemplate
      ? initialTemplate
      : (getTemplateForFamily(familyKey, sectionKey, true) || getDefaultEmptyTemplate(sectionKey))
  );
  const [familyDefaultMap, setFamilyDefaultMap] = useState<Record<string, string>>(() => getFamilyTemplateMap());

  const [columns, setColumns] = useState<ColumnDef[]>(() =>
    activeTemplate.columns.map((c) => ({ ...c }))
  );
  const [isAddingColumn, setIsAddingColumn] = useState<boolean>(false);
  const [newColumnTitle, setNewColumnTitle] = useState<string>("");
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState<boolean>(false);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState<boolean>(false);
  const [rawImportText, setRawImportText] = useState<string>("");
  const [importMode, setImportMode] = useState<"fill" | "replace">("fill");

  const labelCol = useMemo(
    () => columns.find((c) => c.role === "label") || (columns[0]?.role !== "value" ? columns[0] : null),
    [columns]
  );
  const valCols = useMemo(() => columns.filter((c) => c !== labelCol), [columns, labelCol]);
  const parsedSmartRows = useMemo(
    () => parseSmartTableText(rawImportText, valCols.length > 0 ? valCols.length : columns.length),
    [rawImportText, valCols.length, columns.length]
  );

  // Aile, Bölüm veya Dışarıdan Verilen Şablon değiştiğinde ilgili şablonu otomatik yükle
  useEffect(() => {
    if (initialTemplate) {
      setActiveTemplate(initialTemplate);
      setColumns(initialTemplate.columns.map((c) => ({ ...c })));
    } else {
      const tpl = getTemplateForFamily(familyKey, sectionKey, true) || getDefaultEmptyTemplate(sectionKey);
      setActiveTemplate(tpl);
      setColumns(tpl.columns.map((c) => ({ ...c })));
    }
    setTemplates(getSavedTableTemplates(sectionKey));
    setFamilyDefaultMap(getFamilyTemplateMap());
  }, [familyKey, sectionKey, initialTemplate]);

  // ==================== EXCEL IZGARA SEÇİM VE DÜZENLEME DURUMLARI ====================
  const [selection, setSelection] = useState<{ start: CellCoord; end: CellCoord } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [editing, setEditing] = useState<{ r: number; c: number; value: string } | null>(null);

  const variations = initialData || [];

  // ==================== KENAR OTOMATİK KAYDIRMA (AUTO-SCROLL ON DRAG) ====================
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      mousePosRef.current = { x: e.clientX, y: e.clientY };

      // Fare imlecinin altındaki hücreyi tespit et
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el?.closest("td[data-r]");
      if (cell) {
        const r = Number(cell.getAttribute("data-r"));
        const c = Number(cell.getAttribute("data-c"));
        if (!isNaN(r) && !isNaN(c)) {
          setSelection((prev) => (prev ? { ...prev, end: { r, c } } : null));
        }
      }
    };

    const handleWindowMouseUp = () => {
      setIsMouseDown(false);
      mousePosRef.current = null;
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isMouseDown]);

  // Otomatik Kaydırma Animasyon Döngüsü
  useEffect(() => {
    if (!isMouseDown) {
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
      return;
    }

    const checkAndScroll = () => {
      if (!isMouseDown || !scrollContainerRef.current || !mousePosRef.current) {
        scrollAnimRef.current = requestAnimationFrame(checkAndScroll);
        return;
      }

      const container = scrollContainerRef.current;
      const rect = container.getBoundingClientRect();
      const mouse = mousePosRef.current;

      const edgeThreshold = 60; // Kenara kaç piksel kala kaydırmaya başlasın
      const hSpeed = 24; // Sabit yatay kaydırma hızı (ivmesiz)
      const vSpeed = 18; // Sabit dikey kaydırma hızı (ivmesiz)

      let scrolled = false;

      // Sağa Doğru Kaydırma
      if (mouse.x > rect.right - edgeThreshold) {
        container.scrollLeft += hSpeed;
        scrolled = true;
      }
      // Sola Doğru Kaydırma
      else if (mouse.x < rect.left + edgeThreshold) {
        container.scrollLeft -= hSpeed;
        scrolled = true;
      }

      // Aşağı Doğru Kaydırma
      if (mouse.y > rect.bottom - edgeThreshold) {
        container.scrollTop += vSpeed;
        scrolled = true;
      }
      // Yukarı Doğru Kaydırma
      else if (mouse.y < rect.top + edgeThreshold) {
        container.scrollTop -= vSpeed;
        scrolled = true;
      }

      // Kaydırma sırasında fare sınır dışına çıksa bile en uçtaki hücreyi seçime dahil et
      if (scrolled) {
        const sampleX = Math.min(rect.right - 20, Math.max(rect.left + 20, mouse.x));
        const sampleY = Math.min(rect.bottom - 20, Math.max(rect.top + 20, mouse.y));
        const el = document.elementFromPoint(sampleX, sampleY);
        const cell = el?.closest("td[data-r]");
        if (cell) {
          const r = Number(cell.getAttribute("data-r"));
          const c = Number(cell.getAttribute("data-c"));
          if (!isNaN(r) && !isNaN(c)) {
            setSelection((prev) => (prev ? { ...prev, end: { r, c } } : null));
          }
        }
      }

      scrollAnimRef.current = requestAnimationFrame(checkAndScroll);
    };

    scrollAnimRef.current = requestAnimationFrame(checkAndScroll);

    return () => {
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
    };
  }, [isMouseDown, columns.length, variations.length]);

  // Seçim Alanının Sınırlarını Hesaplama
  const selectionBounds = useMemo(() => {
    if (!selection) return null;
    return {
      minR: Math.min(selection.start.r, selection.end.r),
      maxR: Math.max(selection.start.r, selection.end.r),
      minC: Math.min(selection.start.c, selection.end.c),
      maxC: Math.max(selection.start.c, selection.end.c),
    };
  }, [selection]);

  // Hücre Seçili mi?
  const isCellSelected = useCallback(
    (r: number, c: number) => {
      if (!selectionBounds) return false;
      return (
        r >= selectionBounds.minR &&
        r <= selectionBounds.maxR &&
        c >= selectionBounds.minC &&
        c <= selectionBounds.maxC
      );
    },
    [selectionBounds]
  );

  // Hücre Aktif İmleç Noktası mı?
  const isCellAnchor = useCallback(
    (r: number, c: number) => selection?.start.r === r && selection?.start.c === c,
    [selection]
  );

  // Sütunu Sağa/Sola Taşıma
  const handleMoveColumn = (colIdx: number, direction: "left" | "right") => {
    const targetIdx = direction === "left" ? colIdx - 1 : colIdx + 1;
    if (targetIdx < 0 || targetIdx >= columns.length) return;
    setColumns((prev) => {
      const next = [...prev];
      const temp = next[colIdx];
      next[colIdx] = next[targetIdx];
      next[targetIdx] = temp;
      onColumnsChange?.(next);
      return next;
    });
  };

  // Sütun Kaldırma
  const handleRemoveColumn = (colKey: string) => {
    if (columns.length <= 1) return;
    const nextCols = columns.filter((c) => c.key !== colKey);
    setColumns(nextCols);
    setSelection(null);
    setEditing(null);

    // Satır verilerinden de silinen sütunu temizle
    const nextData = variations.map((r) => {
      const copy = { ...r };
      delete copy[colKey];
      return copy;
    });
    onChange(nextData);
    onColumnsChange?.(nextCols);
  };

  // Sütun Başlığı Yeniden Adlandırma (Çift Tıklama ile)
  const [editingColKey, setEditingColKey] = useState<string | null>(null);
  const [editingColTitle, setEditingColTitle] = useState<string>("");

  const handleSaveColTitle = () => {
    if (!editingColKey) return;
    const trimmed = editingColTitle.trim();
    if (trimmed) {
      setColumns((prev) => {
        const next = prev.map((c) => (c.key === editingColKey ? { ...c, title: trimmed } : c));
        onColumnsChange?.(next);
        return next;
      });
    }
    setEditingColKey(null);
  };

  // Kaldırılmış şablon sütunları
  const missingDefaultColumns = useMemo(() => {
    const currentKeys = new Set(columns.map((c) => c.key));
    return activeTemplate.columns.filter((c) => !currentKeys.has(c.key));
  }, [columns, activeTemplate]);

  // Şablon Değiştirme
  const handleSelectTemplate = (tpl: TableTemplate) => {
    setActiveTemplate(tpl);
    const nextCols = tpl.columns.map((c) => ({ ...c }));
    setColumns(nextCols);
    setIsTemplateMenuOpen(false);
    setSelection(null);
    setEditing(null);
    onColumnsChange?.(nextCols);
    setToastNotice(isTr ? `"${tpl.name}" şablonu uygulandı.` : `"${tpl.name}" template applied.`);
    setTimeout(() => setToastNotice(null), 3000);
  };

  // Yeni Sütun Ekleme
  const handleConfirmAddColumn = () => {
    const trimmed = newColumnTitle.trim();
    if (!trimmed) {
      setIsAddingColumn(false);
      return;
    }
    const colKey = `col_${Date.now()}`;
    const nextCols = [
      ...columns,
      {
        key: colKey,
        title: trimmed,
        isCustom: true,
        align: "center" as const,
        width: "min-w-[110px]",
      },
    ];
    setColumns(nextCols);
    setNewColumnTitle("");
    setIsAddingColumn(false);
    onColumnsChange?.(nextCols);
  };

  // Hücre Değeri Güncelleme
  const handleCellChange = useCallback(
    (rowIndex: number, field: string, value: any) => {
      const next = [...variations];
      next[rowIndex] = {
        ...next[rowIndex],
        [field]: value,
      };
      onChange(next);
    },
    [variations, onChange]
  );

  // Satır Ekle (Bölüme Duyarlı)
  const handleAddRow = () => {
    if (sectionKey === "varyasyonlar") {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const newRow: any = isFiber
        ? {
            include: true,
            part_numarasi: `3.ETK.${randomSuffix}`,
            lif_cinsi: "SM G.652.D",
            fiber_sayisi: 4,
            dis_cap_mm: "7.0",
            toplam_agirlik_kg_km: "50",
            sevk_boyu_m: "1000",
          }
        : {
            include: true,
            part_numarasi: `3.ETK.${randomSuffix}`,
            kesit: "1x2x0.8 mm",
            per_sayisi: 1,
            dis_cap_mm: "7.0",
            bakir_agirligi_kg_km: "18.5",
            toplam_agirlik_kg_km: "50",
            sevk_boyu_m: "500/1000",
          };

      columns.forEach((c) => {
        if (c.isCustom && newRow[c.key] === undefined) newRow[c.key] = "";
      });
      onChange([...variations, newRow]);
    } else {
      const newRow: any = {};
      if (showIncludeCheckbox) newRow.include = true;
      columns.forEach((c) => {
        newRow[c.key] = "";
      });
      onChange([...variations, newRow]);
    }
  };

  // Grup / Ara Başlık Satırı Ekle
  const handleAddGroupHeaderRow = () => {
    const newGroupRow: any = {
      isGroupHeader: true,
      title: isTr ? "Yeni Ara Başlık / Grup" : "New Section Header",
      indent: 0,
      include: true,
    };
    onChange([...variations, newGroupRow]);
  };

  // Grup Başlığı Metnini Güncelle
  const handleUpdateGroupTitle = (rowIndex: number, newTitle: string) => {
    const next = [...variations];
    next[rowIndex] = { ...next[rowIndex], title: newTitle };
    onChange(next);
  };

  // Grup Başlığı Girintisini Değiştir (0: Ana Başlık, 1: Alt Başlık)
  const handleToggleGroupIndent = (rowIndex: number) => {
    const next = [...variations];
    const currentIndent = next[rowIndex].indent || 0;
    next[rowIndex] = { ...next[rowIndex], indent: currentIndent === 0 ? 1 : 0 };
    onChange(next);
  };

  // Satır Sil
  const handleDeleteRow = (rowIndex: number) => {
    const next = [...variations];
    next.splice(rowIndex, 1);
    onChange(next);
  };

  // Dahil (Checkbox) Durumu Değiştir
  const handleToggleInclude = (rowIndex: number) => {
    const current = variations[rowIndex];
    handleCellChange(rowIndex, "include", current.include === false ? true : false);
  };

  // Tümünü Seç / Bırak
  const isAllChecked = variations.length > 0 && variations.every((v) => v.include !== false);
  const handleToggleAll = () => {
    const nextState = !isAllChecked;
    onChange(variations.map((v) => ({ ...v, include: nextState })));
  };

  // Düzenlemeyi Kaydet ve Kapat
  const commitEditing = useCallback(() => {
    if (!editing) return;
    const colDef = columns[editing.c];
    if (colDef && variations[editing.r]) {
      handleCellChange(editing.r, colDef.key, editing.value);
    }
    setEditing(null);
  }, [editing, columns, variations, handleCellChange]);

  // Ctrl+C ile Seçili Bloğu Kopyalama
  const handleCopySelection = useCallback(() => {
    if (!selectionBounds) return;
    const lines: string[] = [];
    for (let r = selectionBounds.minR; r <= selectionBounds.maxR; r++) {
      const rowItem = variations[r];
      if (!rowItem) continue;
      const cellVals: string[] = [];
      for (let c = selectionBounds.minC; c <= selectionBounds.maxC; c++) {
        const colDef = columns[c];
        cellVals.push(colDef ? String(rowItem[colDef.key] ?? "") : "");
      }
      lines.push(cellVals.join("\t"));
    }
    const tsv = lines.join("\r\n");
    navigator.clipboard.writeText(tsv);
    setToastNotice(t.copied);
    setTimeout(() => setToastNotice(null), 2500);
  }, [selectionBounds, variations, columns, t.copied]);

  // Ctrl+V ile Akıllı Yapıştırma (Grup Başlıklarını ve Değer Sütunlarını Otomatik Eşleştirir)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      // Form alanlarında, textarea'da veya modal açıkken tabloya yapıştırmayı engelle!
      const targetTag = (e.target as HTMLElement)?.tagName?.toUpperCase();
      if (targetTag === "TEXTAREA" || targetTag === "INPUT" || isSmartImportOpen || editing) {
        return;
      }

      const clipboardData = e.clipboardData.getData("text/plain");
      if (!clipboardData || !clipboardData.trim()) return;

      const valColsCount = valCols.length > 0 ? valCols.length : columns.length;
      const parsedRows = parseSmartTableText(clipboardData, valColsCount);
      if (parsedRows.length === 0) return;

      const startRowIdx = selectionBounds ? selectionBounds.minR : 0;
      const startColIdx = selectionBounds ? selectionBounds.minC : 0;

      const nextVariations = [...variations];
      let currentRowIdx = startRowIdx;

      // DURUM 1: Sadece değer sütununa tıklanmış (startColIdx > 0, örn: kullanıcı 0.40 mm hücresinde)
      if (startColIdx > 0) {
        for (let i = 0; i < parsedRows.length; i++) {
          const item = parsedRows[i];
          if (item.isGroupHeader) continue; // değer hücresine yapıştırırken başlıkları atla

          while (currentRowIdx < nextVariations.length && nextVariations[currentRowIdx]?.isGroupHeader) {
            currentRowIdx++;
          }

          if (!nextVariations[currentRowIdx]) {
            nextVariations[currentRowIdx] = { id: Date.now() + currentRowIdx, include: true };
          }

          const targetRow = { ...nextVariations[currentRowIdx] };
          const valsToPaste = item.values || [];
          for (let c = 0; c < valsToPaste.length; c++) {
            const targetCol = startColIdx + c;
            if (targetCol < columns.length) {
              targetRow[columns[targetCol].key] = valsToPaste[c];
            }
          }
          nextVariations[currentRowIdx] = targetRow;
          currentRowIdx++;
        }
      }
      // DURUM 2: Baştan (startColIdx === 0) yapıştırılıyor
      else {
        for (let i = 0; i < parsedRows.length; i++) {
          const item = parsedRows[i];
          if (item.isGroupHeader) {
            if (nextVariations[currentRowIdx]?.isGroupHeader) {
              nextVariations[currentRowIdx] = {
                ...nextVariations[currentRowIdx],
                title: item.title,
                indent: item.indent ?? nextVariations[currentRowIdx].indent,
              };
              currentRowIdx++;
            } else {
              nextVariations[currentRowIdx] = {
                id: Date.now() + currentRowIdx,
                isGroupHeader: true,
                title: item.title,
                indent: !!item.indent,
                include: true,
              };
              currentRowIdx++;
            }
          } else {
            // Veri satırı yapıştırırken ara başlık satırını atla
            while (currentRowIdx < nextVariations.length && nextVariations[currentRowIdx]?.isGroupHeader) {
              currentRowIdx++;
            }

            if (!nextVariations[currentRowIdx]) {
              nextVariations[currentRowIdx] = { id: Date.now() + currentRowIdx, include: true };
            }

            const targetRow = { ...nextVariations[currentRowIdx] };
            if (labelCol && item.title) {
              targetRow[labelCol.key] = item.title;
            }
            if (item.values) {
              for (let c = 0; c < valCols.length; c++) {
                if (c < item.values.length) {
                  targetRow[valCols[c].key] = item.values[c];
                }
              }
            }
            nextVariations[currentRowIdx] = targetRow;
            currentRowIdx++;
          }
        }
      }

      e.preventDefault();
      onChange(nextVariations);
      setToastNotice(
        isTr
          ? `${parsedRows.length} satır başarıyla yapıştırıldı!`
          : `${parsedRows.length} rows successfully pasted!`
      );
      setTimeout(() => setToastNotice(null), 3000);
    },
    [editing, selectionBounds, variations, columns, isTr, onChange, isSmartImportOpen, valCols, labelCol]
  );

  // Akıllı İçe Aktarmayı Tabloya Uygula
  const handleApplyImport = useCallback(() => {
    if (parsedSmartRows.length === 0) return;

    if (importMode === "fill" && variations.length > 0) {
      const nextVariations = [...variations];
      const parsedDataRows = parsedSmartRows.filter((r) => !r.isGroupHeader);

      let dataRowCounter = 0;
      for (let r = 0; r < nextVariations.length; r++) {
        const row = nextVariations[r];
        if (row.isGroupHeader) continue;

        if (dataRowCounter < parsedDataRows.length) {
          const pRow = parsedDataRows[dataRowCounter];
          const updatedRow = { ...row };
          if (labelCol && pRow.title && !updatedRow[labelCol.key]) {
            updatedRow[labelCol.key] = pRow.title;
          }
          if (pRow.values) {
            for (let c = 0; c < valCols.length; c++) {
              if (c < pRow.values.length) {
                updatedRow[valCols[c].key] = pRow.values[c];
              }
            }
          }
          nextVariations[r] = updatedRow;
          dataRowCounter++;
        }
      }

      while (dataRowCounter < parsedDataRows.length) {
        const pRow = parsedDataRows[dataRowCounter];
        const newRow: any = { id: Date.now() + Math.random(), include: true };
        if (labelCol) newRow[labelCol.key] = pRow.title || "";
        if (pRow.values) {
          for (let c = 0; c < valCols.length; c++) {
            newRow[valCols[c].key] = pRow.values[c] || "";
          }
        }
        nextVariations.push(newRow);
        dataRowCounter++;
      }

      onChange(nextVariations);
    } else {
      const newRows = parsedSmartRows.map((r, idx) => {
        if (r.isGroupHeader) {
          return {
            id: Date.now() + idx,
            isGroupHeader: true,
            title: r.title,
            indent: !!r.indent,
            include: true,
          };
        } else {
          const rowObj: any = { id: Date.now() + idx, include: true };
          if (labelCol) rowObj[labelCol.key] = r.title || "";
          if (r.values) {
            for (let c = 0; c < valCols.length; c++) {
              rowObj[valCols[c].key] = r.values[c] || "";
            }
          }
          return rowObj;
        }
      });
      onChange(newRows);
    }

    setIsSmartImportOpen(false);
    setRawImportText("");
    setToastNotice(
      isTr
        ? `${parsedSmartRows.length} satır başarıyla aktarıldı!`
        : `${parsedSmartRows.length} rows successfully imported!`
    );
    setTimeout(() => setToastNotice(null), 3000);
  }, [parsedSmartRows, importMode, variations, labelCol, valCols, isTr, onChange]);

  // Klavye Yön Tuşları, Enter, Delete ve Ctrl+C Yönetimi
  const handleTableKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toUpperCase();
      if (targetTag === "TEXTAREA" || targetTag === "INPUT" || isSmartImportOpen) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
        if (!editing) {
          e.preventDefault();
          handleCopySelection();
        }
        return;
      }

      if (editing) {
        if (e.key === "Enter") {
          e.preventDefault();
          commitEditing();
          if (editing.r < variations.length - 1) {
            setSelection({
              start: { r: editing.r + 1, c: editing.c },
              end: { r: editing.r + 1, c: editing.c },
            });
          }
        } else if (e.key === "Tab") {
          e.preventDefault();
          commitEditing();
          const nextC = e.shiftKey ? Math.max(0, editing.c - 1) : Math.min(columns.length - 1, editing.c + 1);
          setSelection({
            start: { r: editing.r, c: nextC },
            end: { r: editing.r, c: nextC },
          });
        } else if (e.key === "Escape") {
          e.preventDefault();
          setEditing(null);
        }
        return;
      }

      if (!selection) return;
      const current = selection.start;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextR = Math.min(variations.length - 1, current.r + 1);
        setSelection({ start: { r: nextR, c: current.c }, end: { r: nextR, c: current.c } });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const nextR = Math.max(0, current.r - 1);
        setSelection({ start: { r: nextR, c: current.c }, end: { r: nextR, c: current.c } });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const nextC = Math.min(columns.length - 1, current.c + 1);
        setSelection({ start: { r: current.r, c: nextC }, end: { r: current.r, c: nextC } });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const nextC = Math.max(0, current.c - 1);
        setSelection({ start: { r: current.r, c: nextC }, end: { r: current.r, c: nextC } });
      } else if (e.key === "Tab") {
        e.preventDefault();
        const nextC = e.shiftKey ? Math.max(0, current.c - 1) : Math.min(columns.length - 1, current.c + 1);
        setSelection({ start: { r: current.r, c: nextC }, end: { r: current.r, c: nextC } });
      } else if (e.key === "Enter" || e.key === "F2") {
        e.preventDefault();
        const colDef = columns[current.c];
        const val = variations[current.r] ? String(variations[current.r][colDef.key] ?? "") : "";
        setEditing({ r: current.r, c: current.c, value: val });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectionBounds) {
          e.preventDefault();
          const next = [...variations];
          for (let r = selectionBounds.minR; r <= selectionBounds.maxR; r++) {
            if (!next[r]) continue;
            const copy = { ...next[r] };
            for (let c = selectionBounds.minC; c <= selectionBounds.maxC; c++) {
              const colDef = columns[c];
              if (colDef) copy[colDef.key] = "";
            }
            next[r] = copy;
          }
          onChange(next);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const colDef = columns[current.c];
        if (colDef) {
          setEditing({ r: current.r, c: current.c, value: e.key });
        }
      }
    },
    [editing, selection, variations, columns, selectionBounds, handleCopySelection, commitEditing, onChange]
  );

  const totalCols = (showIncludeCheckbox ? 1 : 0) + columns.length + 1;

  return (
    <div
      ref={tableRef}
      onKeyDown={handleTableKeyDown}
      onPaste={handlePaste}
      tabIndex={0}
      className="w-full space-y-3 focus:outline-none select-none"
    >
      {toastNotice && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg animate-in fade-in shadow-xs">
          <Copy className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastNotice}</span>
        </div>
      )}

      {/* EXCEL IZGARA KONTEYNERİ */}
      <div className="relative rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div ref={scrollContainerRef} className="max-h-[480px] overflow-auto scroll-smooth">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 select-none">
              {/* Çatı Başlık (Super Header) */}
              {activeTemplate?.superHeaderTitle && (
                <tr className="bg-emerald-700 text-white font-bold border-b border-emerald-800">
                  {showIncludeCheckbox && <th className="w-10 bg-slate-100 border-r border-slate-200" />}
                  {columns[0]?.role === "label" && (
                    <th className="bg-slate-100 border-r border-slate-200" />
                  )}
                  <th
                    colSpan={totalCols - (showIncludeCheckbox ? 1 : 0) - (columns[0]?.role === "label" ? 1 : 0)}
                    className="px-3 py-1.5 text-center text-xs tracking-wide shadow-xs"
                  >
                    {activeTemplate.superHeaderTitle}
                  </th>
                </tr>
              )}

              {/* Sütun Başlıkları */}
              {activeTemplate?.showHeaderRow !== false && (
                <tr>
                  {/* Sabit Onay / Checkbox Sütunu (Opsiyonel / Varyasyonlar için) */}
                  {showIncludeCheckbox && (
                    <th className="w-10 px-2 py-2.5 text-center border-r border-slate-200 bg-slate-100 shrink-0">
                      <input
                        type="checkbox"
                        checked={isAllChecked}
                        onChange={handleToggleAll}
                        className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer rounded"
                        title={isTr ? "Tümünü Seç / Kaldır" : "Toggle All"}
                      />
                    </th>
                  )}

                  {columns.map((col, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === columns.length - 1;
                    const isFirstBlank = isFirst && (
                      col.hideHeader === true ||
                      activeTemplate?.blankCornerHeader === true ||
                      !col.title ||
                      !col.title.trim()
                    );
                    const isLabel = col.role === "label" || isFirstBlank;

                    if (isFirstBlank) {
                      return (
                        <th
                          key={col.key}
                          className="px-2 py-2 bg-white border-0"
                          style={{ backgroundColor: "#ffffff", border: "none" }}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-slate-400 italic font-normal">
                              {isTr ? "(Renksiz Köşe)" : "(Blank Corner)"}
                            </span>
                            {col.title && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 truncate max-w-[70px]" title={col.title}>
                                {col.title}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    }

                    return (
                      <th
                        key={col.key}
                        className={`px-2 py-2 border-r border-slate-200 hover:bg-slate-200/60 transition-colors group ${
                          isLabel ? "bg-emerald-50 text-emerald-800 font-bold" : ""
                        } ${col.width || "min-w-[95px]"}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          {editingColKey === col.key ? (
                            <input
                              type="text"
                              autoFocus
                              value={editingColTitle}
                              onChange={(e) => setEditingColTitle(e.target.value)}
                              onBlur={handleSaveColTitle}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveColTitle();
                                if (e.key === "Escape") setEditingColKey(null);
                              }}
                              className="w-24 px-1 py-0.5 text-xs bg-white border border-emerald-500 text-slate-900 rounded outline-none"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => {
                                setEditingColKey(col.key);
                                setEditingColTitle(col.title);
                              }}
                              title={isTr ? "Sütun adını değiştirmek için çift tıklayın" : "Double click to rename column"}
                              className="truncate font-semibold flex items-center gap-1 cursor-pointer hover:text-emerald-700 transition-colors"
                            >
                              {col.title}
                              {isLabel && (
                                <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase font-mono">
                                  {isTr ? "Etiket" : "Label"}
                                </span>
                              )}
                            </span>
                          )}

                          <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleMoveColumn(idx, "left")}
                              disabled={isFirst}
                              title={t.move_left}
                              className="p-0.5 text-slate-400 hover:text-emerald-700 disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed rounded"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveColumn(idx, "right")}
                              disabled={isLast}
                              title={t.move_right}
                              className="p-0.5 text-slate-400 hover:text-emerald-700 disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed rounded"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>

                            {columns.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveColumn(col.key)}
                                title={t.delete_col}
                                className="p-0.5 text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer rounded transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}

                  <th className="px-2 py-1.5 text-center min-w-[110px] bg-slate-100">
                    {isAddingColumn ? (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            value={newColumnTitle}
                            onChange={(e) => setNewColumnTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleConfirmAddColumn();
                              if (e.key === "Escape") {
                                setIsAddingColumn(false);
                                setNewColumnTitle("");
                              }
                            }}
                            placeholder={t.col_placeholder}
                            className="w-20 px-1 py-0.5 text-xs bg-white border border-emerald-500 text-slate-900 rounded focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleConfirmAddColumn}
                            className="text-emerald-600 hover:text-emerald-700 p-0.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingColumn(false);
                              setNewColumnTitle("");
                            }}
                            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {missingDefaultColumns.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap justify-center">
                            {missingDefaultColumns.map((mc) => (
                              <button
                                key={mc.key}
                                type="button"
                                onClick={() => {
                                  setColumns((prev) => [...prev, mc]);
                                  setIsAddingColumn(false);
                                }}
                                className="text-[9px] px-1 py-0.5 bg-slate-200 text-slate-700 hover:text-emerald-800 hover:bg-emerald-100 rounded border border-slate-300 cursor-pointer"
                                title={isTr ? "Sütunu geri ekle" : "Restore column"}
                              >
                                + {mc.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingColumn(true)}
                        className="flex items-center justify-center gap-1 text-slate-500 hover:text-emerald-700 transition w-full text-xs font-medium cursor-pointer py-1"
                        title={t.add_col}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t.add_col}</span>
                      </button>
                    )}
                  </th>
                </tr>
              )}
            </thead>

            {/* TABLO GÖVDESİ */}
            <tbody className="divide-y divide-slate-200">
              {variations.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                      <TableIcon className="w-8 h-8 text-slate-400 stroke-1" />
                      <span className="font-semibold text-slate-700 text-sm">{t.empty_title}</span>
                      <p className="text-xs text-slate-500 text-center">{t.empty_desc}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                variations.map((item, rIdx) => {
                  const isIncluded = item.include !== false;

                  // EĞER BU BİR GRUP / ARA BAŞLIK SATIRI İSE
                  if (item.isGroupHeader) {
                    return (
                      <tr
                        key={rIdx}
                        className="bg-slate-100/90 border-y-2 border-emerald-600/70 select-none transition-colors"
                      >
                        <td colSpan={totalCols} className="px-3 py-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <div
                              className="flex items-center gap-2 flex-1"
                              style={{ paddingLeft: item.indent ? "20px" : "0px" }}
                            >
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                                  item.indent
                                    ? "bg-cyan-50 text-cyan-800 border border-cyan-200"
                                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                }`}
                              >
                                {item.indent
                                  ? (isTr ? "Alt Grup" : "Sub-Group")
                                  : (isTr ? "Ana Başlık" : "Main Header")}
                              </span>
                              <input
                                type="text"
                                value={item.title || ""}
                                onChange={(e) => handleUpdateGroupTitle(rIdx, e.target.value)}
                                placeholder={isTr ? "Grup başlığını giriniz..." : "Group title..."}
                                className="bg-white border border-slate-300 text-slate-900 font-bold text-xs px-2.5 py-1 rounded-lg outline-none focus:border-emerald-500 flex-1 max-w-md"
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleGroupIndent(rIdx)}
                                className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 text-[10px] rounded cursor-pointer transition font-medium"
                                title={isTr ? "Girinti Seviyesini Değiştir" : "Toggle Indent"}
                              >
                                {item.indent
                                  ? (isTr ? "← Ana Başlık Yap" : "← Make Main")
                                  : (isTr ? "→ Alt Grup Yap" : "→ Make Sub")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(rIdx)}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer transition rounded"
                                title={isTr ? "Grup Başlığını Sil" : "Delete Header"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={rIdx}
                      className={`transition-colors ${
                        rIdx % 2 === 0
                          ? "bg-white hover:bg-slate-50"
                          : "bg-slate-50/70 hover:bg-slate-100/80"
                      } ${!isIncluded ? "opacity-40" : ""}`}
                    >
                      {/* Checkbox (Opsiyonel / Varyasyonlar için) */}
                      {showIncludeCheckbox && (
                        <td className="px-2 py-1.5 text-center border-r border-slate-200">
                          <input
                            type="checkbox"
                            checked={isIncluded}
                            onChange={() => handleToggleInclude(rIdx)}
                            className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer rounded"
                            title={isIncluded ? (isTr ? "Dahil" : "Included") : isTr ? "Dahil Değil" : "Excluded"}
                          />
                        </td>
                      )}

                      {/* Excel Hücreleri */}
                      {columns.map((col, cIdx) => {
                        const val = item[col.key] !== undefined ? String(item[col.key]) : "";
                        const selected = isCellSelected(rIdx, cIdx);
                        const isAnchor = isCellAnchor(rIdx, cIdx);
                        const isEditingThis = editing?.r === rIdx && editing?.c === cIdx;
                        const isFirstColBlank = cIdx === 0 && (
                          col.hideHeader === true ||
                          activeTemplate?.blankCornerHeader === true ||
                          !col.title ||
                          !col.title.trim()
                        );
                        const isLabel = col.role === "label" || isFirstColBlank;

                        const alignClass =
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left";
                        const colorClass = isFirstColBlank
                          ? "bg-emerald-700 text-white font-bold"
                          : isLabel
                          ? "text-emerald-900 font-bold bg-emerald-50/70"
                          : col.key === "part_numarasi"
                          ? "text-slate-900 font-mono font-medium"
                          : col.key === "dis_cap_mm"
                          ? "text-emerald-800 font-mono font-medium"
                          : col.key === "bakir_agirligi_kg_km"
                          ? "text-amber-800 font-mono font-medium"
                          : "text-slate-800";

                        return (
                          <td
                            key={col.key}
                            data-r={rIdx}
                            data-c={cIdx}
                            onMouseDown={(e) => {
                              if (e.button !== 0) return;
                              if (editing) commitEditing();
                              setSelection({
                                start: { r: rIdx, c: cIdx },
                                end: { r: rIdx, c: cIdx },
                              });
                              setIsMouseDown(true);
                              mousePosRef.current = { x: e.clientX, y: e.clientY };
                            }}
                            onMouseEnter={() => {
                              if (isMouseDown && selection) {
                                setSelection((prev) => (prev ? { ...prev, end: { r: rIdx, c: cIdx } } : null));
                              }
                            }}
                            onDoubleClick={() => {
                              setEditing({ r: rIdx, c: cIdx, value: val });
                            }}
                            className={`relative px-2 py-1.5 border-r border-slate-200 cursor-cell transition-colors select-none ${
                              isFirstColBlank
                                ? "bg-emerald-700 text-white font-bold"
                                : isLabel
                                ? "bg-emerald-50/70 text-emerald-900 font-bold"
                                : ""
                            } ${
                              selected ? "bg-emerald-100/70" : isFirstColBlank ? "" : "hover:bg-slate-100/60"
                            } ${isAnchor ? "ring-2 ring-emerald-600 ring-inset z-10" : ""}`}
                          >
                            {isEditingThis ? (
                              <input
                                type="text"
                                autoFocus
                                value={editing.value}
                                onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                onBlur={commitEditing}
                                className={`w-full bg-white text-slate-900 font-inherit text-xs px-1 py-0.5 rounded outline-none ring-2 ring-emerald-600 ${alignClass}`}
                              />
                            ) : (
                              <div className={`truncate text-xs ${colorClass} ${alignClass}`}>
                                {val || <span className="text-slate-400 opacity-40">—</span>}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      <td className="px-2 py-1"></td>
                    </tr>
                  );
                })
              )}

              {/* Minimal Satır Ekleme Butonları */}
              <tr>
                <td colSpan={totalCols} className="p-0 bg-slate-50/80 border-t border-dashed border-slate-200">
                  <div className="flex items-center justify-center gap-3 py-2">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-white rounded-lg transition flex items-center gap-1.5 border border-slate-300 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t.add_row}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSmartImportOpen(true)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition flex items-center gap-1.5 border border-emerald-200 cursor-pointer shadow-xs"
                      title={isTr ? "PDF veya Excel'den kopyalanan metni akıllı yapıştır" : "Smart paste from PDF or Excel"}
                    >
                      <ClipboardPaste className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isTr ? "PDF / Excel'den Akıllı Yapıştır" : "Smart Paste from PDF/Excel"}</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Akıllı İçe Aktarma Modalı */}
      {isSmartImportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
          onPaste={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSmartImportOpen(false);
            }
          }}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <ClipboardPaste className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isTr ? "PDF / Excel'den Akıllı Yapıştır" : "Smart Paste from PDF or Excel"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isTr
                      ? "Teknik föyden kopyaladığınız metni yapıştırın; başlıklar ve değerler otomatik hizalanır."
                      : "Paste copied datasheet text; headers and numerical values align automatically."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSmartImportOpen(false);
                  setRawImportText("");
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-700 font-medium flex items-center gap-1.5 text-xs">
                  <span>{isTr ? "Kopyalanan Metin Alanı" : "Pasted Text Area"}</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {isTr ? "(Ctrl+V ile buraya yapıştırın)" : "(Paste here with Ctrl+V)"}
                  </span>
                </label>
                {rawImportText && (
                  <button
                    type="button"
                    onClick={() => setRawImportText("")}
                    className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    {isTr ? "Metni Temizle" : "Clear Text"}
                  </button>
                )}
              </div>

              <textarea
                rows={5}
                value={rawImportText}
                onChange={(e) => setRawImportText(e.target.value)}
                onPaste={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={
                  isTr
                    ? "Örnek yapıştırma metni:\nİletken Direnci Ω/km (20 °C)\nMaksimum Ortalama 139,4 89,4 62,1 58 57 35 27,6\nMaksimum Bireysel 146,6 93 64,6 60 58 37 28,8\nİzolasyon Direnci MΩ/km (500 V DC) >10000 >10000 >15000 ...\n..."
                    : "Paste table text here..."
                }
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-3 rounded-xl font-mono text-xs outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500/30 placeholder-slate-400 resize-none transition"
              />
            </div>

            {/* Canlı Ayrıştırma Önizlemesi */}
            {parsedSmartRows.length > 0 && (
              <div className="border border-slate-200 rounded-xl bg-slate-50/70 p-3 space-y-2.5 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isTr
                      ? `${parsedSmartRows.filter((r) => r.isGroupHeader).length} Başlık, ${parsedSmartRows.filter((r) => !r.isGroupHeader).length} Veri Satırı Algılandı`
                      : `${parsedSmartRows.filter((r) => r.isGroupHeader).length} Headers, ${parsedSmartRows.filter((r) => !r.isGroupHeader).length} Data Rows Detected`}
                  </span>

                  {variations.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 p-0.5 rounded-lg shadow-xs">
                      <button
                        type="button"
                        onClick={() => setImportMode("fill")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                          importMode === "fill"
                            ? "bg-emerald-600 text-white font-semibold shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title={
                          isTr
                            ? "Tablodaki mevcut satır başlıklarını korur, sadece değer sütunlarını doldurur"
                            : "Preserves existing row labels, fills value columns"
                        }
                      >
                        {isTr ? "Mevcut Satırları Doldur" : "Fill Existing Rows"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode("replace")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                          importMode === "replace"
                            ? "bg-emerald-600 text-white font-semibold shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title={
                          isTr
                            ? "Tablodaki satırları silip kopyalanan satırlarla sıfırdan oluşturur"
                            : "Replaces existing rows with pasted rows"
                        }
                      >
                        {isTr ? "Sıfırdan Aktar" : "Replace Table"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Mini Önizleme Tablosu */}
                <div className="max-h-44 overflow-x-auto overflow-y-auto rounded-lg border border-slate-200 bg-white text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100">
                      <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        {labelCol && (
                          <th className="px-2.5 py-1.5 whitespace-nowrap min-w-[130px] border-r border-slate-200">
                            {labelCol.title}
                          </th>
                        )}
                        {valCols.map((c) => (
                          <th
                            key={c.key}
                            className="px-2 py-1.5 text-center whitespace-nowrap min-w-[65px] font-mono text-emerald-800 border-r border-slate-200 last:border-r-0"
                          >
                            {c.title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {parsedSmartRows.map((r, idx) =>
                        r.isGroupHeader ? (
                          <tr key={idx} className="bg-emerald-50/60 text-emerald-900 font-semibold">
                            <td colSpan={columns.length} className="px-2.5 py-1 text-xs">
                              <span className="inline-block mr-2 px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold uppercase">
                                {r.indent ? (isTr ? "Alt Grup" : "Sub") : (isTr ? "Ana Başlık" : "Group")}
                              </span>
                              {r.title}
                            </td>
                          </tr>
                        ) : (
                          <tr key={idx} className="hover:bg-slate-50">
                            {labelCol && (
                              <td className="px-2.5 py-1 font-medium text-slate-800 whitespace-nowrap border-r border-slate-200">
                                {r.title || (
                                  <span className="text-slate-400 italic">{isTr ? "(Başlıksız)" : "(Untitled)"}</span>
                                )}
                              </td>
                            )}
                            {valCols.map((c, cIdx) => (
                              <td
                                key={c.key}
                                className="px-2 py-1 text-center font-mono text-slate-800 border-r border-slate-200 last:border-r-0"
                              >
                                {r.values?.[cIdx] ?? <span className="text-slate-400">-</span>}
                              </td>
                            ))}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-[11px] text-slate-500">
                {rawImportText.trim()
                  ? `${rawImportText.trim().split(/\r?\n/).length} ${isTr ? "satır metin okundu" : "lines read"}`
                  : ""}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSmartImportOpen(false);
                    setRawImportText("");
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  {isTr ? "Vazgeç" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={parsedSmartRows.length === 0}
                  onClick={handleApplyImport}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isTr
                      ? `Tabloya Aktar (${parsedSmartRows.length} Satır)`
                      : `Import to Table (${parsedSmartRows.length} Rows)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const VariationsTable = DynamicTable;
