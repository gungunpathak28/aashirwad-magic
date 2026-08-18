/**
 * Toggle button for the vertical 9:16 "Reel Mode" layout, plus the small
 * reminder note shown while it's active. Purely presentational — the
 * actual aspect-ratio switch happens via a CSS class in App.jsx.
 */
export default function ReelMode({ active, onToggle }) {
  return (
    <>
      <button
        type="button"
        className={`icon-btn${active ? ' active' : ''}`}
        onClick={onToggle}
        aria-pressed={active}
      >
        🎥 {active ? 'Exit Reel Mode' : 'Reel Mode'}
      </button>
      {active && <p className="reel-note">Screen record this for your Reel ✨</p>}
    </>
  );
}
