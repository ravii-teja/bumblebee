"use client";

import React from "react";
import { Mic, MicOff } from "lucide-react";

interface VoiceOrbProps {
  isListening: boolean;
  transcript: string;
  isSupported?: boolean;
  onToggle: () => void;
}

export function VoiceOrb({ isListening, transcript, onToggle }: VoiceOrbProps) {
  return (
    <div
      id="hud-voice-orb-container"
      style={{
        position: "absolute",
        bottom: "var(--space-4)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px"
      }}
    >
      {/* Live Voice Transcript Floating Pill */}
      {transcript && (
        <div
          className="glass-panel"
          style={{
            padding: "4px 14px",
            borderRadius: "var(--radius-pill)",
            fontSize: "12px",
            color: "var(--accent-cyan)",
            maxWidth: "380px",
            textAlign: "center",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            animation: "pulse-cyan 2s infinite"
          }}
        >
          &ldquo;{transcript}&rdquo;
        </div>
      )}

      {/* Pulsing Voice Orb Button */}
      <button
        id="btn-voice-orb"
        onClick={onToggle}
        title={isListening ? "Listening... (Tap to pause)" : "Tap to speak hands-free"}
        style={{
          width: 58,
          height: 58,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isListening
            ? "radial-gradient(circle, #38BDF8 0%, #0284C7 80%)"
            : "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)",
          color: isListening ? "#0F172A" : "var(--accent-cyan)",
          border: isListening ? "2px solid #7DD3FC" : "1px solid var(--border-subtle)",
          boxShadow: isListening
            ? "0 0 25px rgba(56, 189, 248, 0.6), 0 0 50px rgba(56, 189, 248, 0.25)"
            : "0 8px 24px rgba(0, 0, 0, 0.5)",
          cursor: "pointer",
          transition: "var(--transition-fast)",
          animation: isListening ? "pulse-cyan 1.8s infinite" : "none"
        }}
      >
        {isListening ? <Mic size={24} /> : <MicOff size={22} />}
      </button>

      {/* Voice Status Hint */}
      <div
        style={{
          fontSize: "10px",
          color: isListening ? "var(--accent-cyan)" : "var(--text-muted)",
          fontWeight: 500,
          letterSpacing: "0.5px",
          textShadow: "0 2px 4px rgba(0,0,0,0.8)"
        }}
      >
        {isListening ? "VOICE NAVIGATION ACTIVE" : "TAP TO SPEAK (OR USE VOICE)"}
      </div>
    </div>
  );
}
