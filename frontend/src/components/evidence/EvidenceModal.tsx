"use client";

import React from "react";
import { VehicleProfile } from "@/lib/types";
import { X, BookOpen, AlertOctagon } from "lucide-react";

interface EvidenceModalProps {
  vehicle?: VehicleProfile;
  onClose: () => void;
}

export function EvidenceModal({ vehicle, onClose }: EvidenceModalProps) {
  const make = vehicle?.make || "OEM";
  const model = vehicle?.model || "Vehicle";
  const year = vehicle?.year || 2022;

  return (
    <div
      id="evidence-provenance-modal"
      className="glass-panel"
      style={{
        position: "absolute",
        top: "clamp(68px, 10vh, 84px)",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "clamp(16px, 3vh, 24px)",
        width: "min(620px, calc(100vw - 24px))",
        maxWidth: "96vw",
        zIndex: 40,
        borderRadius: "var(--radius-lg)",
        padding: "clamp(14px, 2.5vw, 22px)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        border: "1px solid rgba(56, 189, 248, 0.3)",
        boxShadow: "0 16px 48px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.12)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(56, 189, 248, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-cyan)"
            }}
          >
            <BookOpen size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "#F8FAFC" }}>
              Bumblebee OEM Service Evidence
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              {year} {make} {model} Technical Information System &amp; Service Manual
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            color: "var(--text-muted)",
            padding: "8px",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer"
          }}
        >
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
        {/* Section: Do-it-yourself Maintenance */}
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
              {make} Field Service Manual: Air Cleaner Filter Inspection
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Section: Air Induction</span>
          </div>

          <p style={{ fontSize: "12px", color: "#CBD5E1", lineHeight: 1.5, marginBottom: "8px" }}>
            <strong>Inspection Interval:</strong> Inspect every 15,000 miles (24,000 km) or 12 months. Replace filter element immediately if pleats are saturated with grit, carbon, or foreign debris. Always verify that perimeter rubber gasket seals tightly without gaps.
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
              <strong>Manufacturer Notice:</strong> Never run engine with air cleaner element removed. Particulate intrusion causes permanent cylinder wall abrasion, turbo vane damage, and fouled mass airflow sensor metering.
            </div>
          </div>
        </div>

        {/* Section: Specifications */}
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
              {year} {make} {model} Engineering Specifications
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Factory Reference</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
            <div style={{ background: "rgba(15, 23, 42, 0.5)", padding: "6px 8px", borderRadius: "4px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>Powertrain Spec</div>
              <div style={{ color: "#F8FAFC", fontWeight: 600 }}>{vehicle?.engine || "Factory Powertrain"}</div>
            </div>
            <div style={{ background: "rgba(15, 23, 42, 0.5)", padding: "6px 8px", borderRadius: "4px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>OEM Filter Standard</div>
              <div style={{ color: "var(--status-verified)", fontWeight: 600 }}>{make} OEM Spec</div>
            </div>
            <div style={{ background: "rgba(15, 23, 42, 0.5)", padding: "6px 8px", borderRadius: "4px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>Air Induction Type</div>
              <div style={{ color: "#F8FAFC", fontWeight: 600 }}>Naturally Aspirated / Turbocharged</div>
            </div>
            <div style={{ background: "rgba(15, 23, 42, 0.5)", padding: "6px 8px", borderRadius: "4px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>MAF Sensor Type</div>
              <div style={{ color: "#F8FAFC", fontWeight: 600 }}>Digital Thermal Anemometer</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
