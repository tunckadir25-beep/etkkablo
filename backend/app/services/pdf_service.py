"""
ETK Kablo TDS Studio v3.0 - PDF Export Service
Playwright Chromium + Jinja2 tabanlı vektörel A4 PDF üretimi.
TdsLivePreview.tsx ile birebir eşleştirilmiş evrensel template kullanır.
"""

import base64
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.models.pdf_schemas import TdsPdfRequest, SectionTableInstance

# ─────────────────────────────────────────────────────────────
# Renk Yardımcıları (cableColors.ts karşılığı)
# ─────────────────────────────────────────────────────────────

CABLE_FAMILY_COLORS: Dict[str, Dict[str, str]] = {
    "fiber_optik":                {"primary": "#619a41", "tint_blend": "0.86"},
    "harici_telefon":             {"primary": "#2a2c2c", "tint_blend": "0.86"},
    "dahili_telefon":             {"primary": "#b9bebc", "tint_blend": "0.86"},
    "data_lan":                   {"primary": "#1e8fbf", "tint_blend": "0.86"},
    "sinyal_kontrol":             {"primary": "#d9a1a7", "tint_blend": "0.86"},
    "enstrumantasyon":            {"primary": "#f5b619", "tint_blend": "0.86"},
    "kontrol":                    {"primary": "#76689b", "tint_blend": "0.86"},
    "yangin_alarm":               {"primary": "#a82623", "tint_blend": "0.86"},
    "yangina_dayanikli":          {"primary": "#ef6c22", "tint_blend": "0.86"},
    "yangina_dayanikli_enerji":   {"primary": "#ef6c22", "tint_blend": "0.86"},
    "solar":                      {"primary": "#ed7d31", "tint_blend": "0.86"},
    "koaksiyel":                  {"primary": "#7f4d26", "tint_blend": "0.86"},
    "cctv":                       {"primary": "#8b8c8f", "tint_blend": "0.86"},
    "bina_otomasyon":             {"primary": "#1e8fbf", "tint_blend": "0.86"},
    "silikon":                    {"primary": "#ef6c22", "tint_blend": "0.86"},
}
DEFAULT_FAMILY = "data_lan"


def _hex_to_rgb(hex_color: str):
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _compute_tint(hex_color: str, blend: float = 0.86) -> str:
    r, g, b = _hex_to_rgb(hex_color)
    tr = round(r + (255 - r) * blend)
    tg = round(g + (255 - g) * blend)
    tb = round(b + (255 - b) * blend)
    return f"#{tr:02x}{tg:02x}{tb:02x}"


def _get_header_text(hex_color: str) -> str:
    r, g, b = _hex_to_rgb(hex_color)
    luminance = (r * 299 + g * 587 + b * 114) / 1000
    return "#0f172a" if luminance > 165 else "#ffffff"


def get_family_colors(family_key: Optional[str], kategori: Optional[str] = None) -> Dict[str, str]:
    """Frontend getFamilyColor() ile eşdeğer."""

    def normalize(s: str) -> str:
        s = s.lower().strip()
        for fr, to in [(" ", "_"), ("-", "_"), ("/", "_"),
                       ("ı", "i"), ("ğ", "g"), ("ü", "u"),
                       ("ş", "s"), ("ö", "o"), ("ç", "c")]:
            s = s.replace(fr, to)
        return s

    key = normalize(family_key or "")
    cat = normalize(kategori or "")
    combined = f"{key} {cat}"

    if key in CABLE_FAMILY_COLORS:
        entry = CABLE_FAMILY_COLORS[key]
    elif "fiber" in combined:
        entry = CABLE_FAMILY_COLORS["fiber_optik"]
    elif "harici" in combined and "telefon" in combined:
        entry = CABLE_FAMILY_COLORS["harici_telefon"]
    elif "dahili" in combined and "telefon" in combined:
        entry = CABLE_FAMILY_COLORS["dahili_telefon"]
    elif any(x in combined for x in ["data", "lan", "ethernet", "cat"]):
        entry = CABLE_FAMILY_COLORS["data_lan"]
    elif "sinyal" in combined:
        entry = CABLE_FAMILY_COLORS["sinyal_kontrol"]
    elif "enstruman" in combined or "instrument" in combined:
        entry = CABLE_FAMILY_COLORS["enstrumantasyon"]
    elif "kontrol" in combined or "kumanda" in combined:
        entry = CABLE_FAMILY_COLORS["kontrol"]
    elif "yangin" in combined and "alarm" in combined:
        entry = CABLE_FAMILY_COLORS["yangin_alarm"]
    elif "dayanikli" in combined:
        entry = CABLE_FAMILY_COLORS["yangina_dayanikli"]
    elif "solar" in combined or "pv" in combined:
        entry = CABLE_FAMILY_COLORS["solar"]
    elif "koaks" in combined or "coax" in combined:
        entry = CABLE_FAMILY_COLORS["koaksiyel"]
    elif "cctv" in combined or "guvenlik" in combined:
        entry = CABLE_FAMILY_COLORS["cctv"]
    else:
        entry = CABLE_FAMILY_COLORS[DEFAULT_FAMILY]

    primary = entry["primary"]
    tint = _compute_tint(primary, float(entry["tint_blend"]))
    header_text = _get_header_text(primary)

    return {"primary": primary, "tint": tint, "header_text": header_text}


# ─────────────────────────────────────────────────────────────
# Veri Yardımcıları (TdsLivePreview.tsx mantığı)
# ─────────────────────────────────────────────────────────────

_PRIORITY_KEYS = [
    "alan_adi", "kullanim_alani", "madde", "tanim",
    "aciklama", "deger", "parametre", "text", "value", "baslik"
]
_META_KEYS = {"id", "sira", "include", "dahil", "key", "_id", "templateId", "instanceId"}


def extract_usage_text(row: Any) -> str:
    if isinstance(row, str):
        return row.strip()
    if not isinstance(row, dict):
        return str(row).strip()
    for k in _PRIORITY_KEYS:
        if isinstance(row.get(k), str) and row[k].strip():
            return row[k].strip()
    for k, v in row.items():
        if k.startswith("col_") and isinstance(v, str) and v.strip():
            return v.strip()
    for k, v in row.items():
        if k not in _META_KEYS and isinstance(v, str) and v.strip():
            return v.strip()
    return ""


def extract_layer(row: Any, idx: int) -> Dict[str, str]:
    if isinstance(row, str):
        return {"label": f"Katman {idx + 1}", "desc": row}
    if not isinstance(row, dict):
        return {"label": f"Katman {idx + 1}", "desc": ""}
    label = row.get("katman_adi") or row.get("katman") or row.get("label") or row.get("title") or ""
    desc = row.get("tanim") or row.get("aciklama") or row.get("desc") or row.get("description") or row.get("deger") or ""
    if not label or not desc:
        entries = [(k, v) for k, v in row.items()
                   if k not in _META_KEYS and isinstance(v, str) and v.strip()]
        if not label and entries:
            label = entries[0][1]
        if not desc and len(entries) >= 2:
            desc = entries[1][1]
    return {"label": label or f"Katman {idx + 1}", "desc": desc}


def is_row_active(row: Dict[str, Any]) -> bool:
    return row.get("include", True) is not False and row.get("dahil", True) is not False


# ─────────────────────────────────────────────────────────────
# Logo base64 yükleyici
# ─────────────────────────────────────────────────────────────

def _load_logo_base64() -> Optional[str]:
    """ETK logosunu base64 data URI olarak döner (inline embed için)."""
    candidates = [
        Path("backend_assets") / "etk-logo.svg",
        Path("etk-logo.svg"),
        Path(__file__).parent.parent.parent.parent / "etk-logo.svg",
    ]
    for p in candidates:
        if p.exists():
            try:
                raw = p.read_bytes()
                b64 = base64.b64encode(raw).decode()
                suffix = p.suffix.lstrip(".")
                mime = "image/svg+xml" if suffix == "svg" else f"image/{suffix}"
                return f"data:{mime};base64,{b64}"
            except Exception:
                pass
    # Fallback: public path (Playwright local file server)
    return "/etk-logo.svg"


def _get_asset_data_uri(relative_path: str) -> str:
    """backend_assets içindeki görselleri base64 data URI'ya dönüştürür."""
    candidates = [
        Path("backend_assets") / relative_path.lstrip("/assets/"),
        Path("backend_assets") / Path(relative_path).name,
        Path(__file__).parent.parent.parent.parent / "backend_assets" / Path(relative_path).name,
    ]
    for p in candidates:
        if p.exists():
            try:
                raw = p.read_bytes()
                b64 = base64.b64encode(raw).decode()
                suffix = p.suffix.lstrip(".").lower()
                mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "svg": "image/svg+xml"}
                mime = mime_map.get(suffix, f"image/{suffix}")
                return f"data:{mime};base64,{b64}"
            except Exception:
                pass
    return relative_path  # fallback: URL olarak bırak


# ─────────────────────────────────────────────────────────────
# Jinja2 Custom Filters
# ─────────────────────────────────────────────────────────────

def _jinja_selectattr_include(rows: List[Any]) -> List[Any]:
    """include != false ve dahil != false olan satırları filtrele."""
    return [r for r in (rows or []) if is_row_active(r) if isinstance(r, dict)]


def _jinja_find_index(lst: List[Any], value: Any) -> int:
    try:
        return list(lst).index(value)
    except ValueError:
        return -1


def _jinja_min(a, b):
    return min(a, b)


# ─────────────────────────────────────────────────────────────
# Template Render
# ─────────────────────────────────────────────────────────────

def _build_jinja_env() -> Environment:
    templates_dir = Path(__file__).parent.parent / "templates"
    env = Environment(
        loader=FileSystemLoader(str(templates_dir)),
        autoescape=select_autoescape(["html"]),
    )
    env.filters["selectattr_include"] = _jinja_selectattr_include
    env.filters["find_index"] = _jinja_find_index
    env.filters["min"] = _jinja_min
    env.globals["min"] = min
    return env


def render_tds_html(payload: TdsPdfRequest) -> str:
    """Payload'dan Jinja2 HTML string üret."""
    product = payload.product
    lang = payload.lang
    isTr = lang == "tr"
    is_fiber = product.get("family_key") == "fiber_optik"

    colors = get_family_colors(product.get("family_key"), product.get("kategori"))
    primary_color = colors["primary"]
    tint_color = colors["tint"]
    header_text_color = colors["header_text"]

    # Puzzle bölüm sıralaması
    sections_raw = payload.puzzle_sections or []
    enabled_sections = sorted(
        [s for s in sections_raw if s.enabled],
        key=lambda s: s.order
    )

    section_tables: Dict[str, List[SectionTableInstance]] = {}
    if payload.section_tables:
        section_tables = {k: v for k, v in payload.section_tables.items()}

    # Kullanım Alanları
    usage_list = [
        t for t in [extract_usage_text(r) for r in (product.get("kullanim_alanlari") or [])]
        if t
    ]

    # Kablo Yapısı
    construction_list = [
        l for l in [extract_layer(r, i) for i, r in enumerate(product.get("kablo_yapisi") or [])]
        if l["label"] or l["desc"]
    ]

    # Sayfa 2 kontrol
    var_tables = section_tables.get("varyasyonlar", [])
    var_table = next(
        (t for t in var_tables if any(is_row_active(r) for r in (t.data or []))),
        None
    )
    is_var_enabled = is_fiber or any(s.id == "varyasyonlar" for s in enabled_sections)
    show_page2 = bool(is_var_enabled and var_table)
    total_pages = 2 if show_page2 else 1

    # Logo ve görseller
    logo_src = _load_logo_base64()
    side_render_src = _get_asset_data_uri(
        "/assets/fiber_side_render.jpeg" if is_fiber else "/assets/copper_side_render.jpeg"
    )
    cross_section_src = _get_asset_data_uri(
        "/assets/fiber_cross_section.jpeg" if is_fiber else "/assets/copper_cross_section.jpeg"
    )

    env = _build_jinja_env()
    template = env.get_template("tds_universal_template.html")

    return template.render(
        product=product,
        lang=lang,
        is_fiber=is_fiber,
        primary_color=primary_color,
        tint_color=tint_color,
        header_text_color=header_text_color,
        enabled_sections=[s.model_dump() for s in enabled_sections],
        section_tables={k: [t.model_dump() for t in v] for k, v in section_tables.items()},
        usage_list=usage_list,
        construction_list=construction_list,
        show_page2=show_page2,
        total_pages=total_pages,
        var_table=var_table.model_dump() if var_table else None,
        logo_src=logo_src,
        side_render_src=side_render_src,
        cross_section_src=cross_section_src,
    )


# ─────────────────────────────────────────────────────────────
# Playwright PDF Üretici
# ─────────────────────────────────────────────────────────────

async def generate_pdf_bytes_async(html_content: str) -> bytes:
    """Playwright Chromium ile HTML → A4 PDF bytes döner (Async FastAPI uyumlu)."""
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox", "--disable-setuid-sandbox"])
        page = await browser.new_page(device_scale_factor=2)
        await page.set_viewport_size({"width": 794, "height": 1123})
        await page.emulate_media(media="print")
        await page.set_content(html_content, wait_until="networkidle")
        await page.wait_for_timeout(300)
        pdf_bytes = await page.pdf(
            format="A4",
            print_background=True,
            margin={"top": "0mm", "right": "0mm", "bottom": "0mm", "left": "0mm"},
            prefer_css_page_size=True,
        )
        await browser.close()

    return pdf_bytes


def generate_pdf_bytes(html_content: str) -> bytes:
    """Senkron script veya CLI ortamları için wrapper."""
    import asyncio
    return asyncio.run(generate_pdf_bytes_async(html_content))
