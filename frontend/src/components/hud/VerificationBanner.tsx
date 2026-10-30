"use client";

import React from "react";
import { VerificationResult } from "@/lib/types";
import { CheckCircle2, HelpCircle, XCircle, Sparkles } from "lucide-react";

interface VerificationBannerProps {
  result: VerificationResult | null;
  onDismiss?: () => void;
}

export function VerificationBanner({ result }: VerificationBannerProps) {
  if (!result) return null;

  const isVerified = result.status === "VERIFIED";
  const isInconclusive = result.status === "INCONCLUSIVE";

  return (
    <div
      id="hud-verification-banner"
      className="glass-panel"
      style={{
        position: "absolute",
        top: "76px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 25,
        width: "560px",
        maxWidth: "92vw",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-3) var(--space-4)",
        border: isVerified
          ? "1px solid var(--border-verified)"
          : isInconclusive
          ? "1px solid var(--status-inconclusive)"
          : "1px solid var(--border-danger)",
        boxShadow: isVerified ? "var(--shadow-glow-emerald)" : "var(--shadow-hud)",
        animation: isVerified ? "pulse-emerald 2s infinite" : "none"
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}>
        <div style={{ marginTop: "2px" }}>
          {isVerified && <CheckCircle2 size={20} color="var(--status-verified)" />}
          {isInconclusive && <HelpCircle size={20} color="var(--status-inconclusive)" />}
          {!isVerified && !isInconclusive && <XCircle size={20} color="var(--status-danger)" />}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "var(--font-sm)",
                  color: isVerified ? "var(--status-verified)" : isInconclusive ? "var(--status-inconclusive)" : "var(--status-danger)"
                }}
              >
                {result.status}: STEP {result.step_number}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  background: "rgba(255, 255, 255, 0.1)",
                  padding: "1px 6px",
                  borderRadius: "var(--radius-pill)",
                  color: "var(--text-secondary)"
                }}
              >
                {Math.round(result.confidence * 100)}% Confidence
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--accent-cyan)" }}>
              <Sparkles size={12} />
              <span>Meta Muse Spark</span>
            </div>
          </div>

          <p style={{ fontSize: "12px", color: "#E2E8F0", lineHeight: 1.4, marginBottom: "6px" }}>
            {result.visual_evidence_description}
          </p>

          {result.detected_features && result.detected_features.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {result.detected_features.map((feat, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: "10px",
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid var(--border-subtle)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    color: "var(--text-secondary)"
                  }}
                >
                  ✓ {feat}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
