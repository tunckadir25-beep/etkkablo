"""
ETK Kablo TDS Studio v3.0 - Cable Calculator Service
Physical cable dimension and weight calculation engine based on official ETK Cable engineering standards.
"""

import math
from typing import Any, Dict


class CableCalculatorService:
    COPPER_DENSITY = 8.89  # kg/dm3 or g/cm3
    STEEL_DENSITY = 7.85
    POLYMER_DENSITY_HFFR = 1.48
    POLYMER_DENSITY_PVC = 1.45
    POLYMER_DENSITY_XLPE = 0.92
    LAY_FACTOR = 1.025

    @staticmethod
    def get_bundling_factor(pair_count: int) -> float:
        """Geometric bundling factor k for N pairs"""
        if pair_count <= 1:
            return 1.0
        elif pair_count == 2:
            return 1.45
        elif pair_count <= 4:
            return 2.15
        elif pair_count <= 6:
            return 2.70
        elif pair_count <= 8:
            return 3.20
        elif pair_count <= 10:
            return 3.55
        elif pair_count <= 12:
            return 3.85
        elif pair_count <= 16:
            return 4.30
        elif pair_count <= 20:
            return 4.80
        elif pair_count <= 24:
            return 5.25
        elif pair_count <= 30:
            return 5.80
        elif pair_count <= 37:
            return 6.40
        elif pair_count <= 50:
            return 7.50
        else:
            return 1.05 * math.sqrt(pair_count * 2)

    @classmethod
    def calculate_copper_weight(
        cls,
        pair_count: int,
        cross_section: float,
        is_pimf: bool = True,
        drain_wire_section: float = 0.495
    ) -> float:
        """
        Calculates approximate copper weight in kg/km
        Cu Weight = (Damar Sayısı * Kesit * Bakır Yoğunluğu * Büküm Katsayısı) + Toprak Teli
        """
        damar_sayisi = pair_count * 2
        base_copper = damar_sayisi * cross_section * cls.COPPER_DENSITY * cls.LAY_FACTOR

        # Drain wire (toprak teli): 1 per pair for PiMF, plus 1 overall
        total_drain_wires = (pair_count + 1) if is_pimf else 1
        drain_copper = total_drain_wires * drain_wire_section * cls.COPPER_DENSITY * cls.LAY_FACTOR

        return round(base_copper + drain_copper, 1)

    @classmethod
    def estimate_outer_diameter(
        cls,
        pair_count: int,
        cross_section: float,
        is_armored: bool = False,
        is_pimf: bool = True,
        inner_sheath_thickness: float = 1.0,
        armor_wire_diameter: float = 0.9,
        outer_sheath_thickness: float = 1.5
    ) -> float:
        """
        Estimates total outer cable diameter in mm
        """
        # Conductor diameter (stranded class 2)
        d_cond = 1.25 * math.sqrt(cross_section)
        # Insulation thickness (XLPE ~ 0.50 mm)
        t_ins = 0.50
        d_insulated = d_cond + 2 * t_ins

        # Single pair diameter (PiMF has Al/PET tape + drain wire)
        d_pair = 2 * d_insulated + (0.20 if is_pimf else 0.05)

        # Bundled core diameter
        k = cls.get_bundling_factor(pair_count)
        d_core = d_pair * k

        # Adding protection layers
        if is_armored:
            d_over_inner = d_core + 2 * inner_sheath_thickness
            d_over_armor = d_over_inner + 2 * armor_wire_diameter
            d_total = d_over_armor + 2 * outer_sheath_thickness
        else:
            d_total = d_core + 2 * outer_sheath_thickness

        return round(d_total, 1)

    @classmethod
    def estimate_total_weight(
        cls,
        copper_weight: float,
        outer_diameter: float,
        is_armored: bool = False
    ) -> float:
        """
        Estimates total cable weight in kg/km
        """
        cross_area = (math.pi / 4.0) * (outer_diameter ** 2)

        if is_armored:
            armor_density_equiv = 1.85
            total_wt = copper_weight + (cross_area * armor_density_equiv * 0.95)
        else:
            polymer_density_equiv = 1.45
            total_wt = copper_weight + (cross_area * polymer_density_equiv * 0.85)

        return round(total_wt)

    @classmethod
    def calculate(
        cls,
        pair_count: int,
        cross_section: float,
        is_armored: bool = False,
        is_pimf: bool = True,
        inner_sheath_thickness: float = 1.0,
        armor_wire_diameter: float = 0.9,
        outer_sheath_thickness: float = 1.5,
        part_prefix: str = "3.5615.12.bX11"
    ) -> Dict[str, Any]:
        """
        Full calculation pipeline returning standard variation fields
        """
        cu_wt = cls.calculate_copper_weight(pair_count, cross_section, is_pimf=is_pimf)
        diameter = cls.estimate_outer_diameter(
            pair_count,
            cross_section,
            is_armored=is_armored,
            is_pimf=is_pimf,
            inner_sheath_thickness=inner_sheath_thickness,
            armor_wire_diameter=armor_wire_diameter,
            outer_sheath_thickness=outer_sheath_thickness
        )
        total_wt = cls.estimate_total_weight(cu_wt, diameter, is_armored=is_armored)

        part_no = f"{part_prefix}.{pair_count:02d}x{cross_section:.1f}-ETK"

        return {
            "part_no": part_no,
            "copper_weight_kg_km": cu_wt,
            "outer_diameter_mm": diameter,
            "total_weight_kg_km": float(total_wt),
            "packing": "500/1000 m",
            "formula_breakdown": {
                "pair_count": pair_count,
                "cores_total": pair_count * 2,
                "cross_section": cross_section,
                "bundling_factor": cls.get_bundling_factor(pair_count),
                "is_armored": is_armored,
                "is_pimf": is_pimf
            }
        }
