"use client";

import React from "react";

interface BumblebeeBrandBadgeProps {
  vehicleText?: string;
  isLive?: boolean;
}

export function BumblebeeBrandBadge({ vehicleText, isLive = true }: BumblebeeBrandBadgeProps) {
  return (
    <div
      id="bumblebee-top-left-brand"
      className="glass-panel"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "7px 14px 7px 10px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid rgba(250, 204, 21, 0.35)",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.6), 0 0 16px rgba(250, 204, 21, 0.15)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        userSelect: "none",
        pointerEvents: "auto",
        transition: "var(--transition-normal)"
      }}
    >
      {/* High-Precision Cyber-Bee Emblem */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #FACC15 0%, #D97706 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 14px rgba(250, 204, 21, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.6)",
          flexShrink: 0
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left Wing */}
          <path
            d="M5 8C5 5.5 7.5 4 10 5.5L11 8.5L7 11C5.5 10 5 9 5 8Z"
            fill="#FFFFFF"
            fillOpacity="0.85"
          />
          {/* Right Wing */}
          <path
            d="M19 8C19 5.5 16.5 4 14 5.5L13 8.5L17 11C18.5 10 19 9 19 8Z"
            fill="#FFFFFF"
            fillOpacity="0.85"
          />
          {/* Central Body & Head */}
          <circle cx="12" cy="7" r="2" fill="#0F172A" />
          <ellipse cx="12" cy="14" rx="3.5" ry="5.5" fill="#0F172A" />
          {/* Bumblebee Stripes */}
          <path
            d="M9.5 12H14.5M9 14.5H15M9.8 17H14.2"
            stroke="#FACC15"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Stinger */}
          <path d="M12 19.5L12 21.5" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Brand Typography & Status */}
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 800,
              fontSize: "14px",
              letterSpacing: "0.4px",
              color: "#FFFFFF",
              textShadow: "0 1px 4px rgba(0,0,0,0.8)"
            }}
          >
            Bumblebee
          </span>
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: isLive ? "#10B981" : "#FACC15",
              boxShadow: isLive ? "0 0 8px #10B981" : "0 0 8px #FACC15",
              display: "inline-block"
            }}
            title={isLive ? "Vision & Sensor Feed Active" : "Standby"}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            marginTop: "2px"
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              color: "var(--bumblebee-yellow)"
            }}
          >
            AI Field Engineer
          </span>
          {vehicleText && (
            <>
              <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>•</span>
              <span
                className="hide-on-mobile"
                style={{
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  maxWidth: "140px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {vehicleText}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
