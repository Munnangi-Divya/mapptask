
import React, { useRef, useState } from "react";
import MapView from "./components/MapView";
import Controls from "./components/Controls";
import StatsPanel from "./components/StatsPanel";
import "./App.css";

export default function App() {
  const mapRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [speed, setSpeedState] = useState(1);

  const handleStats = (s) => {

    setStats({
      speedKmh: s?.speedKmh ?? 0,
      distanceKm: s?.distanceKm ?? 0,
      elapsedMs: s?.elapsedMs ?? 0,
      currentPos: s?.currentPos ?? null,
      isPlaying: s?.isPlaying ?? false,
    });
  };

  const handlePlay = () => {
    mapRef.current?.play();
  };

  const handlePause = () => {
    mapRef.current?.pause();
  };

  const handleRestart = () => {
    mapRef.current?.restart();
  };

  const handleSetSpeed = (v) => {
    setSpeedState(v);
    mapRef.current?.setSpeed?.(v);
  };

  return (
    <div className="app-root">
      
      <StatsPanel stats={stats} />

      
      <div className="map-area">
        <MapView ref={mapRef} onStats={handleStats} />
      </div>

      <div className="controls-area">
        <Controls
          onPlay={handlePlay}
          onPause={handlePause}
          onRestart={handleRestart}
          speed={speed}
          setSpeed={handleSetSpeed}
        />
      </div>
    </div>
  );
}
