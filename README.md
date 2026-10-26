# MUSE FIELD — AI Field Engineer for Automotive Repair
**Theme:** Meta AI Developer Hackathon — Push the Frontier  
**Tagline:** Point. Understand. Repair. Verify.  
**Models:** Meta Muse Spark • SAM 3.1 (Segment Anything) • Meta Llama Multimodal

---

## Overview

MUSE FIELD is a multimodal physical-AI automotive repair assistant that bridges foundation perception models with deterministic field engineering. It allows vehicle owners and field technicians to:
1. **Point** a live smartphone or tablet camera at an automotive engine compartment.
2. **Understand** components and spatial relationships through **Meta Muse Spark** perception and **SAM 3.1** pixel-precise polygon segmentation.
3. **Retrieve** grounded manufacturer repair procedures and verified replacement parts with documented evidence.
4. **Repair & Verify** physical progress through a deterministic state machine that visually compares camera views against expected physical states step-by-step.

---

## Design System: Google Minimalist Precision & Golden Ratio ($\phi \approx 1.618$)

MUSE FIELD implements Google Material minimalist engineering:
- **Golden Ratio ($\phi$) Grid & Typography:** Layout splits (61.8% primary HUD, 38.2% inspector drawers) and spacing scales derived from $\phi \approx 1.618$.
- **High-Contrast Cyber-Physical HUD:** Sleek Obsidian dark mode (`#07090D`) with precision cyan reticles (`#38BDF8`), field amber highlights (`#F59E0B`), and grounded verification emerald (`#10B981`).
- **Hands-Free Operation:** Integrated Web Speech API for voice-driven step progression, parts lookup, and verification.

---

## Architecture & Monorepo Structure

```
meta-hackathon-2026/
├── backend/                       # Python FastAPI Backend
│   ├── app/
│   │   ├── api/v1/                # REST endpoints: /sessions, /vision, /parts, /procedures
│   │   ├── core/                  # Deterministic state machine & safety guardrails
│   │   ├── models/                # Pydantic schemas (VehicleProfile, Step, Verification)
│   │   ├── services/              # Meta Muse Spark client, SAM 3.1 segmentation adapter
│   │   └── mock_data/             # Grounded 2022 Toyota RAV4 repair specifications
│   ├── requirements.txt
│   └── tests/                     # Automated pytest suite
│
├── frontend/                      # Next.js 14 App Router + TypeScript + Vanilla CSS
│   ├── src/
│   │   ├── app/                   # Root HUD chamber & metadata
│   │   ├── components/
│   │   │   ├── camera/            # WebRTC CameraViewport & SAM 3.1 Canvas Overlay
│   │   │   ├── hud/               # StepGuidanceCard, VerificationBanner, VoiceBar
│   │   │   ├── explorer/          # SpatialVehicleMap (engine compartment tree)
│   │   │   ├── parts/             # PartsDrawer (OEM Toyota 17801-F0050 & fitment proof)
│   │   │   └── evidence/          # EvidenceModal (OEM Manual citations) & Audit Report
│   │   ├── hooks/                 # useCamera, useSpeechRecognition
│   │   └── lib/                   # API client & Golden Ratio tokens
│   └── public/vehicles/rav4/      # High-res SVG engine bay perspectives & step schematics
│
├── docs/
│   ├── product.md                 # Complete Product Requirements Document (PRD)
│   └── architecture_spec.md       # Technical specification & API contracts
└── docker-compose.yml             # Single-command container deployment
```

---

## Quickstart (Local Development)

### 1. Prerequisites
- Python 3.12+ (or `uv`)
- Node.js 20+ & npm

### 2. Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```

Run tests:
```bash
PYTHONPATH=. pytest tests/
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Quickstart (Docker Compose)
```bash
docker-compose up --build
```

---

## Golden Path Demo Walkthrough (3-Minute Hackathon Judge Flow)

1. **Launch:** Open the HUD at [http://localhost:3000](http://localhost:3000). The 2022 Toyota RAV4 profile is pre-loaded.
2. **Perception:** Live camera feed (or test bench perspective) identifies the **Engine Air Cleaner Assembly**; SAM 3.1 casts a glowing polygon mask over the housing.
3. **Parts Finder:** Tap **Parts Finder** to view OEM Toyota `17801-F0050` and FRAM `CA12289` with verified fitment evidence.
4. **Step-by-Step Guidance:**
   - **Step 1:** Locate Air Cleaner Assembly. Tap **Verify State (Meta Muse)** -> State verified!
   - **Step 2:** Release retaining spring clips. Tap **Verify State** -> Latches disengaged verified!
   - **Step 3:** Lift upper housing lid -> Element exposed verified!
   - **Step 4:** Extract dirty filter element -> Lower tray clear verified!
   - **Step 5:** Install new genuine filter element -> Pleats seated flush verified!
   - **Step 6:** Relatch spring clips & seal box -> State machine signals **PROCEDURE COMPLETED**.
5. **Audit Report:** Tap **Audit Report** in header to inspect the complete provenance report with timestamps and verification confidence scores.
