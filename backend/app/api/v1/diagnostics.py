"""Diagnostics API endpoints."""
from typing import List
from fastapi import APIRouter
from app.models.schemas import DiagnosticHypothesis
from app.services.manual_retriever import ManualRetrieverService

router = APIRouter(prefix="/diagnostics", tags=["Diagnostics"])
retriever = ManualRetrieverService()


@router.get("", response_model=List[DiagnosticHypothesis])
def get_diagnostics(vehicle_id: str = "toyota_rav4_2022", symptom: str = ""):
    return retriever.get_diagnostic_hypotheses(vehicle_id, symptom)
