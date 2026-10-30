"use client";

import React from "react";
import { RepairStep, VerificationResult } from "@/lib/types";
import { CheckCircle2, AlertTriangle, Eye, Wrench } from "lucide-react";

interface StepGuidanceCardProps {
  step: RepairStep;
  totalSteps: number;
  verification?: VerificationResult;
  onVerify: () => Promise<void>;
  onManualOverride: () => Promise<void>;
  onReset?: () => void;
  isVerifying: boolean;
}

export function StepGuidanceCard({
  step,
  totalSteps,
  verification,
  onVerify,
  onManualOverride,
  isVerifying
}: StepGuidanceCardProps) {
  const isVerified = verification?.status === "VERIFIED";

  return (
    <div
      id="hud-step-guidance-card"
      className="glass-panel"
      style={{
        width: "480px",
        maxWidth: "92vw",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        border: isVerified ? "1px solid var(--border-verified)" : "1px solid var(--border-subtle)",
        transition: "var(--transition-normal)"
      }}
    >
      {/* Step Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "var(--radius-pill)",
              background: isVerified ? "var(--status-verified)" : "var(--accent-cyan)",
              color: "#0F172A",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.5px"
            }}
          >
            STEP {step.step_number} OF {totalSteps}
          </span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            Page {step.reference_manual_page}
          </span>
        </div>

        {isVerified && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "var(--status-verified)",
              fontSize: "12px",
              fontWeight: 600
            }}
          >
            <CheckCircle2 size={15} />
            <span>VERIFIED</span>
          </div>
        )}
      </div>

      {/* Step Title & Instruction */}
      <div>
        <h2 style={{ fontSize: "var(--font-md)", fontWeight: 600, color: "#F8FAFC", marginBottom: "6px" }}>
          {step.title}
        </h2>
        <p style={{ fontSize: "var(--font-base)", color: "#CBD5E1", lineHeight: 1.5 }}>
          {step.instruction}
        </p>
      </div>

      {/* Required Tools */}
      {step.required_tools.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
          <Wrench size={13} color="var(--accent-amber)" />
          <span style={{ color: "var(--text-muted)" }}>Tools:</span>
          <span>{step.required_tools.join(", ")}</span>
        </div>
      )}

      {/* Manufacturer Safety Warning */}
      {step.safety_warning && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            fontSize: "12px",
            color: "#FDE68A",
            lineHeight: 1.4
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "2px", color: "var(--accent-amber)" }} />
          <span>{step.safety_warning}</span>
        </div>
      )}

      {/* Expected Visual State Callout */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.5)",
          border: "1px dashed var(--border-subtle)",
          padding: "8px 12px",
          borderRadius: "var(--radius-sm)",
          fontSize: "12px"
        }}
      >
        <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>Expected Camera View: </span>
        <span style={{ color: "#E2E8F0" }}>{step.expected_visual_state}</span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "4px" }}>
        <button
          id="btn-verify-step"
          onClick={onVerify}
          disabled={isVerifying}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px 16px",
            borderRadius: "var(--radius-md)",
            background: isVerifying
              ? "rgba(56, 189, 248, 0.3)"
              : "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
            color: "#FFFFFF",
            fontSize: "var(--font-sm)",
            fontWeight: 600,
            boxShadow: isVerifying ? "none" : "0 0 16px rgba(56, 189, 248, 0.35)",
            transition: "var(--transition-fast)"
          }}
        >
          <Eye size={16} />
          {isVerifying ? "Analyzing Camera State..." : isVerified ? "Re-Verify Physical State" : "Verify State (Meta Muse)"}
        </button>

        <button
          id="btn-manual-override"
          onClick={onManualOverride}
          title="Manually confirm if camera angle is restricted"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface-2)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
            fontSize: "var(--font-sm)",
            transition: "var(--transition-fast)"
          }}
        >
          Confirm Override
        </button>
      </div>
    </div>
  );
}
