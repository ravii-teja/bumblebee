"use client";

import React from "react";
import { RepairSession } from "@/lib/types";
import { X, FileCheck, Download } from "lucide-react";

interface SessionAuditModalProps {
  session: RepairSession;
  onClose: () => void;
}

export function SessionAuditModal({ session, onClose }: SessionAuditModalProps) {
  const isComplete = session.completed_steps.length >= session.procedure.steps.length;

  return (
    <div
      id="session-audit-modal"
      className="glass-panel"
      style={{
        position: "absolute",
        top: "clamp(68px, 10vh, 84px)",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "clamp(16px, 3vh, 24px)",
        width: "min(660px, calc(100vw - 24px))",
        maxWidth: "96vw",
        zIndex: 40,
        borderRadius: "var(--radius-lg)",
        padding: "clamp(14px, 2.5vw, 22px)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        border: "1px solid rgba(16, 185, 129, 0.35)",
        boxShadow: "0 16px 48px rgba(0, 0, 0, 0.8), 0 0 20px rgba(16, 185, 129, 0.12)"
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--status-verified)"
            }}
          >
            <FileCheck size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "#F8FAFC" }}>
              Bumblebee Session Provenance Report
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Session ID: {session.session_id} • Status: {session.status}
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

      {/* Overview Card */}
      <div
        style={{
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-3)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          fontSize: "12px"
        }}
      >
        <div>
          <span style={{ color: "var(--text-muted)" }}>Vehicle: </span>
          <span style={{ color: "#F8FAFC", fontWeight: 600 }}>
            {session.vehicle_profile.year} {session.vehicle_profile.make} {session.vehicle_profile.model}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Engine: </span>
          <span style={{ color: "#F8FAFC" }}>{session.vehicle_profile.engine}</span>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Procedure: </span>
          <span style={{ color: "#F8FAFC" }}>{session.procedure.title}</span>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Completed Steps: </span>
          <span style={{ color: isComplete ? "var(--status-verified)" : "var(--accent-amber)", fontWeight: 700 }}>
            {session.completed_steps.length} of {session.procedure.steps.length}
          </span>
        </div>
      </div>

      {/* Step Audit Verification Log */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <h4 style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>
          Step-by-Step Verification Audit Trail
        </h4>

        {session.procedure.steps.map((st) => {
          const isDone = session.completed_steps.includes(st.step_number);
          const ver = session.verifications[st.step_number];

          return (
            <div
              key={st.step_number}
              style={{
                background: "var(--bg-surface-2)",
                border: isDone ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: "12px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontWeight: 600, color: "#F8FAFC" }}>
                  Step {st.step_number}: {st.title}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: isDone ? "rgba(16, 185, 129, 0.2)" : "rgba(100, 116, 139, 0.2)",
                    color: isDone ? "var(--status-verified)" : "var(--text-muted)"
                  }}
                >
                  {isDone ? "VERIFIED" : "PENDING"}
                </span>
              </div>

              {ver && (
                <div style={{ fontSize: "11px", color: "#CBD5E1", marginTop: "2px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Visual Match: </span>
                  {ver.visual_evidence_description} ({Math.round(ver.confidence * 100)}% match)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Buttons */}
      <div style={{ display: "flex", gap: "var(--space-2)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--border-subtle)" }}>
        <button
          onClick={() => alert("Session audit report exported as PDF / JSON summary.")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
            color: "#FFF",
            fontSize: "12px",
            fontWeight: 600
          }}
        >
          <Download size={14} />
          Export Audit PDF
        </button>

        <button
          onClick={onClose}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface-2)",
            color: "var(--text-secondary)",
            fontSize: "12px"
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
