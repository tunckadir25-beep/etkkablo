import {
  CalculationRequest,
  CalculationResponse,
  FamilySummary,
  ProductDetail,
  ProductSummary,
} from "../types/cable";

export const API_BASE = "http://localhost:8000/api/v1";

export async function fetchFamilies(): Promise<FamilySummary[]> {
  const res = await fetch(`${API_BASE}/families`);
  if (!res.ok) {
    throw new Error(`Katalog aileleri alınamadı: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchProducts(
  familyKey?: string,
  search?: string
): Promise<ProductSummary[]> {
  const params = new URLSearchParams();
  if (familyKey) params.append("family", familyKey);
  if (search) params.append("search", search);

  const res = await fetch(`${API_BASE}/products?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Ürün listesi alınamadı: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchProductDetail(productId: number): Promise<ProductDetail> {
  const res = await fetch(`${API_BASE}/products/${productId}`);
  if (!res.ok) {
    throw new Error(`Ürün detayı alınamadı: ${res.statusText}`);
  }
  return res.json();
}

export async function estimateCalculation(
  req: CalculationRequest
): Promise<CalculationResponse> {
  const res = await fetch(`${API_BASE}/calculator/estimate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    throw new Error(`Hesaplama gerçekleştirilemedi: ${res.statusText}`);
  }
  return res.json();
}
