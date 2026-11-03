"use client";

import React, { useState } from "react";
import { Camera, Mic, MicOff, MessageSquare, Send, X } from "lucide-react";

interface CleanControlBarProps {
  isListening: boolean;
  onToggleVoice: () => void;
  onCaptureCamera: () => void;
  onSendChat: (text: string) => void;
  isProcessing: boolean;
  onOpenChat?: () => void;
  isChatOpen?: boolean;
}

export function CleanControlBar({
  isListening,
  onToggleVoice,
  onCaptureCamera,
  onSendChat,
  isProcessing,
  onOpenChat,
  isChatOpen = false
}: CleanControlBarProps) {
  const [showChatInput, setShowChatInput] = useState(false);
  const [chatText, setChatText] = useState("");

  const handleChatButtonClick = () => {
    if (onOpenChat) {
      onOpenChat();
    } else {
      setShowChatInput((prev) => !prev);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || isProcessing) return;
    onSendChat(chatText);
    setChatText("");
    setShowChatInput(false);
  };

  return (
    <div
      id="clean-control-bar"
      style={{
        position: "absolute",
        bottom: "max(18px, env(safe-area-inset-bottom))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 35,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        pointerEvents: "none",
        width: "100%",
        padding: "0 16px"
      }}
    >
      {/* Minimal Floating Chat Input (when opened) */}
      {showChatInput && (
        <form
          onSubmit={handleChatSubmit}
          className="glass-panel"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            borderRadius: "var(--radius-pill)",
            width: "min(380px, calc(100vw - 32px))",
            maxWidth: "92vw",
            boxShadow: "0 10px 30px rgba(0,0,0,0.7), 0 0 1px 1px var(--border-bumblebee)",
            pointerEvents: "auto"
          }}
        >
          <input
            type="text"
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder="Describe issue or ask Bumblebee..."
            autoFocus
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#FFF",
              fontSize: "13px",
              outline: "none"
            }}
          />
          <button
            type="submit"
            disabled={!chatText.trim() || isProcessing}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: chatText.trim() ? "var(--bumblebee-yellow)" : "transparent",
              color: chatText.trim() ? "#0F172A" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <Send size={13} />
          </button>
          <button
            type="button"
            onClick={() => setShowChatInput(false)}
            style={{
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            <X size={15} />
          </button>
        </form>
      )}

      {/* Core Actions: Chat, Camera Shutter, Voice Orb */}
      <div
        className="glass-panel"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "clamp(8px, 2.5vw, 16px)",
          padding: "clamp(6px, 1.5vh, 8px) clamp(12px, 3vw, 20px)",
          borderRadius: "var(--radius-pill)",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.7), 0 0 1px 1px var(--border-subtle)",
          pointerEvents: "auto"
        }}
      >
        {/* 1. Chat Option */}
        <button
          id="btn-chat-mode"
          onClick={handleChatButtonClick}
          title={isChatOpen ? "Close Chat & Diagnostics" : "Open Chat & Diagnostics"}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: showChatInput || isChatOpen ? "rgba(250, 204, 21, 0.2)" : "var(--bg-surface-2)",
            color: showChatInput || isChatOpen ? "var(--bumblebee-yellow)" : "var(--text-secondary)",
            border: showChatInput || isChatOpen ? "1px solid var(--bumblebee-yellow)" : "1px solid var(--border-subtle)",
            cursor: "pointer",
            transition: "var(--transition-fast)",
            boxShadow: showChatInput || isChatOpen ? "0 0 12px rgba(250, 204, 21, 0.4)" : "none"
          }}
        >
          <MessageSquare size={19} />
        </button>

        {/* 2. Primary Bumblebee Camera Shutter / Scan Button */}
        <button
          id="btn-camera-capture"
          onClick={onCaptureCamera}
          title="Point at vehicle & scan"
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isProcessing
              ? "rgba(250, 204, 21, 0.3)"
              : "radial-gradient(circle, #FACC15 0%, #D97706 80%)",
            color: "#0F172A",
            border: "3px solid rgba(255, 255, 255, 0.85)",
            boxShadow: "0 0 24px rgba(250, 204, 21, 0.6), 0 8px 24px rgba(0,0,0,0.6)",
            cursor: "pointer",
            transition: "var(--transition-fast)",
            transform: isProcessing ? "scale(0.95)" : "scale(1)"
          }}
        >
          <Camera size={28} color="#07090D" strokeWidth={2.4} />
        </button>

        {/* 4. Voice Mode Orb */}
        <button
          id="btn-voice-mode"
          onClick={onToggleVoice}
          title={isListening ? "Listening... (Tap to mute)" : "Tap to activate Bumblebee voice mode"}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isListening ? "var(--bumblebee-yellow)" : "var(--bg-surface-2)",
            color: isListening ? "#0F172A" : "var(--text-secondary)",
            border: isListening ? "1px solid #FEF08A" : "1px solid var(--border-subtle)",
            boxShadow: isListening ? "0 0 18px rgba(250, 204, 21, 0.6)" : "none",
            cursor: "pointer",
            transition: "var(--transition-fast)",
            animation: isListening ? "pulse-bumblebee 1.6s infinite" : "none"
          }}
        >
          {isListening ? <Mic size={20} strokeWidth={2.5} /> : <MicOff size={19} />}
        </button>
      </div>
    </div>
  );
}
