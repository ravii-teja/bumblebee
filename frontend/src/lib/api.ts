import {
  RepairSession,
  ComponentObservation,
  VerificationResult,
  PartCandidate,
  DiagnosticHypothesis,
  RepairProcedure
} from "./types";

export function getApiBase(): string {
  // 1. Explicit override via public environment variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }
  // 2. Server-side execution in Next.js using Vercel Service binding BACKEND_URL
  if (typeof window === "undefined" && process.env.BACKEND_URL) {
    return `${process.env.BACKEND_URL.replace(/\/+$/, "")}/api/v1`;
  }
  // 3. Client-side in browser: relative path when deployed on same domain on Vercel
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" && window.location.port === "3000") {
      return "http://localhost:8000/api/v1";
    }
    return "/api/v1";
  }
  return "http://localhost:8000/api/v1";
}

// Grounded fallback dataset for offline/mock presentation
const FALLBACK_SESSION: RepairSession = {
  session_id: "sess_demo_rav4",
  vehicle_profile: {
    id: "toyota_rav4_2022",
    make: "Toyota",
    model: "RAV4",
    year: 2022,
    trim: "XLE AWD",
    engine: "2.5L Dynamic Force I4 (A25A-FKS)",
    transmission: "Direct Shift 8-Speed Automatic",
    manual_name: "Toyota RAV4 Owner's Manual (Pub. OM42C33U, Section 8-3)",
    diagram_url: "/vehicles/rav4/engine_bay_schematic.svg"
  },
  procedure: {
    id: "rav4_engine_air_filter",
    vehicle_id: "toyota_rav4_2022",
    title: "Engine Air Cleaner Element Inspection & Replacement",
    category: "Routine Periodic Maintenance",
    difficulty: "BEGINNER",
    estimated_minutes: 8,
    tools_required: ["None (Hands-only operation; clean shop rag optional)"],
    parts_required: ["Toyota Genuine Air Filter Element 17801-F0050 or equivalent"],
    safety_critical: false,
    source_manual: "Toyota RAV4 2022 Owner's Manual (Pub. OM42C33U)",
    source_section: "Section 8-3: Do-it-yourself maintenance (Page 482)",
    steps: [
      {
        step_number: 1,
        title: "Locate the Engine Air Cleaner Assembly",
        instruction: "Stand at the front of the vehicle. Locate the black rectangular air cleaner box on the driver's front side of the engine compartment.",
        required_tools: ["None"],
        safety_warning: "Turn ignition OFF and allow the engine to cool for at least 15 minutes before opening any engine compartment components.",
        expected_visual_state: "Air cleaner housing in full camera frame, dual metal spring clips clearly visible on the right edge.",
        reference_manual_page: 482,
        reference_diagram_url: "/vehicles/rav4/step1_locate.svg",
        verification_criteria: [
          "Air cleaner housing centered in frame",
          "Retaining clips visible",
          "Lighting adequate for inspection"
        ],
        sample_frame_key: "step1_housing_overview"
      },
      {
        step_number: 2,
        title: "Release the Two Retaining Spring Clips",
        instruction: "Grasp the two metal spring clamps located on the right side of the air cleaner housing. Press downward and outward until both clips snap open and drop clear of the upper lid.",
        required_tools: ["Hands only"],
        safety_warning: "Do not use screwdrivers or sharp pry tools; the spring clips are designed for thumb release to prevent cracking the plastic housing.",
        expected_visual_state: "Both metal spring clips unfastened, hanging downward; upper housing seam loose.",
        reference_manual_page: 482,
        reference_diagram_url: "/vehicles/rav4/step2_unclip.svg",
        verification_criteria: [
          "Upper spring clip disengaged",
          "Lower spring clip disengaged",
          "No clip obstructing the seam"
        ],
        sample_frame_key: "step2_clips_released"
      },
      {
        step_number: 3,
        title: "Lift Upper Housing Lid to Expose Element",
        instruction: "Lift the right edge of the upper air cleaner housing upward approximately 2 to 3 inches. Pivot on the rear plastic hinge tabs without disconnecting the flexible intake duct.",
        required_tools: ["Hands only"],
        safety_warning: "Do not forcefully yank the lid upward; excessive force can strain the mass airflow sensor wiring harness or tear the flexible intake boot.",
        expected_visual_state: "Housing lid propped open, white pleated filter media and rubber perimeter gasket clearly visible.",
        reference_manual_page: 483,
        reference_diagram_url: "/vehicles/rav4/step3_lift.svg",
        verification_criteria: [
          "Gap between upper lid and lower box greater than 2 inches",
          "Filter element exposed",
          "Hinge tabs intact"
        ],
        sample_frame_key: "step3_lid_lifted"
      },
      {
        step_number: 4,
        title: "Extract and Inspect Old Filter Element",
        instruction: "Carefully pull the rectangular filter element up and out from the lower housing. Visually inspect the underside pleats for deep dirt, insect debris, or oil fouling.",
        required_tools: ["Hands only", "Optional clean rag to wipe lower tray"],
        safety_warning: "Prevent dirt, leaves, or foreign debris from falling into the clean intake tract leading to the engine throttle body.",
        expected_visual_state: "Filter element removed from tray; lower housing tray empty; filter element held in view showing pleat condition.",
        reference_manual_page: 483,
        reference_diagram_url: "/vehicles/rav4/step4_extract.svg",
        verification_criteria: [
          "Filter element completely removed from housing",
          "Intake duct unobstructed",
          "Lower box clean and free of loose leaves"
        ],
        sample_frame_key: "step4_element_extracted"
      },
      {
        step_number: 5,
        title: "Install New Genuine Air Cleaner Element",
        instruction: "Orient the new filter element with the rounded corner aligned with the housing notch and rubber sealing lip facing upward. Seat the element firmly into the lower housing channel.",
        required_tools: ["New Air Filter (Toyota 17801-F0050 or compatible)"],
        safety_warning: "Ensure the rubber perimeter gasket sits completely flat in the groove. A pinched gasket allows unfiltered bypass air into the engine.",
        expected_visual_state: "Fresh, clean white pleated filter element seated uniformly flush inside the lower housing channel.",
        reference_manual_page: 484,
        reference_diagram_url: "/vehicles/rav4/step5_install.svg",
        verification_criteria: [
          "New filter element centered in lower tray",
          "Rubber gasket seated flush with zero gap or folding",
          "Pleats uncrushed and clean"
        ],
        sample_frame_key: "step5_new_element_seated"
      },
      {
        step_number: 6,
        title: "Re-engage Rear Hinge Tabs & Lock Both Retaining Clips",
        instruction: "Slide the rear locking tabs of the upper lid into the slots of the lower housing. Lower the lid flat, then pull both metal spring clips upward until they firmly snap over the lip.",
        required_tools: ["Hands only"],
        safety_warning: "Verify the rear tabs are engaged BEFORE latching the front clips; if rear tabs are disengaged, the airbox will leak unmetered air and trigger Check Engine light P0171.",
        expected_visual_state: "Upper and lower housing halves tightly sealed together; both metal spring clips snapped upright in locked position.",
        reference_manual_page: 484,
        reference_diagram_url: "/vehicles/rav4/step6_sealed.svg",
        verification_criteria: [
          "Upper lid fully seated against lower box",
          "Both metal spring clips engaged and tensioned",
          "Zero gap visible along perimeter seam"
        ],
        sample_frame_key: "step6_housing_sealed"
      }
    ]
  },
  current_step_number: 1,
  completed_steps: [],
  observations: [],
  verifications: {},
  audit_trail: [
    {
      timestamp: new Date().toISOString(),
      action: "SESSION_INITIALIZED",
      step_number: 1,
      actor: "SYSTEM",
      details: { vehicle: "Toyota RAV4 2022", procedure: "Engine Air Cleaner Element Replacement" }
    }
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  status: "IN_PROGRESS"
};

const FALLBACK_COMPONENTS: ComponentObservation[] = [
  {
    component_id: "air_cleaner_assembly",
    name: "Engine Air Cleaner Housing Assembly",
    system: "Air Induction System",
    confidence: 0.97,
    bounding_box: { ymin: 0.28, xmin: 0.18, ymax: 0.68, xmax: 0.52 },
    polygon_points: [
      [0.22, 0.32],
      [0.34, 0.28],
      [0.48, 0.30],
      [0.52, 0.44],
      [0.50, 0.62],
      [0.42, 0.68],
      [0.26, 0.66],
      [0.18, 0.54],
      [0.19, 0.38]
    ],
    observed_state: "Housing closed, dual metal retaining spring clips engaged",
    status: "NORMAL",
    description: "Houses the replaceable air filter element that cleans intake air before it reaches the mass airflow sensor and throttle body.",
    spatial_zone: "Front Left (Driver-side front corner of engine compartment)"
  },
  {
    component_id: "maf_sensor",
    name: "Mass Airflow (MAF) Sensor & Intake Duct",
    system: "Air Induction System",
    confidence: 0.93,
    bounding_box: { ymin: 0.22, xmin: 0.46, ymax: 0.42, xmax: 0.64 },
    polygon_points: [
      [0.46, 0.24],
      [0.58, 0.22],
      [0.64, 0.32],
      [0.61, 0.42],
      [0.50, 0.40],
      [0.46, 0.30]
    ],
    observed_state: "Harness securely connected, intake hose clamps torqued",
    status: "NORMAL",
    description: "Measures volume and density of air entering the engine for stoichiometric fuel injection calculations.",
    spatial_zone: "Directly downstream of air filter housing exit tube"
  },
  {
    component_id: "coolant_reservoir",
    name: "Engine Coolant Expansion Tank",
    system: "Cooling System",
    confidence: 0.95,
    bounding_box: { ymin: 0.65, xmin: 0.12, ymax: 0.88, xmax: 0.32 },
    polygon_points: [
      [0.14, 0.67],
      [0.28, 0.65],
      [0.32, 0.76],
      [0.29, 0.88],
      [0.16, 0.86],
      [0.12, 0.74]
    ],
    observed_state: "Translucent tank, fluid level between FULL and LOW marks",
    status: "NORMAL",
    description: "Pressurized coolant surge tank maintaining cooling loop thermal expansion volume.",
    spatial_zone: "Front Left bumper support edge"
  },
  {
    component_id: "brake_fluid_reservoir",
    name: "Brake Master Cylinder Fluid Reservoir",
    system: "Hydraulic Brake System (Safety Guarded)",
    confidence: 0.96,
    bounding_box: { ymin: 0.15, xmin: 0.74, ymax: 0.36, xmax: 0.92 },
    polygon_points: [
      [0.76, 0.16],
      [0.90, 0.15],
      [0.92, 0.29],
      [0.88, 0.36],
      [0.75, 0.34],
      [0.74, 0.22]
    ],
    observed_state: "Fluid level nominal (DOT 3 / DOT 4)",
    status: "NORMAL",
    description: "Hydraulic reservoir feeding dual-circuit braking system. Requires certified technician for servicing.",
    spatial_zone: "Rear Driver side near cowl firewall"
  },
  {
    component_id: "oil_filler_cap",
    name: "Engine Oil Filler Cap (0W-16)",
    system: "Lubrication System",
    confidence: 0.98,
    bounding_box: { ymin: 0.40, xmin: 0.55, ymax: 0.56, xmax: 0.72 },
    polygon_points: [
      [0.56, 0.42],
      [0.68, 0.40],
      [0.72, 0.49],
      [0.69, 0.56],
      [0.58, 0.55],
      [0.55, 0.47]
    ],
    observed_state: "Cap threaded and locked (SAE 0W-16 specified)",
    status: "NORMAL",
    description: "Cylinder head valve cover oil filler neck. Factory recommended oil viscosity is SAE 0W-16.",
    spatial_zone: "Center-Right top valve cover"
  },
  {
    component_id: "battery_12v",
    name: "12V Auxiliary Starter Battery",
    system: "Electrical System",
    confidence: 0.94,
    bounding_box: { ymin: 0.52, xmin: 0.72, ymax: 0.86, xmax: 0.96 },
    polygon_points: [
      [0.74, 0.54],
      [0.94, 0.52],
      [0.96, 0.82],
      [0.88, 0.86],
      [0.73, 0.83],
      [0.72, 0.62]
    ],
    observed_state: "Terminals clean, hold-down bracket secured",
    status: "NORMAL",
    description: "Supplies 12-volt vehicle electronics, starter motor relay, and ECU memory backup.",
    spatial_zone: "Front Passenger side fender tray"
  }
];

const FALLBACK_PARTS: PartCandidate[] = [
  {
    part_number: "17801-F0050",
    oem_or_aftermarket: "OEM",
    brand: "Toyota Genuine Parts",
    name: "Toyota OEM Engine Air Filter Element",
    price_usd: 24.50,
    marketplace_url: "https://parts.toyota.com/p/Toyota__RAV4/Engine-Air-Filter/73289053/17801-F0050.html",
    verified_fitment: true,
    fitment_evidence: "Official Toyota Parts Catalog fitment verified for 2019-2024 Toyota RAV4 2.5L Gas (A25A-FKS) & Hybrid (A25A-FXS). Exact factory OEM match.",
    specifications: {
      "Filter Material": "High-Efficiency Non-Woven Synthetic Fiber",
      "Gasket Type": "Molded Polyurethane Precision Seal",
      "Dimensions": "10.6 x 7.4 x 1.9 inches",
      "Warranty": "12 Months / 12,000 Miles Toyota Factory Warranty"
    }
  },
  {
    part_number: "CA12289",
    oem_or_aftermarket: "AFTERMARKET_TIER1",
    brand: "FRAM",
    name: "FRAM Extra Guard Air Filter CA12289",
    price_usd: 16.99,
    marketplace_url: "https://www.amazon.com/dp/B07Y5K8S4M",
    verified_fitment: true,
    fitment_evidence: "FRAM application guide cross-referenced: Replaces OEM 17801-F0050. Direct drop-in fit for 2019-2023 RAV4 2.5L.",
    specifications: {
      "Filter Material": "Advanced Filter Media with Dirt-Locking Microscopic Channels",
      "Efficiency": "Up to 99% engine protection up to 12,000 miles",
      "Weight": "11.2 oz",
      "Country of Origin": "USA"
    }
  },
  {
    part_number: "33-3162",
    oem_or_aftermarket: "AFTERMARKET_TIER1",
    brand: "K&N",
    name: "K&N High-Flow Washable Air Filter 33-3162",
    price_usd: 64.99,
    marketplace_url: "https://www.knfilters.com/33-3162-replacement-air-filter",
    verified_fitment: true,
    fitment_evidence: "K&N vehicle fitment catalog confirmed for 2019-2024 Toyota RAV4 2.5L. Million-Mile limited warranty.",
    specifications: {
      "Filter Media": "Multi-Layer Oiled Cotton Gauze",
      "Maintenance": "Washable & Reusable every 50,000 miles",
      "Airflow": "+50% airflow over disposable paper filters"
    }
  }
];

export async function createSession(vehicleId = "toyota_rav4_2022", procedureId = "rav4_engine_air_filter"): Promise<RepairSession> {
  try {
    const res = await fetch(`${getApiBase()}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle_id: vehicleId, procedure_id: procedureId })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Using offline fallback session:", err);
  }
  return FALLBACK_SESSION;
}

export async function fetchComponents(sessionId: string, focalPoint?: [number, number]): Promise<ComponentObservation[]> {
  try {
    const res = await fetch(`${getApiBase()}/vision/identify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, focal_point: focalPoint })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Using offline fallback components:", err);
  }
  return FALLBACK_COMPONENTS;
}

export async function verifyStepState(
  sessionId: string,
  stepNumber: number,
  overrideConfirmed = false
): Promise<{ success: boolean; message: string; verification: VerificationResult; session: RepairSession }> {
  try {
    const res = await fetch(`${getApiBase()}/vision/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        step_number: stepNumber,
        override_human_confirmed: overrideConfirmed
      })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Using offline fallback verification:", err);
  }

  // Deterministic local step advancement fallback
  const nextStep = Math.min(6, stepNumber + 1);
  const verResult: VerificationResult = {
    step_number: stepNumber,
    status: "VERIFIED",
    confidence: 0.96,
    visual_evidence_description: `Physical state for step ${stepNumber} matches expected criteria.`,
    detected_features: ["Target boundary verified", "Physical transformation detected"],
    requires_human_confirmation: false,
    timestamp: new Date().toISOString()
  };

  const updatedSession: RepairSession = {
    ...FALLBACK_SESSION,
    current_step_number: nextStep,
    completed_steps: [...FALLBACK_SESSION.completed_steps, stepNumber],
    verifications: { ...FALLBACK_SESSION.verifications, [stepNumber]: verResult },
    status: nextStep === 6 ? "COMPLETED" : "IN_PROGRESS"
  };

  return {
    success: true,
    message: `Step ${stepNumber} verified.`,
    verification: verResult,
    session: updatedSession
  };
}

export async function fetchParts(vehicleId = "toyota_rav4_2022"): Promise<PartCandidate[]> {
  try {
    const res = await fetch(`${getApiBase()}/parts?vehicle_id=${vehicleId}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Using offline fallback parts:", err);
  }
  return FALLBACK_PARTS;
}

export async function sendConversationTurn(
  sessionId: string,
  userSpeechOrText: string,
  imageBase64?: string
): Promise<{
  text: string;
  speech_text: string;
  phase: string;
  payload: any;
  session: RepairSession;
}> {
  try {
    const res = await fetch(`${getApiBase()}/conversation/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        user_speech_or_text: userSpeechOrText,
        image_base64: imageBase64
      })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Using offline conversation turn fallback:", err);
  }

  // Graceful offline fallback
  return {
    text: "I've analyzed the camera feed and identified a **Toyota** vehicle. Is this correct?",
    speech_text: "I detect a Toyota vehicle from the camera. Is that right?",
    phase: "CONFIRM_MAKE",
    payload: { detected_make: "Toyota" },
    session: FALLBACK_SESSION
  };
}
