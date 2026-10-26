"use client";

import React, { useState, useRef } from "react";
import { Camera, Mic, MicOff, MessageSquare, Send, X, Image as ImageIcon } from "lucide-react";

interface CleanControlBarProps {
  isListening: boolean;
  onToggleVoice: () => void;
  onCaptureCamera: () => void;
  onSendChat: (text: string) => void;
  onUploadImage?: (base64: string) => void;
  isProcessing: boolean;
}

export function CleanControlBar({
  isListening,
  onToggleVoice,
  onCaptureCamera,
  onSendChat,
  onUploadImage,
  isProcessing
}: CleanControlBarProps) {
  const [showChatInput, setShowChatInput] = useState(false);
  const [chatText, setChatText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        onUploadImage(base64);
      };
      reader.readAsDataURL(file);
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
        bottom: "32px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 35,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px"
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
            padding: "6px 12px",
            borderRadius: "var(--radius-pill)",
            width: "360px",
            maxWidth: "90vw",
            boxShadow: "0 10px 30px rgba(0,0,0,0.7)"
          }}
        >
          <input
            type="text"
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder="Describe issue or ask a question..."
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
              background: chatText.trim() ? "var(--accent-cyan)" : "transparent",
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
              cursor: "pointer"
            }}
          >
            <X size={15} />
          </button>
        </form>
      )}

      {/* The 3 Core Actions: Chat, Camera Shutter, Mic */}
      <div
        className="glass-panel"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "8px 20px",
          borderRadius: "var(--radius-pill)",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.7), 0 0 1px 1px var(--border-subtle)"
        }}
      >
        {/* Hidden File Input for Image Upload */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {/* 1. Chat Option */}
        <button
          id="btn-chat-mode"
          onClick={() => setShowChatInput((prev) => !prev)}
          title="Type message / issue"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: showChatInput ? "rgba(56, 189, 248, 0.2)" : "var(--bg-surface-2)",
            color: showChatInput ? "var(--accent-cyan)" : "var(--text-secondary)",
            border: showChatInput ? "1px solid var(--accent-cyan)" : "1px solid var(--border-subtle)",
            cursor: "pointer",
            transition: "var(--transition-fast)"
          }}
        >
          <MessageSquare size={19} />
        </button>

        {/* 2. Upload Image Option */}
        <button
          id="btn-upload-image"
          onClick={() => fileInputRef.current?.click()}
          title="Upload vehicle or engine image"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-surface-2)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-subtle)",
            cursor: "pointer",
            transition: "var(--transition-fast)"
          }}
        >
          <ImageIcon size={19} />
        </button>

        {/* 2. Primary Camera Shutter / Scan Button */}
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
              ? "rgba(56, 189, 248, 0.3)"
              : "radial-gradient(circle, #38BDF8 0%, #0284C7 75%)",
            color: "#FFFFFF",
            border: "3px solid rgba(255, 255, 255, 0.8)",
            boxShadow: "0 0 24px rgba(56, 189, 248, 0.5), 0 8px 24px rgba(0,0,0,0.6)",
            cursor: "pointer",
            transition: "var(--transition-fast)",
            transform: isProcessing ? "scale(0.95)" : "scale(1)"
          }}
        >
          <Camera size={28} />
        </button>

        {/* 3. Voice Mode Orb */}
        <button
          id="btn-voice-mode"
          onClick={onToggleVoice}
          title={isListening ? "Listening... (Tap to mute)" : "Tap to activate voice mode"}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isListening ? "var(--accent-cyan)" : "var(--bg-surface-2)",
            color: isListening ? "#0F172A" : "var(--text-secondary)",
            border: isListening ? "1px solid #7DD3FC" : "1px solid var(--border-subtle)",
            boxShadow: isListening ? "0 0 18px rgba(56, 189, 248, 0.6)" : "none",
            cursor: "pointer",
            transition: "var(--transition-fast)",
            animation: isListening ? "pulse-cyan 1.6s infinite" : "none"
          }}
        >
          {isListening ? <Mic size={20} /> : <MicOff size={19} />}
        </button>
      </div>
    </div>
  );
}
