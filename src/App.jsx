import { useCallback, useEffect, useRef, useState } from 'react';
import CameraView from './components/CameraView.jsx';
import ParticleCanvas from './components/ParticleCanvas.jsx';
import Celebration from './components/Celebration.jsx';
import ReelMode from './components/ReelMode.jsx';
import { createGestureTracker } from './utils/gestureDetection.js';

function playChime(audioCtxRef, muted) {
  if (muted) return;
  try {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtxRef.current = new Ctx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    // Sacred temple bell / harmonic chime (528Hz divine frequency chord)
    const notes = [528, 660, 792, 1056];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.75);
    });
  } catch {
    // Web Audio optional, fail silently
  }
}

export default function App() {
  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [trackingReady, setTrackingReady] = useState(false);
  const [error, setError] = useState(null);
  const [trackingWarning, setTrackingWarning] = useState(null);
  const [handDetected, setHandDetected] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isBlessed, setIsBlessed] = useState(false);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [reelMode, setReelMode] = useState(false);
  const [muted, setMuted] = useState(true);

  const trackerRef = useRef(null);
  const particleRef = useRef(null);
  const sustainTimersRef = useRef([]);
  const audioCtxRef = useRef(null);

  if (!trackerRef.current) {
    trackerRef.current = createGestureTracker();
  }

  const clearSustainTimers = useCallback(() => {
    sustainTimersRef.current.forEach((id) => clearTimeout(id));
    sustainTimersRef.current = [];
  }, []);

  const triggerCelebration = useCallback(() => {
    clearSustainTimers();
    setIsBlessed(true);
    setCelebrationKey((k) => k + 1);
    particleRef.current?.celebrate();
    playChime(audioCtxRef, muted);

    // Keep petals gently falling across the celebration window
    for (let i = 1; i <= 6; i++) {
      const id = setTimeout(() => {
        particleRef.current?.keepPetalsFalling();
      }, i * 550);
      sustainTimersRef.current.push(id);
    }

    // Auto-reset blessing state after celebration ends so you can give Aashirwad again seamlessly
    const resetTimer = setTimeout(() => {
      setIsBlessed(false);
    }, 4500);
    sustainTimersRef.current.push(resetTimer);
  }, [muted, clearSustainTimers]);

  const handleResult = useCallback(
    (landmarks, handedness) => {
      const present = Boolean(landmarks);
      setHandDetected(present);

      if (isBlessed) {
        setHoldProgress(0);
        return;
      }

      const { holdProgress: progress, triggered } = trackerRef.current.update(
        landmarks,
        handedness
      );
      setHoldProgress(progress);

      // Emit charging aura sparkles around the hand when holding the blessing pose
      if (landmarks && progress > 0.05) {
        particleRef.current?.sparkleAura(1 - landmarks[9].x, landmarks[9].y);
      }

      if (triggered) {
        triggerCelebration();
      }
    },
    [isBlessed, triggerCelebration]
  );

  const handleStart = () => {
    setError(null);
    setTrackingWarning(null);
    setCameraReady(false);
    setTrackingReady(false);
    setCameraStarted(true);
  };

  const handleReset = () => {
    clearSustainTimers();
    setIsBlessed(false);
    setHoldProgress(0);
    trackerRef.current?.reset();
    particleRef.current?.clear();
  };

  useEffect(() => clearSustainTimers, [clearSustainTimers]);

  const showMeter = cameraReady && !isBlessed;

  return (
    <div className="app-shell">
      <div className="header">
        <p className="eyebrow">Aashirwad Magic</p>
        <h1 className="title">
          Give Aashirwad <span className="hand-emoji">✋</span>
        </h1>
        <p className="subtitle">Show your blessing palm to the camera…</p>
      </div>

      <div className="stage">
        <div className={`camera-frame${isBlessed ? ' blessed' : ''}${reelMode ? ' reel-mode' : ''}`}>
          {cameraStarted ? (
            <>
              <CameraView
                onResult={handleResult}
                onReady={() => setCameraReady(true)}
                onTrackingReady={() => setTrackingReady(true)}
                onError={(msg) => {
                  setError(msg);
                  setCameraStarted(false);
                  setCameraReady(false);
                  setTrackingReady(false);
                }}
                onTrackingError={(msg) => setTrackingWarning(msg)}
              />
              <ParticleCanvas ref={particleRef} />
              <div className={`screen-glow${isBlessed ? ' active' : ''}`} />

              {/* Status badges */}
              {!cameraReady && (
                <div className="loading-overlay">
                  <div className="loading-spinner" />
                  <p>Starting camera...</p>
                </div>
              )}

              {cameraReady && !trackingReady && !trackingWarning && (
                <div className="tracking-badge loading">
                  <span className="dot pulse" />
                  Initializing AI tracking...
                </div>
              )}

              {cameraReady && trackingReady && (
                <div className={`hand-indicator${handDetected ? ' visible' : ''}`}>
                  <span className="dot" />
                  {handDetected ? 'Hand detected' : 'Waiting for hand'}
                </div>
              )}

              {trackingWarning && (
                <div className="tracking-warning">{trackingWarning}</div>
              )}

              <div className={`blessing-meter${showMeter ? ' visible' : ''}`}>
                <div className="blessing-meter-label">
                  <span>Blessing Power</span>
                  <span>{Math.round(holdProgress * 100)}%</span>
                </div>
                <div className="blessing-meter-track">
                  <div
                    className="blessing-meter-fill"
                    style={{ width: `${holdProgress * 100}%` }}
                  />
                </div>
              </div>

              <Celebration visible={isBlessed} celebrationKey={celebrationKey} />
            </>
          ) : (
            <div className="start-panel">
              <span className="palm-glyph">🙏</span>
              {error ? (
                <div className="error-box">
                  <p className="error-title">⚠️ Camera Notice</p>
                  <p className="error-text">{error}</p>
                </div>
              ) : (
                <p className="helper-text">
                  Click below to start your camera, then raise an open palm toward the screen to receive divine blessings.
                </p>
              )}
              <button type="button" className="btn" onClick={handleStart}>
                {error ? 'Try Again' : 'Start Camera'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="controls-row">
        <ReelMode active={reelMode} onToggle={() => setReelMode((v) => !v)} />
        <button
          type="button"
          className={`icon-btn${!muted ? ' active' : ''}`}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? '🔇 Sound Off' : '🔔 Sound On'}
        </button>
        {isBlessed && (
          <button type="button" className="icon-btn" onClick={handleReset}>
            🔄 Try Again
          </button>
        )}
      </div>

      <p className="footer-note">Runs 100% locally in your browser · no video ever leaves your device</p>
    </div>
  );
}
