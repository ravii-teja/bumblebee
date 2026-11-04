"""Vision, segmentation, and verification API endpoints."""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    VisionIdentifyRequest,
    VerifyStepRequest,
    ComponentObservation,
    VerificationResult,
    RepairSession
)
from app.services.meta_muse import MetaMuseService
from app.services.sam_segmentation import SAMSegmentationService
from app.core.state_machine import RepairStateMachine
from app.core.safety_guard import SafetyGuard
from app.db.repository import SessionRepository

router = APIRouter(prefix="/vision", tags=["Vision & Perception"])
meta_muse = MetaMuseService()
sam_service = SAMSegmentationService()


@router.post("/identify", response_model=List[ComponentObservation])
async def identify_components(req: VisionIdentifyRequest):
    """Identifies components via Meta Muse Spark with SAM 3.1 segmentation polygons."""
    session = RepairStateMachine.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    components = await meta_muse.identify_components(
        image_base64=req.image_base64,
        focal_point=req.focal_point,
        simulation_frame_index=req.simulation_frame_index,
        vehicle_make=session.vehicle_profile.make if session.vehicle_profile else None,
        vehicle_model=session.vehicle_profile.model if session.vehicle_profile else None
    )

    # Attach SAM 3.1 polygons
    for comp in components:
        if not comp.polygon_points or len(comp.polygon_points) < 3:
            poly = sam_service.get_segmentation_polygon(comp.component_id)
            if poly:
                comp.polygon_points = poly

    session.observations = components
    try:
        if req.image_base64:
            SessionRepository.record_image(
                session_id=req.session_id,
                step_number=session.current_step_number,
                image_type="IDENTIFY",
                image_data=req.image_base64,
                visual_evidence=f"Spatial detection observed {len(components)} engine components"
            )
    except Exception:
        pass
    return components


@router.get("/segment/{component_id}", response_model=Dict[str, Any])
def get_segmentation(component_id: str):
    """Retrieves SAM 3.1 segmentation mask polygon for a single component."""
    poly = sam_service.get_segmentation_polygon(component_id)
    if not poly:
        raise HTTPException(status_code=404, detail=f"No segmentation mask found for {component_id}")
    return {"component_id": component_id, "polygon_points": poly}


@router.post("/verify", response_model=Dict[str, Any])
async def verify_step(req: VerifyStepRequest):
    """Verifies camera view against step expected state and updates state machine."""
    session = RepairStateMachine.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Extract target step details from dynamic session procedure
    current_step = next((s for s in session.procedure.steps if s.step_number == req.step_number), None)
    step_title = current_step.title if current_step else None
    step_instruction = current_step.instruction if current_step else None
    expected_visual_state = current_step.expected_visual_state if current_step else None
    v_make = session.vehicle_profile.make if session.vehicle_profile else None
    v_model = session.vehicle_profile.model if session.vehicle_profile else None

    # Evaluate step verification via Meta Muse
    verification = await meta_muse.verify_step_visual_state(
        step_number=req.step_number,
        image_base64=req.image_base64,
        simulation_frame_index=req.simulation_frame_index,
        override_human_confirmed=req.override_human_confirmed,
        step_title=step_title,
        step_instruction=step_instruction,
        expected_visual_state=expected_visual_state,
        vehicle_make=v_make,
        vehicle_model=v_model
    )

    # Advance deterministic state machine
    success, error_msg, updated_session = RepairStateMachine.advance_step(
        session_id=req.session_id,
        verification=verification
    )

    try:
        if req.image_base64:
            SessionRepository.record_image(
                session_id=req.session_id,
                step_number=req.step_number,
                image_type="VERIFY",
                image_data=req.image_base64,
                visual_evidence=verification.visual_evidence_description,
                confidence=verification.confidence
            )
    except Exception:
        pass

    return {
        "success": success,
        "message": error_msg or "Step visually verified and approved.",
        "verification": verification,
        "session": updated_session
    }
