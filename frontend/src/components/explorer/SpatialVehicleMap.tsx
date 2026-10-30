"use client";

import React from "react";
import { ComponentObservation } from "@/lib/types";
import { X, ShieldAlert, CheckCircle2, Layers } from "lucide-react";

interface SpatialVehicleMapProps {
  components: ComponentObservation[];
  selectedComponent: ComponentObservation | null;
  onSelectComponent: (comp: ComponentObservation | null) => void;
  onClose: () => void;
}

export function SpatialVehicleMap({
  components,
  selectedComponent,
  onSelectComponent,
  onClose
}: SpatialVehicleMapProps) {
  return (
    <div
      id="spatial-vehicle-map-modal"
      className="glass-panel"
      style={{
        position: "absolute",
        top: "76px",
        left: "var(--space-4)",
        bottom: "var(--space-4)",
        width: "520px",
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
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Layers size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "#F8FAFC" }}>
            Spatial Component Explorer
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            color: "var(--text-muted)",
            padding: "4px",
            borderRadius: "var(--radius-sm)"
          }}
        >
          <X size={18} />
        </button>
      </div>

      <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
        Select a component to inspect its spatial hierarchy, system linkages, and safety clearance.
      </p>

      {/* Component List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)"
        }}
      >
        {components.map((comp) => {
          const isSelected = selectedComponent?.component_id === comp.component_id;
          const isSafetyGuarded = comp.system.toLowerCase().includes("safety") || comp.system.toLowerCase().includes("brake");

          return (
            <div
              key={comp.component_id}
              onClick={() => onSelectComponent(comp)}
              style={{
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: isSelected
                  ? "rgba(56, 189, 248, 0.12)"
                  : "var(--bg-surface-2)",
                border: isSelected
                  ? "1px solid var(--accent-cyan)"
                  : isSafetyGuarded
                  ? "1px solid rgba(239, 68, 68, 0.3)"
                  : "1px solid var(--border-subtle)",
                cursor: "pointer",
                transition: "var(--transition-fast)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontWeight: 600, fontSize: "13px", color: isSelected ? "var(--accent-cyan)" : "#F8FAFC" }}>
                  {comp.name}
                </span>

                {isSafetyGuarded ? (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      fontSize: "10px",
                      color: "var(--status-danger)",
                      background: "rgba(239, 68, 68, 0.15)",
                      padding: "2px 6px",
                      borderRadius: "var(--radius-pill)"
                    }}
                  >
                    <ShieldAlert size={11} />
                    Guarded
                  </span>
                ) : (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      fontSize: "10px",
                      color: "var(--status-verified)",
                      background: "rgba(16, 185, 129, 0.15)",
                      padding: "2px 6px",
                      borderRadius: "var(--radius-pill)"
                    }}
                  >
                    <CheckCircle2 size={11} />
                    Verified
                  </span>
                )}
              </div>

              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                System: <span style={{ color: "var(--text-secondary)" }}>{comp.system}</span> • Zone: {comp.spatial_zone}
              </div>

              <p style={{ fontSize: "12px", color: "#CBD5E1", lineHeight: 1.4 }}>
                {comp.description}
              </p>

              {comp.observed_state && (
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "11px",
                    background: "rgba(15, 23, 42, 0.5)",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    color: "var(--accent-cyan)"
                  }}
                >
                  Observed State: {comp.observed_state}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
