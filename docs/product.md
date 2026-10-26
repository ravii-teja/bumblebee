# MUSE FIELD — Product Specification & PRD
**Theme:** Meta AI Developer Hackathon — Push the Frontier  
**Tagline:** Point. Understand. Repair. Verify.  
**Design Philosophy:** Google Minimalist Engineering meets Cyber-Physical HUD (Golden Ratio Spacing & Proportions)

---

## 1. Executive Summary & Vision

MUSE FIELD is a multimodal physical-AI automotive repair assistant powered by **Meta Muse Spark** and **SAM 3.1 (Segment Anything)**. It enables vehicle owners, roadside assistance operators, and field technicians to:
1. **Point** a live smartphone/tablet camera at any vehicle compartment (e.g., engine bay, cabin filter housing).
2. **Understand** the spatial location, function, and condition of components through real-time pixel-level segmentation.
3. **Diagnose** non-safety-critical issues using multimodal symptom analysis grounded in manufacturer documentation.
4. **Retrieve** OEM repair manuals, step-by-step procedures, and verified compatible parts.
5. **Repair & Verify** through an interactive, visually grounded procedure engine that verifies physical state transitions step-by-step.

---

## 2. Core Design Principles

### Google Minimalist Architecture & Golden Ratio ($\phi \approx 1.618$)
- **Intentional Restraint & Calm Focus:** Pure utility without decorative noise. The camera viewport is the canvas; HUD elements float gracefully on tonal surfaces with subtle elevations.
- **Golden Ratio Scale System:**
  - Layout Grid: Split views strictly follow $\phi$ proportions (Primary HUD: 61.8%, Telemetry / Inspector Drawer: 38.2%).
  - Spacing Scale ($\phi$ Base 8): `5px`, `8px`, `13px`, `21px`, `34px`, `55px`, `89px`.
  - Type Scale: Derived through golden ratio harmonic steps ($1.25$ or $1.618$ intervals: `11px`, `13px`, `16px`, `20px`, `26px`, `34px`, `42px`).
- **Color & Tonal Depth (Google Material You + Precision Engineering):**
  - Surface Dark Base: `#0B0F17` (Deep Obsidian Void)
  - Surface Container / Elevated: `rgba(22, 27, 38, 0.75)` with backdrop-filter blur (Glassmorphism)
  - Primary Tonal Accent: `#38BDF8` (Precision Cyan) & `#F59E0B` (Field Amber Reticle)
  - Verification Success: `#10B981` (Grounded Emerald)
  - Safety Alert / Warning: `#EF4444` (Caution Crimson)
  - Typography: Crisp modern sans-serif (`Inter`, `Google Sans`, `Roboto Flex`) with high legibility on outdoor glare conditions.

---

## 3. Product Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │               MUSE FIELD HUD                 │
                    │  (Next.js 14 / TypeScript / Canvas Overlays) │
                    └──────────────────────┬───────────────────────┘
                                           │
                        WebRTC Frame Stream / Actions
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │          FastAPI Orchestration Core          │
                    │   - Deterministic Repair State Machine       │
                    │   - Non-Safety Guardrails & Audit Logger     │
                    └──────┬───────────────┬───────────────┬───────┘
                           │               │               │
            ┌──────────────▼──────┐ ┌──────▼──────┐ ┌──────▼─────────────┐
            │   Meta Muse Spark   │ │   SAM 3.1   │ │   Grounded Data    │
            │ Multimodal Reasoning│ │ Segmentation│ │ - OEM Manual RAG   │
            │ State Verification  │ │ Polygon Mask│ │ - Parts Fitment DB │
            └─────────────────────┘ └─────────────┘ └────────────────────┘
```

---

## 4. Key Product Features

### 4.1 Camera-Based Component Identification & Grounding
- Live video/frame ingestion with automated brightness/focus analysis.
- Meta Muse Spark identifies candidate automotive components.
- SAM 3.1 creates interactive polygon masks rendered on an overlaid HTML5 canvas.
- Hovering or tapping a component highlights its boundary and reveals its name, parent system, and status.

### 4.2 Spatial Vehicle Explorer
- Seamless toggle between AR Camera View and 2D Interactive Schematic of the vehicle engine bay.
- Demonstrates structural hierarchy: e.g., Air Intake System -> Air Filter Housing -> Mass Airflow Sensor -> Throttle Body.

### 4.3 Grounded Knowledge Retrieval & Diagnostic Engine
- RAG pipeline indexed over official manufacturer service manuals.
- Every instruction, torque spec, and caution note links directly to its verified source manual page and diagram.

### 4.4 Verified Parts Finder
- Pulls genuine OEM part numbers and cross-referenced aftermarket alternatives (FRAM, Bosch, Mobil1).
- Strict verification rule: Never display a part as "Compatible" without manufacturer fitment confirmation.

### 4.5 Deterministic Interactive Repair Guide & Visual Verification
- Sequential state machine (cannot skip required safety steps).
- Visual verification after each step: Muse Spark compares camera view against expected visual state.
- Three clear verification states:
  - `VERIFIED`: Visible physical change confirmed (e.g., clamp released, filter seated).
  - `INCONCLUSIVE`: Camera angle obscured or low lighting; requests adjustment or manual technician override.
  - `MISMATCH`: Incorrect component touched or warning condition observed.

### 4.6 Safety Guardrails & Provenance Logging
- Safety-critical procedures (brakes, high-voltage EV/hybrid batteries, steering linkages) are explicitly barred with safe redirection.
- Complete audit trail of all steps, timestamps, images captured, and citations.

---

## 5. Showcase Vehicle & Hackathon Golden Path

- **Vehicle:** 2022 Toyota RAV4 2.5L 4-Cylinder Gas/Hybrid (A25A-FKS)
- **Scenario:** Engine Air Cleaner Element Inspection & Replacement (Toyota Manual Section 8-3)
- **Parts:** OEM Part `17801-F0050` / FRAM `CA12289`
- **Verification Milestones:**
  1. Box Identified & Highlighted via SAM 3.1
  2. Spring Retaining Clips Unlatched (State: Latches Open)
  3. Filter Element Extracted (State: Element Removed / Housing Open)
  4. New Element Seated & Clips Relatched (State: Housing Sealed)

---

## 6. Monorepo Structure

```
meta-hackathon-2026/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── api/v1/           # Endpoints for vision, diagnostics, procedures, parts
│   │   ├── core/             # State machine, safety guard, audit logger
│   │   ├── models/           # Pydantic models & schemas
│   │   ├── services/         # Meta Muse Spark, SAM 3.1, Manual RAG, Parts Finder
│   │   └── mock_data/        # Deterministic showcase data for RAV4
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # Next.js 14 HUD application
│   ├── src/
│   │   ├── app/              # Layout, vehicle picker, HUD chamber
│   │   ├── components/       # Camera, SAM Overlay, Step Guidance, Spatial Map, Parts
│   │   ├── hooks/            # useCamera, useSpeechRecognition, useRepairSession
│   │   └── lib/              # API client, types, golden ratio tokens
│   ├── public/               # Diagrams, manual assets, test frames
│   └── package.json
└── docs/
    ├── product.md            # This product specification
    └── architecture_spec.md  # Detailed architecture & API docs
```
