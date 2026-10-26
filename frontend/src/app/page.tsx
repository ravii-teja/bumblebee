"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Sparkles, Volume2, VolumeX, FileText } from "lucide-react";

export default function MuseFieldChamber() {
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

  const { videoRef, hasCamera, captureFrame } = useCamera();

  // Text-to-Speech synthesizer
  const speakText = useCallback(
    (text: string) => {
      if (isTtsMuted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    },
    [isTtsMuted]
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

  const { isListening, transcript, isSupported, toggleListening } = useSpeechRecognition(handleTurn);

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
    if (phase === "SCAN_VEHICLE") {
      await handleTurn("identify vehicle from camera image");
    } else if (phase === "ACTIVE_REPAIR") {
      await handleVerifyStep();
    } else {
      await handleTurn("scan frame");
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
        return "Point at a vehicle";
      case "CONFIRM_MAKE":
        return "Confirm Vehicle Brand";
      case "ASK_MODEL_YEAR":
        return "Specify Model & Year";
      case "ASK_ISSUE":
        return "Describe Issue or Symptom";
      case "ACTIVE_REPAIR":
        return `Step ${session?.current_step_number || 1} of 6 • ${session?.vehicle_profile.make || "Vehicle"} Guide`;
      case "COMPLETED":
        return "Procedure Completed";
      default:
        return "Point at a vehicle";
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
      id="muse-field-chamber"
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#07090D",
        overflow: "hidden"
      }}
    >
      {/* 1. Fullscreen Camera Viewport with Subtle Blueprint Wireframe Background */}
      <CameraViewport
        videoRef={videoRef}
        hasCamera={hasCamera}
        isStreaming={true}
        components={components}
        selectedComponent={selectedComponent}
        stepNumber={session.current_step_number}
        phase={phase}
        useSimulation={!hasCamera}
      />

      {/* 2. Single Minimalist Top Instruction Banner */}
      <div
        style={{
          position: "absolute",
          top: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 25,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          pointerEvents: "auto"
        }}
      >
        <div
          className="glass-panel"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 18px",
            borderRadius: "var(--radius-pill)",
            fontSize: "13px",
            fontWeight: 600,
            color: "#F8FAFC",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)"
          }}
        >
          <Sparkles size={14} color="var(--accent-cyan)" />
          <span>{getTopInstruction()}</span>
        </div>

        {/* Mute Voice Toggle */}
        <button
          onClick={() => setIsTtsMuted((m) => !m)}
          className="glass-panel"
          title={isTtsMuted ? "Unmute Voice" : "Mute Voice"}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isTtsMuted ? "var(--text-muted)" : "var(--accent-cyan)",
            cursor: "pointer"
          }}
        >
          {isTtsMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {session.completed_steps.length > 0 && (
          <button
            onClick={() => setActiveModal("summary")}
            className="glass-panel"
            title="Session Log Dossier"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--status-verified)",
              cursor: "pointer"
            }}
          >
            <FileText size={16} />
          </button>
        )}
      </div>

      {/* 3. Live Verification Banner */}
      <VerificationBanner result={latestVerification} />

      {/* 4. Live Speech Transcription Pill */}
      {transcript && (
        <div
          className="glass-panel"
          style={{
            position: "absolute",
            bottom: "115px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            padding: "5px 16px",
            borderRadius: "var(--radius-pill)",
            fontSize: "12px",
            color: "var(--accent-cyan)",
            maxWidth: "380px",
            textAlign: "center",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            animation: "pulse-cyan 2s infinite"
          }}
        >
          &ldquo;{transcript}&rdquo;
        </div>
      )}

      {/* 5. Minimalist Conversational Card (Visible only when dialogue is active) */}
      {phase !== "SCAN_VEHICLE" && aiMessage && (
        <div
          style={{
            position: "absolute",
            bottom: "115px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25
          }}
        >
          <ConversationalCard
            phase={phase}
            aiMessage={aiMessage}
            step={currentStep}
            totalSteps={session.procedure.steps.length}
            verification={stepVerification}
            isVerifying={isVerifying}
            onQuickResponse={(text) => handleTurn(text)}
            onVerifyStep={handleVerifyStep}
            onNextStep={handleNextStep}
            onOpenParts={() => setActiveModal("parts")}
          />
        </div>
      )}

      {/* 6. Clean Floating Control Bar (Chat Option, Image Upload, Camera Shutter, Voice Mic) */}
      <CleanControlBar
        isListening={isListening}
        onToggleVoice={toggleListening}
        onCaptureCamera={handleCameraScan}
        onSendChat={(text) => handleTurn(text)}
        onUploadImage={handleUploadImage}
        isProcessing={isProcessing}
      />

      {/* 7. Drawers & Modals */}
      {activeModal === "parts" && (
        <PartsDrawer onClose={() => setActiveModal("none")} />
      )}

      {activeModal === "manual" && (
        <EvidenceModal onClose={() => setActiveModal("none")} />
      )}

      {activeModal === "summary" && (
        <SessionAuditModal session={session} onClose={() => setActiveModal("none")} />
      )}
    </main>
  );
}
