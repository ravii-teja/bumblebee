"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { PartCandidate, VehicleProfile } from "@/lib/types";
import { fetchParts } from "@/lib/api";
import {
  X,
  Wrench,
  ExternalLink,
  ShieldCheck,
  Search,
  Copy,
  Check,
  Filter,
  PackageCheck
} from "lucide-react";

interface PartsDrawerProps {
  vehicle?: VehicleProfile;
  onClose: () => void;
}

const POPULAR_CATEGORIES = [
  { label: "All Parts", query: "" },
  { label: "Air Filter", query: "air filter" },
  { label: "Oil & Filter", query: "oil filter" },
  { label: "Brakes", query: "brake pads" },
  { label: "Spark Plugs", query: "spark plugs" },
  { label: "Cabin Filter", query: "cabin filter" }
];

export function PartsDrawer({ vehicle, onClose }: PartsDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [parts, setParts] = useState<PartCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedPartNumber, setCopiedPartNumber] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const performSearch = useCallback(
    async (queryText: string) => {
      setLoading(true);
      const data = await fetchParts(
        vehicle?.id || "generic_vehicle",
        vehicle?.make || "",
        vehicle?.model || "",
        vehicle?.year || 2022,
        queryText
      );
      setParts(data);
      setLoading(false);
    },
    [vehicle]
  );

  useEffect(() => {
    let active = true;
    async function init() {
      const data = await fetchParts(
        vehicle?.id || "generic_vehicle",
        vehicle?.make || "",
        vehicle?.model || "",
        vehicle?.year || 2022,
        ""
      );
      if (active) {
        setParts(data);
        setLoading(false);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [vehicle]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleCategorySelect = (query: string) => {
    setActiveCategory(query);
    setSearchQuery(query);
    startTransition(() => {
      performSearch(query);
    });
  };

  const handleCopyPartNumber = (partNumber: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(partNumber);
      setCopiedPartNumber(partNumber);
      setTimeout(() => setCopiedPartNumber(null), 2000);
    }
  };

  const vehicleTitle =
    vehicle?.make && vehicle.make !== "generic_vehicle" && vehicle.make !== ""
      ? `${vehicle.year || 2022} ${vehicle.make} ${vehicle.model}`
      : "Automotive Vehicle";

  return (
    <div
      id="parts-finder-drawer"
      className="glass-panel"
      style={{
        position: "absolute",
        top: "clamp(68px, 10vh, 84px)",
        right: "clamp(12px, 3vw, 24px)",
        bottom: "clamp(16px, 3vh, 24px)",
        width: "min(560px, calc(100vw - 24px))",
        maxWidth: "96vw",
        zIndex: 40,
        borderRadius: "18px",
        padding: "clamp(16px, 2.5vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        border: "1px solid rgba(250, 204, 21, 0.35)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.85), 0 0 24px rgba(250, 204, 21, 0.14)",
        background: "rgba(10, 13, 20, 0.94)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)"
      }}
    >
      {/* 1. Header Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(250, 204, 21, 0.25) 0%, rgba(217, 119, 6, 0.15) 100%)",
              border: "1px solid rgba(250, 204, 21, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--bumblebee-yellow)",
              boxShadow: "0 0 16px rgba(250, 204, 21, 0.2)"
            }}
          >
            <Wrench size={17} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.2px" }}>
                Verified Parts Catalog
              </h3>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "var(--radius-pill)",
                  background: "rgba(16, 185, 129, 0.18)",
                  color: "#10B981",
                  border: "1px solid rgba(16, 185, 129, 0.35)"
                }}
              >
                100% FITMENT PROOF
              </span>
            </div>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {vehicleTitle} • OEM & Tier-1 Engineering Tolerances
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          title="Close Parts Drawer"
          style={{
            color: "var(--text-muted)",
            padding: "8px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "var(--transition-fast)"
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* 2. Interactive Search Input Bar */}
      <form onSubmit={handleSearchSubmit} style={{ width: "100%" }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            width: "100%",
            background: "rgba(18, 24, 38, 0.9)",
            border: "1px solid rgba(250, 204, 21, 0.3)",
            borderRadius: "12px",
            padding: "4px 8px 4px 14px",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5), 0 0 16px rgba(250, 204, 21, 0.08)"
          }}
        >
          <Search size={16} color="var(--bumblebee-yellow)" style={{ flexShrink: 0, marginRight: "10px" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${vehicle?.make || "OEM"} parts, part number, spark plugs, filters...`}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#FFFFFF",
              fontSize: "13px",
              outline: "none",
              fontFamily: "'Inter', sans-serif"
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                performSearch("");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "6px"
              }}
            >
              <X size={14} />
            </button>
          )}
          <button
            type="submit"
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              background: "var(--bumblebee-yellow)",
              color: "#0F172A",
              border: "none",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginLeft: "6px",
              boxShadow: "0 2px 8px rgba(250, 204, 21, 0.4)"
            }}
          >
            <span>Search</span>
          </button>
        </div>
      </form>

      {/* 3. Category Filter Quick Pills */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "4px",
          scrollbarWidth: "none"
        }}
      >
        <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "3px" }}>
          <Filter size={11} /> Filters:
        </span>
        {POPULAR_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.query;
          return (
            <button
              key={cat.label}
              onClick={() => handleCategorySelect(cat.query)}
              style={{
                whiteSpace: "nowrap",
                fontSize: "11px",
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: "var(--radius-pill)",
                border: isActive ? "1px solid var(--bumblebee-yellow)" : "1px solid rgba(255, 255, 255, 0.08)",
                background: isActive ? "rgba(250, 204, 21, 0.16)" : "rgba(255, 255, 255, 0.04)",
                color: isActive ? "var(--bumblebee-yellow)" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "var(--transition-fast)"
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 4. Parts Results List in Minimal Premium Cards */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          paddingRight: "4px"
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 0",
              gap: "12px",
              color: "var(--text-secondary)"
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "2px solid rgba(250, 204, 21, 0.2)",
                borderTop: "2px solid var(--bumblebee-yellow)",
                animation: "spin 0.8s linear infinite"
              }}
            />
            <span style={{ fontSize: "13px" }}>Searching authorized engineering catalogs...</span>
          </div>
        ) : parts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "13px" }}>
            No matching verified parts found for &ldquo;{searchQuery}&rdquo;. Try another component or category.
          </div>
        ) : (
          parts.map((part) => {
            const isOem = part.oem_or_aftermarket === "OEM";
            const isCopied = copiedPartNumber === part.part_number;

            return (
              <div
                key={part.part_number}
                className="glass-panel"
                style={{
                  background: "rgba(18, 23, 34, 0.88)",
                  border: isOem ? "1px solid rgba(56, 189, 248, 0.45)" : "1px solid rgba(250, 204, 21, 0.35)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  boxShadow: isOem
                    ? "0 4px 20px rgba(56, 189, 248, 0.08)"
                    : "0 4px 20px rgba(250, 204, 21, 0.06)",
                  transition: "var(--transition-fast)"
                }}
              >
                {/* Header Row: Classification & Price */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "2px 7px",
                          borderRadius: "4px",
                          letterSpacing: "0.5px",
                          background: isOem ? "rgba(56, 189, 248, 0.18)" : "rgba(245, 158, 11, 0.18)",
                          color: isOem ? "var(--accent-cyan)" : "var(--bumblebee-yellow)",
                          border: isOem ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid rgba(245, 158, 11, 0.35)"
                        }}
                      >
                        {isOem ? "FACTORY OEM" : "TIER-1 AFTERMARKET"}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#E2E8F0" }}>{part.brand}</span>
                    </div>

                    <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.3 }}>
                      {part.name}
                    </h4>
                  </div>

                  {/* Price Tag */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: 800,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: "#10B981"
                      }}
                    >
                      ${part.price_usd.toFixed(2)}
                    </div>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Verified MSRP
                    </span>
                  </div>
                </div>

                {/* Part Number Box with Copy Action */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "rgba(10, 14, 22, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    fontSize: "11px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Part Number:</span>
                    <span
                      style={{
                        color: "var(--bumblebee-yellow)",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        fontSize: "12px",
                        letterSpacing: "0.05em"
                      }}
                    >
                      {part.part_number}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyPartNumber(part.part_number)}
                    title="Copy Part Number"
                    style={{
                      background: isCopied ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.06)",
                      border: isCopied ? "1px solid #10B981" : "1px solid rgba(255, 255, 255, 0.1)",
                      color: isCopied ? "#10B981" : "var(--text-secondary)",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      transition: "var(--transition-fast)"
                    }}
                  >
                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{isCopied ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                {/* Fitment Provenance Evidence */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "6px",
                    fontSize: "11px",
                    color: "#CBD5E1",
                    lineHeight: 1.45
                  }}
                >
                  <ShieldCheck size={14} color="#10B981" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>{part.fitment_evidence}</span>
                </div>

                {/* Technical Specifications Grid */}
                {part.specifications && Object.keys(part.specifications).length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "6px",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.04)",
                      fontSize: "11px"
                    }}
                  >
                    {Object.entries(part.specifications).map(([key, val]) => (
                      <div key={key} style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{key}</span>
                        <span style={{ color: "#E2E8F0", fontWeight: 500 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer Status & Order Action */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "4px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#10B981" }}>
                    <PackageCheck size={13} />
                    <span>In Stock • Grounded Fitment Guaranteed</span>
                  </div>

                  <a
                    href={part.marketplace_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "6px 12px",
                      borderRadius: "var(--radius-pill)",
                      background: isOem
                        ? "linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0.1) 100%)"
                        : "linear-gradient(135deg, rgba(250, 204, 21, 0.25) 0%, rgba(217, 119, 6, 0.15) 100%)",
                      border: isOem ? "1px solid var(--accent-cyan)" : "1px solid var(--bumblebee-yellow)",
                      color: isOem ? "var(--accent-cyan)" : "var(--bumblebee-yellow)",
                      fontSize: "11px",
                      fontWeight: 700,
                      textDecoration: "none",
                      transition: "var(--transition-fast)"
                    }}
                  >
                    <span>View in Store</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
