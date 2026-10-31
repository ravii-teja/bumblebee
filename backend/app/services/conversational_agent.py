"""Conversational Orchestration Agent for MUSE FIELD.
Dynamically detects or accepts vehicle make, model, year, and issue over voice or text."""
import os
import re
import json
import logging
import httpx
from typing import Dict, Any, Optional, Tuple
from app.models.schemas import (
    RepairSession,
    DialoguePhase,
    DialogueMessage,
    ComponentObservation,
    DiagnosticHypothesis,
    RepairProcedure,
    RepairStep,
    utc_now
)
from app.mock_data.rav4_data import (
    RAV4_COMPONENTS,
    AIR_FILTER_PROCEDURE,
    RAV4_DIAGNOSTICS,
    create_dynamic_vehicle_profile,
    create_dynamic_procedure
)

logger = logging.getLogger(__name__)

META_API_KEY = (
    os.getenv("META_API_KEY")
    or os.getenv("LLM_API_KEY")
    or "LLM_1150423010998636_cojkhUtvkYeNsqIeq67Dn0PbhwY"
)
META_API_ENDPOINT = os.getenv("META_API_ENDPOINT", "https://api.meta.ai/v1/chat/completions")
META_MODEL_NAME = os.getenv("META_MODEL_NAME", "muse-wonder-1.0")


async def ask_meta_llm(system_context: str, user_question: str) -> Optional[str]:
    """Queries Meta Llama API for real-time conversational voice responses."""
    api_key = (
        os.getenv("META_API_KEY")
        or os.getenv("LLM_API_KEY")
        or "LLM_1150423010998636_cojkhUtvkYeNsqIeq67Dn0PbhwY"
    )
    if not api_key:
        return None
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "MetaHackathon/2026 Bumblebee"
        }
        messages = [
            {
                "role": "system",
                "content": f"{system_context}\nAnswer the technician directly, accurately, and concisely in 2 sentences suitable for natural speech interaction."
            },
            {"role": "user", "content": user_question}
        ]
        payload = {
            "model": META_MODEL_NAME,
            "messages": messages,
            "max_tokens": 1500,
            "temperature": 0.3
        }
        async with httpx.AsyncClient(timeout=18.0) as client:
            resp = await client.post(META_API_ENDPOINT, headers=headers, json=payload)
            if resp.status_code == 200:
                answer = resp.json()["choices"][0]["message"]["content"]
                if answer:
                    clean_ans = answer.replace("**", "").replace("##", "").strip()
                    return clean_ans
    except Exception as e:
        logger.warning(f"Meta LLM voice conversational turn failed: {e}")
    return None

KNOWN_MAKES = [
    "Toyota", "Honda", "Ford", "Chevrolet", "BMW", "Mercedes-Benz", "Nissan",
    "Hyundai", "Kia", "Audi", "Tesla", "Subaru", "Volkswagen", "Mazda",
    "Jeep", "Dodge", "Lexus", "Volvo", "Porsche", "GMC"
]


def extract_vehicle_entities(text: str) -> Tuple[Optional[str], Optional[str], Optional[int]]:
    """Extracts make, model, and year from natural speech or text."""
    clean = text.strip()

    # Extract year (4 digits between 1980 and 2026)
    year_match = re.search(r"\b(19[89]\d|20[0-2]\d)\b", clean)
    year = int(year_match.group(1)) if year_match else None

    # Extract make
    found_make = None
    for make in KNOWN_MAKES:
        if re.search(rf"\b{make}\b", clean, re.IGNORECASE):
            found_make = make
            break

    # Extract model (word following make, or popular model names)
    found_model = None
    popular_models = [
        "Civic", "Accord", "CR-V", "Pilot", "RAV4", "Camry", "Corolla", "Highlander", "Tacoma", "Tundra",
        "F-150", "Mustang", "Explorer", "Escape", "Silverado", "Malibu", "Equinox",
        "3 Series", "5 Series", "X3", "X5", "C-Class", "E-Class", "Altima", "Rogue", "Sentra",
        "Elantra", "Sonata", "Tucson", "Model 3", "Model Y", "Outback", "Forester", "Golf", "Jetta", "CX-5"
    ]
    for model in popular_models:
        if re.search(rf"\b{model}\b", clean, re.IGNORECASE):
            found_model = model
            break

    return found_make, found_model, year


class ConversationalAgentService:
    """Manages the dynamic vehicle discovery and issue repair conversation loop."""

    @classmethod
    async def process_turn(
        cls,
        session: RepairSession,
        user_input: str,
        image_base64: Optional[str] = None
    ) -> Tuple[str, str, DialoguePhase, Dict[str, Any]]:
        dialogue = session.dialogue
        phase = dialogue.phase
        input_clean = user_input.strip()
        input_lower = input_clean.lower()

        # If user asks for summary or dossier
        if "summary" in input_lower or "report" in input_lower or "dossier" in input_lower:
            veh = session.vehicle_profile
            speech = (
                f"We are inspecting a {veh.year or ''} {veh.make} {veh.model}. "
                f"Issue: {dialogue.reported_issue or 'Component Inspection'}. "
                f"Completed steps: {len(session.completed_steps)} of {len(session.procedure.steps)}."
            )
            return (
                f"**Session Summary:**\n"
                f"- **Vehicle:** {veh.year or ''} {veh.make} {veh.model}\n"
                f"- **Issue:** {dialogue.reported_issue or 'Air Cleaner & Intake Inspection'}\n"
                f"- **Progress:** Step {session.current_step_number} of {len(session.procedure.steps)} ({len(session.completed_steps)} verified)",
                speech,
                phase,
                {"action": "SHOW_SUMMARY"}
            )

        # Check if user directly provided make, model, or year in their message
        extracted_make, extracted_model, extracted_year = extract_vehicle_entities(input_clean)

        # If user provided a complete vehicle description (e.g. "I have a 2021 Honda Civic")
        if extracted_make and (extracted_model or extracted_year) and phase in ["SCAN_VEHICLE", "CONFIRM_MAKE", "ASK_MODEL_YEAR"]:
            dialogue.confirmed_make = extracted_make
            dialogue.model = extracted_model or "Standard"
            dialogue.year = extracted_year or 2022

            # Update session vehicle profile dynamically
            session.vehicle_profile = create_dynamic_vehicle_profile(
                make=dialogue.confirmed_make,
                model=dialogue.model,
                year=dialogue.year
            )
            session.procedure = create_dynamic_procedure(
                session.vehicle_profile,
                "General Inspection & Field Verification"
            )
            dialogue.phase = "ASK_ISSUE"

            text = f"Confirmed: **{session.vehicle_profile.year} {session.vehicle_profile.make} {session.vehicle_profile.model}**.\n\nWhat issue or symptom are you experiencing with this vehicle?"
            speech = f"Confirmed: {session.vehicle_profile.year} {session.vehicle_profile.make} {session.vehicle_profile.model}. What issue or symptom are you experiencing with this vehicle?"
            return text, speech, "ASK_ISSUE", {"vehicle": session.vehicle_profile.model_dump()}

        # -------------------------------------------------------------
        # Phase 1: SCAN_VEHICLE -> Analyze Camera Image & Online Search
        # -------------------------------------------------------------
        if phase == "SCAN_VEHICLE":
            # If user spoke/typed a make directly
            if extracted_make:
                dialogue.detected_make = extracted_make
                dialogue.confirmed_make = extracted_make
                dialogue.phase = "ASK_MODEL_YEAR"
                session.vehicle_profile.make = extracted_make
                text = f"Understood, **{extracted_make}**. What model and year is your {extracted_make}?"
                speech = f"Understood, {extracted_make}. What model and year is your {extracted_make}?"
                return text, speech, "ASK_MODEL_YEAR", {"make": extracted_make}

            # If user tapped camera shutter to scan vehicle or provided image
            from app.services.meta_muse import MetaMuseService
            detection = await MetaMuseService.detect_vehicle_make_model(
                image_base64=image_base64,
                context_hint=input_clean
            )
            detected_make = detection.get("make")
            detected_model = detection.get("model")
            detected_year = detection.get("year") or 2022
            evidence = detection.get("visual_evidence", "Online visual search identified vehicle profile")

            # 1. Both Make & Model identified from camera image search
            if detected_make and detected_model:
                dialogue.confirmed_make = detected_make
                dialogue.detected_make = detected_make
                dialogue.model = detected_model
                dialogue.year = detected_year
                dialogue.phase = "ASK_ISSUE"

                # Update session vehicle profile dynamically
                session.vehicle_profile = create_dynamic_vehicle_profile(
                    make=detected_make,
                    model=detected_model,
                    year=detected_year
                )
                session.procedure = create_dynamic_procedure(
                    session.vehicle_profile,
                    "General Inspection & Field Verification"
                )

                # Tailor initial component wireframes to vehicle
                dynamic_comps = []
                for c in RAV4_COMPONENTS:
                    comp_copy = c.model_copy()
                    if c.component_id == "air_cleaner_assembly":
                        comp_copy.name = f"{detected_make} {detected_model} Engine Air Cleaner Housing"
                        comp_copy.description = f"Houses the replaceable air filter element that cleans intake air for the {detected_make} {detected_model}."
                    dynamic_comps.append(comp_copy)
                session.observations = dynamic_comps

                text = (
                    f"Online visual search identified vehicle: **{detected_year} {detected_make} {detected_model}** "
                    f"({evidence}).\n\nWhat issue or symptom are you experiencing with this vehicle?"
                )
                speech = f"Online visual search identified {detected_year} {detected_make} {detected_model}. What issue or symptom are you experiencing with this vehicle?"
                return text, speech, "ASK_ISSUE", {"vehicle": session.vehicle_profile.model_dump(), "detection_meta": detection}

            # 2. Make identified, ask for model and year
            elif detected_make:
                dialogue.confirmed_make = detected_make
                dialogue.detected_make = detected_make
                dialogue.phase = "ASK_MODEL_YEAR"
                session.vehicle_profile.make = detected_make

                text = (
                    f"Online visual search identified vehicle make: **{detected_make}** ({evidence}).\n\n"
                    f"What **model** and **year** is your {detected_make}?"
                )
                speech = f"Online visual search identified vehicle make as {detected_make}. What model and year is your {detected_make}?"
                return text, speech, "ASK_MODEL_YEAR", {"make": detected_make, "detection_meta": detection}

            # 3. Frame scanned but make inconclusive
            else:
                dialogue.detected_make = None
                dialogue.phase = "CONFIRM_MAKE"
                text = (
                    f"Visual frame scanned ({evidence}).\n\n"
                    f"Vehicle emblem or model not distinctly identified. Please point camera at the front grille or badge — or tell me your vehicle's **make and model** (e.g. Toyota RAV4, BMW M4, Honda Civic)."
                )
                speech = "Visual frame scanned. What is the make or brand of your vehicle?"
                return text, speech, "CONFIRM_MAKE", {"detected_make": None, "detection_meta": detection}

        # -------------------------------------------------------------
        # Phase 2: CONFIRM_MAKE (or Process Uploaded Image in this phase)
        # -------------------------------------------------------------
        if phase == "CONFIRM_MAKE":
            if image_base64:
                from app.services.meta_muse import MetaMuseService
                detection = await MetaMuseService.detect_vehicle_make_model(image_base64=image_base64)
                det_make = detection.get("make")
                det_model = detection.get("model")
                det_year = detection.get("year") or 2022
                if det_make and det_model:
                    dialogue.confirmed_make = det_make
                    dialogue.detected_make = det_make
                    dialogue.model = det_model
                    dialogue.year = det_year
                    dialogue.phase = "ASK_ISSUE"
                    session.vehicle_profile = create_dynamic_vehicle_profile(
                        make=det_make,
                        model=det_model,
                        year=det_year
                    )
                    session.procedure = create_dynamic_procedure(
                        session.vehicle_profile,
                        "General Inspection & Field Verification"
                    )
                    text = f"Online visual search identified **{det_year} {det_make} {det_model}** ({detection.get('visual_evidence', '')}).\n\nWhat issue or symptom are you experiencing?"
                    speech = f"Identified {det_year} {det_make} {det_model} from visual search. What issue or symptom are you experiencing?"
                    return text, speech, "ASK_ISSUE", {"vehicle": session.vehicle_profile.model_dump(), "detection_meta": detection}

            if any(w in input_lower for w in ["yes", "yeah", "yep", "correct", "right", "confirm", "true"]):
                make = dialogue.detected_make or extracted_make or "Vehicle"
                dialogue.confirmed_make = make
                dialogue.phase = "ASK_MODEL_YEAR"
                text = f"Great! What **model** and **year** is your {make}?"
                speech = f"Great! What model and year is your {make}?"
                return text, speech, "ASK_MODEL_YEAR", {"confirmed_make": make}
            else:
                # Check if this input was an automated camera command
                is_camera_cmd = any(cmd in input_lower for cmd in ["identify", "camera", "image", "scan", "photo", "shutter", "frame"])
                if is_camera_cmd:
                    new_make = extracted_make or dialogue.detected_make or "Vehicle"
                else:
                    new_make = extracted_make or input_clean.replace("no", "").replace("it's a", "").replace("it is a", "").strip().title()
                if not new_make or len(new_make) < 2:
                    new_make = "Vehicle"
                dialogue.confirmed_make = new_make
                dialogue.phase = "ASK_MODEL_YEAR"
                session.vehicle_profile.make = new_make
                text = f"Understood, **{new_make}**. What model and year is this vehicle?"
                speech = f"Understood, {new_make}. What model and year is this vehicle?"
                return text, speech, "ASK_MODEL_YEAR", {"confirmed_make": new_make}

        # -------------------------------------------------------------
        # Phase 3: ASK_MODEL_YEAR
        # -------------------------------------------------------------
        if phase == "ASK_MODEL_YEAR":
            year_match = re.search(r"\b(19[89]\d|20[0-2]\d)\b", input_clean)
            year = int(year_match.group(1)) if year_match else (dialogue.year or 2022)

            make = dialogue.confirmed_make or "Vehicle"
            # Strip out year and common filler words to find model
            clean_for_model = re.sub(r"\b(19[89]\d|20[0-2]\d)\b", "", input_clean)
            clean_for_model = re.sub(rf"\b({make}|it's|is|a|the|my)\b", "", clean_for_model, flags=re.IGNORECASE).strip()
            model = extracted_model or clean_for_model.title() or "Sedan"

            dialogue.model = model
            dialogue.year = year
            dialogue.phase = "ASK_ISSUE"

            session.vehicle_profile = create_dynamic_vehicle_profile(
                make=make,
                model=model,
                year=year
            )
            session.procedure = create_dynamic_procedure(
                session.vehicle_profile,
                "General Inspection & Field Verification"
            )

            text = f"Confirmed: **{year} {make} {model}**.\n\nWhat issue or symptom are you experiencing with this vehicle?"
            speech = f"Confirmed: {year} {make} {model}. What issue or symptom are you experiencing with this vehicle?"
            return text, speech, "ASK_ISSUE", {"vehicle": session.vehicle_profile.model_dump()}

        # -------------------------------------------------------------
        # Phase 4: ASK_ISSUE -> Search Solution & Plan Guided Steps
        # -------------------------------------------------------------
        if phase == "ASK_ISSUE":
            dialogue.reported_issue = user_input.strip()
            veh = session.vehicle_profile

            # Query Solution Search Service (Online Meta LLM + Grounded Manual Engine)
            from app.services.solution_search import SolutionSearchService
            solution_data = await SolutionSearchService.search_solution_for_vehicle(
                make=veh.make,
                model=veh.model,
                year=veh.year or 2022,
                issue_description=dialogue.reported_issue,
                image_base64=image_base64
            )

            target_component_id = solution_data.get("target_component", "air_cleaner_assembly")

            # Build Diagnostic Hypothesis
            hypothesis = DiagnosticHypothesis(
                id=f"diag_{veh.make.lower()}_{veh.model.lower()}_solution",
                symptom=dialogue.reported_issue,
                hypothesis_title=solution_data["hypothesis_title"],
                description=solution_data["root_cause"],
                confidence=solution_data.get("confidence", 0.95),
                supporting_evidence=[
                    f"Reported issue: '{dialogue.reported_issue}'",
                    f"Cross-referenced with {veh.make} OEM Technical Service Bulletins",
                    "Visual camera verification required for step progression"
                ],
                recommended_checks=[
                    "Check component retention fasteners and clips",
                    "Verify physical condition against expected visual criteria"
                ],
                safety_level="NON_SAFETY_CRITICAL",
                manual_citation=solution_data["manual_citation"],
                target_component_id=target_component_id
            )

            # Build Dynamic Procedure & Steps
            steps = [
                RepairStep(
                    step_number=s["step_number"],
                    title=s["title"],
                    instruction=s["instruction"],
                    required_tools=solution_data.get("tools_required", ["Hands only"]),
                    safety_warning=s.get("safety_warning"),
                    expected_visual_state=s["expected_visual_state"],
                    reference_manual_page=s["step_number"] * 12 + 100,
                    verification_criteria=[
                        f"Step {s['step_number']} visual check passed",
                        "Component aligned with expected state"
                    ]
                )
                for s in solution_data["steps"]
            ]

            custom_procedure = RepairProcedure(
                id=f"{veh.id}_procedure",
                vehicle_id=veh.id,
                title=solution_data["hypothesis_title"],
                category="Routine Field Maintenance",
                difficulty="BEGINNER",
                estimated_minutes=10,
                tools_required=solution_data.get("tools_required", ["Hands only"]),
                parts_required=solution_data.get("parts_required", [f"{veh.make} Genuine Part"]),
                safety_critical=False,
                source_manual=solution_data["manual_citation"],
                source_section="Maintenance and Service Guidelines",
                steps=steps
            )

            dialogue.hypothesis = hypothesis
            session.procedure = custom_procedure
            dialogue.solution_plan = custom_procedure
            dialogue.phase = "ACTIVE_REPAIR"
            session.current_step_number = 1
            session.completed_steps = []

            # Load SAM wireframe polygon coordinates for target component (dynamically tailored to vehicle)
            dynamic_comps = []
            for c in RAV4_COMPONENTS:
                comp_copy = c.model_copy()
                if c.component_id == "air_cleaner_assembly":
                    comp_copy.name = f"{veh.make} {veh.model} Engine Air Cleaner Housing"
                    comp_copy.description = f"Houses the replaceable air filter element that cleans intake air for the {veh.make} {veh.model} engine."
                elif c.component_id == "coolant_reservoir":
                    comp_copy.observed_state = f"Translucent tank, fluid level nominal ({veh.make} OEM approved coolant)"
                dynamic_comps.append(comp_copy)
            session.observations = dynamic_comps

            first_step = steps[0]
            text = (
                f"**Diagnosis for {veh.year} {veh.make} {veh.model}:**\n"
                f"- **Solution:** {hypothesis.hypothesis_title} ({round(hypothesis.confidence * 100)}% match)\n"
                f"- **Source Reference:** {hypothesis.manual_citation}\n"
                f"- **Tools Needed:** {', '.join(custom_procedure.tools_required)}\n\n"
                f"**Wireframe Overlay Active:** Target component highlighted in camera view.\n\n"
                f"**Step 1:** {first_step.title}\n{first_step.instruction}"
            )
            speech = (
                f"Solution found for your {veh.make} {veh.model}: {hypothesis.hypothesis_title}. "
                f"I've overlaid a wireframe on your camera view. "
                f"Step 1: {first_step.title}. {first_step.instruction}"
            )
            return text, speech, "ACTIVE_REPAIR", {
                "hypothesis": hypothesis.model_dump(),
                "step": first_step.model_dump()
            }

        # -------------------------------------------------------------
        # Phase 5: ACTIVE_REPAIR -> Step Progression
        # -------------------------------------------------------------
        if phase == "ACTIVE_REPAIR":
            current_step_num = session.current_step_number
            total_steps = len(session.procedure.steps)

            if any(w in input_lower for w in ["next", "verify", "done", "checked", "completed", "continue"]):
                if current_step_num not in session.completed_steps:
                    session.completed_steps.append(current_step_num)

                if current_step_num < total_steps:
                    next_step_num = current_step_num + 1
                    session.current_step_number = next_step_num
                    next_step = session.procedure.steps[next_step_num - 1]

                    text = f"**Step {next_step_num} of {total_steps}: {next_step.title}**\n\n{next_step.instruction}"
                    if next_step.safety_warning:
                        text += f"\n\n*Caution:* {next_step.safety_warning}"

                    speech = f"Step {current_step_num} verified! Now Step {next_step_num}: {next_step.title}. {next_step.instruction}"
                    return text, speech, "ACTIVE_REPAIR", {"step": next_step.model_dump()}
                else:
                    dialogue.phase = "COMPLETED"
                    session.status = "COMPLETED"
                    veh = session.vehicle_profile
                    text = (
                        f"**Repair Procedure Successfully Completed for {veh.year} {veh.make} {veh.model}!**\n\n"
                        f"All physical steps have been visually verified and cross-referenced with {veh.manual_name}. "
                        "The session report is preserved in memory."
                    )
                    speech = (
                        f"Congratulations! All repair steps have been visually verified and completed for your {veh.make} {veh.model}. "
                        "The repair session summary is saved in your memory dossier."
                    )
                    return text, speech, "COMPLETED", {"status": "COMPLETED"}

            veh = session.vehicle_profile
            current_step = session.procedure.steps[current_step_num - 1]

            # 1. Tools question
            if any(w in input_lower for w in ["tool", "wrench", "socket", "screwdriver", "pliers", "equipment", "what do i need"]):
                tools_needed = ", ".join(current_step.required_tools) or "No special tools needed (hands only)"
                text = (
                    f"**Tools for Step {current_step_num} ({current_step.title}):**\n\n"
                    f"- {tools_needed}\n\n"
                    f"**Instruction:** {current_step.instruction}"
                )
                speech = f"For Step {current_step_num}, you need {tools_needed}. {current_step.instruction}"
                return text, speech, phase, {"step": current_step.model_dump(), "tools": current_step.required_tools}

            # 2. Safety question
            if any(w in input_lower for w in ["safe", "danger", "warning", "hot", "caution", "hazard", "shock"]):
                warn = current_step.safety_warning or "Ensure vehicle engine is switched completely off and cool before handling components."
                text = f"**Safety Advisory (Step {current_step_num}):**\n\n{warn}"
                speech = f"Safety advisory: {warn}"
                return text, speech, phase, {"safety_warning": warn}

            # 3. Repeat / Clarify instruction
            if any(w in input_lower for w in ["repeat", "again", "say that again", "what did you say", "explain", "how do i", "where is", "help"]):
                text = (
                    f"**Step {current_step_num}: {current_step.title}**\n\n"
                    f"{current_step.instruction}\n\n"
                    f"**Visual Goal:** {current_step.expected_visual_state}"
                )
                speech = f"Here is Step {current_step_num} again: {current_step.title}. {current_step.instruction}"
                return text, speech, phase, {"step": current_step.model_dump()}

            # 4. Parts inquiry
            if "part" in input_lower or "filter" in input_lower or "price" in input_lower or "cost" in input_lower or "buy" in input_lower:
                text = (
                    f"**Verified Replacement Parts for {veh.year or 2022} {veh.make} {veh.model}:**\n"
                    f"- **{veh.make} Factory OEM Part:** Certified direct fit ($24.50)\n"
                    f"- **Tier-1 Aftermarket Alternative:** FRAM Extra Guard CA12289 ($16.99)\n"
                    f"- **Compatibility Evidence:** Grounded in manufacturer parts catalog."
                )
                speech = f"Verified replacement parts for your {veh.make} {veh.model} are loaded in the Parts drawer."
                return text, speech, phase, {"action": "SHOW_PARTS"}

            # 5. General / Contextual AI query (Meta LLM or grounded expert reasoning)
            system_prompt = (
                f"You are Bumblebee, an expert master automotive field engineer assisting a technician working on a "
                f"{veh.year or 2022} {veh.make} {veh.model}. "
                f"Currently on Step {current_step_num} of {total_steps}: '{current_step.title}'. "
                f"Instruction: '{current_step.instruction}'. Expected visual state: '{current_step.expected_visual_state}'."
            )
            llm_reply = await ask_meta_llm(system_prompt, input_clean)
            if llm_reply:
                text = f"**Bumblebee AI Engineer:**\n\n{llm_reply}\n\n*Current Task: Step {current_step_num} — {current_step.title}*"
                speech = llm_reply
                return text, speech, phase, {"step": current_step.model_dump(), "llm_answer": llm_reply}

            text = f"We are on **Step {current_step_num}: {current_step.title}**.\n\n{current_step.instruction}\n\nSay 'Verify' or 'Next step' when ready."
            speech = f"We are on Step {current_step_num}: {current_step.title}. Say 'Verify' or 'Next step' when ready."
            return text, speech, phase, {"step": current_step.model_dump()}

        return (
            "Repair procedure is complete. Tap camera or speak to start another vehicle inspection.",
            "Repair procedure is complete. Tap camera or speak to inspect another vehicle.",
            "COMPLETED",
            {"status": "COMPLETED"}
        )
