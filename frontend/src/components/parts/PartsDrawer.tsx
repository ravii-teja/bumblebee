"use client";

import React, { useState, useEffect } from "react";
import { PartCandidate } from "@/lib/types";
import { fetchParts } from "@/lib/api";
import { X, Wrench, ExternalLink, ShieldCheck, Tag } from "lucide-react";

interface PartsDrawerProps {
  onClose: () => void;
}

export function PartsDrawer({ onClose }: PartsDrawerProps) {
  const [parts, setParts] = useState<PartCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchParts("toyota_rav4_2022");
      setParts(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div
      id="parts-finder-drawer"
      className="glass-panel"
      style={{
        position: "absolute",
        top: "clamp(68px, 10vh, 84px)",
        right: "clamp(12px, 3vw, 24px)",
        bottom: "clamp(16px, 3vh, 24px)",
        width: "min(520px, calc(100vw - 24px))",
        maxWidth: "96vw",
        zIndex: 40,
        borderRadius: "var(--radius-lg)",
        padding: "clamp(14px, 2.5vw, 22px)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        border: "1px solid rgba(250, 204, 21, 0.3)",
        boxShadow: "0 16px 48px rgba(0, 0, 0, 0.8), 0 0 20px rgba(250, 204, 21, 0.12)"
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(250, 204, 21, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--bumblebee-yellow)"
            }}
          >
            <Wrench size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "#F8FAFC" }}>
              Bumblebee Verified Parts
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Direct Manufacturer Fitment &amp; Cross-Reference
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            color: "var(--text-muted)",
            padding: "8px",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer"
          }}
        >
          <X size={18} />
        </button>
      </div>

      <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
        Compatibility strictly grounded in Toyota catalog data and manufacturer cross-references.
      </p>

      {/* Parts List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)"
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "13px" }}>
            Searching authorized parts catalogs...
          </div>
        ) : (
          parts.map((part) => (
            <div
              key={part.part_number}
              style={{
                background: "var(--bg-surface-2)",
                border: part.oem_or_aftermarket === "OEM"
                  ? "1px solid rgba(56, 189, 248, 0.4)"
                  : "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3)",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >
              {/* Part Name & OEM Badge */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: part.oem_or_aftermarket === "OEM"
                          ? "rgba(56, 189, 248, 0.2)"
                          : "rgba(245, 158, 11, 0.2)",
                        color: part.oem_or_aftermarket === "OEM" ? "var(--accent-cyan)" : "var(--accent-amber)"
                      }}
                    >
                      {part.oem_or_aftermarket === "OEM" ? "FACTORY OEM" : "AFTERMARKET TIER 1"}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#F8FAFC" }}>
                      {part.brand}
                    </span>
                  </div>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#E2E8F0", marginTop: "4px" }}>
                    {part.name}
                  </h4>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#10B981" }}>
                    ${part.price_usd.toFixed(2)}
                  </div>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Est. Price</span>
                </div>
              </div>

              {/* Part Number & Provenance Evidence */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "11px"
                }}
              >
                <div style={{ color: "var(--text-muted)", marginBottom: "2px" }}>
                  Part #: <span style={{ color: "#F8FAFC", fontFamily: "monospace", fontWeight: 600 }}>{part.part_number}</span>
                </div>
                <div style={{ color: "#CBD5E1", display: "flex", alignItems: "flex-start", gap: "5px" }}>
                  <ShieldCheck size={14} color="#10B981" style={{ flexShrink: 0, marginTop: "1px" }} />
                  <span>{part.fitment_evidence}</span>
                </div>
              </div>

              {/* Specifications */}
              {part.specifications && Object.keys(part.specifications).length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "11px" }}>
                  {Object.entries(part.specifications).map(([key, val]) => (
                    <div key={key} style={{ color: "var(--text-muted)" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{key}:</span> {val}
                    </div>
                  ))}
                </div>
              )}

              {/* Link */}
              <a
                href={part.marketplace_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface-3)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--accent-cyan)",
                  fontSize: "12px",
                  fontWeight: 500,
                  textDecoration: "none",
                  marginTop: "2px"
                }}
              >
                <span>View in Parts Store</span>
                <ExternalLink size={12} />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
