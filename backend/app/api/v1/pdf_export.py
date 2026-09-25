"""
ETK Kablo TDS Studio v3.0 - PDF Export API Router
POST /api/v1/export/pdf           → Jinja2 template tabanlı (veri bazlı)
POST /api/v1/export/pdf/from-html → Tarayıcı DOM'undan birebir vektörel PDF
"""

import re
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.models.pdf_schemas import TdsPdfRequest
from app.services.pdf_service import (
    generate_pdf_bytes_async,
    render_tds_html,
    _load_logo_base64,
    _get_asset_data_uri,
)

router = APIRouter(prefix="/api/v1", tags=["PDF Export"])


# ─── Model: Ham HTML endpoint ──────────────────────────────────────────────────
class RawHtmlRequest(BaseModel):
    html: str
    urun_kodu: str = "Kablo"


# ─── Endpoint 1: Veri tabanlı (Jinja2) ────────────────────────────────────────
@router.post("/export/pdf")
async def export_tds_pdf(payload: TdsPdfRequest) -> Response:
    """
    Frontend state (product + sectionTables + puzzleSections) → Jinja2 → Playwright PDF.
    """
    product = payload.product
    if not product or not product.get("urun_kodu"):
        raise HTTPException(status_code=422, detail="Geçerli bir ürün verisi gereklidir.")

    try:
        html_content = render_tds_html(payload)
        pdf_bytes = await generate_pdf_bytes_async(html_content)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF üretimi başarısız: {exc!s}")

    raw_name = product.get("urun_kodu", "Kablo")
    safe_name = re.sub(r"[^\w\-.]", "_", raw_name)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_TDS.pdf"'},
    )


# ─── Endpoint 2: DOM tabanlı (Birebir önizleme) ───────────────────────────────
@router.post("/export/pdf/from-html")
async def export_pdf_from_html(payload: RawHtmlRequest) -> Response:
    """
    Tarayıcının render ettiği TdsLivePreview DOM'unu (CSS + base64 görseller dahil)
    Playwright Chromium ile A4 vektörel PDF'e dönüştürür.
    PDF = önizlemenin piksel birebir kopyası.
    """
    if not payload.html or len(payload.html) < 100:
        raise HTTPException(status_code=422, detail="Geçerli HTML içeriği gereklidir.")

    html_content = payload.html

    # Backend güvenlik ağı: Herhangi bir görsel relative kalmışsa base64 data URI ile değiştir
    asset_names = [
        "copper_side_render.jpeg",
        "copper_cross_section.jpeg",
        "fiber_side_render.jpeg",
        "fiber_cross_section.jpeg",
        "etk_logo.png",
    ]
    for asset_name in asset_names:
        for prefix in ["/assets/", "assets/"]:
            target = f"{prefix}{asset_name}"
            if target in html_content:
                data_uri = _get_asset_data_uri(asset_name)
                if data_uri and data_uri.startswith("data:"):
                    html_content = html_content.replace(f'src="{target}"', f'src="{data_uri}"')
                    html_content = html_content.replace(f"src='{target}'", f"src='{data_uri}'")

    if "etk-logo.svg" in html_content:
        logo_b64 = _load_logo_base64()
        if logo_b64 and logo_b64.startswith("data:"):
            for prefix in ["/etk-logo.svg", "etk-logo.svg", "/assets/etk-logo.svg"]:
                html_content = html_content.replace(f'src="{prefix}"', f'src="{logo_b64}"')
                html_content = html_content.replace(f"src='{prefix}'", f"src='{logo_b64}'")

    try:
        pdf_bytes = await generate_pdf_bytes_async(html_content)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF üretimi başarısız: {type(exc).__name__}: {exc}")

    safe_name = re.sub(r"[^\w\-.]", "_", payload.urun_kodu or "Kablo")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_TDS.pdf"'},
    )
