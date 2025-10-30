


import React from "react";

export default function StatsPanel({ stats }) {
  
  const speedKmh = Number(stats?.speedKmh ?? 0);
  const distanceKm = Number(stats?.distanceKm ?? 0);
  const elapsedMs = Number(stats?.elapsedMs ?? 0);
  const currentPos = stats?.currentPos ?? null;
  const isPlaying = Boolean(stats?.isPlaying);

  
  const formatElapsed = (ms) => {
    const totalSec = Math.floor((ms || 0) / 1000);
    const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  return (
    <div className="stats-panel neon-stats">
      <div className="stats-row">
        <div className="stat">
          <div className="stat-label">Speed</div>
          <div className="stat-value">{speedKmh.toFixed(2)} km/h</div>
        </div>

        <div className="stat">
          <div className="stat-label">Distance</div>
          <div className="stat-value">{distanceKm.toFixed(3)} km</div>
        </div>

        <div className="stat">
          <div className="stat-label">Elapsed</div>
          <div className="stat-value">{formatElapsed(elapsedMs)}</div>
        </div>
      </div>

      <div className="stats-row small">
        <div className="stat mini">
          <div className="stat-label">Lat / Lng</div>
          <div className="stat-value mini-value">
            {currentPos ? `${currentPos.lat.toFixed(5)}, ${currentPos.lng.toFixed(5)}` : "—"}
          </div>
        </div>

        <div className="stat mini">
          <div className="stat-label">Status</div>
          <div className={`stat-value ${isPlaying ? "live" : "paused"}`}>
            {isPlaying ? "Moving" : "Paused"}
          </div>
        </div>
      </div>
    </div>
  );
}
