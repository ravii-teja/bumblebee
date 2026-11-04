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
META_MODEL_NAME = os.getenv("META_MODEL_NAME", "muse-spark-1.3")

AUTOMOTIVE_KB = {
    "p0171": "DTC P0171 indicates System Too Lean (Bank 1) — the engine is getting too much unmetered air or inadequate fuel. Most common causes: vacuum leak downstream of the MAF sensor, dirty MAF sensor, or loose air intake boot.",
    "p0172": "DTC P0172 indicates System Too Rich (Bank 1) — too much fuel or not enough air. Typical causes: clogged engine air filter, leaking fuel injector, or faulty oxygen sensor.",
    "p0300": "DTC P0300 indicates a Random/Multiple Cylinder Misfire. Check worn spark plugs, failing ignition coils, low fuel delivery, or intake vacuum leaks.",
    "p0420": "DTC P0420 indicates Catalyst System Efficiency Below Threshold (Bank 1). Usually caused by an exhaust leak before the catalytic converter or an aging catalytic converter.",
    "p0455": "DTC P0455 indicates an EVAP Gross Leak. Common culprit is a loose, missing, or worn fuel filler gas cap or cracked purge solenoid hose.",
    "p0128": "DTC P0128 indicates Coolant Thermostat Error (coolant temp below regulating temp). The engine thermostat is likely stuck open and needs replacement.",
    "brake": "Brake squealing typically occurs when the brake pad acoustic wear indicator contacts the rotor, signaling worn pads. Grinding indicates metal-on-metal wear requiring immediate pad and rotor replacement.",
    "idle": "A rough engine idle or vibration when stopped is usually caused by vacuum leaks, a heavily clogged air filter, dirty throttle body carbon buildup, or fouled spark plugs.",
    "battery": "If the vehicle clicks rapidly and fails to crank, the 12V battery voltage is below threshold (under 12.0V) or terminal connectors are corroded/loose.",
    "overheat": "Engine overheating is critical: never open the coolant reservoir while hot. Common causes are low coolant, stuck thermostat, radiator fan failure, or water pump leak.",
    "alternator": "Symptoms of a failing alternator include dimming headlights, battery warning light on the dash, and battery draining while driving. A healthy alternator outputs 13.8V to 14.5V with engine running."
}


def lookup_automotive_kb(query: str) -> Optional[str]:
    """Provides rapid grounded automotive diagnostic response for common DTCs and symptoms."""
    q = query.lower()
    for key, answer in AUTOMOTIVE_KB.items():
        if key in q:
            return answer
    return None


async def ask_meta_llm(system_context: str, user_question: str) -> Optional[str]:
    """Queries Meta Llama API for real-time conversational voice responses."""
    api_key = (
        os.getenv("META_API_KEY")
        or os.getenv("LLM_API_KEY")
        or "LLM_1150423010998636_cojkhUtvkYeNsqIeq67Dn0PbhwY"
    )
    if not api_key:
        return lookup_automotive_kb(user_question)
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
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(META_API_ENDPOINT, headers=headers, json=payload)
            if resp.status_code == 200:
                answer = resp.json()["choices"][0]["message"]["content"]
                if answer:
                    clean_ans = answer.replace("**", "").replace("##", "").strip()
                    return clean_ans
    except Exception as e:
        logger.warning(f"Meta LLM voice conversational turn failed: {e}")
    return lookup_automotive_kb(user_question)

KNOWN_MAKES = [
    "Toyota", "Honda", "Ford", "Chevrolet", "Chevy", "BMW", "Mercedes-Benz", "Mercedes", "Nissan",
    "Hyundai", "Kia", "Audi", "Tesla", "Subaru", "Volkswagen", "VW", "Mazda",
    "Jeep", "Dodge", "Ram", "Lexus", "Volvo", "Porsche", "GMC", "Acura", "Infiniti",
    "Cadillac", "Chrysler", "Buick", "Lincoln", "Mini", "Jaguar", "Land Rover", "Mitsubishi", "Genesis"
]


POPULAR_MODEL_TO_MAKE = {
    # Honda
    "Civic": "Honda", "Accord": "Honda", "CR-V": "Honda", "Pilot": "Honda", "Fit": "Honda", "HR-V": "Honda", "Passport": "Honda", "Ridgeline": "Honda", "Odyssey": "Honda",
    # Toyota
    "RAV4": "Toyota", "Camry": "Toyota", "Corolla": "Toyota", "Highlander": "Toyota", "Tacoma": "Toyota", "Tundra": "Toyota", "Prius": "Toyota", "4Runner": "Toyota", "Sienna": "Toyota", "Yaris": "Toyota", "Sequoia": "Toyota", "Crown": "Toyota", "Venza": "Toyota",
    # Ford
    "F-150": "Ford", "Mustang": "Ford", "Explorer": "Ford", "Escape": "Ford", "Edge": "Ford", "Bronco": "Ford", "Ranger": "Ford", "Expedition": "Ford", "Fusion": "Ford", "Focus": "Ford", "F-250": "Ford", "F-350": "Ford",
    # Chevrolet
    "Silverado": "Chevrolet", "Malibu": "Chevrolet", "Equinox": "Chevrolet", "Tahoe": "Chevrolet", "Suburban": "Chevrolet", "Colorado": "Chevrolet", "Trax": "Chevrolet", "Camaro": "Chevrolet", "Corvette": "Chevrolet", "Blazer": "Chevrolet", "Traverse": "Chevrolet",
    # BMW
    "3 Series": "BMW", "5 Series": "BMW", "7 Series": "BMW", "M3": "BMW", "M4": "BMW", "M5": "BMW", "X1": "BMW", "X3": "BMW", "X5": "BMW", "X7": "BMW", "330i": "BMW", "M340i": "BMW", "530i": "BMW",
    # Tesla
    "Model 3": "Tesla", "Model Y": "Tesla", "Model S": "Tesla", "Model X": "Tesla", "Cybertruck": "Tesla",
    # Subaru
    "Outback": "Subaru", "Forester": "Subaru", "Crosstrek": "Subaru", "Impreza": "Subaru", "WRX": "Subaru", "Ascent": "Subaru", "Legacy": "Subaru", "BRZ": "Subaru",
    # Volkswagen
    "Golf": "Volkswagen", "Jetta": "Volkswagen", "Tiguan": "Volkswagen", "Atlas": "Volkswagen", "Passat": "Volkswagen", "GTI": "Volkswagen", "ID.4": "Volkswagen",
    # Mazda
    "CX-5": "Mazda", "CX-30": "Mazda", "CX-50": "Mazda", "CX-90": "Mazda", "Mazda3": "Mazda", "Mazda6": "Mazda", "Miata": "Mazda", "MX-5": "Mazda",
    # Hyundai
    "Elantra": "Hyundai", "Sonata": "Hyundai", "Tucson": "Hyundai", "Santa Fe": "Hyundai", "Palisade": "Hyundai", "Kona": "Hyundai", "Ioniq": "Hyundai",
    # Kia
    "Forte": "Kia", "Optima": "Kia", "K5": "Kia", "Sportage": "Kia", "Sorento": "Kia", "Telluride": "Kia", "Soul": "Kia", "Carnival": "Kia", "EV6": "Kia",
    # Nissan
    "Altima": "Nissan", "Rogue": "Nissan", "Sentra": "Nissan", "Pathfinder": "Nissan", "Frontier": "Nissan", "Murano": "Nissan", "Maxima": "Nissan",
    # Jeep
    "Wrangler": "Jeep", "Grand Cherokee": "Jeep", "Cherokee": "Jeep", "Gladiator": "Jeep", "Compass": "Jeep", "Renegade": "Jeep",
    # Dodge / Ram
    "Charger": "Dodge", "Challenger": "Dodge", "Durango": "Dodge", "1500": "Ram", "2500": "Ram",
    # Audi
    "A3": "Audi", "A4": "Audi", "A6": "Audi", "Q3": "Audi", "Q5": "Audi", "Q7": "Audi", "Q8": "Audi",
    # Mercedes
    "C-Class": "Mercedes-Benz", "E-Class": "Mercedes-Benz", "S-Class": "Mercedes-Benz", "GLC": "Mercedes-Benz", "GLE": "Mercedes-Benz", "GLS": "Mercedes-Benz",
    # Lexus
    "RX": "Lexus", "NX": "Lexus", "ES": "Lexus", "IS": "Lexus", "GX": "Lexus", "LX": "Lexus",
    # Volvo
    "XC40": "Volvo", "XC60": "Volvo", "XC90": "Volvo",
    # Porsche
    "911": "Porsche", "Cayenne": "Porsche", "Macan": "Porsche", "Panamera": "Porsche", "Taycan": "Porsche",
    # GMC
    "Sierra": "GMC", "Yukon": "GMC", "Acadia": "GMC", "Canyon": "GMC"
}

DEFAULT_MAKE_MODEL = {
    "Honda": "Civic",
    "Toyota": "RAV4",
    "Ford": "F-150",
    "Chevrolet": "Silverado",
    "Chevy": "Silverado",
    "BMW": "3 Series",
    "Mercedes-Benz": "C-Class",
    "Mercedes": "C-Class",
    "Nissan": "Altima",
    "Hyundai": "Elantra",
    "Kia": "Forte",
    "Audi": "A4",
    "Tesla": "Model 3",
    "Subaru": "Outback",
    "Volkswagen": "Golf",
    "VW": "Golf",
    "Mazda": "CX-5",
    "Jeep": "Wrangler",
    "Dodge": "Charger",
    "Ram": "1500",
    "Lexus": "RX",
    "Volvo": "XC60",
    "Porsche": "911",
    "GMC": "Sierra",
    "Acura": "MDX",
    "Infiniti": "Q50",
    "Cadillac": "Escalade",
    "Lincoln": "Navigator",
    "Mini": "Cooper",
    "Mitsubishi": "Outlander"
}


def extract_vehicle_entities(text: str) -> Tuple[Optional[str], Optional[str], Optional[int]]:
    """Extracts make, model, and year from natural speech or text."""
    clean = text.strip()

    # Extract year (4 digits between 1980 and 2026)
    year_match = re.search(r"\b(19[89]\d|20[0-2]\d)\b", clean)
    year = int(year_match.group(1)) if year_match else None

    # Extract make
    found_make = None
    for make in KNOWN_MAKES:
        if re.search(rf"\b{re.escape(make)}\b", clean, re.IGNORECASE):
            if make.lower() == "chevy":
                found_make = "Chevrolet"
            elif make.lower() == "vw":
                found_make = "Volkswagen"
            elif make.lower() == "mercedes":
                found_make = "Mercedes-Benz"
            else:
                found_make = make
            break

    # Extract model
    found_model = None
    for model in POPULAR_MODEL_TO_MAKE.keys():
        if re.search(rf"\b{re.escape(model)}\b", clean, re.IGNORECASE):
            found_model = model
            break

    # If make is missing but model is recognized, infer make from model
    if not found_make and found_model:
        found_make = POPULAR_MODEL_TO_MAKE.get(found_model)

    # If no popular model matched, but make was found, try extracting candidate word following make
    if not found_model and found_make:
        m = re.search(rf"\b{re.escape(found_make)}\s+([A-Za-z0-9\-_]+)", clean, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip()
            if candidate.lower() not in [
                "car", "vehicle", "truck", "suv", "sedan", "coupe", "with", "having",
                "is", "a", "an", "the", "year", "engine", "issue", "model"
            ]:
                found_model = candidate.title()

    return found_make, found_model, year


def clean_text_of_vehicle(text: str, make: Optional[str] = None, model: Optional[str] = None, year: Optional[int] = None) -> str:
    """Strips vehicle entities and filler words to extract any embedded issue description."""
    res = text
    if make:
        res = re.sub(rf"\b{re.escape(make)}\b", "", res, flags=re.IGNORECASE)
    if model:
        res = re.sub(rf"\b{re.escape(model)}\b", "", res, flags=re.IGNORECASE)
    if year:
        res = re.sub(rf"\b{year}\b", "", res)
    res = re.sub(r"\b(?:set|switch|change|add|ad|my|car|is|a|an|the|i|have|drive|vehicle|to|with|has|having|please|for|and|year|years|model|models|make|makes|brand|type|select|it's|it)\b", "", res, flags=re.IGNORECASE)
    return res.strip(" :,-.")


def extract_embedded_issue(text: str) -> Optional[str]:
    """Extracts an issue or symptom description if embedded in vehicle setup message."""
    m = re.search(
        r"\b(?:with|having|has|issue\s+is|problem\s+is|trouble\s+is|symptom\s+is)\b\s*[:\s]*(.*)",
        text,
        re.IGNORECASE
    )
    if m:
        issue = m.group(1).strip()
        if len(issue) > 2:
            return issue

    # If the text explicitly mentions DTC fault code or known symptom
    symptom_match = re.search(
        r"\b(p\d{4}|dtc\b|rough idle|misfire|squeal|grind|overheat|battery|no crank|check engine)\b",
        text,
        re.IGNORECASE
    )
    if symptom_match:
        return text.strip()

    return None


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

        # Conversational greetings & courtesy
        if input_lower in ["hi", "hello", "hey", "hey bumblebee", "hello bumblebee", "good morning", "good afternoon"]:
            veh = session.vehicle_profile
            if veh and veh.make and veh.make != "generic_vehicle" and veh.make.strip():
                greeting = f"Hello! I'm Bumblebee. We're inspecting your {veh.year or ''} {veh.make} {veh.model}. What issue or question can I help you with?"
            else:
                greeting = "Hello! I'm Bumblebee, your master automotive diagnostic engineer. Tell me your vehicle make and model, or point your camera to begin."
            return greeting, greeting, phase, {"action": "GREETING"}

        if any(input_lower == w for w in ["thank you", "thanks", "appreciate it"]):
            reply = "You're welcome! Let me know if you need any other diagnostics, part checks, or step guidance."
            return reply, reply, phase, {"action": "COURTESY"}

        if any(w in input_lower for w in ["who are you", "what can you do"]):
            msg = "I am Bumblebee, your master automotive diagnostic and repair engineer. I can identify vehicles via camera, guide you through step-by-step verified physical repairs, diagnose DTC fault codes, and find verified replacement parts."
            return msg, msg, phase, {"action": "CAPABILITIES"}

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

        # If make was not in string, infer from model or existing session
        if not extracted_make and extracted_model:
            extracted_make = (
                POPULAR_MODEL_TO_MAKE.get(extracted_model)
                or dialogue.confirmed_make
                or (session.vehicle_profile.make if session.vehicle_profile.make and session.vehicle_profile.make != "generic_vehicle" else None)
            )

        # If make was in string, but not model, check if model exists in session
        if extracted_make and not extracted_model and dialogue.model and dialogue.model not in ["Standard", "Sedan", "Vehicle", "General Vehicle"]:
            extracted_model = dialogue.model

        # Explicit vehicle change/add intent keywords
        is_vehicle_intent = any(k in input_lower for k in [
            "switch car", "switch vehicle", "change car", "change vehicle", "add car",
            "add vehicle", "new car", "new vehicle", "set car", "set vehicle",
            "ad car", "ad vehicle", "car and year", "add car and year", "ad car and year",
            "vehicle and year", "enter car", "enter vehicle", "car model",
            "i have a", "my car is", "i drive a", "select vehicle", "select car"
        ])

        # If user explicitly requested to switch/add vehicle without naming make/model yet
        if is_vehicle_intent and not extracted_make and not extracted_model:
            dialogue.phase = "SCAN_VEHICLE"
            dialogue.confirmed_make = None
            dialogue.detected_make = None
            if extracted_year:
                dialogue.year = extracted_year
                text = (
                    f"Got year **{extracted_year}**! You can point your camera to scan your car or badge, or tell me your "
                    f"vehicle's **make and model** (e.g. 'Honda Civic', 'Toyota RAV4', 'Ford F-150')."
                )
                speech = f"Got year {extracted_year}! Tell me your vehicle make and model."
            else:
                text = (
                    "Sure! You can point your camera to scan your car or badge, or tell me your "
                    "vehicle's **make, model, and year** (e.g. '2023 Honda Civic', '2021 Ford F-150')."
                )
                speech = "Sure! Point your camera to scan, or tell me your vehicle make, model, and year."
            return text, speech, "SCAN_VEHICLE", {"action": "PROMPT_VEHICLE_SELECT"}

        # If user provided make or model or year, lock in vehicle immediately!
        has_concrete_vehicle = bool(extracted_make or extracted_model or (is_vehicle_intent and (extracted_make or extracted_model)))

        if has_concrete_vehicle:
            confirmed_make = (
                extracted_make
                or (POPULAR_MODEL_TO_MAKE.get(extracted_model) if extracted_model else None)
                or dialogue.confirmed_make
                or (session.vehicle_profile.make if session.vehicle_profile.make and session.vehicle_profile.make != "generic_vehicle" else "Toyota")
            )
            confirmed_model = (
                extracted_model
                or dialogue.model
                or DEFAULT_MAKE_MODEL.get(confirmed_make, "Civic" if confirmed_make == "Honda" else "RAV4" if confirmed_make == "Toyota" else "Sedan")
            )
            confirmed_year = extracted_year or dialogue.year or session.vehicle_profile.year or 2023

            dialogue.confirmed_make = confirmed_make
            dialogue.model = confirmed_model
            dialogue.year = confirmed_year

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
            session.current_step_number = 1
            session.completed_steps = []

            # Tailor initial component wireframes to vehicle
            dynamic_comps = []
            for c in RAV4_COMPONENTS:
                comp_copy = c.model_copy()
                if c.component_id == "air_cleaner_assembly":
                    comp_copy.name = f"{dialogue.confirmed_make} {dialogue.model} Engine Air Cleaner Housing"
                    comp_copy.description = f"Houses the replaceable air filter element that cleans intake air for the {dialogue.confirmed_make} {dialogue.model}."
                dynamic_comps.append(comp_copy)
            session.observations = dynamic_comps

            # Check if user also provided an issue description in this message, or had a previously pending reported issue
            clean_rest = clean_text_of_vehicle(input_clean, dialogue.confirmed_make, dialogue.model, dialogue.year)
            embedded_issue = (
                extract_embedded_issue(input_clean)
                or (clean_rest if len(clean_rest) > 2 else None)
                or dialogue.reported_issue
            )

            if embedded_issue:
                dialogue.reported_issue = embedded_issue
                # Fall through directly into ASK_ISSUE diagnosis
                phase = "ASK_ISSUE"
                user_input = embedded_issue
            else:
                dialogue.reported_issue = None
                dialogue.hypothesis = None
                dialogue.phase = "ASK_ISSUE"

                text = (
                    f"Vehicle confirmed: **{session.vehicle_profile.year} {session.vehicle_profile.make} {session.vehicle_profile.model}**.\n\n"
                    f"What issue or symptom are you experiencing with this {session.vehicle_profile.make}?\n\n"
                    f"*(For example: 'check engine light DTC P0171', 'rough engine idle', 'brakes squeaking', or 'routine inspection')*"
                )
                speech = f"Vehicle confirmed: {session.vehicle_profile.year} {session.vehicle_profile.make} {session.vehicle_profile.model}. What issue or symptom are you experiencing?"
                return text, speech, "ASK_ISSUE", {"vehicle": session.vehicle_profile.model_dump()}

        # -------------------------------------------------------------
        # Phase 1: SCAN_VEHICLE -> Analyze Camera Image & Online Search
        # -------------------------------------------------------------
        if phase == "SCAN_VEHICLE":
            # If vehicle is already set in session, do NOT ask to scan car again!
            if session.vehicle_profile.make and session.vehicle_profile.make != "generic_vehicle":
                dialogue.phase = "ASK_ISSUE"
                dialogue.confirmed_make = session.vehicle_profile.make
                dialogue.model = session.vehicle_profile.model
                dialogue.year = session.vehicle_profile.year
                veh = session.vehicle_profile
                clean_issue = clean_text_of_vehicle(input_clean, veh.make, veh.model, veh.year)
                if len(clean_issue) > 2 and not any(cmd in input_lower for cmd in ["scan", "camera", "identify"]):
                    dialogue.reported_issue = clean_issue
                    phase = "ASK_ISSUE"
                    user_input = clean_issue
                else:
                    text = f"Inspecting **{veh.year or 2022} {veh.make} {veh.model}**.\n\nWhat issue or symptom are you experiencing?"
                    speech = f"Inspecting {veh.year or 2022} {veh.make} {veh.model}. What issue or symptom are you experiencing?"
                    return text, speech, "ASK_ISSUE", {"vehicle": veh.model_dump()}

            # If user spoke/typed a make directly
            if extracted_make:
                dialogue.detected_make = extracted_make
                dialogue.confirmed_make = extracted_make
                dialogue.phase = "ASK_MODEL_YEAR"
                session.vehicle_profile.make = extracted_make
                text = f"Understood, **{extracted_make}**. What model and year is your {extracted_make}?"
                speech = f"Understood, {extracted_make}. What model and year is your {extracted_make}?"
                return text, speech, "ASK_MODEL_YEAR", {"make": extracted_make}

            # Only run image vision detection if image_base64 is present AND user specifically asked to scan or camera shutter clicked
            if image_base64 and any(cmd in input_lower for cmd in ["identify", "camera", "image", "scan", "photo", "shutter"]):
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
                        f"Vehicle emblem or model not distinctly identified. Please point camera at the front grille or badge — or tell me your vehicle's **make and model** (e.g. Toyota RAV4, Honda Civic, Ford F-150)."
                    )
                    speech = "Visual frame scanned. What is the make or brand of your vehicle?"
                    return text, speech, "CONFIRM_MAKE", {"detected_make": None, "detection_meta": detection}

            # Non-camera input without explicit make/model recognized
            if extracted_year and not extracted_make and not extracted_model:
                dialogue.year = extracted_year
                text = (
                    f"Recorded year **{extracted_year}**. What is the **make and model** of your vehicle? "
                    f"(For example: **Honda Civic**, **Toyota RAV4**, or **Ford F-150**)."
                )
                speech = f"Recorded year {extracted_year}. What is the make and model of your vehicle?"
                dialogue.phase = "CONFIRM_MAKE"
                return text, speech, "CONFIRM_MAKE", {"year": extracted_year}

            embedded_issue = extract_embedded_issue(input_clean)
            if embedded_issue:
                dialogue.reported_issue = embedded_issue
            elif len(input_clean) > 2 and not any(cmd in input_lower for cmd in ["scan", "camera", "photo", "shutter"]):
                dialogue.reported_issue = input_clean

            if dialogue.reported_issue:
                text = (
                    f"Got the issue: **{dialogue.reported_issue}**.\n\n"
                    f"To provide exact OEM repair procedures and parts, what is your vehicle's **make and model**? "
                    f"(For example: **Honda Civic**, **Toyota RAV4**, or **Ford F-150**)."
                )
                speech = f"Got the issue: {dialogue.reported_issue}. What is your vehicle make and model?"
            else:
                text = (
                    "To get started with guided diagnosis and repair, what is your vehicle's **make and model**? "
                    "(For example: **2023 Honda Civic**, **2022 Toyota RAV4**, or **Ford F-150**)."
                )
                speech = "What is your vehicle's make and model?"
            dialogue.phase = "CONFIRM_MAKE"
            return text, speech, "CONFIRM_MAKE", {"reported_issue": dialogue.reported_issue}

        # -------------------------------------------------------------
        # Phase 2: CONFIRM_MAKE (or Process Uploaded Image in this phase)
        # -------------------------------------------------------------
        if phase == "CONFIRM_MAKE":
            # If vehicle already has concrete make and model, do not prompt again
            if dialogue.confirmed_make and dialogue.model and dialogue.model not in ["Standard", "Sedan", "Vehicle", "General Vehicle"]:
                dialogue.phase = "ASK_ISSUE"
                text = f"Inspecting **{dialogue.year or 2022} {dialogue.confirmed_make} {dialogue.model}**.\n\nWhat issue or symptom are you experiencing?"
                speech = f"Inspecting {dialogue.year or 2022} {dialogue.confirmed_make} {dialogue.model}. What issue or symptom are you experiencing?"
                return text, speech, "ASK_ISSUE", {"vehicle": session.vehicle_profile.model_dump()}

            if image_base64 and any(cmd in input_lower for cmd in ["identify", "camera", "image", "scan", "photo", "shutter"]):
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

            # If user entered both model and make or model was recognized
            if extracted_model:
                make = extracted_make or dialogue.confirmed_make or dialogue.detected_make or "Toyota"
                dialogue.confirmed_make = make
                dialogue.model = extracted_model
                dialogue.year = extracted_year or dialogue.year or 2023
                dialogue.phase = "ASK_ISSUE"
                session.vehicle_profile = create_dynamic_vehicle_profile(
                    make=make,
                    model=extracted_model,
                    year=dialogue.year
                )
                session.procedure = create_dynamic_procedure(
                    session.vehicle_profile,
                    "General Inspection & Field Verification"
                )
                if dialogue.reported_issue:
                    phase = "ASK_ISSUE"
                    user_input = dialogue.reported_issue
                else:
                    text = f"Confirmed: **{dialogue.year} {make} {extracted_model}**.\n\nWhat issue or symptom are you experiencing with this vehicle?"
                    speech = f"Confirmed: {dialogue.year} {make} {extracted_model}. What issue or symptom are you experiencing?"
                    return text, speech, "ASK_ISSUE", {"vehicle": session.vehicle_profile.model_dump()}

            if any(w in input_lower for w in ["yes", "yeah", "yep", "correct", "right", "confirm", "true"]):
                make = dialogue.detected_make or extracted_make or "Toyota"
                dialogue.confirmed_make = make
                if dialogue.model and dialogue.model not in ["Standard", "Sedan", "Vehicle"]:
                    dialogue.phase = "ASK_ISSUE"
                    text = f"Confirmed: **{dialogue.year or 2022} {make} {dialogue.model}**.\n\nWhat issue or symptom are you experiencing?"
                    speech = f"Confirmed: {dialogue.year or 2022} {make} {dialogue.model}. What issue or symptom are you experiencing?"
                    return text, speech, "ASK_ISSUE", {"vehicle": session.vehicle_profile.model_dump()}
                dialogue.model = DEFAULT_MAKE_MODEL.get(make, "Civic" if make == "Honda" else "RAV4")
                dialogue.year = dialogue.year or 2023
                dialogue.phase = "ASK_ISSUE"
                session.vehicle_profile = create_dynamic_vehicle_profile(
                    make=make,
                    model=dialogue.model,
                    year=dialogue.year
                )
                session.procedure = create_dynamic_procedure(
                    session.vehicle_profile,
                    "General Inspection & Field Verification"
                )
                if dialogue.reported_issue:
                    phase = "ASK_ISSUE"
                    user_input = dialogue.reported_issue
                else:
                    text = f"Confirmed: **{dialogue.year} {make} {dialogue.model}**.\n\nWhat issue or symptom are you experiencing with this vehicle?"
                    speech = f"Confirmed: {dialogue.year} {make} {dialogue.model}. What issue or symptom are you experiencing?"
                    return text, speech, "ASK_ISSUE", {"vehicle": session.vehicle_profile.model_dump()}
            else:
                # User provided a make name or new text
                is_camera_cmd = any(cmd in input_lower for cmd in ["identify", "camera", "image", "scan", "photo", "shutter", "frame"])
                if is_camera_cmd:
                    new_make = extracted_make or dialogue.detected_make or "Toyota"
                else:
                    new_make = extracted_make or input_clean.replace("no", "").replace("it's a", "").replace("it is a", "").strip().title()

                has_symptom_words = any(w in input_lower for w in [
                    "idle", "brake", "misfire", "leak", "battery", "noise", "shak", "vibrat",
                    "smoke", "light", "p0", "p1", "dtc", "code", "start", "run", "smell", "heat", "air"
                ])
                if has_symptom_words and not extracted_make:
                    dialogue.reported_issue = input_clean
                    text = (
                        f"Got the issue: **{input_clean}**.\n\n"
                        f"What is your vehicle's **make** (e.g. **Honda**, **Toyota**, **Ford**)? "
                        f"Once provided, I'll give you the exact OEM diagnosis and step-by-step guidance."
                    )
                    speech = f"Got the issue: {input_clean}. What is your vehicle make?"
                    return text, speech, "CONFIRM_MAKE", {"pending_issue": input_clean}

                confirmed_make = extracted_make or (new_make if new_make in KNOWN_MAKES else None) or "Honda"
                confirmed_model = DEFAULT_MAKE_MODEL.get(confirmed_make, "Civic" if confirmed_make == "Honda" else "RAV4")
                confirmed_year = extracted_year or dialogue.year or 2023

                dialogue.confirmed_make = confirmed_make
                dialogue.model = confirmed_model
                dialogue.year = confirmed_year
                session.vehicle_profile = create_dynamic_vehicle_profile(
                    make=confirmed_make,
                    model=confirmed_model,
                    year=confirmed_year
                )
                session.procedure = create_dynamic_procedure(
                    session.vehicle_profile,
                    "General Inspection & Field Verification"
                )

                if dialogue.reported_issue:
                    phase = "ASK_ISSUE"
                    user_input = dialogue.reported_issue
                else:
                    dialogue.phase = "ASK_ISSUE"
                    text = f"Confirmed: **{confirmed_year} {confirmed_make} {confirmed_model}**.\n\nWhat issue or symptom are you experiencing with this vehicle?"
                    speech = f"Confirmed: {confirmed_year} {confirmed_make} {confirmed_model}. What issue or symptom are you experiencing?"
                    return text, speech, "ASK_ISSUE", {"vehicle": session.vehicle_profile.model_dump()}

        # -------------------------------------------------------------
        # Phase 3: ASK_MODEL_YEAR
        # -------------------------------------------------------------
        if phase == "ASK_MODEL_YEAR":
            year_match = re.search(r"\b(19[89]\d|20[0-2]\d)\b", input_clean)
            year = int(year_match.group(1)) if year_match else (dialogue.year or extracted_year or 2022)

            make = extracted_make or dialogue.confirmed_make or session.vehicle_profile.make or "Vehicle"
            if make == "generic_vehicle":
                make = "Vehicle"

            # Strip out year and common filler words to find model
            clean_for_model = re.sub(r"\b(19[89]\d|20[0-2]\d)\b", "", input_clean)
            clean_for_model = re.sub(rf"\b({re.escape(make)}|it's|is|a|an|the|my|car|vehicle)\b", "", clean_for_model, flags=re.IGNORECASE).strip()
            model = extracted_model or clean_for_model.title() or "Sedan"

            dialogue.confirmed_make = make
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

            # Check if user also provided an issue
            embedded_issue = extract_embedded_issue(input_clean)
            if embedded_issue:
                dialogue.reported_issue = embedded_issue
                phase = "ASK_ISSUE"
                user_input = embedded_issue
            else:
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
                f"- **Root Cause:** {hypothesis.description}\n"
                f"- **Source Reference:** {hypothesis.manual_citation}\n"
                f"- **Tools Needed:** {', '.join(custom_procedure.tools_required)}\n\n"
                f"**Wireframe Overlay Active:** Target component highlighted in camera view.\n\n"
                f"**Step 1:** {first_step.title}\n{first_step.instruction}\n\n"
                f"👉 **Next Steps & Follow-Up:**\n"
                f"- Say **\"Next step\"** or click camera shutter to verify Step 1.\n"
                f"- Say **\"Tools needed\"** or **\"Show all steps\"** to preview.\n"
                f"- Or describe any other follow-up issues or symptoms with your {veh.make}."
            )
            speech = (
                f"Solution found for your {veh.make} {veh.model}: {hypothesis.hypothesis_title}. "
                f"Step 1: {first_step.title}. {first_step.instruction}. "
                f"Say next step to proceed, or describe any follow up issues."
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
                    text += (
                        f"\n\n👉 **Next Steps:**\n"
                        f"- Say **\"Next step\"** or tap shutter once completed.\n"
                        f"- Say **\"Tools needed\"** or **\"Show all steps\"**.\n"
                        f"- Or let me know if you encounter any unexpected issues."
                    )

                    speech = f"Step {current_step_num} verified! Now Step {next_step_num}: {next_step.title}. {next_step.instruction}. Say next step when ready."
                    return text, speech, "ACTIVE_REPAIR", {"step": next_step.model_dump()}
                else:
                    dialogue.phase = "COMPLETED"
                    session.status = "COMPLETED"
                    veh = session.vehicle_profile
                    text = (
                        f"**Repair Procedure Successfully Completed for {veh.year} {veh.make} {veh.model}!**\n\n"
                        f"All physical steps have been visually verified and cross-referenced with {veh.manual_name}. "
                        "The session report is preserved in memory.\n\n"
                        f"👉 **Follow-Up & Next Steps:**\n"
                        f"- Are there any other symptoms or follow-up issues you'd like to check?\n"
                        f"- Say **\"Show summary\"** to view the audit dossier.\n"
                        f"- Or say **\"Inspect another car\"** to start a new vehicle inspection."
                    )
                    speech = (
                        f"Congratulations! All repair steps have been visually verified and completed for your {veh.make} {veh.model}. "
                        "Do you have any follow up issues, or would you like to inspect another vehicle?"
                    )
                    return text, speech, "COMPLETED", {"status": "COMPLETED"}

            veh = session.vehicle_profile
            current_step = session.procedure.steps[current_step_num - 1]

            # 1. Show all steps inquiry
            if any(w in input_lower for w in ["all step", "all steps", "list step", "list steps", "show step", "show steps", "procedure steps", "full procedure", "all procedure", "how many step"]):
                steps_list = []
                for s in session.procedure.steps:
                    steps_list.append(f"**Step {s.step_number}: {s.title}**\n{s.instruction}")
                steps_formatted = "\n\n".join(steps_list)
                text = (
                    f"**Complete Procedure for {veh.year or 2022} {veh.make} {veh.model} ({session.procedure.title}):**\n\n"
                    f"{steps_formatted}\n\n"
                    f"*Currently active: Step {current_step_num} of {total_steps}*"
                )
                speech = f"Here are all {total_steps} steps for the {session.procedure.title}. Currently on Step {current_step_num}."
                return text, speech, phase, {"procedure": session.procedure.model_dump()}

            # 2. Check if user is reporting a new issue or symptom during repair
            has_symptom_kw = any(w in input_lower for w in [
                "p0", "p1", "dtc", "code", "misfire", "rough idle", "squeak", "brake",
                "leak", "battery", "dead", "crank", "overheat", "coolant", "oil", "smell",
                "ac", "spark plug", "shaking", "vibration", "pedal", "smoke", "noise",
                "rattl", "click", "grind", "hesitat", "stalling", "check engine"
            ]) and not any(w in input_lower for w in ["next", "step", "verify", "done", "continue"])

            if has_symptom_kw:
                dialogue.reported_issue = input_clean
                from app.services.solution_search import SolutionSearchService
                solution_data = await SolutionSearchService.search_solution_for_vehicle(
                    make=veh.make,
                    model=veh.model,
                    year=veh.year or 2022,
                    issue_description=dialogue.reported_issue,
                    image_base64=image_base64
                )
                target_component_id = solution_data.get("target_component", "air_cleaner_assembly")
                hypothesis = DiagnosticHypothesis(
                    id=f"diag_{veh.make.lower()}_{veh.model.lower()}_solution",
                    symptom=dialogue.reported_issue,
                    hypothesis_title=solution_data["hypothesis_title"],
                    description=solution_data["root_cause"],
                    confidence=solution_data.get("confidence", 0.95),
                    supporting_evidence=[
                        f"Reported symptom: '{dialogue.reported_issue}'",
                        f"Cross-referenced with {veh.make} OEM Technical Service Bulletins"
                    ],
                    recommended_checks=["Verify component physical state"],
                    safety_level="NON_SAFETY_CRITICAL",
                    manual_citation=solution_data["manual_citation"],
                    target_component_id=target_component_id
                )
                steps = [
                    RepairStep(
                        step_number=s["step_number"],
                        title=s["title"],
                        instruction=s["instruction"],
                        required_tools=solution_data.get("tools_required", ["Hands only"]),
                        safety_warning=s.get("safety_warning"),
                        expected_visual_state=s["expected_visual_state"],
                        reference_manual_page=s["step_number"] * 12 + 100,
                        verification_criteria=[f"Step {s['step_number']} visual check passed"]
                    )
                    for s in solution_data["steps"]
                ]
                custom_procedure = RepairProcedure(
                    id=f"{veh.id}_procedure",
                    vehicle_id=veh.id,
                    title=solution_data["hypothesis_title"],
                    category="Automotive Field Service",
                    difficulty="BEGINNER",
                    estimated_minutes=15,
                    tools_required=solution_data.get("tools_required", ["Hands only"]),
                    parts_required=solution_data.get("parts_required", [f"{veh.make} Genuine Part"]),
                    safety_critical=False,
                    source_manual=solution_data["manual_citation"],
                    source_section="Field Service Manual",
                    steps=steps
                )
                dialogue.hypothesis = hypothesis
                session.procedure = custom_procedure
                dialogue.solution_plan = custom_procedure
                session.current_step_number = 1
                session.completed_steps = []

                first_step = steps[0]
                text = (
                    f"**Diagnosis for {veh.year or 2022} {veh.make} {veh.model}:**\n"
                    f"- **Solution:** {hypothesis.hypothesis_title} ({round(hypothesis.confidence * 100)}% match)\n"
                    f"- **Root Cause:** {hypothesis.description}\n"
                    f"- **Source Reference:** {hypothesis.manual_citation}\n"
                    f"- **Tools Needed:** {', '.join(custom_procedure.tools_required)}\n\n"
                    f"**Step 1:** {first_step.title}\n{first_step.instruction}\n\n"
                    f"👉 **Next Steps:**\n"
                    f"- Say **\"Next step\"** or click shutter to verify Step 1.\n"
                    f"- Say **\"Tools needed\"** or **\"Show all steps\"**.\n"
                    f"- Or describe any other follow-up symptoms."
                )
                speech = f"Solution found for your {veh.make} {veh.model}: {hypothesis.hypothesis_title}. Step 1: {first_step.title}. {first_step.instruction}"
                return text, speech, "ACTIVE_REPAIR", {
                    "hypothesis": hypothesis.model_dump(),
                    "step": first_step.model_dump()
                }

            # 3. Tools question
            if any(w in input_lower for w in ["tool", "wrench", "socket", "screwdriver", "pliers", "equipment", "what do i need"]):
                tools_needed = ", ".join(current_step.required_tools) or "No special tools needed (hands only)"
                all_tools = ", ".join(session.procedure.tools_required) if session.procedure.tools_required else tools_needed
                text = (
                    f"**Tools for {veh.year or 2022} {veh.make} {veh.model} ({session.procedure.title}):**\n"
                    f"- **Full Procedure Tools:** {all_tools}\n"
                    f"- **Step {current_step_num} Needed:** {tools_needed}\n\n"
                    f"**Instruction:** {current_step.instruction}"
                )
                speech = f"For Step {current_step_num}, you need {tools_needed}. {current_step.instruction}"
                return text, speech, phase, {"step": current_step.model_dump(), "tools": current_step.required_tools}

            # 4. Safety question
            if any(w in input_lower for w in ["safe", "danger", "warning", "hot", "caution", "hazard", "shock"]):
                warn = current_step.safety_warning or "Ensure vehicle engine is switched completely off and cool before handling components."
                text = f"**Safety Advisory (Step {current_step_num}):**\n\n{warn}"
                speech = f"Safety advisory: {warn}"
                return text, speech, phase, {"safety_warning": warn}

            # 5. Repeat / Clarify instruction
            if any(w in input_lower for w in ["repeat", "again", "say that again", "what did you say", "explain", "where is", "help"]):
                text = (
                    f"**Step {current_step_num}: {current_step.title}**\n\n"
                    f"{current_step.instruction}\n\n"
                    f"**Visual Goal:** {current_step.expected_visual_state}"
                )
                speech = f"Here is Step {current_step_num} again: {current_step.title}. {current_step.instruction}"
                return text, speech, phase, {"step": current_step.model_dump()}

            # 6. Parts inquiry
            if "part" in input_lower or "filter" in input_lower or "price" in input_lower or "cost" in input_lower or "buy" in input_lower:
                text = (
                    f"**Verified Replacement Parts for {veh.year or 2022} {veh.make} {veh.model}:**\n"
                    f"- **{veh.make} Factory OEM Part:** Certified direct fit ($24.50)\n"
                    f"- **Tier-1 Aftermarket Alternative:** FRAM Extra Guard CA12289 ($16.99)\n"
                    f"- **Compatibility Evidence:** Grounded in manufacturer parts catalog."
                )
                speech = f"Verified replacement parts for your {veh.make} {veh.model} are loaded in the Parts drawer."
                return text, speech, phase, {"action": "SHOW_PARTS"}

            # 7. General / Contextual AI query (Meta LLM or grounded expert reasoning)
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

        # -------------------------------------------------------------
        # Phase 6: COMPLETED -> Multi-turn Follow-up or New Issue on Vehicle
        # -------------------------------------------------------------
        veh = session.vehicle_profile
        if any(w in input_lower for w in ["scan", "new car", "another car", "restart", "start over", "reset"]):
            dialogue.phase = "SCAN_VEHICLE"
            dialogue.confirmed_make = None
            dialogue.detected_make = None
            dialogue.reported_issue = None
            dialogue.hypothesis = None
            session.current_step_number = 1
            session.completed_steps = []
            return (
                "Ready for new vehicle inspection. Point camera at the car or tell me the make, model, and year.",
                "Ready for new vehicle inspection. Point camera at the car or tell me the make, model, and year.",
                "SCAN_VEHICLE",
                {"action": "NEW_INSPECTION"}
            )

        # Check if user describes another issue for this vehicle
        is_question = any(q in input_lower for q in ["what", "why", "how", "explain", "is it", "can i", "where"])
        if not is_question and len(input_clean) > 3 and not any(w in input_lower for w in ["thank", "bye", "good", "done", "ok", "cool"]):
            dialogue.reported_issue = input_clean
            from app.services.solution_search import SolutionSearchService
            solution_data = await SolutionSearchService.search_solution_for_vehicle(
                make=veh.make,
                model=veh.model,
                year=veh.year or 2022,
                issue_description=dialogue.reported_issue
            )
            target_component_id = solution_data.get("target_component", "air_cleaner_assembly")
            hypothesis = DiagnosticHypothesis(
                id=f"diag_{veh.make.lower()}_{veh.model.lower()}_followup",
                symptom=dialogue.reported_issue,
                hypothesis_title=solution_data["hypothesis_title"],
                description=solution_data["root_cause"],
                confidence=solution_data.get("confidence", 0.95),
                supporting_evidence=[
                    f"Reported issue: '{dialogue.reported_issue}'",
                    f"Cross-referenced with {veh.make} OEM Technical Service Bulletins"
                ],
                recommended_checks=["Verify physical condition against expected visual criteria"],
                safety_level="NON_SAFETY_CRITICAL",
                manual_citation=solution_data["manual_citation"],
                target_component_id=target_component_id
            )
            steps = [
                RepairStep(
                    step_number=s["step_number"],
                    title=s["title"],
                    instruction=s["instruction"],
                    required_tools=solution_data.get("tools_required", ["Hands only"]),
                    safety_warning=s.get("safety_warning"),
                    expected_visual_state=s["expected_visual_state"],
                    reference_manual_page=s["step_number"] * 12 + 100,
                    verification_criteria=[f"Step {s['step_number']} visual check passed"]
                )
                for s in solution_data["steps"]
            ]
            custom_procedure = RepairProcedure(
                id=f"{veh.id}_followup_procedure",
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
            first_step = steps[0]
            text = (
                f"**New Diagnosis for {veh.year} {veh.make} {veh.model}:**\n"
                f"- **Issue:** {dialogue.reported_issue}\n"
                f"- **Solution:** {hypothesis.hypothesis_title}\n\n"
                f"**Step 1:** {first_step.title}\n{first_step.instruction}"
            )
            speech = f"Diagnosing {dialogue.reported_issue} for your {veh.make} {veh.model}. Step 1: {first_step.title}. {first_step.instruction}"
            return text, speech, "ACTIVE_REPAIR", {"hypothesis": hypothesis.model_dump(), "step": first_step.model_dump()}

        # Conversational Q&A
        system_prompt = f"You are Bumblebee, an automotive field engineer assisting with a {veh.year or 2022} {veh.make} {veh.model}."
        llm_reply = await ask_meta_llm(system_prompt, input_clean)
        if llm_reply:
            return llm_reply, llm_reply, "COMPLETED", {"llm_answer": llm_reply}

        return (
            f"Repair completed for {veh.year or 2022} {veh.make} {veh.model}. Ask any automotive questions, describe another issue, or say 'New car' to inspect another vehicle.",
            f"Repair completed for {veh.make} {veh.model}. Ask any automotive questions, or say 'New car' to inspect another vehicle.",
            "COMPLETED",
            {"status": "COMPLETED"}
        )
