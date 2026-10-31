"""Conversation API Router for Voice-driven Interaction Loop."""
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from app.models.schemas import ConversationalInputRequest, DialogueMessage, utc_now
from app.core.state_machine import RepairStateMachine
from app.services.conversational_agent import ConversationalAgentService
from app.db.repository import SessionRepository

router = APIRouter(prefix="/conversation", tags=["Conversation"])


@router.post("/turn", response_model=Dict[str, Any])
async def conversation_turn(req: ConversationalInputRequest):
    """Processes a user speech/text turn and updates conversational memory."""
    session = RepairStateMachine.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Record user message
    user_msg = DialogueMessage(
        sender="USER",
        text=req.user_speech_or_text,
        phase=session.dialogue.phase,
        timestamp=utc_now()
    )
    session.dialogue.messages.append(user_msg)

    # Process turn with Conversational Agent
    ai_text, speech_text, next_phase, payload = await ConversationalAgentService.process_turn(
        session=session,
        user_input=req.user_speech_or_text,
        image_base64=req.image_base64
    )

    # Record AI response
    ai_msg = DialogueMessage(
        sender="AI",
        text=ai_text,
        speech_text=speech_text,
        phase=next_phase,
        timestamp=utc_now()
    )
    session.dialogue.messages.append(ai_msg)
    session.dialogue.phase = next_phase
    session.updated_at = utc_now()

    # Database transactional persistence
    try:
        if req.image_base64:
            SessionRepository.record_image(
                session_id=req.session_id,
                step_number=session.current_step_number,
                image_type="SCAN",
                image_data=req.image_base64,
                visual_evidence=payload.get("detection_meta", {}).get("visual_evidence") if isinstance(payload, dict) else None,
                detected_make=session.dialogue.detected_make,
                detected_model=session.dialogue.model
            )
        SessionRepository.record_turn(
            session_id=req.session_id,
            sender="AI",
            phase=next_phase,
            user_text=req.user_speech_or_text,
            ai_text=ai_text,
            speech_text=speech_text,
            payload=payload if isinstance(payload, dict) else None
        )
        SessionRepository.upsert_session(session)
        SessionRepository.record_or_update_issue_resolution(
            session_id=req.session_id,
            make=session.dialogue.confirmed_make or session.dialogue.detected_make or session.vehicle_profile.make,
            model=session.dialogue.model or session.vehicle_profile.model,
            year=session.dialogue.year or session.vehicle_profile.year,
            reported_issue=session.dialogue.reported_issue,
            hypothesis=session.dialogue.hypothesis
        )
    except Exception:
        pass

    return {
        "text": ai_text,
        "speech_text": speech_text,
        "phase": next_phase,
        "payload": payload,
        "session": session
    }


@router.post("/stream")
async def conversation_stream(req: ConversationalInputRequest):
    """Streams turn responses via Server-Sent Events (SSE).
    Emits speech_text immediately for ultra-low latency TTS playback (<200ms)."""
    session = RepairStateMachine.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    from fastapi.responses import StreamingResponse
    import json

    async def event_generator():
        # 1. Record user turn
        user_msg = DialogueMessage(
            sender="USER",
            text=req.user_speech_or_text,
            phase=session.dialogue.phase,
            timestamp=utc_now()
        )
        session.dialogue.messages.append(user_msg)

        # 2. Process turn with Conversational Agent
        ai_text, speech_text, next_phase, payload = await ConversationalAgentService.process_turn(
            session=session,
            user_input=req.user_speech_or_text,
            image_base64=req.image_base64
        )

        # 3. Immediately emit speech event for instant audio synthesis
        speech_packet = json.dumps({
            "speech_text": speech_text,
            "phase": next_phase
        })
        yield f"event: speech\ndata: {speech_packet}\n\n"

        # 4. Record and update session
        ai_msg = DialogueMessage(
            sender="AI",
            text=ai_text,
            speech_text=speech_text,
            phase=next_phase,
            timestamp=utc_now()
        )
        session.dialogue.messages.append(ai_msg)
        session.dialogue.phase = next_phase
        session.updated_at = utc_now()

        # Database transactional persistence
        try:
            if req.image_base64:
                SessionRepository.record_image(
                    session_id=req.session_id,
                    step_number=session.current_step_number,
                    image_type="SCAN",
                    image_data=req.image_base64,
                    visual_evidence=payload.get("detection_meta", {}).get("visual_evidence") if isinstance(payload, dict) else None,
                    detected_make=session.dialogue.detected_make,
                    detected_model=session.dialogue.model
                )
            SessionRepository.record_turn(
                session_id=req.session_id,
                sender="AI",
                phase=next_phase,
                user_text=req.user_speech_or_text,
                ai_text=ai_text,
                speech_text=speech_text,
                payload=payload if isinstance(payload, dict) else None
            )
            SessionRepository.upsert_session(session)
            SessionRepository.record_or_update_issue_resolution(
                session_id=req.session_id,
                make=session.dialogue.confirmed_make or session.dialogue.detected_make or session.vehicle_profile.make,
                model=session.dialogue.model or session.vehicle_profile.model,
                year=session.dialogue.year or session.vehicle_profile.year,
                reported_issue=session.dialogue.reported_issue,
                hypothesis=session.dialogue.hypothesis
            )
        except Exception:
            pass

        # 5. Emit full state packet with JSON serialization
        full_packet = json.dumps({
            "text": ai_text,
            "speech_text": speech_text,
            "phase": next_phase,
            "payload": payload,
            "session": session.model_dump(mode="json")
        })
        yield f"event: state\ndata: {full_packet}\n\n"
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/{session_id}", response_model=Dict[str, Any])
def get_dialogue_state(session_id: str):
    session = RepairStateMachine.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session_id,
        "dialogue": session.dialogue,
        "current_step": session.current_step_number,
        "completed_steps": session.completed_steps
    }
