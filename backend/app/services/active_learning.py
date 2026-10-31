"""Continuous Active Learning & Multimodal Fine-Tuning Dataset Exporter."""
import json
import logging
from typing import Dict, Any, List
from app.db.database import get_db

logger = logging.getLogger(__name__)


class ActiveLearningService:
    """Exports validated field repairs and technician feedback into training datasets."""

    @classmethod
    def compile_fine_tuning_dataset(cls, min_rating: int = 4) -> Dict[str, Any]:
        """Compiles validated sessions with high technician ratings into JSONL training records."""
        with get_db() as conn:
            cursor = conn.cursor()

            # Query resolved sessions with high rating
            cursor.execute("""
            SELECT ir.session_id, ir.make, ir.model, ir.year, ir.reported_issue,
                   ir.root_cause_hypothesis, ir.dtc_codes_json, ir.parts_replaced_json,
                   ir.technician_rating, ir.technician_feedback, s.status, s.phase
            FROM issue_resolutions ir
            JOIN sessions s ON ir.session_id = s.session_id
            WHERE (ir.technician_rating >= ? OR ir.resolution_status = 'RESOLVED')
            ORDER BY ir.created_at DESC;
            """, (min_rating,))

            sessions = [dict(r) for r in cursor.fetchall()]
            dataset_records: List[Dict[str, Any]] = []

            for sess in sessions:
                sid = sess["session_id"]

                # Fetch turns for this session
                cursor.execute("""
                SELECT turn_index, sender, user_text, ai_text, speech_text, phase
                FROM conversation_turns
                WHERE session_id = ?
                ORDER BY turn_index ASC;
                """, (sid,))
                turns = [dict(r) for r in cursor.fetchall()]

                # Fetch images with detections
                cursor.execute("""
                SELECT step_number, image_type, visual_evidence, detected_make, detected_model, confidence
                FROM session_images
                WHERE session_id = ?;
                """, (sid,))
                images = [dict(r) for r in cursor.fetchall()]

                # Fetch step verifications
                cursor.execute("""
                SELECT step_number, title, status, confidence, visual_evidence_description
                FROM step_records
                WHERE session_id = ? AND status = 'VERIFIED';
                """, (sid,))
                verified_steps = [dict(r) for r in cursor.fetchall()]

                # Create multimodal training example
                record = {
                    "id": sid,
                    "vehicle": {
                        "make": sess["make"],
                        "model": sess["model"],
                        "year": sess["year"]
                    },
                    "diagnostic_ground_truth": {
                        "reported_issue": sess["reported_issue"],
                        "root_cause": sess["root_cause_hypothesis"],
                        "dtc_codes": json.loads(sess["dtc_codes_json"]) if sess.get("dtc_codes_json") else [],
                        "parts_replaced": json.loads(sess["parts_replaced_json"]) if sess.get("parts_replaced_json") else []
                    },
                    "technician_validation": {
                        "rating": sess["technician_rating"],
                        "notes": sess["technician_feedback"]
                    },
                    "visual_supervision_frames_count": len(images),
                    "verified_steps_count": len(verified_steps),
                    "conversational_dialogue_turns": [
                        {
                            "role": "user" if t["sender"] == "USER" else "assistant",
                            "content": t["user_text"] if t["sender"] == "USER" else t["ai_text"],
                            "speech_text": t.get("speech_text"),
                            "phase": t["phase"]
                        }
                        for t in turns
                        if t.get("user_text") or t.get("ai_text")
                    ]
                }
                dataset_records.append(record)

            return {
                "dataset_version": "1.0-active-learning",
                "total_examples": len(dataset_records),
                "format": "multimodal_jsonl",
                "records": dataset_records
            }
