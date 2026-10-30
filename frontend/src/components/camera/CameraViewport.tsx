"use client";

import React, { useRef, useEffect, useState } from "react";
import { ComponentObservation } from "@/lib/types";
import { Camera, Layers, X, RefreshCw } from "lucide-react";

interface CameraViewportProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream?: MediaStream | null;
  hasCamera: boolean;
  isStreaming: boolean;
  components: ComponentObservation[];
  selectedComponent: ComponentObservation | null;
  stepNumber: number;
  phase: string;
  facingMode?: "environment" | "user";
  onStartCamera?: () => void;
  useSimulation?: boolean;
  onToggleSimulation?: () => void;
  isProcessing?: boolean;
}

export function CameraViewport({
  videoRef,
  stream,
  hasCamera,
  components,
  selectedComponent,
  stepNumber,
  phase,
  facingMode = "environment",
  onStartCamera,
  useSimulation = false,
  onToggleSimulation,
  isProcessing = false
}: CameraViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scanLineOffsetRef = useRef<number>(0);
  const [showSchematicOverlay, setShowSchematicOverlay] = useState(false);

  // Bind stream if videoRef was mounted after stream resolution
  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.warn("Attaching stream to viewport video:", e));
    }
  }, [stream, videoRef]);

  const getStepSchematic = () => {
    switch (stepNumber) {
      case 1: return "/vehicles/rav4/step1_locate.svg";
      case 2: return "/vehicles/rav4/step2_unclip.svg";
      case 3: return "/vehicles/rav4/step3_lift.svg";
      case 4: return "/vehicles/rav4/step4_extract.svg";
      case 5: return "/vehicles/rav4/step5_install.svg";
      case 6: return "/vehicles/rav4/step6_sealed.svg";
      default: return "/vehicles/blueprint_wireframe.jpg";
    }
  };

  // Continuous AR Overlay Drawing Loop (Handles window resizing & animated scanlines)
  useEffect(() => {
    const renderAR = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      // 1. Vehicle Discovery AR Scanning Reticle
      if (phase === "SCAN_VEHICLE" || phase === "CONFIRM_MAKE" || phase === "ASK_MODEL_YEAR" || phase === "ASK_ISSUE") {
        const cx = width * 0.5;
        const cy = height * 0.45;
        const boxW = Math.min(width * 0.72, 540);
        const boxH = Math.min(height * 0.48, 360);
        const x1 = cx - boxW / 2;
        const y1 = cy - boxH / 2;
        const x2 = cx + boxW / 2;
        const y2 = cy + boxH / 2;
        const bLen = Math.min(30, boxW * 0.12);

        // Dashed bounding box
        ctx.strokeStyle = "rgba(250, 204, 21, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(x1, y1, boxW, boxH);
        ctx.setLineDash([]);

        // Vibrant Corner Brackets in Bumblebee Yellow
        ctx.strokeStyle = "#FACC15";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";

        // Top-left
        ctx.beginPath();
        ctx.moveTo(x1, y1 + bLen);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1 + bLen, y1);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(x2 - bLen, y1);
        ctx.lineTo(x2, y1);
        ctx.lineTo(x2, y1 + bLen);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(x1, y2 - bLen);
        ctx.lineTo(x1, y2);
        ctx.lineTo(x1 + bLen, y2);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(x2 - bLen, y2);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, y2 - bLen);
        ctx.stroke();

        // Center Crosshair
        ctx.strokeStyle = "rgba(250, 204, 21, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy);
        ctx.lineTo(cx + 16, cy);
        ctx.moveTo(cx, cy - 16);
        ctx.lineTo(cx, cy + 16);
        ctx.stroke();

        // Center target circle
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#FACC15";
        ctx.fill();

        // Animated Laser Scanline inside the reticle box (accelerates during active search)
        const speed = isProcessing ? 4.5 : 1.8;
        scanLineOffsetRef.current = (scanLineOffsetRef.current + speed) % boxH;
        const scanY = y1 + scanLineOffsetRef.current;
        const grad = ctx.createLinearGradient(x1, scanY, x2, scanY);
        if (isProcessing) {
          grad.addColorStop(0, "rgba(56, 189, 248, 0)");
          grad.addColorStop(0.5, "rgba(56, 189, 248, 0.95)");
          grad.addColorStop(1, "rgba(56, 189, 248, 0)");
        } else {
          grad.addColorStop(0, "rgba(250, 204, 21, 0)");
          grad.addColorStop(0.5, "rgba(250, 204, 21, 0.75)");
          grad.addColorStop(1, "rgba(250, 204, 21, 0)");
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = isProcessing ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(x1 + 4, scanY);
        ctx.lineTo(x2 - 4, scanY);
        ctx.stroke();

        // Dynamic Tag below reticle
        const reticleLabel = isProcessing
          ? "⚡ SEARCHING VEHICLE MAKE & MODEL VIA META VISION..."
          : "⦿ BUMBLEBEE AR SPATIAL PERCEPTION — ALIGN ENGINE / COMPONENT";
        ctx.font = "600 11px 'Inter', sans-serif";
        const tagW = ctx.measureText(reticleLabel).width;
        ctx.fillStyle = "rgba(7, 9, 13, 0.92)";
        ctx.strokeStyle = isProcessing ? "rgba(56, 189, 248, 0.6)" : "rgba(250, 204, 21, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cx - tagW / 2 - 12, y2 + 14, tagW + 24, 24, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = isProcessing ? "#38BDF8" : "#FACC15";
        ctx.fillText(reticleLabel, cx - tagW / 2, y2 + 30);
      }

      // 2. Active Repair AR Highlights (SAM 3.1 Segmentation & Component Pins)
      if (phase === "ACTIVE_REPAIR" || phase === "ANALYZING_ISSUE") {
        const targetComp = components.find(
          (c) => c.component_id === "air_cleaner_assembly" || c.component_id === selectedComponent?.component_id
        );

        if (targetComp && targetComp.polygon_points && targetComp.polygon_points.length >= 3) {
          const points = targetComp.polygon_points;

          // Glowing Wireframe Boundary in Bumblebee Gold
          ctx.beginPath();
          ctx.moveTo(points[0][0] * width, points[0][1] * height);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0] * width, points[i][1] * height);
          }
          ctx.closePath();

          ctx.strokeStyle = "#FACC15";
          ctx.lineWidth = 2.5;
          ctx.fillStyle = "rgba(250, 204, 21, 0.16)";
          ctx.shadowColor = "#FACC15";
          ctx.shadowBlur = 16;
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Geometric Grid pattern inside segmented mask
          ctx.save();
          ctx.clip();
          ctx.strokeStyle = "rgba(250, 204, 21, 0.28)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);

          const bb = targetComp.bounding_box;
          const bx = bb.xmin * width;
          const by = bb.ymin * height;
          const bw = (bb.xmax - bb.xmin) * width;
          const bh = (bb.ymax - bb.ymin) * height;

          const gridStep = 24;
          for (let x = bx; x <= bx + bw; x += gridStep) {
            ctx.beginPath();
            ctx.moveTo(x, by);
            ctx.lineTo(x, by + bh);
            ctx.stroke();
          }
          for (let y = by; y <= by + bh; y += gridStep) {
            ctx.beginPath();
            ctx.moveTo(bx, y);
            ctx.lineTo(bx + bw, y);
            ctx.stroke();
          }
          ctx.setLineDash([]);
          ctx.restore();

          // AR Spatial Pin and Label
          const labelX = points[0][0] * width;
          const labelY = points[0][1] * height;

          ctx.fillStyle = "rgba(14, 18, 26, 0.92)";
          ctx.strokeStyle = "#FACC15";
          ctx.lineWidth = 1.2;

          const labelText = `⦿ SAM 3.1: ${targetComp.name.toUpperCase()}`;
          ctx.font = "700 12px 'Inter', sans-serif";
          const textW = ctx.measureText(labelText).width;

          ctx.beginPath();
          ctx.roundRect(labelX - 4, labelY - 28, textW + 16, 24, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#FACC15";
          ctx.fillText(labelText, labelX + 4, labelY - 12);
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderAR);
    };

    renderAR();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [components, selectedComponent, phase, isProcessing]);

  return (
    <div
      ref={containerRef}
      id="ar-camera-viewport-container"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#07090D",
        overflow: "hidden"
      }}
    >
      {/* 1. Fullscreen Live Camera Video Feed (Primary AR Ground) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 1,
          transform: facingMode === "user" ? "scaleX(-1)" : "none",
          opacity: hasCamera && !useSimulation ? 1 : 0,
          transition: "opacity 300ms ease"
        }}
      />

      {/* 2. Standby / Permission Prompt when camera is not yet active */}
      {!hasCamera && !useSimulation && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            backgroundColor: "#07090D",
            background: "radial-gradient(circle at center, rgba(14, 18, 26, 0.8) 0%, #07090D 80%)",
            padding: "24px",
            textAlign: "center"
          }}
        >
          {/* Subtle Cyber Reticle Emblem */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: "2px dashed rgba(250, 204, 21, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(250, 204, 21, 0.08)",
              boxShadow: "0 0 30px rgba(250, 204, 21, 0.2)"
            }}
          >
            <Camera size={34} color="var(--bumblebee-yellow)" />
          </div>

          <div style={{ maxWidth: 360 }}>
            <h2 style={{ fontSize: "19px", fontWeight: 700, color: "#F8FAFC", marginBottom: "6px" }}>
              Bumblebee AR Vision Chamber
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Enable your camera to experience pixel-precise SAM 3.1 segmentation and live repair guidance.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "min(280px, 85vw)" }}>
            <button
              onClick={onStartCamera}
              className="glass-panel"
              style={{
                padding: "12px 20px",
                borderRadius: "var(--radius-pill)",
                background: "linear-gradient(135deg, #FACC15 0%, #EAB308 100%)",
                color: "#07090D",
                fontWeight: 700,
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 0 24px rgba(250, 204, 21, 0.4)",
                border: "none",
                transition: "var(--transition-fast)"
              }}
            >
              <Camera size={18} />
              <span>ACTIVATE AR CAMERA</span>
            </button>

            {onToggleSimulation && (
              <button
                onClick={onToggleSimulation}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "var(--text-muted)",
                  padding: "9px 16px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Use Test Bench Simulator
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Fallback Test Bench Simulator View (if user toggles simulation) */}
      {useSimulation && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#07090D"
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/vehicles/blueprint_wireframe.jpg"
            alt="Simulated Engine Bay"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.65,
              filter: "contrast(1.15) brightness(0.85)"
            }}
          />
          {onToggleSimulation && (
            <button
              onClick={onToggleSimulation}
              className="glass-panel"
              style={{
                position: "absolute",
                top: 72,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 15,
                padding: "6px 14px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid rgba(250, 204, 21, 0.5)",
                background: "rgba(14, 18, 26, 0.9)",
                color: "var(--bumblebee-yellow)",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <RefreshCw size={12} />
              <span>SIMULATION BENCH ACTIVE • SWITCH TO LIVE CAMERA</span>
            </button>
          )}
        </div>
      )}

      {/* 4. Canvas AR Overlay (Draws directly on top of the live video) */}
      <canvas
        ref={canvasRef}
        id="ar-overlay-canvas"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 10,
          pointerEvents: "none"
        }}
      />

      {/* 5. Floating OEM Schematic Reference (Overlay during Active Repair) */}
      {phase === "ACTIVE_REPAIR" && (
        <div
          style={{
            position: "absolute",
            top: "max(68px, calc(env(safe-area-inset-top) + 56px))",
            right: "max(14px, env(safe-area-inset-right))",
            zIndex: 25,
            pointerEvents: "auto"
          }}
        >
          {showSchematicOverlay ? (
            <div
              className="glass-panel"
              style={{
                width: "clamp(220px, 22vw, 280px)",
                borderRadius: "12px",
                border: "1px solid rgba(250, 204, 21, 0.4)",
                background: "rgba(10, 13, 20, 0.94)",
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,0.8)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--bumblebee-yellow)"
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <Layers size={12} /> Step {stepNumber} OEM Diagram
                </span>
                <button
                  onClick={() => setShowSchematicOverlay(false)}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                >
                  <X size={13} />
                </button>
              </div>
              <div style={{ width: "100%", height: 140, backgroundColor: "#07090D", padding: "6px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getStepSchematic()}
                  alt={`Step ${stepNumber} Diagram`}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowSchematicOverlay(true)}
              className="glass-panel"
              title="Show OEM Manual Schematic"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid rgba(250, 204, 21, 0.35)",
                background: "rgba(14, 18, 26, 0.85)",
                color: "var(--bumblebee-yellow)",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <Layers size={13} />
              <span>OEM Schematic</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
