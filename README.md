# Aashirwad Magic ✋🌸✨

Real webcam + real hand-tracking web experience. Show an open palm to the
camera; hold the blessing pose for a moment and the screen fills with
falling petals, golden glow and sparkles. 

Everything runs locally in the browser — no backend, no API keys. Hand
tracking uses Google's MediaPipe HandLandmarker (`@mediapipe/tasks-vision`).

## Run it

```bash
npm install
npm run dev
``` 

Open the printed local URL, click **Start Camera**, allow permission, and
raise an open palm toward the screen.

## How the gesture is detected

All detection logic lives in `src/utils/gestureDetection.js`, isolated from
the UI so it can be tuned independently:

1. **Shape** — `isHandOpenPalm()` checks that at least 4 of the 5 fingers are
   extended (each fingertip is meaningfully farther from the wrist than its
   pip joint) and that the fingertips are spread apart, so a fist or a
   sliver of a hand at a bad angle doesn't count.
2. **Orientation** — `isPalmFacingCamera()` takes the cross product of two
   vectors across the palm (wrist→index-knuckle, wrist→pinky-knuckle); the
   sign of the result tells us whether the palm or the back of the hand
   faces the lens.
3. **Hold + cooldown** — `createGestureTracker()` wraps both checks with
   timing: the pose must be held continuously for `holdDurationMs` (default
   650ms) before it fires, and then a `cooldownMs` window (default 4s)
   prevents it firing again immediately. This is what stops it from
   triggering off a single lucky frame or firing every frame once you're
   holding the pose.

## How to test it

- Sit with decent, even lighting facing the camera.
- Raise one hand, palm open and facing the screen, fingers naturally spread
  (like a blessing gesture), and hold still for under a second.
- Watch the **Blessing Power** meter in the bottom-left of the camera frame
  fill up as you hold the pose — it hits 100% right as the celebration
  fires.
- Lower your hand and try again after the ~4s cooldown.

## Adjusting gesture sensitivity

Open `src/utils/gestureDetection.js` and tweak the `CONFIG` object at the
top:

| Setting | Effect |
|---|---|
| `extensionMargin` | Lower = fingers count as "extended" more easily (more sensitive). Raise if it triggers with a half-closed hand. |
| `minExtendedFingers` | How many of the 4 fingers (index–pinky) must be extended. Drop to 3 if it feels too strict. |
| `minFingerSpread` | Minimum distance between index and pinky fingertips. Lower if it's rejecting hands held close to the camera. |
| `holdDurationMs` | How long the pose must be held before it fires. Lower for a snappier trigger, raise to cut false positives. |
| `cooldownMs` | Minimum gap between triggers. |

No other file needs to change — the tracker and pose functions are pure and
isolated from the camera/UI code.

## Project structure

```
src/
  components/
    CameraView.jsx      # webcam + MediaPipe lifecycle
    ParticleCanvas.jsx   # canvas particle engine wrapper (imperative API)
    Celebration.jsx      # animated "Aashirwad mil gaya" text overlay
    ReelMode.jsx          # vertical 9:16 mode toggle + note
  utils/
    gestureDetection.js  # isolated pose/hold/cooldown logic
    particles.js          # petal / sparkle / glow-dot canvas engine
  App.jsx
  main.jsx
  index.css
```

## Deploying to Vercel

```bash
npm install -g vercel   # if you don't have it already
vercel
```

Or via the dashboard: push this folder to a GitHub repo, then in Vercel
choose **Add New Project → Import Git Repository**. Vercel auto-detects
Vite — no config needed. Build command: `npm run build`, output directory:
`dist`.

Because MediaPipe's WASM/model files load from Google's CDN at runtime, no
extra environment variables or secrets are required.

## Notes

- Camera access requires HTTPS in production (Vercel gives you this by
  default) or `localhost` in development.
- The video feed is mirrored (selfie-style) purely visually — the raw
  landmark coordinates used for detection are not flipped.
- Sound is off by default; toggle it with the **Sound** button. It plays a
  tiny generated chime (Web Audio API oscillators) — no audio files.
  
