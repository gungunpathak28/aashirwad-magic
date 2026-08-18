import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { ParticleSystem } from '../utils/particles';

/**
 * Thin React wrapper around ParticleSystem. Exposes an imperative API
 * (via ref) so the parent can trigger bursts without re-rendering React
 * state every animation frame.
 */
const ParticleCanvas = forwardRef(function ParticleCanvas(_, ref) {
  const canvasRef = useRef(null);
  const systemRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const system = new ParticleSystem(canvas);
    systemRef.current = system;
    system.start();

    const handleResize = () => system.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      system.destroy();
      systemRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    celebrate() {
      const system = systemRef.current;
      if (!system) return;
      system.spawnPetalBurst(60);
      system.spawnSparkleBurst(system.width / 2, system.height * 0.45, 45);
      system.spawnGlowDots(18);
    },
    sparkleAura(xRatio, yRatio) {
      const system = systemRef.current;
      if (!system) return;
      system.spawnAuraSparkles(system.width * xRatio, system.height * yRatio, 3);
    },
    keepPetalsFalling() {
      const system = systemRef.current;
      if (!system) return;
      system.spawnPetalBurst(12);
    },
    clear() {
      systemRef.current?.clear();
    },
  }));

  return <canvas ref={canvasRef} className="particle-canvas" />;
});

export default ParticleCanvas;
