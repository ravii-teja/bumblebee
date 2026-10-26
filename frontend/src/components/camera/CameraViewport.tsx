"use client";

import React, { useRef, useEffect } from "react";
import { ComponentObservation } from "@/lib/types";

interface CameraViewportProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hasCamera: boolean;
  isStreaming: boolean;
  components: ComponentObservation[];
  selectedComponent: ComponentObservation | null;
  stepNumber: number;
  phase: string;
  useSimulation: boolean;
}

export function CameraViewport({
  videoRef,
  hasCamera,
  components,
  selectedComponent,
  stepNumber,
  phase,
  useSimulation
}: CameraViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Return clean perspective image
  const isHomeScreen = phase === "SCAN_VEHICLE" || phase === "CONFIRM_MAKE" || phase === "ASK_MODEL_YEAR";

  const getSimulatedImage = () => {
    if (isHomeScreen) {
      return "/vehicles/blueprint_wireframe.jpg";
    }
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

  // Render Wireframe only when in active repair mode
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Only draw wireframe overlay when in ACTIVE_REPAIR or ANALYZING_ISSUE
    if (phase !== "ACTIVE_REPAIR" && phase !== "ANALYZING_ISSUE") {
      return;
    }

    // Find the target component to highlight (Engine Air Cleaner Assembly)
    const targetComp = components.find(
      (c) => c.component_id === "air_cleaner_assembly" || c.component_id === selectedComponent?.component_id
    );

    if (!targetComp || !targetComp.polygon_points || targetComp.polygon_points.length < 3) {
      return;
    }

    const points = targetComp.polygon_points;

    // Draw Glowing Wireframe Boundary
    ctx.beginPath();
    ctx.moveTo(points[0][0] * width, points[0][1] * height);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0] * width, points[i][1] * height);
    }
    ctx.closePath();

    ctx.strokeStyle = "#38BDF8";
    ctx.lineWidth = 2.5;
    ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
    ctx.shadowColor = "#38BDF8";
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Geometric Wireframe Grid Lines inside polygon
    ctx.save();
    ctx.clip();

    ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
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

    // Clean, subtle component title pin
    const labelX = points[0][0] * width;
    const labelY = points[0][1] * height;

    ctx.fillStyle = "rgba(14, 18, 26, 0.9)";
    ctx.strokeStyle = "#38BDF8";
    ctx.lineWidth = 1;

    const labelText = targetComp.name;
    ctx.font = "500 12px 'Inter', sans-serif";
    const textW = ctx.measureText(labelText).width;

    ctx.beginPath();
    ctx.roundRect(labelX - 4, labelY - 26, textW + 16, 22, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38BDF8";
    ctx.fillText(labelText, labelX + 4, labelY - 11);
  }, [components, selectedComponent, phase]);

  return (
    <div
      ref={containerRef}
      id="camera-viewport-container"
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
      {/* Live Video Feed or Subtle Blueprint Wireframe Background */}
      {!useSimulation && hasCamera ? (
        <video
          ref={videoRef as any}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#07090D",
            position: "relative"
          }}
        >
          {/* Subtle Reference Blueprint Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getSimulatedImage()}
            alt="Vehicle Camera View"
            style={{
              width: "100%",
              height: "100%",
              objectFit: isHomeScreen ? "contain" : "contain",
              opacity: isHomeScreen ? 0.38 : 1.0,
              filter: isHomeScreen ? "contrast(1.15) brightness(0.85)" : "none",
              userSelect: "none",
              transition: "opacity 400ms ease"
            }}
          />

          {/* Vignette Gradient Overlay on Home Screen */}
          {isHomeScreen && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "radial-gradient(circle at center, transparent 35%, rgba(7, 9, 13, 0.7) 80%, #07090D 100%)",
                pointerEvents: "none"
              }}
            />
          )}
        </div>
      )}

      {/* Wireframe & SAM 3.1 Overlay Canvas */}
      <canvas
        ref={canvasRef}
        id="wireframe-canvas"
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
    </div>
  );
}
