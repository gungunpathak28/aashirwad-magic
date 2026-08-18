// gestureDetection.js
//
// Isolated "Aashirwad" (blessing) gesture detection logic.
// Everything tunable lives in the CONFIG object at the top so sensitivity
// can be adjusted without touching the detection math.
//
// The MediaPipe HandLandmarker returns 21 normalized landmarks per hand:
//   0    = wrist
//   1-4  = thumb (cmc, mcp, ip, tip)
//   5-8  = index (mcp, pip, dip, tip)
//   9-12 = middle (mcp, pip, dip, tip)
//   13-16 = ring (mcp, pip, dip, tip)
//   17-20 = pinky (mcp, pip, dip, tip)
//
// x, y are normalized [0,1] relative to the image (y points downward).
// z is relative depth.

export const CONFIG = {
  // How "extended" a finger must be (tip must be at least this much farther
  // from the wrist than the pip joint is, in normalized units).
  extensionMargin: 0.015,

  // Minimum number of the 4 non-thumb fingers (index, middle, ring, pinky)
  // that must be extended. 3 allows natural blessing gestures where pinky or
  // ring may be slightly relaxed.
  minExtendedFingers: 3,

  // How long (ms) the gesture must be held continuously before it fires.
  holdDurationMs: 600,

  // Cooldown (ms) after a successful trigger before it can fire again.
  cooldownMs: 3500,

  // Minimum spread between index and pinky fingertips (normalized).
  // Kept forgiving so blessing hands with closed or open fingers both work.
  minFingerSpread: 0.02,
};

const FINGER_JOINTS = {
  index: { mcp: 5, pip: 6, tip: 8 },
  middle: { mcp: 9, pip: 10, tip: 12 },
  ring: { mcp: 13, pip: 14, tip: 16 },
  pinky: { mcp: 17, pip: 18, tip: 20 },
};

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * A finger counts as "extended" when its tip is meaningfully farther from
 * the wrist than its pip joint is.
 */
function isFingerExtended(landmarks, wrist, joints) {
  const tip = landmarks[joints.tip];
  const pip = landmarks[joints.pip];
  const tipDist = dist(tip, wrist);
  const pipDist = dist(pip, wrist);
  return tipDist - pipDist > CONFIG.extensionMargin;
}

/**
 * Checks whether the hand is open with fingers upright —
 * the core "palm shown to camera" shape used in a blessing gesture.
 */
export function isHandOpenPalm(landmarks) {
  if (!landmarks || landmarks.length < 21) return false;
  const wrist = landmarks[0];
  let extendedCount = 0;

  for (const key of Object.keys(FINGER_JOINTS)) {
    if (isFingerExtended(landmarks, wrist, FINGER_JOINTS[key])) {
      extendedCount += 1;
    }
  }

  const indexTip = landmarks[FINGER_JOINTS.index.tip];
  const pinkyTip = landmarks[FINGER_JOINTS.pinky.tip];
  const spread = dist(indexTip, pinkyTip);

  // In Aashirwad gesture, hand is held upright (wrist is below knuckles)
  const middleMcp = landmarks[FINGER_JOINTS.middle.mcp];
  const isUpright = wrist.y > middleMcp.y;

  return extendedCount >= CONFIG.minExtendedFingers && spread >= CONFIG.minFingerSpread && isUpright;
}

/**
 * Determines whether the palm (vs back of hand) is facing the camera.
 * Uses 2D cross product of vectors from wrist to index knuckle and pinky knuckle.
 * 
 * In screen coordinates (y points down):
 * - Right hand palm facing camera: Index knuckle is on camera right, pinky on left -> crossZ < 0
 * - Left hand palm facing camera: Index knuckle is on camera left, pinky on right -> crossZ > 0
 */
export function isPalmFacingCamera(landmarks, handedness = 'Right') {
  if (!landmarks || landmarks.length < 21) return false;
  const wrist = landmarks[0];
  const indexMcp = landmarks[FINGER_JOINTS.index.mcp];
  const pinkyMcp = landmarks[FINGER_JOINTS.pinky.mcp];

  const v1 = { x: indexMcp.x - wrist.x, y: indexMcp.y - wrist.y };
  const v2 = { x: pinkyMcp.x - wrist.x, y: pinkyMcp.y - wrist.y };

  // 2D cross product: v1.x * v2.y - v1.y * v2.x
  const crossZ = v1.x * v2.y - v1.y * v2.x;

  if (handedness === 'Left') {
    return crossZ > 0;
  }
  return crossZ < 0;
}

/**
 * Combines shape + orientation into a single "is this the blessing pose" boolean.
 */
export function isAashirwadPose(landmarks, handedness = 'Right') {
  if (!landmarks || landmarks.length < 21) return false;
  return isHandOpenPalm(landmarks) && isPalmFacingCamera(landmarks, handedness);
}

/**
 * Stateful gesture tracker that manages hold progress and cooldown.
 */
export function createGestureTracker(config = {}) {
  const cfg = { ...CONFIG, ...config };
  let poseStartedAt = null;
  let lastTriggerAt = -Infinity;

  return {
    update(landmarks, handedness = 'Right', now = performance.now()) {
      const onCooldown = now - lastTriggerAt < cfg.cooldownMs;
      const isPosing = !onCooldown && isAashirwadPose(landmarks, handedness);

      if (!isPosing) {
        poseStartedAt = null;
        return { isPosing: false, holdProgress: 0, triggered: false, onCooldown };
      }

      if (poseStartedAt === null) {
        poseStartedAt = now;
      }

      const elapsed = now - poseStartedAt;
      const holdProgress = Math.min(1, elapsed / cfg.holdDurationMs);
      const triggered = elapsed >= cfg.holdDurationMs;

      if (triggered) {
        lastTriggerAt = now;
        poseStartedAt = null;
      }

      return { isPosing: true, holdProgress, triggered, onCooldown: false };
    },

    reset() {
      poseStartedAt = null;
      lastTriggerAt = -Infinity;
    },
  };
}
