import { useEffect, useRef, useState } from "react";
import { wrap180 } from "./dialModel.ts";

// Motion for the world-time dial.

/** Rotation of the 24-hour ring for a source time: +15° per hour, so the ring
 *  turns clockwise through the day. The angle is unwrapped (it keeps counting
 *  past ±360°), so 23:00 → 01:00 turns forward 30° instead of back 330°. While `immediate` (dragging) it follows exactly;
 *  otherwise it eases, so "best overlap" and "Now" visibly turn the ring. */
export function useRingRotation(sourceHours: number, immediate: boolean): number {
  const [target, setTarget] = useState(() => 15 * sourceHours);
  useEffect(() => {
    setTarget((prev) => prev + wrap180(15 * sourceHours - prev));
  }, [sourceHours]);

  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  useEffect(() => {
    if (immediate) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const from = shownRef.current;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 650);
      shownRef.current = from + (target - from) * (1 - Math.pow(1 - k, 3));
      setShown(shownRef.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, immediate]);
  return shown;
}

/** Seconds-hand angle, stepping in eighths of a second like a 4 Hz movement
 *  (two beats per swing, eight per second). Mount it only while live: pulling
 *  the crown "hacks" the movement and the seconds hand goes away. */
export function useSecondsAngle(): number {
  const [ms, setMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setMs(Date.now()), 125);
    return () => clearInterval(id);
  }, []);
  return (Math.floor((ms % 60_000) / 125) * 360) / 480;
}
