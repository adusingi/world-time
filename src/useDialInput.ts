import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Converter } from "./useConverter.ts";
import { wrap180 } from "./dialModel.ts";

// Input for the world-time dial. The crown is the mode switch, as on a real
// watch:
//
//   crown in (live)      → the dial only shows the time. Trying to set it
//                          (drag the ring, ← →) nudges the crown as a hint.
//   click the crown      → in ⇄ out. Out = planning; in = back to now.
//   crown out (planning) → drag the ring, drag the crown up/down (up = later),
//                          wheel, ← → / ↑ ↓ (Shift = 1 h). All in 15-min steps.
//
// Everything goes through the converter, so the globe arcs, the hero time and
// the timeline follow the dial. Touch: while live the page scrolls over the
// dial (touch-action pan-y); with the crown out the dial takes every gesture.

const STEP_MS = 15 * 60_000;
export const VIEW = 480; // viewBox size; the SVG is square, centred on 0,0
const RING_INNER = 112; // grab zone: ring + city labels, not the hands
const RING_OUTER = 212;
const CROWN_STEP = 6; // viewBox units of crown drag per 15-minute step
const CLICK_SLOP = 3; // crown movement (viewBox units) still counted as a click
const HINT_AFTER = 8; // ring drag distance (viewBox units) that earns a hint

type Gesture =
  | { kind: "ring"; last: number; turned: number; from: number; snapped: number }
  | { kind: "crown"; y0: number; from: number; snapped: number; turned: boolean }
  | { kind: "locked"; x0: number; y0: number; hinted: boolean }; // ring, crown in

const snap = (ms: number) => Math.round(ms / STEP_MS) * STEP_MS;

export function useDialInput(conv: Converter) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [dragging, setDragging] = useState(false); // ring or crown turning: no easing
  const [hint, setHint] = useState(0); // bumps on every "pull the crown first"

  const showHint = () => setHint((n) => n + 1);
  const pinIfNew = (g: { snapped: number }, ms: number) => {
    if (ms === g.snapped) return;
    g.snapped = ms;
    conv.pickInstant(new Date(ms));
  };

  function toggleCrown() {
    if (conv.live) conv.pickInstant(conv.sourceInstant);
    else conv.goLive();
  }

  // Pointer position in viewBox units, plus its angle from 12 o'clock.
  function locate(e: PointerEvent) {
    const box = svgRef.current!.getBoundingClientRect();
    const k = VIEW / box.width;
    const x = (e.clientX - box.left - box.width / 2) * k;
    const y = (e.clientY - box.top - box.height / 2) * k;
    return { x, y, angle: (Math.atan2(x, -y) * 180) / Math.PI, r: Math.hypot(x, y) };
  }

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    const p = locate(e);
    const onCrown = !!(e.target as Element).closest("[data-crown]");
    if (!onCrown && (p.r < RING_INNER || p.r > RING_OUTER)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const from = conv.sourceInstant.getTime();
    if (onCrown) {
      gesture.current = { kind: "crown", y0: p.y, from, snapped: from, turned: false };
    } else if (conv.live) {
      gesture.current = { kind: "locked", x0: p.x, y0: p.y, hinted: false };
    } else {
      gesture.current = { kind: "ring", last: p.angle, turned: 0, from, snapped: from };
      setDragging(true);
    }
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    const g = gesture.current;
    if (!g) return;
    const p = locate(e);
    if (g.kind === "locked") {
      if (!g.hinted && Math.hypot(p.x - g.x0, p.y - g.y0) > HINT_AFTER) {
        g.hinted = true;
        showHint();
      }
    } else if (g.kind === "crown") {
      // Crown in: a press only pulls it out (on release). Crown out: turn it.
      const up = g.y0 - p.y;
      if (conv.live || (!g.turned && Math.abs(up) < CLICK_SLOP)) return;
      if (!g.turned) {
        g.turned = true;
        setDragging(true);
      }
      pinIfNew(g, snap(g.from + (up / CROWN_STEP) * STEP_MS));
    } else {
      g.turned += wrap180(p.angle - g.last);
      g.last = p.angle;
      // The ring turns backwards through the day: dragging it clockwise by one
      // hour-step (15°) goes back one hour.
      pinIfNew(g, snap(g.from - (g.turned / 15) * 3_600_000));
    }
  }

  function onPointerUp() {
    const g = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (g?.kind === "crown" && !g.turned) toggleCrown();
  }

  function onPointerCancel() {
    gesture.current = null;
    setDragging(false);
  }

  function onKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleCrown();
      return;
    }
    const dir =
      e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!dir) return;
    e.preventDefault(); // arrows would otherwise scroll the page
    if (conv.live) showHint();
    else conv.pickInstant(new Date(snap(conv.sourceInstant.getTime() + dir * (e.shiftKey ? 4 : 1) * STEP_MS)));
  }

  // Wheel turns the crown only when it is out, so page scroll is never
  // hijacked in live mode. Needs a non-passive listener to preventDefault.
  // Trackpads send many tiny deltas, so step once per ~40px of scroll.
  const wheelAcc = useRef(0);
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    if (conv.live || e.deltaY === 0) return;
    e.preventDefault();
    wheelAcc.current += e.deltaY;
    if (Math.abs(wheelAcc.current) < 40) return;
    conv.pickInstant(new Date(snap(conv.sourceInstant.getTime() + Math.sign(wheelAcc.current) * STEP_MS)));
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
    hint,
    touchClass: conv.live ? "touch-pan-y" : "touch-none",
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onKeyDown },
  };
}
