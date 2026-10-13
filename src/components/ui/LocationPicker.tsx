"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { reverseGeocode, type AddressComponents } from "@/lib/geocode";
import { hasRealCoordinates } from "@/lib/wizard";
import { useTranslation } from "@/lib/i18n";

export interface LocationPickerValue {
  /** 0,0 (or non-finite) means "no location chosen yet"; it is never treated as a real place. */
  lat: number;
  lng: number;
  address: string;
  components?: AddressComponents;
}

interface LocationPickerProps {
  value: LocationPickerValue;
  onChange: (v: LocationPickerValue) => void;
  addressPlaceholder?: string;
  detectLocationLabel?: string;
  height?: string;
  /** Visible label for the address input. Omit if the page attaches its own (id + aria-labelledby). */
  label?: string;
  id?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
}

// Neutral overview (central Europe, zoomed out) until the user picks or detects a place.
const DEFAULT_CENTER: [number, number] = [48.5, 14];
const DEFAULT_ZOOM = 4;
const PICKED_ZOOM = 14;

const PIN_HTML =
  '<div style="width:22px;height:22px;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:rgb(31 92 74);border:3px solid rgb(255 253 248);box-shadow:0 2px 6px rgba(28,26,23,0.4)"></div>';

function coordinateLabel(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function LocationPicker({
  value,
  onChange,
  addressPlaceholder = "Search address…",
  detectLocationLabel,
  height = "280px",
  label,
  id,
  hint,
  error,
  required,
}: LocationPickerProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const libRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);
  const [detecting, setDetecting] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const hasLocation = hasRealCoordinates(value.lat, value.lng);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Place (or move) the pin; creates it on first use. Only ever called with real coordinates.
  function placeMarker(lat: number, lng: number) {
    const L = libRef.current;
    const map = leafletRef.current;
    if (!L || !map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      return;
    }
    const icon = L.divIcon({ className: "", html: PIN_HTML, iconSize: [22, 22], iconAnchor: [11, 22] });
    const marker = L.marker([lat, lng], { icon, draggable: true, keyboard: false }).addTo(map);
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      void commit(pos.lat, pos.lng);
    });
    markerRef.current = marker;
  }

  async function commit(lat: number, lng: number) {
    const result = await reverseGeocode(lat, lng);
    onChangeRef.current({ lat, lng, address: result?.formatted || coordinateLabel(lat, lng), components: result?.components });
  }

  useEffect(() => {
    if (!mapRef.current) return;

    // `cancelled` guards against React Strict Mode's double-invoked effects.
    let cancelled = false;

    import("leaflet").then((mod) => {
      if (cancelled || !mapRef.current) return;
      const L = mod.default ?? mod;
      libRef.current = L;

      const start = initialValueRef.current;
      const real = hasRealCoordinates(start.lat, start.lng);
      const map = L.map(mapRef.current).setView(real ? [start.lat, start.lng] : DEFAULT_CENTER, real ? PICKED_ZOOM : DEFAULT_ZOOM);
      leafletRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      if (real) placeMarker(start.lat, start.lng);

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        placeMarker(e.latlng.lat, e.latlng.lng);
        void commit(e.latlng.lat, e.latlng.lng);
      });
    });

    return () => {
      cancelled = true;
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the pin in sync when the value changes externally (suggestion, detect, parent state).
  useEffect(() => {
    if (!leafletRef.current || !hasRealCoordinates(value.lat, value.lng)) return;
    placeMarker(value.lat, value.lng);
    leafletRef.current.setView([value.lat, value.lng], PICKED_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.lat, value.lng]);

  function handleDetect() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError(t("location.geoUnsupported"));
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await commit(pos.coords.latitude, pos.coords.longitude);
        setDetecting(false);
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? t("location.geoDenied")
            : err.code === err.TIMEOUT
              ? t("location.geoTimeout")
              : t("location.geoUnavailable")
        );
        setDetecting(false);
      },
      { timeout: 10000 }
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AddressAutocomplete
        id={id}
        label={label}
        hint={hint}
        error={error}
        required={required}
        value={value.address}
        onChange={(addr) => onChange({ ...value, address: addr })}
        onSelect={({ address: addr, lat, lng, components }) => onChange({ lat, lng, address: addr, components })}
        placeholder={addressPlaceholder}
        detectLocationLabel={detectLocationLabel ?? t("auth.signUp.detectLocation")}
        onDetectLocation={handleDetect}
        detectingLocation={detecting}
      />

      {geoError ? (
        <p role="alert" className="flex items-start gap-1.5 text-caption font-bold text-danger">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {geoError}
        </p>
      ) : null}

      <div
        ref={mapRef}
        role="region"
        aria-label={t("location.mapLabel")}
        style={{ height }}
        className="z-0 overflow-hidden rounded-card border border-line-strong bg-sunken shadow-stamp"
      />

      {hasLocation ? (
        <p className="text-caption tabular-nums text-ink-muted">{coordinateLabel(value.lat, value.lng)}</p>
      ) : (
        <p className="text-caption text-ink-muted">{t("location.pickHint")}</p>
      )}
    </div>
  );
}
