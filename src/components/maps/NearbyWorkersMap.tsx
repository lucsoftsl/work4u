"use client";

import { useEffect, useRef } from "react";
import type { NearbyWorkerListing } from "@/api/types";

const AVAILABILITY_COLOR: Record<NearbyWorkerListing["availability"], string> = {
  AVAILABLE: "#10b981",
  BUSY: "#f59e0b",
  PAUSED: "#94a3b8",
};

interface NearbyWorkersMapProps {
  center: { lat: number; lng: number };
  radiusKm: number;
  listings: NearbyWorkerListing[];
  activeListingId: string | null;
  onMarkerHover?: (listingId: string | null) => void;
  onMarkerClick?: (listingId: string) => void;
  height?: string;
}

export function NearbyWorkersMap({
  center,
  radiusKm,
  listings,
  activeListingId,
  onMarkerHover,
  onMarkerClick,
  height = "100%",
}: NearbyWorkersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const centerMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // `cancelled` guards against React Strict Mode's double-invoked effects —
    // cleanup can fire before the dynamic import resolves.
    let cancelled = false;
    const markers = markersRef.current;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, { zoomControl: true }).setView([center.lat, center.lng], 13);
      leafletRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const centerIcon = L.divIcon({
        className: "",
        html: '<div style="width:16px;height:16px;border-radius:9999px;background:#1e6d8a;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      centerMarkerRef.current = L.marker([center.lat, center.lng], {
        icon: centerIcon,
        interactive: false,
      }).addTo(map);

      circleRef.current = L.circle([center.lat, center.lng], {
        radius: radiusKm * 1000,
        color: "#1e6d8a",
        weight: 1,
        fillColor: "#1e6d8a",
        fillOpacity: 0.06,
      }).addTo(map);
    });

    return () => {
      cancelled = true;
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
      markers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the center pin + radius circle in sync when the job location or
  // the selected radius chip changes, without re-creating the map.
  useEffect(() => {
    if (!leafletRef.current || !circleRef.current || !centerMarkerRef.current) return;
    centerMarkerRef.current.setLatLng([center.lat, center.lng]);
    circleRef.current.setLatLng([center.lat, center.lng]);
    circleRef.current.setRadius(radiusKm * 1000);
    leafletRef.current.setView([center.lat, center.lng], leafletRef.current.getZoom());
  }, [center.lat, center.lng, radiusKm]);

  // Diff worker markers against the current listings so re-renders don't
  // tear down and rebuild every pin (which would lose hover/click state).
  useEffect(() => {
    if (!leafletRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !leafletRef.current) return;
      const map = leafletRef.current;
      const seen = new Set<string>();

      listings.forEach((listing) => {
        if (listing.latitude === null || listing.longitude === null) return;
        seen.add(listing.id);

        const color = AVAILABILITY_COLOR[listing.availability];
        const isActive = listing.id === activeListingId;
        const size = isActive ? 34 : 26;
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:800;">${(listing.worker?.name || "?").charAt(0)}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const existing = markersRef.current.get(listing.id);
        if (existing) {
          existing.setIcon(icon);
          existing.setLatLng([listing.latitude, listing.longitude]);
        } else {
          const marker = L.marker([listing.latitude, listing.longitude], { icon }).addTo(map);
          marker.on("mouseover", () => onMarkerHover?.(listing.id));
          marker.on("mouseout", () => onMarkerHover?.(null));
          marker.on("click", () => onMarkerClick?.(listing.id));
          markersRef.current.set(listing.id, marker);
        }
      });

      markersRef.current.forEach((marker, id) => {
        if (!seen.has(id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [listings, activeListingId, onMarkerHover, onMarkerClick]);

  return (
    <>
      {/* Leaflet CSS — loaded once via link tag, same as LocationPicker */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
      <div ref={mapRef} style={{ height, width: "100%" }} className="bg-[#e6ecef]" />
    </>
  );
}
