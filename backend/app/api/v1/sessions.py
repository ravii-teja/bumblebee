"""Session management endpoints."""
from fastapi import APIRouter, HTTPException
from app.models.schemas import RepairSession, CreateSessionRequest
from app.core.state_machine import RepairStateMachine

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post("", response_model=RepairSession)
def create_session(req: CreateSessionRequest):
    session = RepairStateMachine.create_session(
        vehicle_id=req.vehicle_id,
        procedure_id=req.procedure_id
    )
    return session


@router.get("/{session_id}", response_model=RepairSession)
def get_session(session_id: str):
    session = RepairStateMachine.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Repair session not found")
    return session


@router.post("/{session_id}/reset", response_model=RepairSession)
def reset_session(session_id: str):
    session = RepairStateMachine.reset_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Repair session not found")
    return session
