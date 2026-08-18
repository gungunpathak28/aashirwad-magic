/**
 * Animated "AASHIRWAD MIL GAYA" celebration overlay.
 * Re-mounted with a fresh `celebrationKey` each time it fires so the
 * CSS entrance/exit animations replay cleanly.
 */
export default function Celebration({ visible, celebrationKey }) {
  if (!visible) return null;

  return (
    <div className="celebration-text" key={celebrationKey}>
      <div className="celebration-badge">✨ सदा सुखी रहो ✨</div>
      <h2 className="celebration-title">AASHIRWAD MIL GAYA ✨</h2>
      <p className="celebration-sub">🌸 Blessings received with divine grace 🌸</p>
    </div>
  );
}
