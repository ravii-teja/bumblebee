"""Procedures and OEM manual citations endpoints."""
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from app.models.schemas import RepairProcedure
from app.services.manual_retriever import ManualRetrieverService

router = APIRouter(prefix="/procedures", tags=["Procedures"])
retriever = ManualRetrieverService()


@router.get("/{procedure_id}", response_model=RepairProcedure)
def get_procedure(procedure_id: str, vehicle_id: str = "toyota_rav4_2022"):
    proc = retriever.get_procedure(vehicle_id, procedure_id)
    if not proc:
        raise HTTPException(status_code=404, detail="Procedure not found")
    return proc


@router.get("/{procedure_id}/citations", response_model=List[Dict[str, Any]])
def get_citations(procedure_id: str, vehicle_id: str = "toyota_rav4_2022"):
    return retriever.search_manual(vehicle_id, procedure_id)
