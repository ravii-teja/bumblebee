"""Parts catalog and fitment verification endpoints."""
from typing import List, Optional
from fastapi import APIRouter
from app.models.schemas import PartCandidate
from app.services.parts_finder import PartsFinderService

router = APIRouter(prefix="/parts", tags=["Parts"])
parts_service = PartsFinderService()


@router.get("", response_model=List[PartCandidate])
def get_parts(
    vehicle_id: str = "generic_vehicle",
    component: str = "air_filter",
    make: Optional[str] = None,
    model: Optional[str] = None,
    year: Optional[int] = None,
    query: Optional[str] = None
):
    return parts_service.search_compatible_parts(vehicle_id, component, make, model, year, query)
