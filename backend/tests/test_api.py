"""Automated tests for MUSE FIELD API & state machine."""
from fastapi.testclient import TestClient
from app.main import app
from app.core.safety_guard import SafetyGuard
from app.mock_data.rav4_data import RAV4_COMPONENTS

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Meta Muse Spark" in data["models"]["reasoning"]


def test_session_lifecycle_and_verification():
    # 1. Create session
    res = client.post("/api/v1/sessions", json={"vehicle_id": "toyota_rav4_2022", "procedure_id": "rav4_engine_air_filter"})
    assert res.status_code == 200
    session_data = res.json()
    session_id = session_data["session_id"]
    assert session_data["current_step_number"] == 1

    # 2. Identify components
    id_res = client.post("/api/v1/vision/identify", json={"session_id": session_id})
    assert id_res.status_code == 200
    components = id_res.json()
    assert len(components) >= 4
    airbox = next((c for c in components if c["component_id"] == "air_cleaner_assembly"), None)
    assert airbox is not None
    assert len(airbox["polygon_points"]) > 0

    # 3. Verify Step 1
    verify_res = client.post("/api/v1/vision/verify", json={"session_id": session_id, "step_number": 1})
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["success"] is True
    assert verify_data["verification"]["status"] == "VERIFIED"
    assert verify_data["session"]["current_step_number"] == 2

    # 4. Fetch parts
    parts_res = client.get("/api/v1/parts?vehicle_id=toyota_rav4_2022")
    assert parts_res.status_code == 200
    parts = parts_res.json()
    assert len(parts) >= 2
    oem_part = next((p for p in parts if p["part_number"] == "17801-F0050"), None)
    assert oem_part is not None
    assert oem_part["verified_fitment"] is True


def test_safety_guard():
    # High voltage cable or brake should trigger safety guard
    brake_comp = next((c for c in RAV4_COMPONENTS if "brake" in c.name.lower()), None)
    assert brake_comp is not None
    safe, warning = SafetyGuard.evaluate_component_safety(brake_comp)
    assert safe is False
    assert "SAFETY SHIELD ACTIVE" in warning


def test_multimodal_conversation_and_solution_search():
    # 1. Create clean standby session
    res = client.post("/api/v1/sessions", json={"vehicle_id": "generic_vehicle", "procedure_id": "general_inspection"})
    assert res.status_code == 200
    session_id = res.json()["session_id"]

    # 2. Camera scan turn
    scan_turn = client.post("/api/v1/conversation/turn", json={
        "session_id": session_id,
        "user_speech_or_text": "point camera at vehicle"
    })
    assert scan_turn.status_code == 200
    data1 = scan_turn.json()
    assert data1["phase"] == "CONFIRM_MAKE"
    assert "vehicle" in data1["text"].lower() or data1["payload"]["detection_meta"]["detected"] is True

    # 3. Model & year input turn
    model_turn = client.post("/api/v1/conversation/turn", json={
        "session_id": session_id,
        "user_speech_or_text": "2021 Honda Civic"
    })
    assert model_turn.status_code == 200
    data2 = model_turn.json()
    assert data2["phase"] == "ASK_ISSUE"
    assert "2021 Honda Civic" in data2["text"]

    # 4. Issue description input turn (chat / voice / image)
    issue_turn = client.post("/api/v1/conversation/turn", json={
        "session_id": session_id,
        "user_speech_or_text": "Engine hesitating and sluggish under throttle with low mpg"
    })
    assert issue_turn.status_code == 200
    data3 = issue_turn.json()
    assert data3["phase"] == "ACTIVE_REPAIR"
    assert "Honda" in data3["text"]
    assert "Step 1" in data3["text"]
    assert "Wireframe Overlay Active" in data3["text"]

    # 5. Next step progression
    step_turn = client.post("/api/v1/conversation/turn", json={
        "session_id": session_id,
        "user_speech_or_text": "next step"
    })
    assert step_turn.status_code == 200
    data4 = step_turn.json()
    assert data4["phase"] == "ACTIVE_REPAIR"
    assert "Step 2" in data4["text"]


def test_conversation_sse_stream():
    """Tests Server-Sent Events (SSE) streaming turn endpoint for instant TTS speech emission."""
    res = client.post("/api/v1/sessions", json={"vehicle_id": "generic_vehicle", "procedure_id": "general_inspection"})
    assert res.status_code == 200
    session_id = res.json()["session_id"]

    stream_res = client.post(
        "/api/v1/conversation/stream",
        json={"session_id": session_id, "user_speech_or_text": "2023 Ford F-150"}
    )
    assert stream_res.status_code == 200
    assert "text/event-stream" in stream_res.headers["content-type"]
    body = stream_res.text
    assert "event: speech" in body
    assert "event: state" in body
    assert "Ford F-150" in body


def test_dtc_hybrid_manual_retriever():
    """Tests DTC code matching and torque fastener specifications in OEM manual retriever."""
    from app.services.manual_retriever import ManualRetrieverService
    service = ManualRetrieverService()
    citations = service.search_manual("generic_vehicle", "Vehicle throwing P0171 bank 1 lean code")
    assert len(citations) >= 2
    dtc_cite = next((c for c in citations if "P0171" in c["section"]), None)
    assert dtc_cite is not None
    assert "System Too Lean" in dtc_cite["section"]
    assert "Torque Fasteners" in citations[-1]["section"]


def test_database_persistence_and_analytics():
    """Tests SQLite database persistence for sessions, vehicles, images, issues, and technician feedback."""
    # 1. Create a session
    sess_res = client.post("/api/v1/sessions", json={"vehicle_id": "generic_vehicle", "procedure_id": "general_inspection"})
    assert sess_res.status_code == 200
    session_id = sess_res.json()["session_id"]

    # 2. Perform a turn with vehicle make and simulated image
    turn_res = client.post("/api/v1/conversation/turn", json={
        "session_id": session_id,
        "user_speech_or_text": "2022 Subaru Outback with rough idle",
        "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    })
    assert turn_res.status_code == 200

    # 3. Query historical session list
    list_res = client.get("/api/v1/analytics/sessions?limit=10")
    assert list_res.status_code == 200
    sessions_list = list_res.json()
    assert len(sessions_list) >= 1
    found = next((s for s in sessions_list if s["session_id"] == session_id), None)
    assert found is not None
    assert found["turn_count"] >= 1
    assert found["image_count"] >= 1

    # 4. Query full session dossier
    dossier_res = client.get(f"/api/v1/analytics/sessions/{session_id}")
    assert dossier_res.status_code == 200
    dossier = dossier_res.json()
    assert dossier["session"]["session_id"] == session_id
    assert len(dossier["turns"]) >= 1
    assert len(dossier["images"]) >= 1
    assert "Subaru" in dossier["session"]["make"] or "Subaru" in dossier["turns"][0]["user_text"]

    # 5. Submit technician feedback for continuous improvement
    feedback_res = client.post(f"/api/v1/analytics/sessions/{session_id}/feedback", json={
        "rating": 5,
        "feedback": "Subaru diagnostic correctly identified air intake and MAF circuit.",
        "resolution_status": "RESOLVED",
        "parts_replaced": ["16546-AA12A"]
    })
    assert feedback_res.status_code == 200
    assert feedback_res.json()["status"] == "success"

    # 6. Verify analytics stats summary
    stats_res = client.get("/api/v1/analytics/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_sessions"] >= 1
    assert stats["total_conversation_turns"] >= 1
    assert stats["total_images_captured"] >= 1
    assert stats["average_technician_rating"] >= 4.0


def test_active_learning_dataset_export():
    """Tests active learning JSONL dataset compilation from high-rated technician repairs."""
    res = client.get("/api/v1/analytics/export/dataset?min_rating=4")
    assert res.status_code == 200
    dataset = res.json()
    assert dataset["dataset_version"] == "1.0-active-learning"
    assert "records" in dataset
    assert isinstance(dataset["records"], list)
    assert len(dataset["records"]) >= 1
    first_record = dataset["records"][0]
    assert "vehicle" in first_record
    assert "diagnostic_ground_truth" in first_record
    assert "conversational_dialogue_turns" in first_record


def test_point_and_click_vehicle_search_and_recreation():
    """Verifies that pointing camera and clicking shutter identifies vehicle from image and recreates profile & procedure."""
    from PIL import Image
    import io
    import base64

    # 1. Initialize generic session
    res = client.post("/api/v1/sessions", json={"vehicle_id": "generic_vehicle", "procedure_id": "general_inspection"})
    assert res.status_code == 200
    session_id = res.json()["session_id"]

    # 2. Synthesize camera frame
    img = Image.new("RGB", (640, 480), color=(30, 60, 160))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    b64 = base64.b64encode(buf.getvalue()).decode()

    # 3. Point and click scan turn
    scan_res = client.post("/api/v1/conversation/turn", json={
        "session_id": session_id,
        "user_speech_or_text": "identify vehicle from camera image",
        "image_base64": b64
    })
    assert scan_res.status_code == 200
    data = scan_res.json()
    assert data["phase"] == "ASK_ISSUE"
    assert "visual search identified" in data["text"].lower()

    sess = data["session"]
    assert sess["vehicle_profile"]["make"] != ""
    assert sess["vehicle_profile"]["model"] != ""
    assert sess["procedure"]["vehicle_id"] != "generic_vehicle"
    assert len(sess["procedure"]["steps"]) == 6
    assert len(sess["observations"]) >= 4

    # 4. Describe issue turn (recreates solution plan)
    issue_res = client.post("/api/v1/conversation/turn", json={
        "session_id": session_id,
        "user_speech_or_text": "P0171 lean code and rough idle under acceleration"
    })
    assert issue_res.status_code == 200
    issue_data = issue_res.json()
    assert issue_data["phase"] == "ACTIVE_REPAIR"
    assert "Step 1" in issue_data["text"]
    assert issue_data["session"]["dialogue"]["hypothesis"] is not None


def test_chat_add_and_switch_vehicle_by_name():
    """Verifies that users can add and switch vehicles by make, model, and year directly in chat."""
    init_res = client.post("/api/v1/sessions", json={
        "vehicle_id": "generic_vehicle",
        "procedure_id": "general_inspection"
    })
    session_id = init_res.json()["session_id"]

    # 1. Add car via text: "Add 2023 Honda Civic"
    turn1 = client.post("/api/v1/conversation/turn", json={
        "session_id": session_id,
        "user_speech_or_text": "Add 2023 Honda Civic"
    })
    assert turn1.status_code == 200
    d1 = turn1.json()
    assert d1["phase"] == "ASK_ISSUE"
    assert "Honda" in d1["text"]
    assert "Civic" in d1["text"]
    assert d1["session"]["vehicle_profile"]["make"] == "Honda"
    assert d1["session"]["vehicle_profile"]["model"] == "Civic"
    assert d1["session"]["vehicle_profile"]["year"] == 2023

    # 2. Switch car via text: "Switch car to 2021 Ford F-150"
    turn2 = client.post("/api/v1/conversation/turn", json={
        "session_id": session_id,
        "user_speech_or_text": "Switch car to 2021 Ford F-150"
    })
    assert turn2.status_code == 200
    d2 = turn2.json()
    assert d2["phase"] == "ASK_ISSUE"
    assert d2["session"]["vehicle_profile"]["make"] == "Ford"
    assert d2["session"]["vehicle_profile"]["model"] == "F-150"
    assert d2["session"]["vehicle_profile"]["year"] == 2021


def test_chat_diagnose_and_talk_about_issues():
    """Verifies that users can talk/chat with the model on vehicle issues and DTC codes."""
    init_res = client.post("/api/v1/sessions", json={
        "vehicle_id": "generic_vehicle",
        "procedure_id": "general_inspection"
    })
    session_id = init_res.json()["session_id"]

    # Set vehicle
    client.post("/api/v1/conversation/turn", json={
        "session_id": session_id,
        "user_speech_or_text": "I drive a 2022 Toyota RAV4"
    })

    # Chat asking about DTC P0171
    dtc_turn = client.post("/api/v1/conversation/turn", json={
        "session_id": session_id,
        "user_speech_or_text": "What does code P0171 mean?"
    })
    assert dtc_turn.status_code == 200
    dtc_data = dtc_turn.json()
    assert "P0171" in dtc_data["text"] or "lean" in dtc_data["text"].lower()

    # Chat asking about symptom: "Engine vibrating and rough idle"
    issue_turn = client.post("/api/v1/conversation/turn", json={
        "session_id": session_id,
        "user_speech_or_text": "Engine vibrating and rough idle when stopped"
    })
    assert issue_turn.status_code == 200
    issue_data = issue_turn.json()
    assert issue_data["phase"] == "ACTIVE_REPAIR"
    assert "Step 1" in issue_data["text"]
    assert len(issue_data["session"]["procedure"]["steps"]) >= 4


def test_chat_combined_vehicle_and_issue_one_turn():
    """Verifies that specifying a vehicle and issue together in one message configures both immediately."""
    init_res = client.post("/api/v1/sessions", json={
        "vehicle_id": "generic_vehicle",
        "procedure_id": "general_inspection"
    })
    session_id = init_res.json()["session_id"]

    turn = client.post("/api/v1/conversation/turn", json={
        "session_id": session_id,
        "user_speech_or_text": "Add 2024 BMW 3 Series with squeaking brakes"
    })
    assert turn.status_code == 200
    data = turn.json()
    assert data["session"]["vehicle_profile"]["make"] == "BMW"
    assert "3 Series" in data["session"]["vehicle_profile"]["model"]
    assert data["phase"] == "ACTIVE_REPAIR"
    assert "Step 1" in data["text"]


def test_conversational_voice_greeting_and_courtesy():
    """Verifies that voice turns like 'hello' and 'thank you' respond naturally and courteously."""
    init_res = client.post("/api/v1/sessions", json={
        "vehicle_id": "generic_vehicle",
        "procedure_id": "general_inspection"
    })
    session_id = init_res.json()["session_id"]

    # 1. Greeting
    hello_turn = client.post("/api/v1/conversation/turn", json={
        "session_id": session_id,
        "user_speech_or_text": "Hello Bumblebee"
    })
    assert hello_turn.status_code == 200
    assert "Hello" in hello_turn.json()["speech_text"]

    # 2. Courtesy
    thanks_turn = client.post("/api/v1/conversation/turn", json={
        "session_id": session_id,
        "user_speech_or_text": "Thank you"
    })
    assert thanks_turn.status_code == 200
    assert "welcome" in thanks_turn.json()["speech_text"].lower()






