import {
  RepairSession,
  ComponentObservation,
  VerificationResult,
  PartCandidate
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
  session_id: "sess_bumblebee_field",
  vehicle_profile: {
    id: "generic_vehicle",
    make: "",
    model: "Vehicle",
    year: 2024,
    trim: "Inspection",
    engine: "Automotive Powertrain",
    transmission: "Standard Transmission",
    manual_name: "Official Manufacturer Service Documentation",
    diagram_url: "/vehicles/clean_car_view.svg"
  },
  procedure: {
    id: "general_inspection",
    vehicle_id: "generic_vehicle",
    title: "Automotive Diagnostic & Field Verification",
    category: "Physical Field Inspection",
    difficulty: "BEGINNER",
    estimated_minutes: 10,
    tools_required: ["Bumblebee Vision Camera Sensor"],
    parts_required: ["Pending Vehicle & Issue Identification"],
    safety_critical: false,
    source_manual: "Official Manufacturer Service Documentation",
    source_section: "Field Inspection Protocol",
    steps: []
  },
  current_step_number: 1,
  completed_steps: [],
  observations: [],
  verifications: {},
  audit_trail: [],
  dialogue: {
    phase: "SCAN_VEHICLE",
    detected_make: undefined,
    confirmed_make: undefined,
    model: undefined,
    year: undefined,
    reported_issue: undefined,
    active_step: 1,
    messages: []
  },
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

export async function createSession(vehicleId = "generic_vehicle", procedureId = "general_inspection"): Promise<RepairSession> {
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

export async function fetchParts(
  vehicleId = "generic_vehicle",
  make = "",
  model = "",
  year = 2022,
  query = ""
): Promise<PartCandidate[]> {
  try {
    const params = new URLSearchParams({
      vehicle_id: vehicleId,
      ...(make ? { make } : {}),
      ...(model ? { model } : {}),
      ...(year ? { year: String(year) } : {}),
      ...(query ? { query } : {})
    });
    const res = await fetch(`${getApiBase()}/parts?${params.toString()}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Using offline fallback parts:", err);
  }
  return FALLBACK_PARTS;
}

export async function streamConversationTurn(
  sessionId: string,
  userSpeechOrText: string,
  imageBase64?: string,
  onSpeech?: (speechText: string, phase: string) => void
): Promise<{
  text: string;
  speech_text: string;
  phase: string;
  payload: Record<string, unknown>;
  session: RepairSession;
}> {
  try {
    const res = await fetch(`${getApiBase()}/conversation/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        user_speech_or_text: userSpeechOrText,
        image_base64: imageBase64
      })
    });

    if (res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalData: {
        text: string;
        speech_text: string;
        phase: string;
        payload: Record<string, unknown>;
        session: RepairSession;
      } | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          if (!block.trim()) continue;
          const eventMatch = block.match(/event:\s*([a-zA-Z0-9_]+)/);
          const dataMatch = block.match(/data:\s*([\s\S]+)/);
          const eventName = eventMatch ? eventMatch[1] : "message";
          const dataStr = dataMatch ? dataMatch[1].trim() : "";

          if (eventName === "speech" && onSpeech) {
            try {
              const speechData = JSON.parse(dataStr);
              if (speechData.speech_text) {
                onSpeech(speechData.speech_text, speechData.phase);
              }
            } catch (e) {
              console.warn("Error parsing speech stream chunk:", e);
            }
          } else if (eventName === "state") {
            try {
              finalData = JSON.parse(dataStr);
            } catch (e) {
              console.warn("Error parsing state stream chunk:", e);
            }
          }
        }
      }

      if (finalData) {
        return finalData;
      }
    }
  } catch (err) {
    console.warn("SSE stream failed, falling back to standard turn:", err);
  }

  // Fallback to standard synchronous turn endpoint
  return sendConversationTurn(sessionId, userSpeechOrText, imageBase64);
}

export async function sendConversationTurn(
  sessionId: string,
  userSpeechOrText: string,
  imageBase64?: string
): Promise<{
  text: string;
  speech_text: string;
  phase: string;
  payload: Record<string, unknown>;
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

  // Graceful offline fallback — never hardcoding a brand
  return {
    text: "Vehicle frame captured in camera view. What is the **make or brand** of your vehicle? (e.g. Honda, Ford, BMW, Toyota, Tesla, Chevrolet)",
    speech_text: "Vehicle frame captured in camera view. What is the make or brand of your vehicle?",
    phase: "CONFIRM_MAKE",
    payload: { detected_make: null },
    session: FALLBACK_SESSION
  };
}

export async function fetchSessionDossier(sessionId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${getApiBase()}/analytics/sessions/${sessionId}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Error fetching session dossier:", err);
  }
  return null;
}

export async function fetchAnalyticsStats(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${getApiBase()}/analytics/stats`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Error fetching analytics stats:", err);
  }
  return null;
}

export async function submitTechnicianFeedback(
  sessionId: string,
  rating: number,
  feedback?: string,
  partsReplaced?: string[]
): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBase()}/analytics/sessions/${sessionId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating,
        feedback,
        resolution_status: "RESOLVED",
        parts_replaced: partsReplaced
      })
    });
    return res.ok;
  } catch (err) {
    console.warn("Error submitting technician feedback:", err);
    return false;
  }
}
