"""Pydantic data schemas for MUSE FIELD."""
from datetime import datetime, timezone
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class VehicleProfile(BaseModel):
    id: str = Field(..., description="Unique vehicle profile ID")
    make: str = Field(..., description="Vehicle make, e.g., Toyota")
    model: str = Field(..., description="Vehicle model, e.g., RAV4")
    year: int = Field(..., description="Model year, e.g., 2022")
    trim: str = Field(..., description="Trim level, e.g., XLE AWD")
    engine: str = Field(..., description="Engine code/spec, e.g., 2.5L Dynamic Force I4 (A25A-FKS)")
    transmission: str = Field(..., description="Transmission type, e.g., Direct Shift 8-Speed Automatic")
    vin_sample: Optional[str] = Field(None, description="Sample VIN pattern")
    manual_name: str = Field(..., description="Official manual reference, e.g., Toyota OM42C33U")
    diagram_url: str = Field(..., description="Schematic diagram URL")


class BoundingBox(BaseModel):
    ymin: float = Field(..., ge=0, le=1)
    xmin: float = Field(..., ge=0, le=1)
    ymax: float = Field(..., ge=0, le=1)
    xmax: float = Field(..., ge=0, le=1)


class ComponentObservation(BaseModel):
    component_id: str
    name: str
    system: str  # e.g., "Air Intake System", "Cooling System", "Electrical"
    confidence: float
    bounding_box: BoundingBox
    polygon_points: List[List[float]] = Field(
        default_factory=list,
        description="List of [x, y] coordinates normalized 0-1 for SAM 3.1 polygon overlay"
    )
    wireframe_points: List[List[float]] = Field(
        default_factory=list,
        description="Additional wireframe mesh lines or inner contours"
    )
    observed_state: str  # e.g., "Housing clamped shut", "Retaining clips disengaged"
    status: Literal["NORMAL", "ATTENTION", "NEEDS_REPLACEMENT", "UNKNOWN"] = "NORMAL"
    description: str
    spatial_zone: str  # e.g., "Driver Front Engine Bay"


class DiagnosticHypothesis(BaseModel):
    id: str
    symptom: str
    hypothesis_title: str
    description: str
    confidence: float
    supporting_evidence: List[str]
    recommended_checks: List[str]
    safety_level: Literal["NON_SAFETY_CRITICAL", "CAUTION_REQUIRED", "SAFETY_CRITICAL"]
    manual_citation: str
    target_component_id: str = "air_cleaner_assembly"


class RepairStep(BaseModel):
    step_number: int
    title: str
    instruction: str
    required_tools: List[str]
    safety_warning: Optional[str] = None
    expected_visual_state: str
    reference_manual_page: int
    reference_diagram_url: Optional[str] = None
    verification_criteria: List[str]
    sample_frame_key: Optional[str] = None  # Key to match simulated/test camera frames


class RepairProcedure(BaseModel):
    id: str
    vehicle_id: str
    title: str
    category: str
    difficulty: Literal["BEGINNER", "INTERMEDIATE", "ADVANCED"]
    estimated_minutes: int
    steps: List[RepairStep]
    tools_required: List[str]
    parts_required: List[str]
    safety_critical: bool = False
    source_manual: str
    source_section: str


class PartCandidate(BaseModel):
    part_number: str
    oem_or_aftermarket: Literal["OEM", "AFTERMARKET_TIER1", "AFTERMARKET_STANDARD"]
    brand: str
    name: str
    price_usd: float
    marketplace_url: str
    image_url: Optional[str] = None
    verified_fitment: bool
    fitment_evidence: str
    specifications: Dict[str, str] = Field(default_factory=dict)


class VerificationResult(BaseModel):
    step_number: int
    status: Literal["VERIFIED", "INCONCLUSIVE", "MISMATCH"]
    confidence: float
    visual_evidence_description: str
    detected_features: List[str]
    requires_human_confirmation: bool = False
    timestamp: datetime = Field(default_factory=utc_now)


class AuditEvent(BaseModel):
    timestamp: datetime = Field(default_factory=utc_now)
    action: str
    step_number: Optional[int] = None
    actor: Literal["SYSTEM", "USER", "META_MUSE", "SAM_3_1"]
    details: Dict[str, Any] = Field(default_factory=dict)


# Dialogue & Memory Tracking
DialoguePhase = Literal[
    "SCAN_VEHICLE",         # Camera looking at car/badge/engine
    "CONFIRM_MAKE",         # "I see a Toyota. Is that right?"
    "ASK_MODEL_YEAR",       # "What model and year is this vehicle?"
    "ASK_ISSUE",            # "What issue are you experiencing?"
    "ANALYZING_ISSUE",      # Segmenting components & retrieving manual
    "ACTIVE_REPAIR",        # Voice-guided step-by-step with camera verification
    "COMPLETED"             # Session summary & resolved
]


class DialogueMessage(BaseModel):
    sender: Literal["USER", "AI"]
    text: str
    speech_text: Optional[str] = None
    phase: DialoguePhase
    timestamp: datetime = Field(default_factory=utc_now)


class DialogueState(BaseModel):
    phase: DialoguePhase = "SCAN_VEHICLE"
    detected_make: Optional[str] = "Toyota"
    confirmed_make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    reported_issue: Optional[str] = None
    hypothesis: Optional[DiagnosticHypothesis] = None
    solution_plan: Optional[RepairProcedure] = None
    active_step: int = 1
    messages: List[DialogueMessage] = Field(default_factory=list)


class RepairSession(BaseModel):
    session_id: str
    vehicle_profile: VehicleProfile
    procedure: RepairProcedure
    current_step_number: int = 1
    completed_steps: List[int] = Field(default_factory=list)
    observations: List[ComponentObservation] = Field(default_factory=list)
    verifications: Dict[int, VerificationResult] = Field(default_factory=dict)
    audit_trail: List[AuditEvent] = Field(default_factory=list)
    dialogue: DialogueState = Field(default_factory=DialogueState)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    status: Literal["IN_PROGRESS", "COMPLETED", "HALTED_SAFETY"] = "IN_PROGRESS"


# Request / Response Schemas
class CreateSessionRequest(BaseModel):
    vehicle_id: str = "toyota_rav4_2022"
    procedure_id: str = "rav4_engine_air_filter"


class VisionIdentifyRequest(BaseModel):
    session_id: str
    image_base64: Optional[str] = None
    focal_point: Optional[List[float]] = None
    simulation_frame_index: Optional[int] = None


class VerifyStepRequest(BaseModel):
    session_id: str
    step_number: int
    image_base64: Optional[str] = None
    simulation_frame_index: Optional[int] = None
    override_human_confirmed: bool = False


class PartsSearchRequest(BaseModel):
    vehicle_id: str
    component_name: str


class ConversationalInputRequest(BaseModel):
    session_id: str
    user_speech_or_text: str
    image_base64: Optional[str] = None
    force_phase: Optional[DialoguePhase] = None
