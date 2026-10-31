"""Repository for Bumblebee database persistence across sessions, vehicles, images, issues, and turns."""
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.db.database import get_db
from app.models.schemas import RepairSession, VehicleProfile, VerificationResult, RepairStep

logger = logging.getLogger(__name__)


def utc_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


class SessionRepository:
    """Manages transactional persistence for sessions, vehicles, images, and diagnostics."""

    @classmethod
    def upsert_session(cls, session: RepairSession):
        """Creates or updates a session in the database."""
        with get_db() as conn:
            cursor = conn.cursor()
            prof = session.vehicle_profile
            diag = session.dialogue

            make = (diag.confirmed_make or diag.detected_make or prof.make or "").strip()
            model = (diag.model or prof.model or "").strip()
            year = diag.year or prof.year or 2024

            hypothesis_str = None
            if diag.hypothesis:
                if hasattr(diag.hypothesis, "title"):
                    prob = getattr(diag.hypothesis, 'probability', 0.9)
                    hypothesis_str = f"{diag.hypothesis.title} ({prob:.0%} confidence)"
                elif isinstance(diag.hypothesis, (dict, list)):
                    hypothesis_str = json.dumps(diag.hypothesis)
                else:
                    hypothesis_str = str(diag.hypothesis)

            solution_plan_str = None
            if diag.solution_plan:
                if hasattr(diag.solution_plan, "title"):
                    solution_plan_str = getattr(diag.solution_plan, "title")
                elif isinstance(diag.solution_plan, (dict, list)):
                    solution_plan_str = json.dumps(diag.solution_plan)
                else:
                    solution_plan_str = str(diag.solution_plan)

            cursor.execute("""
            INSERT INTO sessions (
                session_id, vehicle_id, make, model, year, status, phase,
                current_step_number, reported_issue, hypothesis, solution_plan,
                resolution_summary, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                make = excluded.make,
                model = excluded.model,
                year = excluded.year,
                status = excluded.status,
                phase = excluded.phase,
                current_step_number = excluded.current_step_number,
                reported_issue = COALESCE(excluded.reported_issue, sessions.reported_issue),
                hypothesis = COALESCE(excluded.hypothesis, sessions.hypothesis),
                solution_plan = COALESCE(excluded.solution_plan, sessions.solution_plan),
                resolution_summary = COALESCE(excluded.resolution_summary, sessions.resolution_summary),
                updated_at = excluded.updated_at;
            """, (
                session.session_id,
                prof.id,
                make,
                model,
                year,
                session.status,
                diag.phase,
                session.current_step_number,
                diag.reported_issue,
                hypothesis_str,
                solution_plan_str,
                f"Completed {len(session.completed_steps)} of {len(session.procedure.steps)} steps",
                session.created_at.isoformat() if hasattr(session.created_at, "isoformat") else str(session.created_at),
                session.updated_at.isoformat() if hasattr(session.updated_at, "isoformat") else str(session.updated_at)
            ))

        # Also persist the vehicle profile if make is identified
        if make:
            cls.save_vehicle(prof, make=make, model=model, year=year)

    @classmethod
    def save_vehicle(cls, prof: VehicleProfile, make: Optional[str] = None, model: Optional[str] = None, year: Optional[int] = None):
        """Saves vehicle profile in the vehicles catalog."""
        with get_db() as conn:
            cursor = conn.cursor()
            veh_make = make or prof.make or "Unknown"
            veh_model = model or prof.model or "Vehicle"
            veh_year = year or prof.year or 2024
            cursor.execute("""
            INSERT INTO vehicles (id, make, model, year, trim, engine, transmission, manual_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                make = excluded.make,
                model = excluded.model,
                year = excluded.year,
                trim = excluded.trim,
                engine = excluded.engine,
                transmission = excluded.transmission,
                manual_name = excluded.manual_name;
            """, (
                prof.id,
                veh_make,
                veh_model,
                veh_year,
                prof.trim,
                prof.engine,
                prof.transmission,
                prof.manual_name,
                utc_iso()
            ))

    @classmethod
    def record_image(
        cls,
        session_id: str,
        step_number: int,
        image_type: str,
        image_data: str,
        visual_evidence: Optional[str] = None,
        detected_make: Optional[str] = None,
        detected_model: Optional[str] = None,
        confidence: Optional[float] = None
    ) -> int:
        """Stores a camera frame and detection metadata for a session."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO session_images (
                session_id, step_number, image_type, image_data,
                visual_evidence, detected_make, detected_model, confidence, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                session_id,
                step_number,
                image_type,
                image_data,
                visual_evidence,
                detected_make,
                detected_model,
                confidence,
                utc_iso()
            ))
            return cursor.lastrowid

    @classmethod
    def record_turn(
        cls,
        session_id: str,
        sender: str,
        phase: str,
        user_text: Optional[str] = None,
        ai_text: Optional[str] = None,
        speech_text: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None
    ) -> int:
        """Stores a conversation turn in the turn history."""
        with get_db() as conn:
            cursor = conn.cursor()
            # Calculate next turn index
            cursor.execute("SELECT COUNT(*) FROM conversation_turns WHERE session_id = ?", (session_id,))
            turn_index = cursor.fetchone()[0] + 1

            cursor.execute("""
            INSERT INTO conversation_turns (
                session_id, turn_index, sender, user_text, ai_text, speech_text,
                phase, payload_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                session_id,
                turn_index,
                sender,
                user_text,
                ai_text,
                speech_text,
                phase,
                json.dumps(payload, default=str) if payload else None,
                utc_iso()
            ))
            return cursor.lastrowid

    @classmethod
    def record_step_verification(
        cls,
        session_id: str,
        step_number: int,
        title: str,
        instruction: str,
        verification: VerificationResult
    ) -> int:
        """Stores step verification result and visual evidence description."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO step_records (
                session_id, step_number, title, instruction, status,
                confidence, verification_criteria_json, visual_evidence_description, verified_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                status = excluded.status,
                confidence = excluded.confidence,
                visual_evidence_description = excluded.visual_evidence_description,
                verified_at = excluded.verified_at;
            """, (
                session_id,
                step_number,
                title,
                instruction,
                verification.status,
                verification.confidence,
                json.dumps(verification.detected_features),
                verification.visual_evidence_description,
                utc_iso()
            ))
            return cursor.lastrowid

    @classmethod
    def record_or_update_issue_resolution(
        cls,
        session_id: str,
        make: Optional[str] = None,
        model: Optional[str] = None,
        year: Optional[int] = None,
        reported_issue: Optional[str] = None,
        hypothesis: Optional[str] = None,
        dtc_codes: Optional[List[str]] = None,
        parts_replaced: Optional[List[str]] = None,
        resolution_status: str = "IN_PROGRESS",
        rating: Optional[int] = None,
        feedback: Optional[str] = None
    ):
        """Records or updates problem resolution metrics for continuous product improvement."""
        if hypothesis and hasattr(hypothesis, "title"):
            hypothesis = hypothesis.title
        elif hypothesis and not isinstance(hypothesis, str):
            hypothesis = str(hypothesis)

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM issue_resolutions WHERE session_id = ?", (session_id,))
            row = cursor.fetchone()

            if row:
                cursor.execute("""
                UPDATE issue_resolutions SET
                    make = COALESCE(?, make),
                    model = COALESCE(?, model),
                    year = COALESCE(?, year),
                    reported_issue = COALESCE(?, reported_issue),
                    root_cause_hypothesis = COALESCE(?, root_cause_hypothesis),
                    dtc_codes_json = COALESCE(?, dtc_codes_json),
                    parts_replaced_json = COALESCE(?, parts_replaced_json),
                    resolution_status = ?,
                    technician_rating = COALESCE(?, technician_rating),
                    technician_feedback = COALESCE(?, technician_feedback),
                    resolved_at = CASE WHEN ? = 'RESOLVED' THEN ? ELSE resolved_at END
                WHERE session_id = ?;
                """, (
                    make, model, year, reported_issue, hypothesis,
                    json.dumps(dtc_codes) if dtc_codes else None,
                    json.dumps(parts_replaced) if parts_replaced else None,
                    resolution_status,
                    rating, feedback,
                    resolution_status, utc_iso(),
                    session_id
                ))
            else:
                cursor.execute("""
                INSERT INTO issue_resolutions (
                    session_id, make, model, year, reported_issue, root_cause_hypothesis,
                    dtc_codes_json, parts_replaced_json, resolution_status, technician_rating,
                    technician_feedback, created_at, resolved_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    session_id,
                    make or "Unknown",
                    model or "Vehicle",
                    year or 2024,
                    reported_issue,
                    hypothesis,
                    json.dumps(dtc_codes) if dtc_codes else None,
                    json.dumps(parts_replaced) if parts_replaced else None,
                    resolution_status,
                    rating,
                    feedback,
                    utc_iso(),
                    utc_iso() if resolution_status == "RESOLVED" else None
                ))

    @classmethod
    def get_session_dossier(cls, session_id: str) -> Optional[Dict[str, Any]]:
        """Returns the full historical dossier for a session: vehicle, images, turns, and issue resolution."""
        with get_db() as conn:
            cursor = conn.cursor()

            # 1. Fetch Session
            cursor.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,))
            sess_row = cursor.fetchone()
            if not sess_row:
                return None
            session_dict = dict(sess_row)

            # 2. Fetch Images (excluding raw base64 from summary to save bandwidth, but including metadata)
            cursor.execute("""
            SELECT id, session_id, step_number, image_type, visual_evidence,
                   detected_make, detected_model, confidence, created_at,
                   LENGTH(COALESCE(image_data, '')) as image_size_bytes
            FROM session_images WHERE session_id = ? ORDER BY id ASC;
            """, (session_id,))
            images = [dict(r) for r in cursor.fetchall()]

            # 3. Fetch Conversation Turns
            cursor.execute("""
            SELECT id, turn_index, sender, user_text, ai_text, speech_text, phase, payload_json, created_at
            FROM conversation_turns WHERE session_id = ? ORDER BY turn_index ASC;
            """, (session_id,))
            turns = []
            for r in cursor.fetchall():
                td = dict(r)
                if td.get("payload_json"):
                    try:
                        td["payload"] = json.loads(td["payload_json"])
                    except Exception:
                        td["payload"] = None
                turns.append(td)

            # 4. Fetch Step Records
            cursor.execute("""
            SELECT id, step_number, title, instruction, status, confidence,
                   verification_criteria_json, visual_evidence_description, verified_at
            FROM step_records WHERE session_id = ? ORDER BY step_number ASC;
            """, (session_id,))
            steps = [dict(r) for r in cursor.fetchall()]

            # 5. Fetch Issue Resolution
            cursor.execute("SELECT * FROM issue_resolutions WHERE session_id = ?", (session_id,))
            res_row = cursor.fetchone()
            resolution = dict(res_row) if res_row else None

            return {
                "session": session_dict,
                "images": images,
                "turns": turns,
                "steps": steps,
                "resolution": resolution
            }

    @classmethod
    def list_recent_sessions(cls, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Lists recent sessions with diagnostic status and vehicle profile."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT s.*, 
                   (SELECT COUNT(*) FROM conversation_turns WHERE session_id = s.session_id) as turn_count,
                   (SELECT COUNT(*) FROM session_images WHERE session_id = s.session_id) as image_count,
                   (SELECT COUNT(*) FROM step_records WHERE session_id = s.session_id AND status = 'VERIFIED') as verified_step_count
            FROM sessions s
            ORDER BY s.updated_at DESC
            LIMIT ? OFFSET ?;
            """, (limit, offset))
            return [dict(r) for r in cursor.fetchall()]

    @classmethod
    def get_analytics_summary(cls) -> Dict[str, Any]:
        """Calculates aggregate metrics for product improvement."""
        with get_db() as conn:
            cursor = conn.cursor()

            # Session counts
            cursor.execute("SELECT COUNT(*) FROM sessions;")
            total_sessions = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM sessions WHERE status = 'COMPLETED';")
            completed_sessions = cursor.fetchone()[0]

            # Image and turn counts
            cursor.execute("SELECT COUNT(*) FROM session_images;")
            total_images = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM conversation_turns;")
            total_turns = cursor.fetchone()[0]

            # Make distribution
            cursor.execute("""
            SELECT make, COUNT(*) as count 
            FROM sessions 
            WHERE make IS NOT NULL AND make != '' AND make != 'Unknown'
            GROUP BY make ORDER BY count DESC LIMIT 8;
            """)
            makes = [{"make": r[0], "count": r[1]} for r in cursor.fetchall()]

            # Step verification rate
            cursor.execute("SELECT COUNT(*) FROM step_records;")
            total_steps = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM step_records WHERE status = 'VERIFIED';")
            verified_steps = cursor.fetchone()[0]
            step_success_rate = (verified_steps / total_steps * 100.0) if total_steps > 0 else 100.0

            # Technician feedback ratings
            cursor.execute("SELECT AVG(technician_rating) FROM issue_resolutions WHERE technician_rating IS NOT NULL;")
            avg_rating = cursor.fetchone()[0]

            return {
                "total_sessions": total_sessions,
                "completed_sessions": completed_sessions,
                "completion_rate_pct": round((completed_sessions / total_sessions * 100.0) if total_sessions > 0 else 0.0, 1),
                "total_images_captured": total_images,
                "total_conversation_turns": total_turns,
                "vehicles_by_make": makes,
                "step_verification_success_rate_pct": round(step_success_rate, 1),
                "average_technician_rating": round(avg_rating, 2) if avg_rating else 5.0
            }
