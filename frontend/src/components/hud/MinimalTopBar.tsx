"use client";

import React from "react";
import { VehicleProfile } from "@/lib/types";
import { Cpu, Wrench, BookOpen, FileText, Volume2, VolumeX, ShieldCheck } from "lucide-react";

interface MinimalTopBarProps {
  vehicle: VehicleProfile;
  phase: string;
  isTtsMuted: boolean;
  onToggleMute: () => void;
  onOpenParts: () => void;
  onOpenManual: () => void;
  onOpenSummary: () => void;
  completedStepsCount: number;
  totalStepsCount: number;
}

export function MinimalTopBar({
  vehicle,
  phase,
  isTtsMuted,
  onToggleMute,
  onOpenParts,
  onOpenManual,
  onOpenSummary,
  completedStepsCount,
  totalStepsCount
}: MinimalTopBarProps) {
  const getPhaseLabel = () => {
    switch (phase) {
      case "SCAN_VEHICLE":
      case "CONFIRM_MAKE":
        return "Camera Pointed • Brand Detection";
      case "ASK_MODEL_YEAR":
        return `${vehicle.make || "Toyota"} • Model & Year`;
      case "ASK_ISSUE":
        return `${vehicle.year} ${vehicle.make} ${vehicle.model} • Symptom Diagnosis`;
      case "ACTIVE_REPAIR":
        return `${vehicle.year} ${vehicle.make} ${vehicle.model} • Step ${completedStepsCount + 1}/${totalStepsCount}`;
      case "COMPLETED":
        return "Inspection & Repair Complete";
      default:
        return "MUSE FIELD Active";
    }
  };

  return (
    <div
      id="minimal-hud-top-bar"
      style={{
        position: "absolute",
        top: "var(--space-4)",
        left: "var(--space-4)",
        right: "var(--space-4)",
        zIndex: 25,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        pointerEvents: "none"
      }}
    >
      {/* Brand & Phase Pill */}
      <div
        className="glass-panel"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 14px",
          borderRadius: "var(--radius-pill)",
          pointerEvents: "auto"
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "6px",
            background: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFF"
          }}
        >
          <Cpu size={14} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontWeight: 700, fontSize: "12px", letterSpacing: "0.5px", color: "#F8FAFC" }}>
            MUSE FIELD
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>•</span>
          <span style={{ fontSize: "12px", color: "var(--accent-cyan)", fontWeight: 500 }}>
            {getPhaseLabel()}
          </span>
        </div>
      </div>

      {/* Quick Action Navigation Overlays (Minimalist Floating Chips) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          pointerEvents: "auto"
        }}
      >
        {phase === "ACTIVE_REPAIR" && (
          <>
            <button
              onClick={onOpenParts}
              className="glass-panel"
              title="Verified Replacement Parts & Materials"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "var(--radius-pill)",
                fontSize: "11px",
                fontWeight: 500,
                color: "#E2E8F0",
                transition: "var(--transition-fast)"
              }}
            >
              <Wrench size={13} color="var(--accent-amber)" />
              <span>Parts</span>
            </button>

            <button
              onClick={onOpenManual}
              className="glass-panel"
              title="OEM Manual & Specifications"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "var(--radius-pill)",
                fontSize: "11px",
                fontWeight: 500,
                color: "#E2E8F0",
                transition: "var(--transition-fast)"
              }}
            >
              <BookOpen size={13} color="var(--accent-cyan)" />
              <span>Manual</span>
            </button>
          </>
        )}

        <button
          onClick={onOpenSummary}
          className="glass-panel"
          title="Session Dossier & Audit Log"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 12px",
            borderRadius: "var(--radius-pill)",
            fontSize: "11px",
            fontWeight: 500,
            color: "#E2E8F0",
            transition: "var(--transition-fast)"
          }}
        >
          <FileText size={13} color="var(--status-verified)" />
          <span>Session Log</span>
        </button>

        <button
          onClick={onToggleMute}
          className="glass-panel"
          title={isTtsMuted ? "Unmute Voice Guidance" : "Mute Voice Guidance"}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isTtsMuted ? "var(--text-muted)" : "var(--accent-cyan)",
            transition: "var(--transition-fast)"
          }}
        >
          {isTtsMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>
    </div>
  );
}
