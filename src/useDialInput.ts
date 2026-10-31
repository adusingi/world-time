import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Converter } from "./useConverter.ts";
import { wrap180 } from "./dialModel.ts";

// Input for the world-time dial. Everything goes through the converter, so the
// globe arcs, the hero time and the timeline follow the dial.
//
//   drag the ring        → plan a time (15-minute detents, like crown clicks)
//   click the crown      → in = live ("Now"); out = planning, movement stopped
//   wheel (crown out)    → ±15 min per notch
//   ← → / ↑ ↓ (focused)  → ±15 min, Shift = ±1 h; Enter / Space = crown
//
// Touch: while live the page still scrolls over the dial (touch-action
// pan-y); with the crown out the dial takes every gesture, so the ring drags
// freely.

const STEP_MS = 15 * 60_000;
export const VIEW = 480; // viewBox size; the SVG is square, centred on 0,0
const RING_INNER = 112; // grab zone: ring + city labels, not the hands
const RING_OUTER = 212;

export function useDialInput(conv: Converter) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ last: number; turned: number; from: number; snapped: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const nudge = (ms: number) =>
    conv.pickInstant(new Date(Math.round((conv.sourceInstant.getTime() + ms) / STEP_MS) * STEP_MS));

  function toggleCrown() {
    if (conv.live) conv.pickInstant(conv.sourceInstant);
    else conv.goLive();
  }

  // Pointer position as (angle from 12 o'clock, radius in viewBox units).
  function locate(e: PointerEvent): { angle: number; r: number } {
    const box = svgRef.current!.getBoundingClientRect();
    const k = VIEW / box.width;
    const dx = (e.clientX - box.left - box.width / 2) * k;
    const dy = (e.clientY - box.top - box.height / 2) * k;
    return { angle: (Math.atan2(dx, -dy) * 180) / Math.PI, r: Math.hypot(dx, dy) };
  }

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    const { angle, r } = locate(e);
    if (r < RING_INNER || r > RING_OUTER) return;
    if ((e.target as Element).closest("[data-crown]")) return; // a click, not a drag
    e.currentTarget.setPointerCapture(e.pointerId);
    const from = conv.sourceInstant.getTime();
    drag.current = { last: angle, turned: 0, from, snapped: from };
    setDragging(true);
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d) return;
    const { angle } = locate(e);
    d.turned += wrap180(angle - d.last);
    d.last = angle;
    // The ring turns backwards through the day: dragging it clockwise by one
    // hour-step (15°) goes back one hour.
    const target = d.from - (d.turned / 15) * 3_600_000;
    const snapped = Math.round(target / STEP_MS) * STEP_MS;
    if (snapped !== d.snapped) {
      d.snapped = snapped;
      conv.pickInstant(new Date(snapped));
    }
  }

  function onPointerUp() {
    drag.current = null;
    setDragging(false);
  }

  function onKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    const step = e.shiftKey ? 4 * STEP_MS : STEP_MS;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") nudge(step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") nudge(-step);
    else if (e.key === "Enter" || e.key === " ") toggleCrown();
    else return;
    e.preventDefault(); // arrows / space would otherwise scroll the page
  }

  // Wheel turns time only with the crown out, so page scroll is never hijacked
  // in live mode. Needs a non-passive listener to preventDefault. Trackpads
  // send many tiny deltas, so step once per ~40px of scroll.
  const wheelAcc = useRef(0);
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    if (conv.live || e.deltaY === 0) return;
    e.preventDefault();
    wheelAcc.current += e.deltaY;
    if (Math.abs(wheelAcc.current) < 40) return;
    nudge(Math.sign(wheelAcc.current) * STEP_MS);
    wheelAcc.current = 0;
  };
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const fn = (e: WheelEvent) => wheelRef.current(e);
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  }, []);

  return {
    svgRef,
    dragging,
    toggleCrown,
    touchClass: conv.live ? "touch-pan-y" : "touch-none",
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onKeyDown },
  };
}
