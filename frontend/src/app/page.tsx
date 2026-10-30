"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { RepairSession, ComponentObservation, VerificationResult, DialoguePhase } from "@/lib/types";
import { createSession, fetchComponents, verifyStepState, sendConversationTurn } from "@/lib/api";
import { useCamera } from "@/hooks/useCamera";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { CameraViewport } from "@/components/camera/CameraViewport";
import { CleanControlBar } from "@/components/hud/CleanControlBar";
import { ConversationalCard } from "@/components/hud/ConversationalCard";
import { VerificationBanner } from "@/components/hud/VerificationBanner";
import { PartsDrawer } from "@/components/parts/PartsDrawer";
import { EvidenceModal } from "@/components/evidence/EvidenceModal";
import { SessionAuditModal } from "@/components/evidence/SessionAuditModal";
import { BumblebeeBrandBadge } from "@/components/hud/BumblebeeBrandBadge";
import { Sparkles, Volume2, VolumeX, FileText, Wrench, BookOpen, SwitchCamera } from "lucide-react";

export default function BumblebeeChamber() {
  const [session, setSession] = useState<RepairSession | null>(null);
  const [components, setComponents] = useState<ComponentObservation[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<ComponentObservation | null>(null);
  const [activeModal, setActiveModal] = useState<"none" | "parts" | "manual" | "summary">("none");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [latestVerification, setLatestVerification] = useState<VerificationResult | null>(null);
  const [isTtsMuted, setIsTtsMuted] = useState(false);

  // Conversational state: initially in standby SCAN_VEHICLE
  const [phase, setPhase] = useState<DialoguePhase>("SCAN_VEHICLE");
  const [aiMessage, setAiMessage] = useState<string>("");
  const [useSimulation, setUseSimulation] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const {
    videoRef,
    stream,
    hasCamera,
    isStreaming,
    facingMode,
    toggleFacingMode,
    startCamera,
    captureFrame
  } = useCamera();

  // Forward declarations for interactive voice loop
  const handleTurnRef = useRef<(userInput: string, customImageBase64?: string) => Promise<void>>(async () => {});

  const {
    isListening,
    isVoiceActive,
    transcript,
    toggleListening,
    pauseForSpeaking,
    resumeAfterSpeaking
  } = useSpeechRecognition((text) => handleTurnRef.current(text));

  // Text-to-Speech synthesizer with hands-free conversation continuation
  const speakText = useCallback(
    (text: string) => {
      if (isTtsMuted || typeof window === "undefined" || !("speechSynthesis" in window)) {
        resumeAfterSpeaking();
        return;
      }
      window.speechSynthesis.cancel();
      pauseForSpeaking();
      setIsSpeaking(true);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        setIsSpeaking(false);
        resumeAfterSpeaking();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        resumeAfterSpeaking();
      };

      window.speechSynthesis.speak(utterance);
    },
    [isTtsMuted, pauseForSpeaking, resumeAfterSpeaking]
  );

  // Dispatch conversational turn
  const handleTurn = useCallback(
    async (userInput: string, customImageBase64?: string) => {
      if (!session || isProcessing) return;
      setIsProcessing(true);

      const lower = userInput.toLowerCase();
      if (lower.includes("show parts") || lower.includes("open parts")) {
        setActiveModal("parts");
        setIsProcessing(false);
        return;
      }
      if (lower.includes("show manual") || lower.includes("open manual")) {
        setActiveModal("manual");
        setIsProcessing(false);
        return;
      }
      if (lower.includes("summary") || lower.includes("dossier")) {
        setActiveModal("summary");
        setIsProcessing(false);
        return;
      }
      if (lower.includes("close") || lower.includes("back to camera")) {
        setActiveModal("none");
        setIsProcessing(false);
        return;
      }

      try {
        const imgFrame = customImageBase64 || captureFrame() || undefined;
        const res = await sendConversationTurn(session.session_id, userInput, imgFrame);

        setAiMessage(res.text);
        setPhase(res.phase as DialoguePhase);
        setSession(res.session);

        if (res.speech_text) {
          speakText(res.speech_text);
        }

        // If active repair reached, load wireframe component masks
        if (res.phase === "ACTIVE_REPAIR") {
          const comps = await fetchComponents(session.session_id);
          setComponents(comps);
          const airbox = comps.find((c) => c.component_id === "air_cleaner_assembly");
          if (airbox) setSelectedComponent(airbox);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [session, isProcessing, captureFrame, speakText]
  );

  useEffect(() => {
    handleTurnRef.current = handleTurn;
  }, [handleTurn]);

  const handleUploadImage = useCallback(
    async (base64: string) => {
      if (phase === "SCAN_VEHICLE") {
        await handleTurn("identify vehicle from uploaded photo", base64);
      } else if (phase === "ASK_ISSUE") {
        await handleTurn("diagnose issue from uploaded component photo", base64);
      } else {
        await handleTurn("verify state from uploaded inspection photo", base64);
      }
    },
    [phase, handleTurn]
  );

  // Initialize Session quietly without injecting hardcoded dialogue
  useEffect(() => {
    async function init() {
      const sess = await createSession("generic_vehicle", "general_inspection");
      setSession(sess);
    }
    init();
  }, []);

  // Camera Shutter Click
  const handleCameraScan = async () => {
    const frame = captureFrame();
    if (phase === "SCAN_VEHICLE") {
      await handleTurn("identify vehicle from camera image", frame || undefined);
    } else if (phase === "ACTIVE_REPAIR") {
      await handleVerifyStep();
    } else {
      await handleTurn("scan frame", frame || undefined);
    }
  };

  // Step Verification
  const handleVerifyStep = async () => {
    if (!session || isVerifying) return;
    setIsVerifying(true);

    try {
      const res = await verifyStepState(session.session_id, session.current_step_number, false);
      setLatestVerification(res.verification);
      setSession(res.session);

      speakText(`Step ${session.current_step_number} verified! Physical state confirmed.`);

      setTimeout(() => {
        setLatestVerification(null);
      }, 5000);
    } catch (e) {
      console.error("Verification failed:", e);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleNextStep = async () => {
    await handleTurn("next step");
  };

  const getTopInstruction = () => {
    switch (phase) {
      case "SCAN_VEHICLE":
        return "Point camera at car & tap shutter";
      case "CONFIRM_MAKE":
        return "Confirm Vehicle Make";
      case "ASK_MODEL_YEAR":
        return "Specify Model & Year";
      case "ASK_ISSUE":
        return "Describe Issue or Symptom";
      case "ACTIVE_REPAIR":
        return `Step ${session?.current_step_number || 1} of ${session?.procedure.steps.length || 6} • ${session?.vehicle_profile.make || "Vehicle"} Guide`;
      case "COMPLETED":
        return "Procedure Completed";
      default:
        return "Point camera at car & tap shutter";
    }
  };

  if (!session) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#07090D",
          color: "var(--text-secondary)"
        }}
      >
        <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>
          Initializing Camera View...
        </div>
      </div>
    );
  }

  const currentStep =
    session.procedure.steps.find((s) => s.step_number === session.current_step_number) ||
    session.procedure.steps[0];
  const stepVerification = session.verifications[currentStep.step_number];

  return (
    <main
      id="bumblebee-field-chamber"
      style={{
        position: "relative",
        width: "100vw",
        height: "100dvh",
        minHeight: "100dvh",
        backgroundColor: "#07090D",
        overflow: "hidden"
      }}
    >
      {/* 1. Fullscreen Live AR Camera Viewport (Primary AR Ground) */}
      <CameraViewport
        videoRef={videoRef}
        stream={stream}
        hasCamera={hasCamera}
        isStreaming={isStreaming}
        components={components}
        selectedComponent={selectedComponent}
        stepNumber={session.current_step_number}
        phase={phase}
        facingMode={facingMode}
        onStartCamera={startCamera}
        useSimulation={useSimulation}
        onToggleSimulation={() => setUseSimulation((s) => !s)}
        isProcessing={isProcessing}
      />

      {/* 2. Responsive Bumblebee Top Navigation Header (AR Overlay) */}
      <header
        id="bumblebee-top-bar"
        style={{
          position: "absolute",
          top: "max(12px, env(safe-area-inset-top))",
          left: "max(12px, env(safe-area-inset-left))",
          right: "max(12px, env(safe-area-inset-right))",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          pointerEvents: "none"
        }}
      >
        {/* Top-Left: Bumblebee Brand Badge */}
        <div style={{ pointerEvents: "auto", flexShrink: 0 }}>
          <BumblebeeBrandBadge
            vehicleText={
              session.vehicle_profile.make &&
              session.vehicle_profile.make !== "generic_vehicle" &&
              session.vehicle_profile.make.trim() !== "" &&
              session.vehicle_profile.model &&
              session.vehicle_profile.model !== "General Vehicle" &&
              session.vehicle_profile.model !== "Vehicle"
                ? `${session.vehicle_profile.year ? `${session.vehicle_profile.year} ` : ""}${session.vehicle_profile.make} ${session.vehicle_profile.model}`
                : undefined
            }
            isLive={hasCamera}
          />
        </div>

        {/* Top-Center: Adaptive Instruction Pill */}
        <div
          className="glass-panel"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "var(--radius-pill)",
            fontSize: "clamp(11px, 2.2vw, 13px)",
            fontWeight: 600,
            color: "#F8FAFC",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
            pointerEvents: "auto",
            maxWidth: "min(360px, 42vw)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          <Sparkles size={14} color="var(--bumblebee-yellow)" style={{ flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {getTopInstruction()}
          </span>
        </div>

        {/* Top-Right: Quick Actions (Camera Flip, Parts, Manual, Voice, Dossier) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            pointerEvents: "auto",
            flexShrink: 0
          }}
        >
          {/* Camera Flip Button */}
          {hasCamera && (
            <button
              onClick={toggleFacingMode}
              className="glass-panel"
              title="Flip Front / Rear Camera"
              style={{
                height: 38,
                padding: "0 12px",
                borderRadius: "var(--radius-pill)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 500,
                transition: "var(--transition-fast)"
              }}
            >
              <SwitchCamera size={14} />
              <span className="hide-on-mobile">{facingMode === "environment" ? "Rear" : "Front"}</span>
            </button>
          )}

          {/* Quick Parts Drawer Toggle */}
          <button
            onClick={() => setActiveModal(activeModal === "parts" ? "none" : "parts")}
            className="glass-panel"
            title="Verified Parts Finder"
            style={{
              height: 38,
              padding: "0 12px",
              borderRadius: "var(--radius-pill)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: activeModal === "parts" ? "var(--bumblebee-yellow)" : "var(--text-secondary)",
              border: activeModal === "parts" ? "1px solid var(--bumblebee-yellow)" : "1px solid var(--border-subtle)",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
              transition: "var(--transition-fast)"
            }}
          >
            <Wrench size={14} />
            <span className="hide-on-mobile">Parts</span>
          </button>

          {/* Quick Manual Toggle */}
          <button
            onClick={() => setActiveModal(activeModal === "manual" ? "none" : "manual")}
            className="glass-panel"
            title="OEM Service Manual Citations"
            style={{
              height: 38,
              padding: "0 12px",
              borderRadius: "var(--radius-pill)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: activeModal === "manual" ? "var(--accent-cyan)" : "var(--text-secondary)",
              border: activeModal === "manual" ? "1px solid var(--accent-cyan)" : "1px solid var(--border-subtle)",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
              transition: "var(--transition-fast)"
            }}
          >
            <BookOpen size={14} />
            <span className="hide-on-mobile">Manual</span>
          </button>

          {/* Voice Mute Toggle */}
          <button
            onClick={() => setIsTtsMuted((m) => !m)}
            className="glass-panel"
            title={isTtsMuted ? "Unmute Bumblebee Voice" : "Mute Bumblebee Voice"}
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isTtsMuted ? "var(--text-muted)" : "var(--bumblebee-yellow)",
              border: "1px solid var(--border-subtle)",
              cursor: "pointer",
              transition: "var(--transition-fast)"
            }}
          >
            {isTtsMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* Session Dossier Summary */}
          {session.completed_steps.length > 0 && (
            <button
              onClick={() => setActiveModal(activeModal === "summary" ? "none" : "summary")}
              className="glass-panel"
              title="Session Provenance Dossier"
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--status-verified)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                cursor: "pointer",
                transition: "var(--transition-fast)"
              }}
            >
              <FileText size={16} />
            </button>
          )}
        </div>
      </header>

      {/* 3. Live Verification Banner */}
      <VerificationBanner result={latestVerification} />

      {/* 4. Interactive Voice Conversation Pill */}
      {(isVoiceActive || transcript || isSpeaking) && !isProcessing && (
        <div
          className="glass-panel"
          style={{
            position: "absolute",
            bottom: "clamp(96px, 13vh, 120px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 32,
            padding: "8px 20px",
            borderRadius: "var(--radius-pill)",
            fontSize: "12px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(10, 13, 20, 0.94)",
            border: isSpeaking
              ? "1px solid rgba(56, 189, 248, 0.5)"
              : "1px solid rgba(250, 204, 21, 0.5)",
            boxShadow: isSpeaking
              ? "0 8px 30px rgba(56, 189, 248, 0.25)"
              : "0 8px 30px rgba(250, 204, 21, 0.25)",
            maxWidth: "min(420px, calc(100vw - 32px))",
            color: isSpeaking ? "var(--accent-cyan)" : "var(--bumblebee-yellow)",
            animation: "pulse-bumblebee 2s infinite"
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: isSpeaking ? "#38BDF8" : "#FACC15",
              boxShadow: isSpeaking ? "0 0 10px #38BDF8" : "0 0 10px #FACC15"
            }}
          />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {isSpeaking
              ? "🔊 Bumblebee speaking..."
              : transcript
              ? `“${transcript}”`
              : "🎙️ Listening... Speak naturally"}
          </span>
        </div>
      )}

      {/* 4.5. Active Processing & Online Visual Search Status Indicator */}
      {isProcessing && (
        <div
          className="glass-panel"
          style={{
            position: "absolute",
            bottom: "clamp(96px, 13vh, 120px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 35,
            padding: "9px 22px",
            borderRadius: "var(--radius-pill)",
            fontSize: "12px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(10, 13, 20, 0.95)",
            border: "1px solid rgba(56, 189, 248, 0.6)",
            boxShadow: "0 8px 30px rgba(56, 189, 248, 0.35)",
            color: "var(--accent-cyan)",
            maxWidth: "min(440px, calc(100vw - 32px))"
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#38BDF8",
              boxShadow: "0 0 10px #38BDF8",
              animation: "pulse-bumblebee 1s infinite"
            }}
          />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Searching vehicle make & model online via Meta Vision...
          </span>
        </div>
      )}

      {/* 4.6. Scanner Guidance Pill in Initial Phase */}
      {phase === "SCAN_VEHICLE" && !isProcessing && !isVoiceActive && !isSpeaking && !transcript && (
        <div
          style={{
            position: "absolute",
            bottom: "clamp(96px, 13vh, 120px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            pointerEvents: "none"
          }}
        >
          <div
            className="glass-panel"
            style={{
              padding: "7px 18px",
              borderRadius: "var(--radius-pill)",
              fontSize: "12px",
              fontWeight: 500,
              background: "rgba(10, 13, 20, 0.88)",
              border: "1px solid rgba(250, 204, 21, 0.3)",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span style={{ color: "var(--bumblebee-yellow)" }}>⦿</span>
            <span>Tap Shutter or Upload Photo to identify vehicle</span>
          </div>
        </div>
      )}

      {/* 5. Minimalist Conversational Card (Visible only when dialogue is active) */}
      {phase !== "SCAN_VEHICLE" && aiMessage && (
        <div
          style={{
            position: "absolute",
            bottom: "clamp(100px, 14vh, 125px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none"
          }}
        >
          <div style={{ pointerEvents: "auto" }}>
            <ConversationalCard
              phase={phase}
              aiMessage={aiMessage}
              step={currentStep}
              totalSteps={session.procedure.steps.length}
              verification={stepVerification}
              isVerifying={isVerifying}
              detectedMake={session.dialogue?.detected_make || undefined}
              confirmedMake={session.dialogue?.confirmed_make || session.vehicle_profile?.make || undefined}
              onQuickResponse={(text) => handleTurn(text)}
              onVerifyStep={handleVerifyStep}
              onNextStep={handleNextStep}
              onOpenParts={() => setActiveModal("parts")}
            />
          </div>
        </div>
      )}

      {/* 6. Clean Floating Control Bar (Chat Option, Image Upload, Camera Shutter, Voice Mic) */}
      <CleanControlBar
        isListening={isVoiceActive || isListening}
        onToggleVoice={toggleListening}
        onCaptureCamera={handleCameraScan}
        onSendChat={(text) => handleTurn(text)}
        onUploadImage={handleUploadImage}
        isProcessing={isProcessing}
      />

      {/* 7. Drawers & Modals */}
      {activeModal === "parts" && (
        <PartsDrawer vehicle={session.vehicle_profile} onClose={() => setActiveModal("none")} />
      )}

      {activeModal === "manual" && (
        <EvidenceModal vehicle={session.vehicle_profile} onClose={() => setActiveModal("none")} />
      )}

      {activeModal === "summary" && (
        <SessionAuditModal session={session} onClose={() => setActiveModal("none")} />
      )}

    </main>
  );
}
