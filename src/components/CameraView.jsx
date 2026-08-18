import { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

/**
 * Owns the webcam stream + MediaPipe HandLandmarker lifecycle.
 * Reports per-frame results upward via onResult so gesture logic and UI
 * state can live in the parent.
 */
export default function CameraView({ onResult, onReady, onTrackingReady, onError, onTrackingError }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const cancelledRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const lastTimestampRef = useRef(0);

  const onResultRef = useRef(onResult);
  const onReadyRef = useRef(onReady);
  const onTrackingReadyRef = useRef(onTrackingReady);
  const onErrorRef = useRef(onError);
  const onTrackingErrorRef = useRef(onTrackingError);

  useEffect(() => {
    onResultRef.current = onResult;
    onReadyRef.current = onReady;
    onTrackingReadyRef.current = onTrackingReady;
    onErrorRef.current = onError;
    onTrackingErrorRef.current = onTrackingError;
  });

  useEffect(() => {
    cancelledRef.current = false;

    async function createLandmarker(vision, delegate) {
      return HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate,
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    }

    async function init() {
      // Check secure context (camera requires HTTPS or localhost)
      const isLocalhost = Boolean(
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]'
      );
      if (!window.isSecureContext && !isLocalhost) {
        onErrorRef.current?.(
          'Camera access requires HTTPS or localhost. Please open http://localhost:5173 in Chrome or Edge.'
        );
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onErrorRef.current?.(
          'Your browser does not support webcam access. Please use the latest Chrome, Edge, or Safari.'
        );
        return;
      }

      let stream;
      try {
        // Try ideal user-facing camera resolution
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (idealErr) {
        console.warn('[AashirwadMagic] Ideal camera constraints failed, falling back to basic video:', idealErr);
        try {
          // Fallback to generic video if specific constraints failed
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err) {
          console.error('[AashirwadMagic] getUserMedia failed completely:', err);
          if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
            onErrorRef.current?.(
              'Camera permission was blocked. Click the camera icon in your browser address bar to Allow access, then try again.'
            );
          } else if (err && err.name === 'NotFoundError') {
            onErrorRef.current?.('No webcam found. Please connect a camera and try again.');
          } else if (err && err.name === 'NotReadableError') {
            onErrorRef.current?.('Camera is in use by another app (e.g. Zoom, Teams). Close it and try again.');
          } else {
            onErrorRef.current?.(`Could not start camera (${err.message || 'error'}). Please check permissions.`);
          }
          return;
        }
      }

      if (cancelledRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.srcObject = stream;

        try {
          await video.play();
        } catch (err) {
          console.warn('[AashirwadMagic] video.play() rejected, waiting for metadata:', err);
          await new Promise((resolve) => {
            video.onloadeddata = () => {
              video.play().catch(() => {});
              resolve();
            };
            video.onloadedmetadata = () => {
              video.play().catch(() => {});
              resolve();
            };
            // Fallback timeout in case events already fired
            setTimeout(resolve, 500);
          });
        }
      }

      onReadyRef.current?.();

      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
        if (cancelledRef.current) return;

        let landmarker;
        try {
          landmarker = await createLandmarker(vision, 'GPU');
        } catch (gpuErr) {
          console.warn('[AashirwadMagic] GPU delegate failed, falling back to CPU:', gpuErr);
          landmarker = await createLandmarker(vision, 'CPU');
        }

        if (cancelledRef.current) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        onTrackingReadyRef.current?.();
        loop();
      } catch (err) {
        console.error('[AashirwadMagic] MediaPipe HandLandmarker failed to load:', err);
        onTrackingErrorRef.current?.(
          'Hand tracking could not load. Camera is live, but gesture tracking requires an active internet connection.'
        );
      }
    }

    function loop() {
      if (cancelledRef.current) return;
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (video && landmarker && video.readyState >= 2) {
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          const now = performance.now();
          const timestamp = Math.max(now, (lastTimestampRef.current || 0) + 1);
          lastTimestampRef.current = timestamp;

          try {
            const result = landmarker.detectForVideo(video, timestamp);
            const landmarks = result.landmarks?.[0] ?? null;
            const handedness = result.handedness?.[0]?.[0]?.categoryName ?? 'Right';
            onResultRef.current?.(landmarks, handedness);
          } catch (detectErr) {
            console.warn('[AashirwadMagic] detection frame skip:', detectErr);
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    init();

    return () => {
      cancelledRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  return <video ref={videoRef} className="camera-video" playsInline muted autoPlay />;
}
