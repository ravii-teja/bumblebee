"use client";

import React from "react";
import { Mic, MicOff } from "lucide-react";

interface VoiceBarProps {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  onToggle: () => void;
  onVoiceCommand?: (cmd: string) => void;
}

export function VoiceBar({
  isListening,
  transcript,
  isSupported,
  onToggle
}: VoiceBarProps) {
  if (!isSupported) return null;

  return (
    <div
      id="hud-voice-bar"
      className="glass-panel"
      style={{
        position: "absolute",
        bottom: "var(--space-4)",
        right: "var(--space-4)",
        zIndex: 25,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "6px 14px",
        borderRadius: "var(--radius-pill)",
        border: isListening ? "1px solid var(--accent-cyan)" : "1px solid var(--border-subtle)",
        boxShadow: isListening ? "var(--shadow-glow-cyan)" : "var(--shadow-hud)",
        transition: "var(--transition-normal)"
      }}
    >
      <button
        id="btn-voice-toggle"
        onClick={onToggle}
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isListening ? "var(--accent-cyan)" : "var(--bg-surface-2)",
          color: isListening ? "#0F172A" : "var(--text-secondary)",
          transition: "var(--transition-fast)"
        }}
      >
        {isListening ? <Mic size={17} /> : <MicOff size={17} />}
      </button>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: isListening ? "var(--accent-cyan)" : "var(--text-secondary)" }}>
            {isListening ? "Listening hands-free..." : "Voice Assistant"}
          </span>
          {isListening && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "var(--accent-cyan)",
                animation: "pulse-cyan 1.5s infinite"
              }}
            />
          )}
        </div>
        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
          {transcript ? `"${transcript}"` : 'Say "Verify", "Next step", or "Show parts"'}
        </div>
      </div>
    </div>
  );
}
