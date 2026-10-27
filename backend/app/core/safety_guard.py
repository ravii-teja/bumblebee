"""Safety Guardrail Engine: Non-safety-critical gating and manufacturer warnings."""
from typing import Tuple, Optional
from app.models.schemas import ComponentObservation

SAFETY_CRITICAL_KEYWORDS = [
    "brake", "hybrid battery", "high voltage", "orange cable", "airbag", "srs",
    "steering rack", "tie rod", "suspension spring", "fuel tank", "pressurized fuel rail"
]

class SafetyGuard:
    """Evaluates whether an action, procedure, or component is safe for field MVP execution."""

    @staticmethod
    def evaluate_component_safety(component: ComponentObservation) -> Tuple[bool, Optional[str]]:
        comp_name_lower = f"{component.name} {component.system} {component.description}".lower()
        for kw in SAFETY_CRITICAL_KEYWORDS:
            if kw in comp_name_lower:
                return False, (
                    f"SAFETY SHIELD ACTIVE: '{component.name}' belongs to a safety-critical system "
                    f"({component.system}). In accordance with Bumblebee safety policy, "
                    f"this operation is restricted to certified automotive master technicians. "
                    f"Refer to Toyota Authorized Dealership Service Bulletin."
                )
        return True, None

    @staticmethod
    def is_procedure_permitted(procedure_title: str) -> Tuple[bool, Optional[str]]:
        title_lower = procedure_title.lower()
        for kw in SAFETY_CRITICAL_KEYWORDS:
            if kw in title_lower:
                return False, f"Procedure '{procedure_title}' involves safety-critical vehicle dynamics and is barred from direct DIY execution."
        return True, None
