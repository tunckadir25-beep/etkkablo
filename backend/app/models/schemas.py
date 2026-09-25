"""
ETK Kablo TDS Studio v3.0 - Data Models & Schemas
Pydantic v2 data models for products, variations, technical parameters, and calculations.
"""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class CableVariationItem(BaseModel):
    id: Optional[Union[str, int]] = None
    part_numarasi: str = Field(..., description="ETK Ürün Part Numarası (örn. 3.5615.12.bX11.0.3.3|0.S2L.01-EN)")
    lif_cinsi: Optional[str] = Field(None, description="Fiber lif tipi (örn. SM G.652.D, OM3)")
    fiber_sayisi: Optional[int] = Field(None, description="Fiber lif adedi")
    per_sayisi: Optional[int] = Field(None, description="Per / Damar sayısı")
    kesit: Optional[str] = Field(None, description="İletken kesiti (örn. 0.50 mm², 1.5 mm²)")
    dis_cap_mm: Union[float, str] = Field(..., description="Kablo dış çapı (mm)")
    bakir_agirligi_kg_km: Optional[Union[float, str]] = Field(None, description="Bakır ağırlığı (kg/km)")
    toplam_agirlik_kg_km: Union[float, str] = Field(..., description="Toplam kablo ağırlığı (kg/km)")
    sevk_boyu_m: Optional[str] = Field("500/1000", description="Standart sevk ve paketleme boyu (m)")
    include: bool = Field(True, description="PDF dökümanına dahil edilsin mi?")


class CableLayerItem(BaseModel):
    order: Optional[int] = 1
    label: str = Field(..., description="Katman adı / bileşeni (örn. İletken, İzolasyon, Dış Kılıf)")
    desc: str = Field(..., description="Katman teknik açıklaması")
    label_en: Optional[str] = None
    desc_en: Optional[str] = None


class MechanicalTestItem(BaseModel):
    test_parametre: str = Field(..., description="Test parametre adı (örn. Ezme Mukavemeti)")
    test_standardi: str = Field(..., description="Standart referansı (örn. IEC 60794-1-2-E3)")
    sartname_degeri: str = Field(..., description="Şartname / Test değeri")
    kabul_kriteri: str = Field(..., description="Kabul kriteri (örn. Δα ≤ 0.05 dB, hasar yok)")
    include: bool = True


class StandardTestItem(BaseModel):
    test_adi: str = Field(..., description="Test standardı adı")
    standart_kodu: str = Field(..., description="Standart kodu (örn. IEC 60332-1-2)")
    include: bool = True


class EnvironmentalSpecs(BaseModel):
    bukme_yaricapi_hareketli: Optional[str] = None
    bukme_yaricapi_sabit: Optional[str] = None
    depolama_sicakligi: Optional[str] = None
    kurulum_sicakligi: Optional[str] = None
    tasima_sicakligi: Optional[str] = None
    calisma_sicakligi: Optional[str] = None
    markalama_standardi: Optional[str] = None
    paketleme_tipi: Optional[str] = None
    sevk_boylari: Optional[str] = None


class ProductSummary(BaseModel):
    id: int
    urun_kodu: str
    kategori: str
    standart_kodu: Optional[str] = None
    urun_aciklamasi: Optional[str] = None
    dokuman_kodu: Optional[str] = "B248"
    variation_count: int = 0
    family_key: str = "fiber"


class ProductDetail(BaseModel):
    id: int
    urun_kodu: str
    kategori: str
    family_key: str
    standart_kodu: Optional[str] = None
    urun_aciklamasi: Optional[str] = None
    dokuman_kodu: Optional[str] = "B248"
    kullanim_alanlari: List[str] = []
    kablo_yapisi: List[CableLayerItem] = []
    mekanik_testler: List[MechanicalTestItem] = []
    uygulama_cevre: Dict[str, Any] = {}
    standartlar: List[StandardTestItem] = []
    varyasyonlar: List[CableVariationItem] = []
    elektriksel_ozellikler: List[Dict[str, Any]] = []
    mekanik_ozellikler_ham: List[Dict[str, Any]] = []
    teknik_ozellikler: List[Dict[str, Any]] = []
    lan_frekans_performansi: List[Dict[str, Any]] = []
    varsayilan_bolumler: List[str] = []



class FamilySummary(BaseModel):
    family_key: str
    display_name: str
    display_en: str
    product_count: int
    variation_count: int
    primary_color: str
    tint_color: str
    icon: str


class CalculationRequest(BaseModel):
    pair_count: int = Field(..., ge=1, le=200, description="Per veya damar sayısı")
    cross_section: float = Field(..., gt=0.0, le=500.0, description="İletken kesiti (mm²)")
    is_armored: bool = Field(False, description="Zırhlı mı?")
    is_pimf: bool = Field(True, description="Çiftler ekranlı mı (PiMF)?")
    inner_sheath_thickness: float = Field(1.0, description="İç kılıf kalınlığı (mm)")
    armor_wire_diameter: float = Field(0.9, description="Zırh tel çapı (mm)")
    outer_sheath_thickness: float = Field(1.5, description="Dış kılıf kalınlığı (mm)")
    part_prefix: Optional[str] = "3.5615.12.bX11"


class CalculationResponse(BaseModel):
    part_no: str
    copper_weight_kg_km: float
    outer_diameter_mm: float
    total_weight_kg_km: float
    packing: str
    formula_breakdown: Dict[str, Any]
