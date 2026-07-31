"use client";

import { useEffect, useRef, useState } from "react";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { reverseGeocode, type AddressComponents } from "@/lib/geocode";

export interface LocationPickerValue {
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
}

const DEFAULT_LAT = 14.5995; // Manila — a reasonable default center, overridden as soon as the user picks anything
const DEFAULT_LNG = 120.9842;

export function LocationPicker({
  value,
  onChange,
  addressPlaceholder = "Search address…",
  detectLocationLabel = "Detect my location",
  height = "280px",
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    // `cancelled` guards against React Strict Mode's double-invoked effects —
    // cleanup can fire before the dynamic import resolves.
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const initLat = typeof value.lat === "number" && isFinite(value.lat) ? value.lat : DEFAULT_LAT;
      const initLng = typeof value.lng === "number" && isFinite(value.lng) ? value.lng : DEFAULT_LNG;

      const map = L.map(mapRef.current).setView([initLat, initLng], 13);
      leafletRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      async function onMove(lat: number, lng: number) {
        const result = await reverseGeocode(lat, lng);
        onChange({ lat, lng, address: result?.formatted ?? "", components: result?.components });
      }

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onMove(pos.lat, pos.lng);
      });

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng([e.latlng.lat, e.latlng.lng]);
        onMove(e.latlng.lat, e.latlng.lng);
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

  // Keep marker in sync when value changes externally (address autocomplete, detect-location)
  useEffect(() => {
    if (!markerRef.current || !leafletRef.current) return;
    if (typeof value.lat !== "number" || typeof value.lng !== "number") return;
    if (!isFinite(value.lat) || !isFinite(value.lng)) return;
    markerRef.current.setLatLng([value.lat, value.lng]);
    leafletRef.current.setView([value.lat, value.lng], 14);
  }, [value.lat, value.lng]);

  async function handleDetect() {
    setDetecting(true);
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const result = await reverseGeocode(lat, lng);
        onChange({ lat, lng, address: result?.formatted ?? "", components: result?.components });
        setDetecting(false);
      },
      () => setDetecting(false)
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AddressAutocomplete
        value={value.address}
        onChange={(addr) => onChange({ ...value, address: addr })}
        onSelect={({ address: addr, lat, lng, components }) => onChange({ lat, lng, address: addr, components })}
        placeholder={addressPlaceholder}
        detectLocationLabel={detectLocationLabel}
        onDetectLocation={handleDetect}
        detectingLocation={detecting}
      />

      {/* Leaflet CSS — loaded once via link tag */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />

      <div ref={mapRef} style={{ height }} className="z-0 overflow-hidden rounded-2xl border border-outline shadow-soft" />

      {typeof value.lat === "number" && typeof value.lng === "number" && (value.lat !== 0 || value.lng !== 0) && (
        <p className="font-mono text-xs text-ink-subtle">
          {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}
