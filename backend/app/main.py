"""
ETK Kablo TDS Studio v3.0 - FastAPI Main Application
Orchestrator for product catalogs, engineering calculations, and TDS specifications.
"""

from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.models.schemas import (
    CalculationRequest,
    CalculationResponse,
    FamilySummary,
    ProductDetail,
    ProductSummary,
)
from app.services.cable_calculator import CableCalculatorService
from app.services.catalog_service import CatalogService
from app.api.v1.pdf_export import router as pdf_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # In-memory RAM yüklemesi: Master JSON'ı ayağa kaldır
    catalog_path = Path("backend/etk_master_catalog.json")
    if not catalog_path.exists():
        catalog_path = Path("etk_master_catalog.json")
    CatalogService.get_instance(catalog_path)
    yield


app = FastAPI(
    title="ETK Kablo TDS Studio v3.0 API",
    version="3.0.0",
    description="Enterprise Cable Engineering TDS Studio API with In-Memory Master Catalog.",
    lifespan=lifespan,
)

# CORS: Frontend bağlantısına izin ver
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# PDF Export Router
app.include_router(pdf_router)

# Statik varlıklar (Logo ve görseller)
assets_path = Path("backend_assets")
if not assets_path.exists():
    assets_path = Path("../backend_assets")
if assets_path.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")


@app.get("/api/v1/health", tags=["System"])
def health_check():
    cs = CatalogService.get_instance()
    return {
        "status": "online",
        "version": "3.0.0",
        "service": "ETK Kablo TDS Studio Pro",
        "loaded_products": len(cs.products_by_id),
        "families": len(cs.products_by_family),
    }


@app.get("/api/v1/families", response_model=List[FamilySummary], tags=["Catalogs"])
def list_families():
    cs = CatalogService.get_instance()
    return cs.get_families()


@app.get("/api/v1/products", response_model=List[ProductSummary], tags=["Catalogs"])
def list_products(
    family: Optional[str] = Query(None, description="15 Kablo ailesi anahtarı (örn. fiber_optik, data_lan)"),
    search: Optional[str] = Query(None, description="Kablo adı veya part no ile filtreleme"),
    limit: int = Query(500, ge=1, le=1000),
):
    cs = CatalogService.get_instance()
    return cs.list_products(family_key=family, search=search, limit=limit)


@app.get("/api/v1/products/{product_id}", response_model=ProductDetail, tags=["Catalogs"])
def get_product_detail(product_id: int):
    cs = CatalogService.get_instance()
    product = cs.get_product_detail(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Kablo ürünü bulunamadı (ID: {product_id}).")
    return product


@app.post("/api/v1/calculator/estimate", response_model=CalculationResponse, tags=["Engineering"])
def estimate_cable_parameters(req: CalculationRequest):
    result = CableCalculatorService.calculate(
        pair_count=req.pair_count,
        cross_section=req.cross_section,
        is_armored=req.is_armored,
        is_pimf=req.is_pimf,
        inner_sheath_thickness=req.inner_sheath_thickness,
        armor_wire_diameter=req.armor_wire_diameter,
        outer_sheath_thickness=req.outer_sheath_thickness,
        part_prefix=req.part_prefix or "3.5615.12.bX11",
    )
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
