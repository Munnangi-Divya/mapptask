
import React from "react";

export default function Controls({
  onPlay,
  onPause,
  onRestart,
  speed = 1,
  setSpeed = () => {},
}) {
  const safeSpeed = Number(speed) || 1;

  return (
    <div className="neon-card">
      <div className="neon-row">
        <button className="neon-btn" onClick={onPlay} aria-label="Play">
          ▶
        </button>

        <button className="neon-btn" onClick={onPause} aria-label="Pause">
          ⏸
        </button>

        <button className="neon-btn" onClick={onRestart} aria-label="Restart">
          ⟲
        </button>

        <div className="speed-control">
          <label className="speed-label">Speed</label>
          <input
            className="speed-range"
            type="range"
            min="0.25"
            max="4"
            step="0.25"
            value={safeSpeed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
          <div className="speed-value">{safeSpeed.toFixed(2)}x</div>
        </div>
      </div>
    </div>
  );
}
