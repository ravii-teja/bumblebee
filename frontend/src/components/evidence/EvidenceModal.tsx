"use client";

import React from "react";
import { X, BookOpen, AlertOctagon, FileText } from "lucide-react";

interface EvidenceModalProps {
  onClose: () => void;
}

export function EvidenceModal({ onClose }: EvidenceModalProps) {
  return (
    <div
      id="evidence-provenance-modal"
      className="glass-panel"
      style={{
        position: "absolute",
        top: "76px",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "var(--space-4)",
        width: "600px",
        maxWidth: "92vw",
        zIndex: 25,
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        border: "1px solid var(--border-subtle)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <BookOpen size={18} color="var(--accent-cyan)" />
          <div>
            <h3 style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "#F8FAFC" }}>
              Manufacturer Service Documentation
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Toyota Technical Information System (TIS) • Publication OM42C33U
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{ color: "var(--text-muted)", padding: "4px" }}>
          <X size={18} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)"
        }}
      >
        {/* Section 8-3 Citation */}
        <div
          style={{
            background: "var(--bg-surface-2)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--accent-cyan)" }}>
              Section 8-3: Do-it-yourself Maintenance — Air Cleaner Filter
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Page 482 - 484</span>
          </div>

          <p style={{ fontSize: "12px", color: "#CBD5E1", lineHeight: 1.5, marginBottom: "8px" }}>
            <strong>Inspection Interval:</strong> Inspect every 15,000 miles (24,000 km) or 18 months. Replace every 30,000 miles (48,000 km) or 36 months under standard operation; or every 15,000 miles if operating in dusty roads.
          </p>

          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              padding: "8px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              color: "#FCA5A5",
              display: "flex",
              alignItems: "flex-start",
              gap: "6px"
            }}
          >
            <AlertOctagon size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong>Manufacturer Notice:</strong> Never run the engine with the air cleaner filter removed. Doing so will cause severe piston ring abrasion and turbo/intake contamination from unmetered atmospheric particulates.
            </div>
          </div>
        </div>

        {/* Section 9-1 Specifications */}
        <div
          style={{
            background: "var(--bg-surface-2)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--accent-cyan)" }}>
              Section 9-1: Vehicle Specifications &amp; Maintenance Data
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Page 536</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
            <div style={{ background: "rgba(15, 23, 42, 0.5)", padding: "6px 8px", borderRadius: "4px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>Engine Code</div>
              <div style={{ color: "#F8FAFC", fontWeight: 600 }}>A25A-FKS 2.5L DOHC</div>
            </div>
            <div style={{ background: "rgba(15, 23, 42, 0.5)", padding: "6px 8px", borderRadius: "4px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>OEM Filter Part Number</div>
              <div style={{ color: "var(--status-verified)", fontWeight: 600 }}>17801-F0050</div>
            </div>
            <div style={{ background: "rgba(15, 23, 42, 0.5)", padding: "6px 8px", borderRadius: "4px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>Engine Oil Specification</div>
              <div style={{ color: "#F8FAFC", fontWeight: 600 }}>SAE 0W-16 (ILSAC GF-6B)</div>
            </div>
            <div style={{ background: "rgba(15, 23, 42, 0.5)", padding: "6px 8px", borderRadius: "4px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>Intake Air Sensor</div>
              <div style={{ color: "#F8FAFC", fontWeight: 600 }}>Hot-wire MAF Sensor</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
