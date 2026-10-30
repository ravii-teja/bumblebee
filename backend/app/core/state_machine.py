"""Deterministic Repair State Machine enforcing step sequencing and visual verification."""
import uuid
from datetime import datetime
from typing import Dict, Optional, Tuple
from app.models.schemas import RepairSession, VerificationResult, AuditEvent, DialogueState
from app.mock_data.rav4_data import RAV4_PROFILE, AIR_FILTER_PROCEDURE, GENERIC_PROFILE, GENERIC_PROCEDURE

# In-memory session store (can be backed by SQLite/PostgreSQL)
_SESSION_STORE: Dict[str, RepairSession] = {}


class RepairStateMachine:
    """Manages lifecycle, step transitions, and state recovery of repair sessions."""

    @classmethod
    def create_session(cls, vehicle_id: str = "generic_vehicle", procedure_id: str = "general_inspection") -> RepairSession:
        session_id = f"sess_{uuid.uuid4().hex[:10]}"
        if vehicle_id == "toyota_rav4_2022":
            prof = RAV4_PROFILE
            proc = AIR_FILTER_PROCEDURE
        else:
            prof = GENERIC_PROFILE
            proc = GENERIC_PROCEDURE

        session = RepairSession(
            session_id=session_id,
            vehicle_profile=prof,
            procedure=proc,
            current_step_number=1,
            completed_steps=[],
            observations=[],
            verifications={},
            dialogue=DialogueState(
                phase="SCAN_VEHICLE",
                detected_make=None,
                confirmed_make=None,
                model=None,
                year=None,
                reported_issue=None,
                messages=[]
            ),
            audit_trail=[
                AuditEvent(
                    timestamp=datetime.utcnow(),
                    action="SESSION_INITIALIZED",
                    step_number=1,
                    actor="SYSTEM",
                    details={"vehicle": prof.model, "procedure": proc.title}
                )
            ]
        )
        _SESSION_STORE[session_id] = session
        return session

    @classmethod
    def get_session(cls, session_id: str) -> Optional[RepairSession]:
        return _SESSION_STORE.get(session_id)

    @classmethod
    def advance_step(
        cls,
        session_id: str,
        verification: VerificationResult
    ) -> Tuple[bool, Optional[str], Optional[RepairSession]]:
        """Advances to the next sequential step if current step is verified."""
        session = cls.get_session(session_id)
        if not session:
            return False, "Session not found", None

        # Verify step matches current step
        if verification.step_number != session.current_step_number:
            return False, f"Cannot verify step {verification.step_number} while currently on step {session.current_step_number}", session

        # Record verification
        session.verifications[verification.step_number] = verification

        # Check if verified or inconclusive
        if verification.status != "VERIFIED":
            session.audit_trail.append(
                AuditEvent(
                    timestamp=datetime.utcnow(),
                    action="VERIFICATION_BLOCKED",
                    step_number=session.current_step_number,
                    actor="META_MUSE",
                    details={"status": verification.status, "confidence": verification.confidence}
                )
            )
            return False, f"Step {verification.step_number} verification status: {verification.status}. Advancement blocked.", session

        # Add to completed
        if session.current_step_number not in session.completed_steps:
            session.completed_steps.append(session.current_step_number)

        total_steps = len(session.procedure.steps)
        if session.current_step_number < total_steps:
            session.current_step_number += 1
            action = f"ADVANCED_TO_STEP_{session.current_step_number}"
        else:
            session.status = "COMPLETED"
            action = "PROCEDURE_COMPLETED"

        session.updated_at = datetime.utcnow()
        session.audit_trail.append(
            AuditEvent(
                timestamp=datetime.utcnow(),
                action=action,
                step_number=session.current_step_number,
                actor="SYSTEM",
                details={"verified_confidence": verification.confidence}
            )
        )
        return True, None, session

    @classmethod
    def reset_session(cls, session_id: str) -> Optional[RepairSession]:
        session = cls.get_session(session_id)
        if session:
            session.current_step_number = 1
            session.completed_steps = []
            session.verifications = {}
            session.status = "IN_PROGRESS"
            session.audit_trail.append(
                AuditEvent(
                    timestamp=datetime.utcnow(),
                    action="SESSION_RESET",
                    step_number=1,
                    actor="USER",
                    details={}
                )
            )
        return session
