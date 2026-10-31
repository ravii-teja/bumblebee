"use client";

import React, { useState, useEffect } from "react";
import { RepairSession } from "@/lib/types";
import { fetchSessionDossier, submitTechnicianFeedback } from "@/lib/api";
import { X, FileCheck, Download, Star, Database, Camera, MessageSquare, CheckCircle2 } from "lucide-react";

interface SessionAuditModalProps {
  session: RepairSession;
  onClose: () => void;
}

export function SessionAuditModal({ session, onClose }: SessionAuditModalProps) {
  const isComplete = session.completed_steps.length >= session.procedure.steps.length;
  const [dossier, setDossier] = useState<Record<string, unknown> | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    async function loadDossier() {
      const data = await fetchSessionDossier(session.session_id);
      if (data) {
        setDossier(data);
      }
    }
    loadDossier();
  }, [session.session_id]);

  const imagesCount = Array.isArray(dossier?.images) ? dossier.images.length : 0;
  const turnsCount = Array.isArray(dossier?.turns) ? dossier.turns.length : (session.dialogue?.messages?.length || 0);

  const handleSubmitFeedback = async () => {
    setIsSubmitting(true);
    const success = await submitTechnicianFeedback(session.session_id, rating, feedbackText);
    setIsSubmitting(false);
    if (success) {
      setFeedbackSubmitted(true);
    }
  };

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
        width: "min(680px, calc(100vw - 24px))",
        maxWidth: "96vw",
        zIndex: 40,
        borderRadius: "var(--radius-lg)",
        padding: "clamp(14px, 2.5vw, 22px)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        border: "1px solid rgba(16, 185, 129, 0.35)",
        boxShadow: "0 16px 48px rgba(0, 0, 0, 0.8), 0 0 20px rgba(16, 185, 129, 0.12)",
        overflowY: "auto"
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
              Bumblebee Session & Diagnostic Dossier
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Session ID: {session.session_id} • Status: {session.status}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "8px" }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Persistent Database Telemetry Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "8px",
          background: "rgba(15, 23, 42, 0.6)",
          padding: "10px 14px",
          borderRadius: "var(--radius-md)",
          border: "1px solid rgba(250, 204, 21, 0.2)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Database size={14} color="var(--bumblebee-yellow)" />
          <div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Database State</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#F8FAFC" }}>SQLite WAL Synced</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Camera size={14} color="#38BDF8" />
          <div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Frames Stored</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#F8FAFC" }}>{imagesCount} Snapshots</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MessageSquare size={14} color="#A78BFA" />
          <div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Turns Logged</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#F8FAFC" }}>{turnsCount} Turns</div>
          </div>
        </div>
      </div>

      {/* Vehicle & Procedure Overview */}
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
            {session.vehicle_profile.year} {session.vehicle_profile.make || "Unassigned"} {session.vehicle_profile.model}
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
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: "200px" }}>
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

      {/* Product Improvement Feedback Box */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.8)",
          borderRadius: "var(--radius-md)",
          padding: "12px 14px",
          border: "1px solid rgba(250, 204, 21, 0.25)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--bumblebee-yellow)", textTransform: "uppercase" }}>
            Technician Diagnostic Feedback (Product Improvement)
          </span>
          <div style={{ display: "flex", gap: "4px" }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: star <= rating ? "#FACC15" : "rgba(255, 255, 255, 0.2)"
                }}
              >
                <Star size={14} fill={star <= rating ? "#FACC15" : "none"} />
              </button>
            ))}
          </div>
        </div>

        {feedbackSubmitted ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--status-verified)", fontSize: "12px", padding: "6px 0" }}>
            <CheckCircle2 size={14} />
            <span>Feedback saved to Bumblebee database! Thank you for improving our automotive models.</span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <input
              type="text"
              placeholder="Notes on diagnostic accuracy, vision precision, or fitment..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              style={{
                flex: 1,
                background: "rgba(7, 9, 13, 0.8)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 10px",
                color: "#F8FAFC",
                fontSize: "11px",
                outline: "none"
              }}
            />
            <button
              onClick={handleSubmitFeedback}
              disabled={isSubmitting}
              style={{
                background: "var(--bumblebee-yellow)",
                color: "#07090D",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {isSubmitting ? "Saving..." : "Save Feedback"}
            </button>
          </div>
        )}
      </div>

      {/* Footer Buttons */}
      <div style={{ display: "flex", gap: "var(--space-2)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--border-subtle)" }}>
        <button
          onClick={() => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dossier || session, null, 2));
            const downloadAnchor = document.createElement("a");
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `bumblebee_${session.session_id}_dossier.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
          }}
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
            fontWeight: 600,
            cursor: "pointer",
            border: "none"
          }}
        >
          <Download size={14} />
          Export Session Dossier (.JSON)
        </button>

        <button
          onClick={onClose}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface-2)",
            color: "var(--text-secondary)",
            fontSize: "12px",
            border: "none",
            cursor: "pointer"
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
