"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Map, X, Loader } from "lucide-react";

declare global {
  interface Window { L: any; }
}

interface Suggestion {
  place_id: number;
  display_name: string;
  address: Record<string, string>;
  type: string;
  lat: string;
  lon: string;
}

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  style?: React.CSSProperties;
}

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function formatSuggestion(item: Suggestion): string {
  const a = item.address || {};
  const parts = [
    a.suburb || a.neighbourhood || a.quarter || a.industrial,
    a.city || a.town || a.village || a.county,
    a.state,
  ].filter(Boolean);
  return parts.length > 0
    ? parts.join(", ")
    : item.display_name.split(",").slice(0, 3).join(",").trim();
}

function formatSubtitle(item: Suggestion): string {
  const a = item.address || {};
  return [a.district, a.state, a.country].filter(Boolean).join(", ");
}

export default function LocationInput({
  value,
  onChange,
  placeholder = "Search city or area…",
  label,
  required,
  style,
}: LocationInputProps) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapLabel, setMapLabel] = useState("");
  const [loadingMap, setLoadingMap] = useState(false);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const debouncedQuery = useDebounce(query, 380);

  // Sync external value → internal query
  useEffect(() => { setQuery(value || ""); }, [value]);

  // ── Autocomplete ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (debouncedQuery.length < 2) { setSuggestions([]); return; }
    setLoadingSug(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debouncedQuery)}&format=json&countrycodes=in&limit=6&addressdetails=1`,
      { headers: { "Accept-Language": "en-IN,en" } }
    )
      .then(r => r.json())
      .then((data: Suggestion[]) => {
        setSuggestions(data.slice(0, 6));
        setShowDrop(data.length > 0);
      })
      .catch(() => {})
      .finally(() => setLoadingSug(false));
  }, [debouncedQuery]);

  const selectSuggestion = (item: Suggestion) => {
    const name = formatSuggestion(item);
    setQuery(name);
    onChange(name);
    setSuggestions([]);
    setShowDrop(false);
  };

  // ── Leaflet loader ────────────────────────────────────────────────────────────
  const loadLeaflet = useCallback(() => {
    return new Promise<void>(resolve => {
      if (window.L) { resolve(); return; }
      // CSS
      if (!document.querySelector('link[href*="leaflet@1.9"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      // JS
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }, []);

  // ── Init map ──────────────────────────────────────────────────────────────────
  const initMap = useCallback(async () => {
    if (!mapDivRef.current || mapInstanceRef.current) return;
    await loadLeaflet();
    setMapReady(true);

    const L = window.L;
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(mapDivRef.current).setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    map.on("click", async (e: any) => {
      const { lat, lng } = e.latlng;

      // Place / move marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }

      setLoadingMap(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { "Accept-Language": "en-IN,en" } }
        );
        const data = await res.json();
        const a = data.address || {};
        const name = [
          a.suburb || a.neighbourhood || a.industrial,
          a.city || a.town || a.village || a.county,
          a.state,
        ].filter(Boolean).join(", ") || data.display_name.split(",").slice(0, 3).join(",").trim();

        setMapLabel(name);
      } catch {
        setMapLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } finally {
        setLoadingMap(false);
      }
    });

    mapInstanceRef.current = map;
    // Invalidate size after modal paint
    setTimeout(() => map.invalidateSize(), 100);
  }, [loadLeaflet]);

  useEffect(() => {
    if (showMap) {
      setMapLabel(query);
      setTimeout(initMap, 50);
    } else {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        setMapReady(false);
      }
    }
  }, [showMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmMapLocation = () => {
    if (mapLabel) {
      setQuery(mapLabel);
      onChange(mapLabel);
    }
    setShowMap(false);
  };

  // ── Styles ────────────────────────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
    borderRadius: 8, border: "1.5px solid #e0e0ee", fontSize: 13,
    boxSizing: "border-box", outline: "none", background: "white",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4,
  };

  return (
    <div style={{ position: "relative", ...style }}>
      {label && (
        <label style={lbl}>
          {label}{required && " *"}
        </label>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        {/* Text input with icon */}
        <div style={{ position: "relative", flex: 1 }}>
          <MapPin
            size={13}
            color="#aaa"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
          <input
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              onChange(e.target.value);
            }}
            onFocus={() => suggestions.length > 0 && setShowDrop(true)}
            onBlur={() => setTimeout(() => setShowDrop(false), 180)}
            placeholder={placeholder}
            required={required}
            autoComplete="off"
            style={inp}
          />
          {loadingSug && (
            <Loader
              size={12}
              color="#aaa"
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", animation: "spin 1s linear infinite" }}
            />
          )}
        </div>

        {/* Map button */}
        <button
          type="button"
          title="Pick from map"
          onClick={() => setShowMap(true)}
          style={{
            background: "#f0f1fa", border: "1.5px solid #e0e0ee", borderRadius: 8,
            padding: "0 11px", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0,
          }}
        >
          <Map size={15} color="#1E2D8E" />
        </button>
      </div>

      {/* Autocomplete dropdown */}
      {showDrop && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 2px)", left: 0, right: 44,
          background: "white", border: "1.5px solid #e0e0ee", borderRadius: 10,
          boxShadow: "0 6px 24px rgba(0,0,0,0.12)", zIndex: 600, overflow: "hidden",
        }}>
          {suggestions.map((s, i) => (
            <div
              key={s.place_id}
              onMouseDown={() => selectSuggestion(s)}
              style={{
                padding: "9px 12px", fontSize: 13, cursor: "pointer",
                borderBottom: i < suggestions.length - 1 ? "1px solid #f5f5f5" : "none",
                display: "flex", alignItems: "flex-start", gap: 9,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f0f1fa")}
              onMouseLeave={e => (e.currentTarget.style.background = "white")}
            >
              <MapPin size={13} color="#1E2D8E" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: "#1a1a2e", lineHeight: 1.3 }}>
                  {formatSuggestion(s)}
                </div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>
                  {formatSubtitle(s) || s.type}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map modal */}
      {showMap && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 2000,
        }}>
          <div style={{
            background: "white", borderRadius: 16, overflow: "hidden",
            width: "min(94vw, 620px)", boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
            display: "flex", flexDirection: "column",
          }}>
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #eee" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>
                  Pick Location from Map
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#aaa" }}>
                  Click anywhere on the map to select
                </p>
              </div>
              <button onClick={() => setShowMap(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} color="#888" />
              </button>
            </div>

            {/* Map container */}
            <div ref={mapDivRef} style={{ height: 380, width: "100%", background: "#f0f0f0" }}>
              {!mapReady && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13 }}>
                  Loading map…
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "12px 18px", display: "flex", justifyContent: "space-between",
              alignItems: "center", background: "#f8f9ff", borderTop: "1px solid #eee", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0 }}>
                <MapPin size={14} color="#1E2D8E" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: loadingMap ? "#aaa" : "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {loadingMap ? "Getting location…" : (mapLabel || "Click on the map to select")}
                </span>
              </div>
              <button
                onClick={confirmMapLocation}
                disabled={!mapLabel || loadingMap}
                style={{
                  background: mapLabel && !loadingMap ? "#1E2D8E" : "#ccc",
                  color: "white", border: "none", borderRadius: 8,
                  padding: "8px 18px", fontSize: 13, fontWeight: 700,
                  cursor: mapLabel && !loadingMap ? "pointer" : "not-allowed",
                  flexShrink: 0,
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: translateY(-50%) rotate(0deg); } to { transform: translateY(-50%) rotate(360deg); } }
      `}</style>
    </div>
  );
}
