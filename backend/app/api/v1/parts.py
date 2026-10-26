"""Parts catalog and fitment verification endpoints."""
from typing import List
from fastapi import APIRouter
from app.models.schemas import PartCandidate
from app.services.parts_finder import PartsFinderService

router = APIRouter(prefix="/parts", tags=["Parts"])
parts_service = PartsFinderService()


@router.get("", response_model=List[PartCandidate])
def get_parts(vehicle_id: str = "toyota_rav4_2022", component: str = "air_filter"):
    return parts_service.search_compatible_parts(vehicle_id, component)
