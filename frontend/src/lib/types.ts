export interface VehicleProfile {
  id: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  engine: string;
  transmission: string;
  vin_sample?: string;
  manual_name: string;
  diagram_url: string;
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface ComponentObservation {
  component_id: string;
  name: string;
  system: string;
  confidence: number;
  bounding_box: BoundingBox;
  polygon_points: number[][]; // [[x, y], ...] normalized 0-1
  wireframe_points?: number[][];
  observed_state: string;
  status: "NORMAL" | "ATTENTION" | "NEEDS_REPLACEMENT" | "UNKNOWN";
  description: string;
  spatial_zone: string;
}

export interface RepairStep {
  step_number: number;
  title: string;
  instruction: string;
  required_tools: string[];
  safety_warning?: string;
  expected_visual_state: string;
  reference_manual_page: number;
  reference_diagram_url?: string;
  verification_criteria: string[];
  sample_frame_key?: string;
}

export interface RepairProcedure {
  id: string;
  vehicle_id: string;
  title: string;
  category: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  estimated_minutes: number;
  steps: RepairStep[];
  tools_required: string[];
  parts_required: string[];
  safety_critical: boolean;
  source_manual: string;
  source_section: string;
}

export interface PartCandidate {
  part_number: string;
  oem_or_aftermarket: "OEM" | "AFTERMARKET_TIER1" | "AFTERMARKET_STANDARD";
  brand: string;
  name: string;
  price_usd: number;
  marketplace_url: string;
  image_url?: string;
  verified_fitment: boolean;
  fitment_evidence: string;
  specifications: Record<string, string>;
}

export interface VerificationResult {
  step_number: number;
  status: "VERIFIED" | "INCONCLUSIVE" | "MISMATCH";
  confidence: number;
  visual_evidence_description: string;
  detected_features: string[];
  requires_human_confirmation: boolean;
  timestamp: string;
}

export interface AuditEvent {
  timestamp: string;
  action: string;
  step_number?: number;
  actor: "SYSTEM" | "USER" | "META_MUSE" | "SAM_3_1";
  details: Record<string, unknown>;
}

export type DialoguePhase =
  | "SCAN_VEHICLE"
  | "CONFIRM_MAKE"
  | "ASK_MODEL_YEAR"
  | "ASK_ISSUE"
  | "ANALYZING_ISSUE"
  | "ACTIVE_REPAIR"
  | "COMPLETED";

export interface DialogueMessage {
  sender: "USER" | "AI";
  text: string;
  speech_text?: string;
  phase: DialoguePhase;
  timestamp: string;
}

export interface DialogueState {
  phase: DialoguePhase;
  detected_make?: string;
  confirmed_make?: string;
  model?: string;
  year?: number;
  reported_issue?: string;
  hypothesis?: DiagnosticHypothesis;
  solution_plan?: RepairProcedure;
  active_step: number;
  messages: DialogueMessage[];
}

export interface RepairSession {
  session_id: string;
  vehicle_profile: VehicleProfile;
  procedure: RepairProcedure;
  current_step_number: number;
  completed_steps: number[];
  observations: ComponentObservation[];
  verifications: Record<number, VerificationResult>;
  audit_trail: AuditEvent[];
  dialogue?: DialogueState;
  created_at: string;
  updated_at: string;
  status: "IN_PROGRESS" | "COMPLETED" | "HALTED_SAFETY";
}

export interface DiagnosticHypothesis {
  id: string;
  symptom: string;
  hypothesis_title: string;
  description: string;
  confidence: number;
  supporting_evidence: string[];
  recommended_checks: string[];
  safety_level: "NON_SAFETY_CRITICAL" | "CAUTION_REQUIRED" | "SAFETY_CRITICAL";
  manual_citation: string;
  target_component_id?: string;
}
