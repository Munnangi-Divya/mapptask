
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import dummyRoute from "../data/dummy-route.json";
import {
  ensureTimestamps,
  totalRouteDurationMs,
  computePositionAtOffset,
} from "../utils/MovementSimulator"; 
import { haversineDistanceMeters, bearingDeg } from "../utils/mapUtils";



const DEFAULT_TILE =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

const MapAutoFit = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (map && bounds && bounds.length) map.fitBounds(bounds, { padding: [60, 60] });
  }, [map, bounds]);
  return null;
};

const MapView = forwardRef(({ tileUrl = DEFAULT_TILE, onStats }, ref) => {

  const route = ensureTimestamps(dummyRoute); // [{lat, lng, ts}]
  const durationMs = totalRouteDurationMs(route);

  
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const rafRef = useRef(null);
  const startPerfRef = useRef(null);
  const simOffsetRef = useRef(0); 
  const animateRef = useRef(null);
  const speedMultiplierRef = useRef(1);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1); // visible slider / UI
  const [simElapsedMs, setSimElapsedMs] = useState(0);
  const [progressLatLngs, setProgressLatLngs] = useState([[route[0].lat, route[0].lng]]);
  const [instantSpeed, setInstantSpeed] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [currentPos, setCurrentPos] = useState({ lat: route[0].lat, lng: route[0].lng, ts: route[0].ts });

  
  const bounds = route.map((p) => [p.lat, p.lng]);

  
  const vehicleDivIcon = L.divIcon({
    className: "vehicle-div-icon",
    html: `<div style="transform: rotate(0deg); display:flex; align-items:center; justify-content:center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 11l1.6-4A2 2 0 0 1 6.5 5h11a2 2 0 0 1 1.9 1.1L21 11" fill="#1976d2"></path>
              <rect x="4" y="11" width="16" height="6" rx="1.2" fill="#1976d2"></rect>
              <circle cx="7.2" cy="18.5" r="1.2" fill="#222"></circle>
              <circle cx="16.8" cy="18.5" r="1.2" fill="#222"></circle>
              <path d="M8 7h8" stroke="#fff" stroke-width="0.6" stroke-linecap="round"></path>
            </svg>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  
  const emitStats = useCallback(
    (payload) => {
      if (typeof onStats === "function") onStats(payload);
    },
    [onStats]
  );

  
  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
    
  }, [speedMultiplier]);

  
  useEffect(() => {
    animateRef.current = function animate(timestamp) {
      if (!startPerfRef.current) startPerfRef.current = timestamp;
      const realElapsed = timestamp - startPerfRef.current;
      const simElapsed = simOffsetRef.current + realElapsed * speedMultiplierRef.current;
      const capped = Math.min(simElapsed, durationMs);
    
      setSimElapsedMs(capped);

      const res = computePositionAtOffset(route, capped);
      if (res) {
        const { pos, index: segIndex } = res;

        
        let b = 0;
        if (segIndex >= 0 && segIndex < route.length - 1) {
          const next = route[Math.min(segIndex + 1, route.length - 1)];
          b = bearingDeg(pos.lat, pos.lng, next.lat, next.lng);
        } else if (segIndex >= 1) {
          const prev = route[Math.max(segIndex - 1, 0)];
          b = bearingDeg(prev.lat, prev.lng, pos.lat, pos.lng);
        }

        
        if (markerRef.current) {
          const el = markerRef.current.getElement();
          if (el) {
            const inner = el.querySelector("div");
            if (inner) inner.style.transform = `rotate(${b}deg)`;
          }
          markerRef.current.setLatLng([pos.lat, pos.lng]);
        }

        
        setProgressLatLngs((prev) => {
          const last = prev[prev.length - 1];
          if (!last || last[0] !== pos.lat || last[1] !== pos.lng) {
            return [...prev, [pos.lat, pos.lng]];
          }
          return prev;
        });

        
        let instSpeed = 0;
        if (segIndex >= 0 && segIndex < route.length - 1) {
          const p0 = route[segIndex];
          const p1 = route[segIndex + 1];
          const distMeters = haversineDistanceMeters(p0.lat, p0.lng, p1.lat, p1.lng);
          const dtSec = (p1.ts.getTime() - p0.ts.getTime()) / 1000;
          if (dtSec > 0) {
            const mps = distMeters / dtSec;
            instSpeed = mps * 3.6;
          }
        }
        setInstantSpeed(instSpeed);

        
        let distMeters = 0;
        for (let i = 0; i < route.length - 1; i++) {
          if (i < res.index) {
            distMeters += haversineDistanceMeters(route[i].lat, route[i].lng, route[i + 1].lat, route[i + 1].lng);
          } else if (i === res.index) {
            const segStart = route[i].ts.getTime() - route[0].ts.getTime();
            const segEnd = route[i + 1].ts.getTime() - route[0].ts.getTime();
            const segDt = segEnd - segStart || 1;
            const localT = Math.max(0, Math.min(1, (capped - segStart) / segDt));
            const segDist = haversineDistanceMeters(route[i].lat, route[i].lng, route[i + 1].lat, route[i + 1].lng);
            distMeters += segDist * localT;
          }
        }
        setDistanceKm(distMeters / 1000);

        
        const curPos = { lat: pos.lat, lng: pos.lng, ts: new Date(route[0].ts.getTime() + capped) };
        setCurrentPos(curPos);

      
        emitStats({
          isPlaying: true,
          elapsedMs: capped,
          speedKmh: instSpeed,
          distanceKm: distMeters / 1000,
          currentPos: curPos,
        });
      }

      if (capped >= durationMs) {
        
        setIsPlaying(false);
        simOffsetRef.current = durationMs;
        startPerfRef.current = null;
        
        emitStats({
          isPlaying: false,
          elapsedMs: durationMs,
          speedKmh: 0,
          distanceKm,
          currentPos,
        });
        rafRef.current = null;
        return;
      }

      rafRef.current = requestAnimationFrame((t) => {
        if (animateRef.current) animateRef.current(t);
      });
    };
    
  }, [route, durationMs, emitStats,currentPos, distanceKm]); 

  
  useImperativeHandle(
    ref,
    () => ({
      play: () => {
        if (isPlaying) return;
        setIsPlaying(true);
        startPerfRef.current = null;
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame((t) => {
            if (animateRef.current) animateRef.current(t);
          });
        }
      },
      pause: () => {
        if (!isPlaying) return;
        setIsPlaying(false);
        simOffsetRef.current = simElapsedMs;
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        startPerfRef.current = null;
        emitStats({
          isPlaying: false,
          elapsedMs: simElapsedMs,
          speedKmh: instantSpeed,
          distanceKm,
          currentPos,
        });
      },
      restart: () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        setIsPlaying(false);
        simOffsetRef.current = 0;
        startPerfRef.current = null;
        setSimElapsedMs(0);
        setProgressLatLngs([[route[0].lat, route[0].lng]]);
        setDistanceKm(0);
        setInstantSpeed(0);
        const startPos = { lat: route[0].lat, lng: route[0].lng, ts: route[0].ts };
        setCurrentPos(startPos);
        if (markerRef.current) markerRef.current.setLatLng([route[0].lat, route[0].lng]);
        emitStats({
          isPlaying: false,
          elapsedMs: 0,
          speedKmh: 0,
          distanceKm: 0,
          currentPos: startPos,
        });
      },
      setSpeed: (mult) => {
        if (typeof mult === "number" && mult > 0) {
          
          simOffsetRef.current = simElapsedMs;
          startPerfRef.current = null;
          setSpeedMultiplier(mult);
        }
      },
    }),
    
    [emitStats, simElapsedMs, instantSpeed, distanceKm, currentPos, route, isPlaying]
  );

  
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (markerRef.current && mapRef.current) {
        try {
          mapRef.current.removeLayer(markerRef.current);
        } catch (e) {}
      }
    };
  }, []);

  
  const handleMapCreated = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    const mk = L.marker([route[0].lat, route[0].lng], { icon: vehicleDivIcon, zIndexOffset: 1000 }).addTo(mapInstance);
    markerRef.current = mk;
  }, [route,vehicleDivIcon]);


 
  useEffect(() => {
    
  }, [simElapsedMs]);

  
  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <MapContainer
        center={[route[0].lat, route[0].lng]}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
        whenCreated={handleMapCreated}
      >
        <TileLayer url={tileUrl} />
        <MapAutoFit bounds={bounds} />
        
        <Polyline positions={route.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#eee", weight: 4 }} />
        
        <Polyline positions={progressLatLngs} pathOptions={{ color: "#1976d2", weight: 6 }} />
      </MapContainer>
    </div>
  );
});

export default MapView;
