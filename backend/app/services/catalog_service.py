"""
ETK Kablo TDS Studio v3.0 - Catalog Service
High-performance in-memory singleton catalog manager indexing 460 products and 10,000+ variations.
"""

import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.models.schemas import (
    CableLayerItem,
    CableVariationItem,
    FamilySummary,
    MechanicalTestItem,
    ProductDetail,
    ProductSummary,
    StandardTestItem,
)

logger = logging.getLogger("CatalogService")

# 15 Kablo Ailesi Metadata & Kurumsal Renk Paleti
FAMILY_METADATA: Dict[str, Dict[str, Any]] = {
    "fiber_optik": {
        "key": "fiber_optik",
        "display_name": "Fiber Optik Kablolar",
        "display_en": "Fiber Optic Cables",
        "primary_color": "#508234",
        "tint_color": "#D3DFCA",
        "icon": "",
    },
    "data_lan": {
        "key": "data_lan",
        "display_name": "Data / LAN Kabloları",
        "display_en": "Data / LAN Cables",
        "primary_color": "#0084B6",
        "tint_color": "#E1F0F8",
        "icon": "",
    },
    "koaksiyel": {
        "key": "koaksiyel",
        "display_name": "Koaksiyel Kablolar",
        "display_en": "Coaxial Cables",
        "primary_color": "#0284C7",
        "tint_color": "#E0F2FE",
        "icon": "",
    },
    "enstrumantasyon": {
        "key": "enstrumantasyon",
        "display_name": "Enstrümantasyon Kabloları",
        "display_en": "Instrumentation Cables",
        "primary_color": "#0B2545",
        "tint_color": "#EBF3FA",
        "icon": "",
    },
    "kontrol": {
        "key": "kontrol",
        "display_name": "Kontrol & Kumanda Kabloları",
        "display_en": "Control Cables",
        "primary_color": "#374151",
        "tint_color": "#F3F4F6",
        "icon": "",
    },
    "yangina_dayanikli": {
        "key": "yangina_dayanikli",
        "display_name": "Yangına Dayanıklı Kablolar",
        "display_en": "Fire Resistant Cables",
        "primary_color": "#DC2626",
        "tint_color": "#FEE2E2",
        "icon": "",
    },
    "yangina_dayanikli_enerji": {
        "key": "yangina_dayanikli_enerji",
        "display_name": "Yangına Dayanıklı Enerji (0.6/1kV)",
        "display_en": "Fire Resistant Energy (0.6/1kV)",
        "primary_color": "#EA580C",
        "tint_color": "#FFEDD5",
        "icon": "",
    },
    "yangin_alarm": {
        "key": "yangin_alarm",
        "display_name": "Yangın Alarm Kabloları",
        "display_en": "Fire Alarm Cables",
        "primary_color": "#B91C1C",
        "tint_color": "#FEE2E2",
        "icon": "",
    },
    "sinyal_kontrol": {
        "key": "sinyal_kontrol",
        "display_name": "Sinyal Kontrol Kabloları",
        "display_en": "Signal & Control Cables",
        "primary_color": "#1E3A5F",
        "tint_color": "#EBF2FA",
        "icon": "",
    },
    "dahili_telefon": {
        "key": "dahili_telefon",
        "display_name": "Dahili Telefon Kabloları",
        "display_en": "Indoor Telephone Cables",
        "primary_color": "#4B5563",
        "tint_color": "#F3F4F6",
        "icon": "",
    },
    "harici_telefon": {
        "key": "harici_telefon",
        "display_name": "Harici Telefon Kabloları",
        "display_en": "Outdoor Telephone Cables",
        "primary_color": "#111827",
        "tint_color": "#F3F4F6",
        "icon": "",
    },
    "solar": {
        "key": "solar",
        "display_name": "Solar / Fotovoltaik Kablolar",
        "display_en": "Solar / PV Cables",
        "primary_color": "#C2410C",
        "tint_color": "#FFEDD5",
        "icon": "",
    },
    "silikon": {
        "key": "silikon",
        "display_name": "Silikon Kablolar (Yüksek Sıcaklık)",
        "display_en": "Silicone High Temp Cables",
        "primary_color": "#B45309",
        "tint_color": "#FEF3F8",
        "icon": "",
    },
    "cctv": {
        "key": "cctv",
        "display_name": "CCTV & Güvenlik Kabloları",
        "display_en": "CCTV & Security Cables",
        "primary_color": "#9A3412",
        "tint_color": "#FFEDD5",
        "icon": "",
    },
    "bina_otomasyon": {
        "key": "bina_otomasyon",
        "display_name": "Bina Otomasyon (KNX/EIB) Kabloları",
        "display_en": "Building Automation Cables",
        "primary_color": "#15803D",
        "tint_color": "#DCFCE7",
        "icon": "",
    },
}

DEFAULT_FIBER_TESTS = [
    {"test_parametre": "Maksimum Germe Kuvveti", "test_standardi": "IEC 60794-1-2-E1", "sartname_degeri": "1.0 x W(N), min. 1000 N", "kabul_kriteri": "Fiber uzaması ≤ 0.33%"},
    {"test_parametre": "Ezme Mukavemeti", "test_standardi": "IEC 60794-1-2-E3", "sartname_degeri": "1000 N / 100 mm, maks. 10 min", "kabul_kriteri": "Δα ≤ 0.05 dB, hasar yok"},
    {"test_parametre": "Darbe Mukavemeti", "test_standardi": "IEC 60794-1-2-E4", "sartname_degeri": "10 Nm, 3 darbe, R= 300 mm", "kabul_kriteri": "Δα ≤ 0.05 dB test sonrası"},
    {"test_parametre": "Burulma Dayanımı", "test_standardi": "IEC 60794-1-2-E7", "sartname_degeri": "1 m, 100N, +/- 180°, 5 çevrim", "kabul_kriteri": "Δα ≤ 0.05 dB, hasar yok"},
    {"test_parametre": "Sıcaklık Döngüsü", "test_standardi": "IEC 60794-1-2-F1", "sartname_degeri": "-20°C to +70°C", "kabul_kriteri": "Δα ≤ 0.05 dB/km"},
    {"test_parametre": "Su Sızdırmazlık", "test_standardi": "IEC 60794-1-2-F5", "sartname_degeri": "1 m su sütunu, 24 saat", "kabul_kriteri": "Su sızıntısı yok"}
]


class CatalogService:
    _instance: Optional["CatalogService"] = None

    def __init__(self, catalog_path: Optional[Path] = None):
        self.catalog_path = catalog_path or Path("backend/etk_master_catalog.json")
        if not self.catalog_path.exists():
            self.catalog_path = Path("etk_master_catalog.json")

        self.products_raw: List[Dict[str, Any]] = []
        self.products_by_id: Dict[int, Dict[str, Any]] = {}
        self.products_by_family: Dict[str, List[Dict[str, Any]]] = {}
        self._load_catalog()

    @classmethod
    def get_instance(cls, catalog_path: Optional[Path] = None) -> "CatalogService":
        if cls._instance is None:
            cls._instance = cls(catalog_path)
        return cls._instance

    def _determine_family_key(self, raw_cat: str, raw_title: str) -> str:
        s = f"{raw_cat} {raw_title}".lower()
        if "fiber" in s or "optik" in s:
            return "fiber_optik"
        elif "lan" in s or "cat" in s or "data" in s:
            return "data_lan"
        elif "koaksiyel" in s or "rg" in s or "coax" in s:
            return "koaksiyel"
        elif "enstrumantasyon" in s or "re-2y" in s:
            return "enstrumantasyon"
        elif "yangına" in s and "enerji" in s:
            return "yangina_dayanikli_enerji"
        elif "yangına" in s or "fe180" in s or "ph120" in s:
            return "yangina_dayanikli"
        elif "yangın alarm" in s or "alarm" in s:
            return "yangin_alarm"
        elif "solar" in s or "h1z2z2" in s or "fotovoltaik" in s:
            return "solar"
        elif "silikon" in s or "siaf" in s or "simh" in s:
            return "silikon"
        elif "cctv" in s:
            return "cctv"
        elif "knx" in s or "eib" in s or "otomasyon" in s:
            return "bina_otomasyon"
        elif "harici" in s and "telefon" in s:
            return "harici_telefon"
        elif "telefon" in s:
            return "dahili_telefon"
        elif "sinyal" in s:
            return "sinyal_kontrol"
        elif "kontrol" in s or "kumanda" in s or "yy" in s or "cy" in s:
            return "kontrol"
        return "kontrol"

    def _get_default_usage_areas(self, family_key: str, title: str) -> List[str]:
        usages_map = {
            "fiber_optik": [
                "Telekomünikasyon şebekeleri ve veri omurga hatlarında",
                "Bina içi (indoor) ve bina dışı (outdoor) kanal veya boru içi tesisatlarda",
                "Yüksek bant genişliği ve elektromanyetik parazitsiz uzun mesafe iletiminde",
            ],
            "data_lan": [
                "Yapısal kablolama sistemlerinde ve veri merkezlerinde (Data Center)",
                "100/1000 Base-T Gigabit Ethernet ve yüksek hızlı ağ bağlantılarında",
                "Ofis, konut ve kampüs yerel alan ağları (LAN) altyapısında",
            ],
            "yangina_dayanikli": [
                "Hastaneler, alışveriş merkezleri, havaalanları ve yüksek yapılı binalarda",
                "Yangın anında en az 180 dakika (FE180 / PH120) fonksiyon sürdürmesi gereken acil durum hatlarında",
                "Yangın alarm, acil aydınlatma, anons ve duman tahliye sistemlerinde",
            ],
            "yangina_dayanikli_enerji": [
                "Hastaneler, alışveriş merkezleri ve tüneller gibi can güvenliğinin kritik olduğu tesislerde",
                "0.6/1 kV acil durum besleme ve yangın anında çalışması gereken enerji devrelerinde",
                "Alev altında devre bütünlüğünü koruyan enerji iletim hatlarında",
            ],
            "yangin_alarm": [
                "Sabit bina içi yangın ihbar ve dedektör sistemlerinde",
                "Acil durum sinyal ve güvenlik devrelerinde",
                "Yangın anında zehirli gaz ve duman çıkarmayan (HFFR / LSZH) ortamlarda",
            ],
            "sinyal_kontrol": [
                "Endüstriyel otomasyon ve proses kontrol tesisatlarında",
                "İmalat hatları, takım tezgahları ve montaj bantlarında",
                "Kuru ve nemli ortamlarda esnek veya sabit sinyal bağlantılarında",
            ],
            "kontrol": [
                "Fabrika ve endüstriyel tesis kontrol panolarında",
                "Ölçüm, kontrol ve regülasyon devrelerinde",
                "Mekanik zorlanmaların orta derecede olduğu sabit tesisatlarda",
            ],
            "enstrumantasyon": [
                "Petrokimya tesisleri, enerji santralleri ve rafinerilerde",
                "Analog ve dijital sinyallerin hassas ölçüm ve aktarım devrelerinde",
                "Dış elektromanyetik gürültülere karşı ekranlı veri iletiminde",
            ],
            "bina_otomasyon": [
                "Akıllı bina yönetim sistemleri ve KNX / EIB bus haberleşme hatlarında",
                "Aydınlatma, iklimlendirme ve perde/panjur otomasyon sistemlerinde",
                "Sensör ve aktüatör bağlantılarında sabit iç mekan tesisatlarında",
            ],
            "dahili_telefon": [
                "Bina içi telefon santralleri ve abone dağıtım hatlarında",
                "İç mekan analog/dijital ses ve sinyalizasyon şebekelerinde",
                "Bina içi zayıf akım sabit tesisatlarında",
            ],
            "harici_telefon": [
                "Şehirlerarası ve yerel yeraltı telefon şebekelerinde",
                "Kablo kanallarında ve doğrudan toprak altına gömülerek",
                "Neme ve suya karşı dayanıklı dış ortam abone dağıtım hatlarında",
            ],
            "koaksiyel": [
                "Kablo TV, uydu anten ve merkezi TV dağıtım sistemlerinde (SMATV / CATV)",
                "CCTV kapalı devre güvenlik ve kamera izleme sistemlerinde",
                "Yüksek frekanslı video ve RF sinyal iletiminde",
            ],
            "cctv": [
                "CCTV kapalı devre kamera ve güvenlik izleme sistemlerinde",
                "Video, ses ve besleme geriliminin tek kabloyla iletiminde",
                "Bina içi ve bina dışı güvenlik izleme hatlarında",
            ],
            "solar": [
                "Fotovoltaik (PV) güneş enerjisi panelleri ve dizi bağlantılarında",
                "Açık hava, UV ve doğrudan güneş ışığına maruz kalan solar tesisatlarda",
                "Inverter ve dağıtım kutusu ara bağlantılarında",
            ],
            "silikon": [
                "Yüksek sıcaklığa maruz kalan fırın, döküm ve kimya tesislerinde",
                "Aşırı sıcaklık değişimlerinin olduğu ortamlarda (-60°C ile +180°C)",
                "Aydınlatma armatürleri ve ısıtıcı cihaz bağlantılarında",
            ],
        }
        return usages_map.get(family_key, [
            "Bina içi ve bina dışı haberleşme şebekelerinde",
            "Sabit tesisatlarda ses, sinyal ve veri iletiminde",
            "Endüstriyel tesisler ve bina yönetim altyapılarında",
        ])

    def _load_catalog(self) -> None:
        if not self.catalog_path.exists():
            logger.error(f"Catalog file not found at {self.catalog_path}")
            return

        logger.info(f"CatalogService: Loading {self.catalog_path} into RAM...")
        with open(self.catalog_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, dict) and "urunler" in data:
            self.products_raw = data["urunler"]
        elif isinstance(data, list):
            self.products_raw = data
        else:
            self.products_raw = []

        # Indexing
        for prod in self.products_raw:
            pid = prod.get("id") or prod.get("urun_id")
            if pid is None:
                continue
            pid = int(pid)
            prod["id"] = pid

            cat = prod.get("kategori") or ""
            title = prod.get("urun_kodu") or prod.get("urun_adi") or ""
            family_key = self._determine_family_key(cat, title)
            prod["family_key"] = family_key

            self.products_by_id[pid] = prod
            self.products_by_family.setdefault(family_key, []).append(prod)

        logger.info(
            f"CatalogService: Ready with {len(self.products_by_id)} products indexed across {len(self.products_by_family)} families."
        )

    def get_families(self) -> List[FamilySummary]:
        results = []
        for key, meta in FAMILY_METADATA.items():
            prods = self.products_by_family.get(key, [])
            var_count = sum(len(p.get("varyasyonlar") or []) for p in prods)
            results.append(
                FamilySummary(
                    family_key=key,
                    display_name=meta["display_name"],
                    display_en=meta["display_en"],
                    product_count=len(prods),
                    variation_count=var_count,
                    primary_color=meta["primary_color"],
                    tint_color=meta["tint_color"],
                    icon=meta["icon"],
                )
            )
        return results

    def list_products(
        self,
        family_key: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 500,
    ) -> List[ProductSummary]:
        if family_key and family_key in self.products_by_family:
            source = self.products_by_family[family_key]
        else:
            source = self.products_raw

        results = []
        q = (search or "").strip().lower()

        for p in source:
            title = p.get("urun_kodu") or p.get("urun_adi") or ""
            cat = p.get("kategori") or ""
            std = p.get("standart_kodu") or p.get("tasarim_standardi") or ""
            desc = p.get("urun_aciklamasi") or p.get("notlar") or ""

            if q and (q not in title.lower() and q not in cat.lower() and q not in std.lower()):
                continue

            results.append(
                ProductSummary(
                    id=p["id"],
                    urun_kodu=title,
                    kategori=cat,
                    standart_kodu=std or None,
                    urun_aciklamasi=desc or None,
                    dokuman_kodu=p.get("dokuman_kodu") or "B248",
                    variation_count=len(p.get("varyasyonlar") or []),
                    family_key=p.get("family_key", "kontrol"),
                )
            )
            if len(results) >= limit:
                break

        return results

    def get_product_detail(self, product_id: int) -> Optional[ProductDetail]:
        raw = self.products_by_id.get(product_id)
        if not raw:
            return None

        title = raw.get("urun_kodu") or raw.get("urun_adi") or f"ETK Cable {product_id}"
        family_key = raw.get("family_key") or self._determine_family_key(raw.get("kategori", ""), title)

        # Parse Layers
        layers: List[CableLayerItem] = []
        raw_layers = raw.get("katmanlar") or raw.get("kablo_yapisi")
        if isinstance(raw_layers, list):
            for i, l in enumerate(raw_layers, start=1):
                if isinstance(l, dict):
                    layers.append(
                        CableLayerItem(
                            order=i,
                            label=l.get("label") or l.get("etiket_tr") or f"Katman {i}",
                            desc=l.get("desc") or l.get("tanim_tr") or "",
                            label_en=l.get("label_en") or l.get("etiket_en"),
                            desc_en=l.get("desc_en") or l.get("tanim_en"),
                        )
                    )
                elif isinstance(l, str) and l.strip():
                    parts = l.split(":", 1)
                    if len(parts) == 2:
                        lbl = re.sub(r"^\d+\s*[-.]\s*", "", parts[0]).strip()
                        layers.append(CableLayerItem(order=i, label=lbl, desc=parts[1].strip()))
                    else:
                        layers.append(CableLayerItem(order=i, label=f"Katman {i}", desc=l.strip()))
        elif isinstance(raw_layers, str) and raw_layers.strip():
            for i, line in enumerate(raw_layers.splitlines(), start=1):
                line = line.strip()
                if not line:
                    continue
                parts = line.split(":", 1)
                if len(parts) == 2:
                    lbl = re.sub(r"^\d+\s*[-.]\s*", "", parts[0]).strip()
                    layers.append(CableLayerItem(order=i, label=lbl, desc=parts[1].strip()))
                else:
                    layers.append(CableLayerItem(order=i, label=f"Katman {i}", desc=line))

        # Parse Mechanical Tests
        mech_tests: List[MechanicalTestItem] = []
        raw_tests = raw.get("mekanik_ozellikler") or raw.get("mekanik_testler")
        if isinstance(raw_tests, list) and len(raw_tests) > 0:
            for t in raw_tests:
                if isinstance(t, dict):
                    p_name = t.get("test_parametre") or t.get("parametre") or t.get("test_adi") or t.get("tanim")
                    if p_name and str(p_name).strip() not in ["-", ""]:
                        mech_tests.append(
                            MechanicalTestItem(
                                test_parametre=str(p_name).strip(),
                                test_standardi=str(t.get("test_standardi") or t.get("standart") or "-").strip(),
                                sartname_degeri=str(t.get("sartname_degeri") or t.get("deger") or "-").strip(),
                                kabul_kriteri=str(t.get("kabul_kriteri") or t.get("kriter") or "-").strip(),
                                include=True,
                            )
                        )
        if not mech_tests and family_key == "fiber_optik":
            mech_tests = [MechanicalTestItem(**t) for t in DEFAULT_FIBER_TESTS]

        # Parse Standard Badges
        stds: List[StandardTestItem] = []
        raw_stds = raw.get("standartlar")
        if isinstance(raw_stds, list):
            for s in raw_stds:
                if isinstance(s, dict):
                    name = s.get("test_adi") or s.get("tanim") or "Standard"
                    name_str = str(name).strip()
                    lower_name = name_str.lower()
                    if "retim" in lower_name or "referans" in lower_name:
                        name_str = "Üretim Standartları"
                    elif "duman" in lower_name:
                        name_str = "Duman Yoğunluk Testi"
                    elif "korozif" in lower_name or "nd" in lower_name or "ndrc" in lower_name or "gaz" in lower_name:
                        name_str = "Korozif Gaz Testi"
                    elif "halojen" in lower_name:
                        name_str = "Halojensizlik Testi"
                    elif "yay" in lower_name:
                        name_str = "Alev Yayılım Testi"
                    elif "geciktirici" in lower_name:
                        name_str = "Alev Geciktiricilik Testi"
                    elif "fe180" in lower_name:
                        name_str = "Devre Bütünlüğü Testi (FE180)"
                    elif "ph120" in lower_name or "ok testi" in lower_name:
                        name_str = "Şok Testi ile Devre Bütünlüğü (PH120)"
                    elif "dayan" in lower_name:
                        name_str = "Yangına Dayanım Testi"

                    code = s.get("standart_kodu") or s.get("kod") or s.get("deger")
                    if code and str(code).strip() not in ["-", ""]:
                        stds.append(StandardTestItem(test_adi=name_str, standart_kodu=str(code).strip()))

        # Parse Variations
        variations: List[CableVariationItem] = []
        raw_vars = raw.get("varyasyonlar") or []
        for i, v in enumerate(raw_vars, start=1):
            if not isinstance(v, dict):
                continue
            part_no = v.get("part_numarasi") or v.get("part_no") or f"3.{product_id}.{i:03d}"
            if part_no in ["-", "", None]:
                part_no = f"3.ETK.{product_id}.{i:03d}"

            fiber_cnt = None
            if v.get("fiber_sayisi"):
                try:
                    fiber_cnt = int(v["fiber_sayisi"])
                except Exception:
                    pass

            pair_cnt = None
            if v.get("per_sayisi") or v.get("damar_sayisi"):
                try:
                    pair_cnt = int(v.get("per_sayisi") or v.get("damar_sayisi"))
                except Exception:
                    pass

            d_outer = v.get("dis_cap_mm") or v.get("ortalama_dis_cap_mm") or "-"
            cu_wt = v.get("bakir_agirligi_kg_km") or None
            tot_wt = v.get("toplam_agirlik_kg_km") or v.get("ortalama_agirlik_kg_km") or "-"
            packing = v.get("paketleme_boyu_m") or v.get("makara_boyu_m") or "500/1000"

            variations.append(
                CableVariationItem(
                    id=i,
                    part_numarasi=str(part_no),
                    lif_cinsi=v.get("lif_cinsi"),
                    fiber_sayisi=fiber_cnt,
                    per_sayisi=pair_cnt,
                    kesit=v.get("kesit") or v.get("iletken_kesiti_mm2") or v.get("yapilandirma_ozeti"),
                    dis_cap_mm=d_outer,
                    bakir_agirligi_kg_km=cu_wt,
                    toplam_agirlik_kg_km=tot_wt,
                    sevk_boyu_m=str(packing),
                    include=True,
                )
            )

        # Environmental & Bending Specs
        env_specs = {
            "bukme_yaricapi_hareketli": "15 x D",
            "bukme_yaricapi_sabit": "10 x D",
            "depolama_sicakligi": "-40°C to +70°C",
            "kurulum_sicakligi": "-10°C to +60°C",
            "tasima_sicakligi": "-40°C to +70°C",
            "calisma_sicakligi": "-30°C to +70°C",
            "markalama_standardi": "Metrajlı ETK Kablo Beyaz Inkjet Baskı",
            "paketleme_tipi": "Geri Dönüşümlü Tahta / Kontrplak Makara",
            "sevk_boylari": "500 m / 1000 m / 2000 m ± %5",
        }
        if raw.get("uygulama_cevre") and isinstance(raw["uygulama_cevre"], dict):
            env_specs.update(raw["uygulama_cevre"])

        # Raw Electrical, Mechanical and Technical Specs for Puzzle Pieces
        raw_elec = raw.get("elektriksel_ozellikler") or []
        raw_mech = raw.get("mekanik_ozellikler") or []
        raw_tech = raw.get("teknik_ozellikler") or []
        raw_lan = raw.get("lan_frekans_performansi") or []

        # If non-fiber mechanical specs provide bending radius or temperature, reflect them in env_specs
        for m in raw_mech:
            if isinstance(m, dict):
                prop = (m.get("ozellik_adi") or "").lower()
                val = m.get("deger") or ""
                if "bükülme" in prop or "bukulme" in prop:
                    env_specs["bukme_yaricapi_sabit"] = val
                    env_specs["bukme_yaricapi_hareketli"] = val
                elif "sıcaklık" in prop or "sicaklik" in prop:
                    env_specs["calisma_sicakligi"] = val
                    env_specs["depolama_sicakligi"] = val

        # Define default puzzle sections based on cable family
        if family_key == "fiber_optik":
            default_sections = [
                "kullanim_alanlari",
                "kablo_yapisi",
                "mekanik_ozellikler",
                "uygulama",
                "markalama_paketleme",
                "standartlar",
                "varyasyonlar",
            ]
        elif family_key == "harici_telefon":
            default_sections = [
                "kullanim_alanlari",
                "kablo_yapisi",
                "teknik_ozellikler",
                "varyasyonlar",
            ]
        elif family_key == "data_lan":
            default_sections = [
                "kullanim_alanlari",
                "kablo_yapisi",
                "teknik_ozellikler",
                "mekanik_ozellikler",
                "standartlar",
                "elektriksel_ozellikler",
                "varyasyonlar",
            ]
        else:
            # Common to all other families (Dahili Telefon, Sinyal, Yangın, Kumanda, Solar, Koaksiyel, CCTV, vb.)
            default_sections = [
                "kullanim_alanlari",
                "kablo_yapisi",
                "teknik_ozellikler",
                "mekanik_ozellikler",
                "standartlar",
                "varyasyonlar",
            ]

        # Usage Areas
        usages = raw.get("kullanim_alanlari") or []
        if not usages and raw.get("notlar"):
            notlar_str = str(raw["notlar"]).strip()
            if notlar_str and not notlar_str.lower().startswith("referans standard"):
                usages = [notlar_str]
        if not usages:
            usages = self._get_default_usage_areas(family_key, title)

        return ProductDetail(
            id=product_id,
            urun_kodu=title,
            kategori=raw.get("kategori") or "Genel",
            family_key=family_key,
            standart_kodu=raw.get("standart_kodu") or raw.get("tasarim_standardi"),
            urun_aciklamasi=raw.get("urun_aciklamasi") or raw.get("notlar"),
            dokuman_kodu=raw.get("dokuman_kodu") or "B248",
            kullanim_alanlari=usages,
            kablo_yapisi=layers,
            mekanik_testler=mech_tests,
            uygulama_cevre=env_specs,
            standartlar=stds,
            varyasyonlar=variations,
            elektriksel_ozellikler=raw_elec,
            mekanik_ozellikler_ham=raw_mech,
            teknik_ozellikler=raw_tech if raw_tech else raw_elec,
            lan_frekans_performansi=raw_lan,
            varsayilan_bolumler=default_sections,
        )

