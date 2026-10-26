"use client";

import React from "react";
import { VehicleProfile } from "@/lib/types";
import { ShieldCheck, Map, Wrench, BookOpen, FileCheck2, Cpu } from "lucide-react";

interface HeaderBarProps {
  vehicle: VehicleProfile;
  activeView: "camera" | "spatial" | "parts" | "citations" | "audit";
  onSelectView: (view: "camera" | "spatial" | "parts" | "citations" | "audit") => void;
  completedStepsCount: number;
  totalStepsCount: number;
}

export function HeaderBar({
  vehicle,
  activeView,
  onSelectView,
  completedStepsCount,
  totalStepsCount
}: HeaderBarProps) {
  return (
    <header
      id="hud-header-bar"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "64px",
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 var(--space-4)",
        background: "linear-gradient(180deg, rgba(7, 9, 13, 0.95) 0%, rgba(7, 9, 13, 0.6) 80%, transparent 100%)",
        borderBottom: "1px solid var(--border-subtle)",
        backdropFilter: "blur(12px)"
      }}
    >
      {/* Brand & Vehicle Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              background: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFF",
              boxShadow: "0 0 12px rgba(56, 189, 248, 0.3)"
            }}
          >
            <Cpu size={18} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontWeight: 700, fontSize: "var(--font-base)", letterSpacing: "1px", color: "#F8FAFC" }}>
                MUSE FIELD
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "var(--accent-cyan)",
                  border: "1px solid rgba(56, 189, 248, 0.3)"
                }}
              >
                META HACKATHON
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              {vehicle.year} {vehicle.make} {vehicle.model} • {vehicle.engine.split(" ")[0]}
            </div>
          </div>
        </div>
      </div>

      {/* Central View Navigators (Google Minimalist Segmented Tabs) */}
      <nav
        id="hud-view-navigation"
        style={{
          display: "flex",
          background: "var(--bg-surface-1)",
          padding: "3px",
          borderRadius: "var(--radius-pill)",
          border: "1px solid var(--border-subtle)"
        }}
      >
        <button
          id="nav-view-camera"
          onClick={() => onSelectView("camera")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "var(--radius-pill)",
            fontSize: "var(--font-xs)",
            fontWeight: 500,
            color: activeView === "camera" ? "#0F172A" : "var(--text-secondary)",
            background: activeView === "camera" ? "var(--accent-cyan)" : "transparent",
            transition: "var(--transition-fast)"
          }}
        >
          <Cpu size={13} />
          AR Vision
        </button>

        <button
          id="nav-view-spatial"
          onClick={() => onSelectView("spatial")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "var(--radius-pill)",
            fontSize: "var(--font-xs)",
            fontWeight: 500,
            color: activeView === "spatial" ? "#0F172A" : "var(--text-secondary)",
            background: activeView === "spatial" ? "var(--accent-cyan)" : "transparent",
            transition: "var(--transition-fast)"
          }}
        >
          <Map size={13} />
          Spatial Map
        </button>

        <button
          id="nav-view-parts"
          onClick={() => onSelectView("parts")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "var(--radius-pill)",
            fontSize: "var(--font-xs)",
            fontWeight: 500,
            color: activeView === "parts" ? "#0F172A" : "var(--text-secondary)",
            background: activeView === "parts" ? "var(--accent-cyan)" : "transparent",
            transition: "var(--transition-fast)"
          }}
        >
          <Wrench size={13} />
          Parts Finder
        </button>

        <button
          id="nav-view-citations"
          onClick={() => onSelectView("citations")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "var(--radius-pill)",
            fontSize: "var(--font-xs)",
            fontWeight: 500,
            color: activeView === "citations" ? "#0F172A" : "var(--text-secondary)",
            background: activeView === "citations" ? "var(--accent-cyan)" : "transparent",
            transition: "var(--transition-fast)"
          }}
        >
          <BookOpen size={13} />
          Manual
        </button>

        <button
          id="nav-view-audit"
          onClick={() => onSelectView("audit")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "var(--radius-pill)",
            fontSize: "var(--font-xs)",
            fontWeight: 500,
            color: activeView === "audit" ? "#0F172A" : "var(--text-secondary)",
            background: activeView === "audit" ? "var(--accent-cyan)" : "transparent",
            transition: "var(--transition-fast)"
          }}
        >
          <FileCheck2 size={13} />
          Audit Report
        </button>
      </nav>

      {/* Safety Shield Status & Step Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(16, 185, 129, 0.12)",
            color: "var(--status-verified)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            padding: "4px 10px",
            borderRadius: "var(--radius-pill)",
            fontSize: "11px",
            fontWeight: 600
          }}
        >
          <ShieldCheck size={14} />
          <span>SAFETY GUARD: ACTIVE</span>
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            fontWeight: 500
          }}
        >
          Step {completedStepsCount}/{totalStepsCount}
        </div>
      </div>
    </header>
  );
}
