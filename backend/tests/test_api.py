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



