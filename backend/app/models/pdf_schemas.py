"""
ETK Kablo TDS Studio v3.0 - PDF Export Pydantic Schemas
Frontend'den gelen sectionTables + puzzleSections + product verilerini taşır.
"""

from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field


class TableColumnDef(BaseModel):
    key: str
    title: Optional[str] = ""
    align: Optional[str] = "center"
    role: Optional[str] = None  # "label" | None
    isCustom: Optional[bool] = None
    hideHeader: Optional[bool] = None


class SectionTableInstance(BaseModel):
    instanceId: str
    templateId: Optional[str] = None
    title: Optional[str] = None
    columns: List[TableColumnDef] = []
    data: List[Dict[str, Any]] = []
    layoutMode: Optional[str] = None            # "matrix" | "standard"
    stripingMode: Optional[str] = None          # "zebra" | "filled_only" | "none"
    showHeaderRow: Optional[bool] = True
    blankCornerHeader: Optional[bool] = None
    superHeaderTitle: Optional[str] = None
    superHeaderStartCol: Optional[str] = None
    superHeaderColSpan: Optional[int] = None


class PuzzleSectionConfig(BaseModel):
    id: str
    title_tr: str
    title_en: str
    enabled: bool = True
    order: int = 0
    layout: Optional[str] = "stacked"


class TdsPdfRequest(BaseModel):
    product: Dict[str, Any] = Field(..., description="CableData objesi (frontend state)")
    lang: Literal["tr", "en"] = "tr"
    puzzle_sections: Optional[List[PuzzleSectionConfig]] = None
    section_tables: Optional[Dict[str, List[SectionTableInstance]]] = None
