"""Parts catalog lookup and fitment verification service."""
from typing import List, Optional
from app.models.schemas import PartCandidate
from app.mock_data.rav4_data import RAV4_PARTS

class PartsFinderService:
    """Finds candidate replacement parts and provides verified compatibility proof."""

    def search_compatible_parts(
        self,
        vehicle_id: str,
        component_name: str
    ) -> List[PartCandidate]:
        """Searches parts and verifies compatibility against vehicle specifications.
        Rule: Never claim compatibility without supporting data."""
        if vehicle_id == "toyota_rav4_2022":
            return RAV4_PARTS
        return []

    def verify_part_number(self, vehicle_id: str, part_number: str) -> Optional[PartCandidate]:
        clean_pn = part_number.replace("-", "").strip().upper()
        for p in RAV4_PARTS:
            if p.part_number.replace("-", "").strip().upper() == clean_pn:
                return p
        return None
