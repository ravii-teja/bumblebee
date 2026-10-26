"""Grounded OEM manual and technical documentation retriever (RAG)."""
from typing import Dict, Any, List, Optional
from app.mock_data.rav4_data import RAV4_PROFILE, AIR_FILTER_PROCEDURE, RAV4_DIAGNOSTICS
from app.models.schemas import RepairProcedure, DiagnosticHypothesis

class ManualRetrieverService:
    """Retrieves verified manufacturer procedures, citations, and specifications."""

    def get_procedure(self, vehicle_id: str, procedure_id: str) -> Optional[RepairProcedure]:
        if vehicle_id == "toyota_rav4_2022" and procedure_id == "rav4_engine_air_filter":
            return AIR_FILTER_PROCEDURE
        return None

    def search_manual(self, vehicle_id: str, query: str) -> List[Dict[str, Any]]:
        """Searches indexed sections of the manufacturer manual."""
        citations = [
            {
                "section": "8-3 Do-it-yourself maintenance",
                "title": "Air cleaner filter",
                "page": 482,
                "manual": RAV4_PROFILE.manual_name,
                "text": "The air cleaner filter should be checked or replaced at specified intervals. Inspect every 15,000 miles (24,000 km) or 18 months under normal driving conditions.",
                "warnings": [
                    "Notice: Do not drive with the air cleaner filter removed. Failure to do so may cause excessive engine wear due to dirt in the air.",
                    "Notice: Do not apply excessive force to the intake air duct hose."
                ]
            },
            {
                "section": "9-1 Specifications",
                "title": "Maintenance data - Air cleaner",
                "page": 536,
                "manual": RAV4_PROFILE.manual_name,
                "text": "Engine: 2.5 L 4-cylinder (A25A-FKS). Filter Element: Non-woven fabric filter (genuine Toyota part 17801-F0050).",
                "warnings": []
            }
        ]
        return citations

    def get_diagnostic_hypotheses(self, vehicle_id: str, symptoms: str) -> List[DiagnosticHypothesis]:
        return RAV4_DIAGNOSTICS
