"use client";

import React from "react";
import { RepairStep, VerificationResult, DialoguePhase } from "@/lib/types";
import { CheckCircle2, AlertTriangle, Eye, ArrowRight, Sparkles, Wrench, RefreshCw, Layers } from "lucide-react";

interface ConversationalCardProps {
  phase: DialoguePhase;
  aiMessage: string;
  step?: RepairStep;
  totalSteps?: number;
  verification?: VerificationResult;
  isVerifying: boolean;
  onQuickResponse: (text: string) => void;
  onVerifyStep: () => void;
  onNextStep: () => void;
  onOpenParts: () => void;
}

export function ConversationalCard({
  phase,
  aiMessage,
  step,
  totalSteps = 6,
  verification,
  isVerifying,
  onQuickResponse,
  onVerifyStep,
  onNextStep,
  onOpenParts
}: ConversationalCardProps) {
  const isVerified = verification?.status === "VERIFIED";

  return (
    <div
      id="hud-conversational-card"
      className="glass-panel"
      style={{
        width: "500px",
        maxWidth: "92vw",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-3) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        border: isVerified ? "1px solid var(--border-verified)" : "1px solid var(--border-subtle)",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6), 0 0 1px 1px var(--border-subtle)",
        transition: "var(--transition-normal)"
      }}
    >
      {/* Phase Status Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Sparkles size={13} color="var(--accent-cyan)" />
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-cyan)", letterSpacing: "0.5px" }}>
            {phase === "SCAN_VEHICLE" || phase === "CONFIRM_MAKE"
              ? "CAMERA VEHICLE IDENTIFICATION"
              : phase === "ASK_MODEL_YEAR"
              ? "MODEL & YEAR DISCOVERY"
              : phase === "ASK_ISSUE"
              ? "SYMPTOM & ISSUE DIAGNOSIS"
              : phase === "ACTIVE_REPAIR" && step
              ? `STEP ${step.step_number} OF ${totalSteps}: ${step.title.toUpperCase()}`
              : "REPAIR SESSION"}
          </span>
        </div>

        {phase === "ACTIVE_REPAIR" && isVerified && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--status-verified)", fontSize: "11px", fontWeight: 600 }}>
            <CheckCircle2 size={13} />
            <span>VERIFIED</span>
          </div>
        )}
      </div>

      {/* Main AI Message / Step Instruction */}
      <div style={{ fontSize: "13px", color: "#F1F5F9", lineHeight: 1.5 }}>
        {phase === "ACTIVE_REPAIR" && step ? (
          <div>
            <div style={{ fontWeight: 600, color: "#FFFFFF", marginBottom: "4px" }}>
              {step.title}
            </div>
            <div style={{ color: "#CBD5E1" }}>
              {step.instruction}
            </div>

            {/* Safety Warning */}
            {step.safety_warning && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "6px",
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "#FDE68A",
                  marginTop: "6px"
                }}
              >
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: "1px", color: "var(--accent-amber)" }} />
                <span>{step.safety_warning}</span>
              </div>
            )}

            {/* Expected Visual State */}
            <div
              style={{
                marginTop: "6px",
                fontSize: "11px",
                color: "var(--text-secondary)",
                background: "rgba(15, 23, 42, 0.5)",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px dashed var(--border-subtle)"
              }}
            >
              <strong style={{ color: "var(--accent-cyan)" }}>Expected State: </strong>
              {step.expected_visual_state}
            </div>
          </div>
        ) : (
          <div style={{ whiteSpace: "pre-line" }}>
            {aiMessage}
          </div>
        )}
      </div>

      {/* Quick Action Chips & Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "2px" }}>
        {/* Phase 1: Confirm Make */}
        {phase === "CONFIRM_MAKE" && (
          <>
            <button
              onClick={() => onQuickResponse("Yes, that's correct")}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-pill)",
                background: "var(--accent-cyan)",
                color: "#0F172A",
                fontSize: "12px",
                fontWeight: 600
              }}
            >
              ✓ Confirm Detected Make
            </button>
            <button
              onClick={() => onQuickResponse("Honda")}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-pill)",
                background: "var(--bg-surface-2)",
                color: "#E2E8F0",
                border: "1px solid var(--border-subtle)",
                fontSize: "12px"
              }}
            >
              Honda
            </button>
            <button
              onClick={() => onQuickResponse("Ford")}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-pill)",
                background: "var(--bg-surface-2)",
                color: "#E2E8F0",
                border: "1px solid var(--border-subtle)",
                fontSize: "12px"
              }}
            >
              Ford
            </button>
            <button
              onClick={() => onQuickResponse("BMW")}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-pill)",
                background: "var(--bg-surface-2)",
                color: "#E2E8F0",
                border: "1px solid var(--border-subtle)",
                fontSize: "12px"
              }}
            >
              BMW
            </button>
            <button
              onClick={() => onQuickResponse("Toyota")}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-pill)",
                background: "var(--bg-surface-2)",
                color: "#E2E8F0",
                border: "1px solid var(--border-subtle)",
                fontSize: "12px"
              }}
            >
              Toyota
            </button>
          </>
        )}

        {/* Phase 2: Model & Year */}
        {phase === "ASK_MODEL_YEAR" && (
          <>
            <button
              onClick={() => onQuickResponse("2021 Civic")}
              style={{
                padding: "6px 13px",
                borderRadius: "var(--radius-pill)",
                background: "var(--accent-cyan)",
                color: "#0F172A",
                fontSize: "12px",
                fontWeight: 600
              }}
            >
              2021 Civic
            </button>
            <button
              onClick={() => onQuickResponse("2022 RAV4")}
              style={{
                padding: "6px 13px",
                borderRadius: "var(--radius-pill)",
                background: "var(--bg-surface-2)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
                fontSize: "12px"
              }}
            >
              2022 RAV4
            </button>
            <button
              onClick={() => onQuickResponse("2020 F-150")}
              style={{
                padding: "6px 13px",
                borderRadius: "var(--radius-pill)",
                background: "var(--bg-surface-2)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
                fontSize: "12px"
              }}
            >
              2020 F-150
            </button>
            <button
              onClick={() => onQuickResponse("2022 3 Series")}
              style={{
                padding: "6px 13px",
                borderRadius: "var(--radius-pill)",
                background: "var(--bg-surface-2)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
                fontSize: "12px"
              }}
            >
              2022 3-Series
            </button>
          </>
        )}

        {/* Phase 3: Ask Issue */}
        {phase === "ASK_ISSUE" && (
          <>
            <button
              onClick={() => onQuickResponse("Engine hesitation, sluggish acceleration and dropped fuel economy")}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-pill)",
                background: "var(--accent-cyan)",
                color: "#0F172A",
                fontSize: "11px",
                fontWeight: 600
              }}
            >
              Sluggish Accel / Low MPG
            </button>
            <button
              onClick={() => onQuickResponse("Need to inspect and replace dirty engine air filter")}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-pill)",
                background: "var(--bg-surface-2)",
                color: "#E2E8F0",
                border: "1px solid var(--border-subtle)",
                fontSize: "11px"
              }}
            >
              Inspect Air Cleaner Box
            </button>
          </>
        )}

        {/* Phase 4: Active Repair */}
        {phase === "ACTIVE_REPAIR" && step && (
          <>
            <button
              id="btn-verify-camera-state"
              onClick={onVerifyStep}
              disabled={isVerifying}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                borderRadius: "var(--radius-md)",
                background: isVerifying
                  ? "rgba(56, 189, 248, 0.3)"
                  : "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
                color: "#FFF",
                fontSize: "12px",
                fontWeight: 600,
                boxShadow: "0 0 14px rgba(56, 189, 248, 0.3)"
              }}
            >
              <Eye size={14} />
              {isVerifying ? "Verifying Camera..." : isVerified ? "Re-Verify State" : "Verify State (Meta Muse)"}
            </button>

            <button
              id="btn-next-step"
              onClick={onNextStep}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "7px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-subtle)",
                color: "#F8FAFC",
                fontSize: "12px",
                fontWeight: 500
              }}
            >
              <span>Next Step</span>
              <ArrowRight size={13} />
            </button>

            <button
              onClick={onOpenParts}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "7px 12px",
                borderRadius: "var(--radius-md)",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "var(--accent-amber)",
                fontSize: "11px",
                fontWeight: 600
              }}
            >
              <Wrench size={13} />
              <span>Parts &amp; Tools</span>
            </button>
          </>
        )}

        {/* Phase 5: Completed */}
        {phase === "COMPLETED" && (
          <button
            onClick={() => onQuickResponse("point camera at car")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "var(--radius-md)",
              background: "var(--status-verified)",
              color: "#0F172A",
              fontSize: "12px",
              fontWeight: 700
            }}
          >
            <RefreshCw size={13} />
            <span>Start New Inspection</span>
          </button>
        )}
      </div>
    </div>
  );
}
