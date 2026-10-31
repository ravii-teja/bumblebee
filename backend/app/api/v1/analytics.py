"""Analytics, Session History, and Product Improvement API Router."""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query
from app.db.repository import SessionRepository
from app.db.database import get_db

router = APIRouter(prefix="/analytics", tags=["Analytics & Improvement"])


class FeedbackRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Technician rating from 1 to 5")
    feedback: Optional[str] = Field(None, description="Technician feedback and diagnostic accuracy notes")
    resolution_status: Optional[str] = Field("RESOLVED", description="'RESOLVED', 'IN_PROGRESS', or 'ESCALATED'")
    parts_replaced: Optional[List[str]] = Field(None, description="List of part numbers successfully installed")


@router.get("/sessions", response_model=List[Dict[str, Any]])
def list_sessions(limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    """Retrieves recent repair sessions with turn and image counts."""
    return SessionRepository.list_recent_sessions(limit=limit, offset=offset)


@router.get("/sessions/{session_id}", response_model=Dict[str, Any])
def get_session_dossier(session_id: str):
    """Retrieves full historical session dossier: vehicle, images, turns, steps, and resolution."""
    dossier = SessionRepository.get_session_dossier(session_id)
    if not dossier:
        raise HTTPException(status_code=404, detail="Session not found in historical database")
    return dossier


@router.post("/sessions/{session_id}/feedback", response_model=Dict[str, Any])
def submit_session_feedback(session_id: str, req: FeedbackRequest):
    """Records technician feedback on diagnostic and verification accuracy for model improvement."""
    dossier = SessionRepository.get_session_dossier(session_id)
    if not dossier:
        raise HTTPException(status_code=404, detail="Session not found in historical database")

    sess = dossier["session"]
    SessionRepository.record_or_update_issue_resolution(
        session_id=session_id,
        make=sess.get("make"),
        model=sess.get("model"),
        year=sess.get("year"),
        reported_issue=sess.get("reported_issue"),
        hypothesis=sess.get("hypothesis"),
        resolution_status=req.resolution_status or "RESOLVED",
        parts_replaced=req.parts_replaced,
        rating=req.rating,
        feedback=req.feedback
    )
    return {
        "status": "success",
        "message": f"Technician feedback recorded for session {session_id}. Thank you for helping improve Bumblebee!",
        "rating": req.rating,
        "session_id": session_id
    }


@router.get("/stats", response_model=Dict[str, Any])
def get_analytics_stats():
    """Returns aggregate metrics across all sessions, vehicle makes, turns, and step verifications."""
    return SessionRepository.get_analytics_summary()


@router.get("/sessions/{session_id}/images", response_model=List[Dict[str, Any]])
def get_session_images(session_id: str):
    """Lists all captured camera frames and detection metadata for a session."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, session_id, step_number, image_type, visual_evidence,
               detected_make, detected_model, confidence, created_at,
               LENGTH(COALESCE(image_data, '')) as bytes_length
        FROM session_images WHERE session_id = ? ORDER BY id ASC;
        """, (session_id,))
        return [dict(r) for r in cursor.fetchall()]


@router.get("/sessions/{session_id}/images/{image_id}", response_model=Dict[str, Any])
def get_single_session_image(session_id: str, image_id: int):
    """Retrieves full image data (Base64) for inspection or offline training."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, session_id, step_number, image_type, image_data,
               visual_evidence, detected_make, detected_model, confidence, created_at
        FROM session_images WHERE session_id = ? AND id = ?;
        """, (session_id, image_id))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Image frame not found")
        return dict(row)


@router.get("/export/dataset", response_model=Dict[str, Any])
def export_training_dataset(min_rating: int = Query(4, ge=1, le=5)):
    """Exports validated field repairs and technician feedback into training datasets."""
    from app.services.active_learning import ActiveLearningService
    return ActiveLearningService.compile_fine_tuning_dataset(min_rating=min_rating)
