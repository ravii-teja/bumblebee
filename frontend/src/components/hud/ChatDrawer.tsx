"use client";

import React, { useState, useRef, useEffect } from "react";
import { DialogueMessage, VehicleProfile, DialoguePhase } from "@/lib/types";
import {
  X,
  Send,
  Sparkles,
  Car,
  Volume2,
  ChevronDown,
  ChevronUp,
  Check
} from "lucide-react";

interface ChatDrawerProps {
  messages: DialogueMessage[];
  vehicle?: VehicleProfile;
  phase: DialoguePhase;
  isProcessing: boolean;
  onSendMessage: (text: string) => void;
  onSelectVehicle: (make: string, model: string, year: number) => void;
  onSpeakText?: (text: string) => void;
  onClose: () => void;
}

const POPULAR_VEHICLE_PRESETS = [
  { make: "Honda", model: "Civic", year: 2023 },
  { make: "Toyota", model: "RAV4", year: 2022 },
  { make: "Ford", model: "F-150", year: 2021 },
  { make: "BMW", model: "3 Series", year: 2024 },
  { make: "Tesla", model: "Model 3", year: 2023 },
  { make: "Chevrolet", model: "Silverado", year: 2022 },
  { make: "Subaru", model: "Outback", year: 2020 },
  { make: "Hyundai", model: "Tucson", year: 2022 }
];

const COMMON_MAKES = [
  "Toyota", "Honda", "Ford", "Chevrolet", "BMW", "Mercedes-Benz", "Nissan",
  "Hyundai", "Kia", "Audi", "Tesla", "Subaru", "Volkswagen", "Mazda",
  "Jeep", "Dodge", "Ram", "Lexus", "Volvo", "Porsche", "GMC"
];

const VEHICLE_PROMPT_CHIPS = [
  { label: "2023 Honda Civic", text: "2023 Honda Civic" },
  { label: "2022 Toyota RAV4", text: "2022 Toyota RAV4" },
  { label: "2021 Ford F-150", text: "2021 Ford F-150" },
  { label: "2024 BMW 3 Series", text: "2024 BMW 3 Series" },
  { label: "2023 Tesla Model 3", text: "2023 Tesla Model 3" },
  { label: "2022 Chevy Silverado", text: "2022 Chevrolet Silverado" }
];

const ISSUE_PROMPT_CHIPS = [
  { label: "Check Engine P0171", text: "What does code P0171 mean and how do I fix it?" },
  { label: "Rough Idle / Shaking", text: "Engine has rough idle and shakes when stopped" },
  { label: "Squeaking Brakes", text: "Brakes make high-pitched squealing sound when stopping" },
  { label: "Battery Won't Crank", text: "Car won't start, clicks rapidly when turning key" },
  { label: "Engine Overheating", text: "Coolant temperature gauge is in the red and overheating" },
  { label: "Oil Leak Under Car", text: "Noticeable oil spot underneath front engine bay" },
  { label: "Show All Steps", text: "Show all steps of the procedure" },
  { label: "Tools Required", text: "What tools do I need for this repair?" },
  { label: "Next Step", text: "Next step" }
];

function formatMessageContent(text: string) {
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    if (!line.trim()) {
      return <div key={idx} style={{ height: "4px" }} />;
    }
    // Check if line is bold header
    if (line.startsWith("**") && line.endsWith("**")) {
      const content = line.slice(2, -2);
      return (
        <div key={idx} style={{ fontWeight: 700, color: "var(--bumblebee-yellow)", marginTop: "4px" }}>
          {content}
        </div>
      );
    }
    // Check for bullet items starting with "- **Label:** rest"
    const bulletMatch = line.match(/^-\s*\*\*(.*?):\*\*(.*)$/);
    if (bulletMatch) {
      return (
        <div key={idx} style={{ display: "flex", gap: "6px", marginLeft: "2px", margin: "2px 0" }}>
          <span style={{ color: "var(--bumblebee-yellow)", flexShrink: 0 }}>•</span>
          <div>
            <strong style={{ color: "#FEF08A" }}>{bulletMatch[1]}:</strong>
            <span style={{ color: "#E2E8F0" }}>{bulletMatch[2]}</span>
          </div>
        </div>
      );
    }
    // Bullet starting with "- "
    if (line.startsWith("- ") || line.startsWith("• ")) {
      return (
        <div key={idx} style={{ display: "flex", gap: "6px", marginLeft: "2px", margin: "2px 0" }}>
          <span style={{ color: "var(--bumblebee-yellow)", flexShrink: 0 }}>•</span>
          <span style={{ color: "#E2E8F0" }}>{line.slice(2)}</span>
        </div>
      );
    }
    // Step header like "**Step 1:** Title"
    const stepMatch = line.match(/^\*\*(Step\s*\d+:?.*?)\*\*(.*)$/i);
    if (stepMatch) {
      return (
        <div
          key={idx}
          style={{
            marginTop: "6px",
            marginBottom: "4px",
            padding: "6px 8px",
            background: "rgba(250, 204, 21, 0.1)",
            borderLeft: "3px solid var(--bumblebee-yellow)",
            borderRadius: "4px"
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--bumblebee-yellow)" }}>{stepMatch[1]}</span>
          <span style={{ color: "#F8FAFC", marginLeft: "4px" }}>{stepMatch[2]}</span>
        </div>
      );
    }
    // Regular text with inline bold
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <div key={idx} style={{ color: "#E2E8F0" }}>
        {parts.map((p, pIdx) => {
          if (p.startsWith("**") && p.endsWith("**")) {
            return <strong key={pIdx} style={{ color: "#FFF", fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
          }
          return p;
        })}
      </div>
    );
  });
}

export function ChatDrawer({
  messages,
  vehicle,
  phase,
  isProcessing,
  onSendMessage,
  onSelectVehicle,
  onSpeakText,
  onClose
}: ChatDrawerProps) {
  const [inputText, setInputText] = useState("");
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [customMake, setCustomMake] = useState(vehicle?.make || "Toyota");
  const [customModel, setCustomModel] = useState(vehicle?.model || "RAV4");
  const [customYear, setCustomYear] = useState<number>(vehicle?.year || 2022);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isProcessing) return;
    onSendMessage(trimmed);
    setInputText("");
  };

  const handleApplyVehicle = (make: string, model: string, year: number) => {
    onSelectVehicle(make, model, year);
    setShowVehiclePicker(false);
  };

  const hasVehicle =
    vehicle &&
    vehicle.make &&
    vehicle.make !== "generic_vehicle" &&
    vehicle.model !== "General Vehicle";

  return (
    <div
      id="bumblebee-chat-drawer"
      className="glass-panel"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "min(460px, 100vw)",
        height: "100dvh",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        background: "rgba(10, 14, 24, 0.96)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderLeft: "1px solid rgba(250, 204, 21, 0.25)",
        boxShadow: "-12px 0 40px rgba(0, 0, 0, 0.8)",
        animation: "slide-in-right 0.25s ease-out"
      }}
    >
      {/* 1. Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(15, 23, 42, 0.6)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "radial-gradient(circle, #FACC15 0%, #D97706 80%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 12px rgba(250, 204, 21, 0.5)"
            }}
          >
            <Sparkles size={17} color="#0F172A" />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#F8FAFC", display: "flex", alignItems: "center", gap: "6px" }}>
              Bumblebee AI Engineer
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: "var(--radius-pill)",
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "#34D399",
                  border: "1px solid rgba(16, 185, 129, 0.3)"
                }}
              >
                LIVE
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>Automotive Diagnostics</span>
              <span>•</span>
              <span style={{ color: "var(--accent-cyan)", textTransform: "capitalize" }}>
                {phase.replace("_", " ").toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            transition: "var(--transition-fast)"
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* 2. Vehicle Selector & Switcher Bar */}
      <div
        style={{
          padding: "12px 18px",
          background: "rgba(15, 23, 42, 0.8)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Car size={16} color="var(--bumblebee-yellow)" />
            <div style={{ fontSize: "12px", color: "#F1F5F9", fontWeight: 600 }}>
              {hasVehicle ? (
                <span>{vehicle.year} {vehicle.make} {vehicle.model}</span>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>No vehicle selected</span>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowVehiclePicker((p) => !p)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              borderRadius: "var(--radius-pill)",
              background: showVehiclePicker ? "rgba(250, 204, 21, 0.2)" : "rgba(255, 255, 255, 0.06)",
              border: showVehiclePicker ? "1px solid var(--bumblebee-yellow)" : "1px solid rgba(255, 255, 255, 0.12)",
              color: showVehiclePicker ? "var(--bumblebee-yellow)" : "#F1F5F9",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "var(--transition-fast)"
            }}
          >
            <span>{hasVehicle ? "Switch Car" : "Add Car"}</span>
            {showVehiclePicker ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {/* Collapsible Vehicle Input & 1-Tap Presets */}
        {showVehiclePicker && (
          <div
            style={{
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}
          >
            {/* Quick 1-Tap Presets */}
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>
              POPULAR VEHICLES:
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px"
              }}
            >
              {POPULAR_VEHICLE_PRESETS.map((p) => (
                <button
                  key={`${p.make}-${p.model}-${p.year}`}
                  onClick={() => handleApplyVehicle(p.make, p.model, p.year)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "var(--radius-pill)",
                    background:
                      vehicle?.make === p.make && vehicle?.model === p.model
                        ? "rgba(250, 204, 21, 0.25)"
                        : "rgba(255, 255, 255, 0.05)",
                    border:
                      vehicle?.make === p.make && vehicle?.model === p.model
                        ? "1px solid var(--bumblebee-yellow)"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                    color:
                      vehicle?.make === p.make && vehicle?.model === p.model
                        ? "var(--bumblebee-yellow)"
                        : "#E2E8F0",
                    fontSize: "11px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  {vehicle?.make === p.make && vehicle?.model === p.model && <Check size={11} />}
                  <span>{p.year} {p.make} {p.model}</span>
                </button>
              ))}
            </div>

            {/* Custom Make, Model, Year Input Form */}
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginTop: "4px" }}>
              OR ENTER ANY VEHICLE:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 0.8fr", gap: "6px" }}>
              {/* Make select / input */}
              <select
                value={customMake}
                onChange={(e) => setCustomMake(e.target.value)}
                style={{
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "6px",
                  color: "#FFF",
                  fontSize: "11px",
                  padding: "6px 8px",
                  outline: "none"
                }}
              >
                {COMMON_MAKES.map((m) => (
                  <option key={m} value={m} style={{ background: "#0F172A", color: "#FFF" }}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Model input */}
              <input
                type="text"
                placeholder="Model (e.g. Civic)"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                style={{
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "6px",
                  color: "#FFF",
                  fontSize: "11px",
                  padding: "6px 8px",
                  outline: "none"
                }}
              />

              {/* Year input */}
              <input
                type="number"
                min={1990}
                max={2026}
                value={customYear}
                onChange={(e) => setCustomYear(parseInt(e.target.value) || 2022)}
                style={{
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "6px",
                  color: "#FFF",
                  fontSize: "11px",
                  padding: "6px 8px",
                  outline: "none"
                }}
              />
            </div>

            <button
              onClick={() => handleApplyVehicle(customMake, customModel, customYear)}
              style={{
                marginTop: "4px",
                padding: "7px 14px",
                borderRadius: "var(--radius-pill)",
                background: "var(--bumblebee-yellow)",
                color: "#0F172A",
                fontWeight: 700,
                fontSize: "12px",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: "0 0 14px rgba(250, 204, 21, 0.4)"
              }}
            >
              <Car size={14} />
              <span>Set Vehicle to {customYear} {customMake} {customModel}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Message Stream */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px"
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
              color: "var(--text-muted)",
              padding: "20px"
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(250, 204, 21, 0.1)",
                border: "1px solid rgba(250, 204, 21, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "12px"
              }}
            >
              <Sparkles size={24} color="var(--bumblebee-yellow)" />
            </div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", marginBottom: "6px" }}>
              Ask Bumblebee Anything
            </div>
            <div style={{ fontSize: "12px", lineHeight: 1.5, maxWidth: "300px" }}>
              Add your vehicle above, describe any symptom or DTC code, or ask for step-by-step repair guidance.
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.sender === "USER";
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start",
                  gap: "4px"
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: isUser ? "var(--accent-cyan)" : "var(--bumblebee-yellow)",
                    padding: "0 4px"
                  }}
                >
                  {isUser ? "You" : "Bumblebee AI Engineer"}
                </div>

                <div
                  style={{
                    maxWidth: "88%",
                    padding: "10px 14px",
                    borderRadius: isUser ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                    background: isUser
                      ? "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)"
                      : "linear-gradient(135deg, rgba(20, 28, 48, 0.95) 0%, rgba(10, 15, 28, 0.98) 100%)",
                    border: isUser
                      ? "1px solid rgba(56, 189, 248, 0.3)"
                      : "1px solid rgba(250, 204, 21, 0.3)",
                    color: "#F8FAFC",
                    fontSize: "12.5px",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    boxShadow: isUser
                      ? "0 4px 14px rgba(0,0,0,0.4)"
                      : "0 4px 14px rgba(0,0,0,0.5), 0 0 10px rgba(250, 204, 21, 0.08)"
                  }}
                >
                  <div style={{ wordBreak: "break-word" }}>
                    {formatMessageContent(msg.text)}
                  </div>

                  {/* Optional Voice replay button for AI messages */}
                  {!isUser && onSpeakText && msg.speech_text && (
                    <button
                      onClick={() => onSpeakText(msg.speech_text || msg.text)}
                      title="Replay Voice Speech"
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "var(--radius-pill)",
                        padding: "3px 8px",
                        fontSize: "10px",
                        color: "var(--bumblebee-yellow)",
                        cursor: "pointer"
                      }}
                    >
                      <Volume2 size={11} />
                      <span>Listen</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px" }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--bumblebee-yellow)",
                boxShadow: "0 0 10px var(--bumblebee-yellow)",
                animation: "pulse-bumblebee 1s infinite"
              }}
            />
            <span style={{ fontSize: "11px", color: "var(--bumblebee-yellow)", fontWeight: 500 }}>
              Bumblebee is analyzing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Quick Issue / Symptom Prompt Chips */}
      <div
        style={{
          padding: "8px 14px",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          background: "rgba(15, 23, 42, 0.6)",
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          whiteSpace: "nowrap"
        }}
      >
        {(hasVehicle ? ISSUE_PROMPT_CHIPS : VEHICLE_PROMPT_CHIPS).map((chip, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(chip.text)}
            disabled={isProcessing}
            style={{
              padding: "4px 10px",
              borderRadius: "var(--radius-pill)",
              background: hasVehicle ? "rgba(255, 255, 255, 0.05)" : "rgba(250, 204, 21, 0.12)",
              border: hasVehicle ? "1px solid rgba(250, 204, 21, 0.2)" : "1px solid rgba(250, 204, 21, 0.4)",
              color: hasVehicle ? "#E2E8F0" : "var(--bumblebee-yellow)",
              fontSize: "11px",
              fontWeight: 500,
              cursor: isProcessing ? "not-allowed" : "pointer",
              transition: "var(--transition-fast)",
              flexShrink: 0
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 5. Chat Input Bar */}
      <form
        onSubmit={handleSend}
        style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(10, 14, 24, 0.98)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            hasVehicle
              ? `Ask about issues on ${vehicle?.make} ${vehicle?.model}...`
              : "Describe issue or add vehicle (e.g. 2023 Honda Civic)..."
          }
          disabled={isProcessing}
          style={{
            flex: 1,
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "var(--radius-pill)",
            color: "#FFFFFF",
            fontSize: "12.5px",
            padding: "9px 16px",
            outline: "none"
          }}
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isProcessing}
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: inputText.trim() && !isProcessing
              ? "var(--bumblebee-yellow)"
              : "rgba(255, 255, 255, 0.06)",
            color: inputText.trim() && !isProcessing ? "#0F172A" : "var(--text-muted)",
            border: "none",
            cursor: inputText.trim() && !isProcessing ? "pointer" : "not-allowed",
            transition: "var(--transition-fast)",
            boxShadow: inputText.trim() && !isProcessing ? "0 0 12px rgba(250, 204, 21, 0.5)" : "none",
            flexShrink: 0
          }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
