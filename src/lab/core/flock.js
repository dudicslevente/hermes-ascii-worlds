// Flocking (boids) for schools, flocks and swarms.
//
// Boids are a simulation, not a closed-form pose, so they keep state. To stay
// as reproducible as the rest of the engine:
// - the simulation runs on a fixed 30 Hz step of the travel clock, so playing
//   forward frame by frame gives exactly the same positions however the frames
//   fall;
// - asking for an earlier time, or jumping more than MAX_GAP seconds ahead,
//   re-seeds the flock from a pure function of that time and warms it up, so
//   a seek never replays hours of history and never depends on what came
//   before;
// - positions live in a unit-height box (width = aspect ratio), so resizing
//   the pane rescales the flock instead of scattering it.
// State is kept in a per-renderer memo (S.memo), never in the module.
import { TAU, clamp, hash01, noise1 } from "./util.js";

export const STEP = 1 / 30;
const MAX_GAP = 20; // seconds of catch-up before a re-seed
const WARM = 8; // seconds simulated before the requested time after a re-seed

// Flock tuning. Distances are in box units (box height = 1).
export const FLOCK_DEFAULTS = Object.freeze({
  see: 0.24, // neighbour radius
  space: 0.085, // personal space: about one fish length
  minSpeed: 0.045,
  maxSpeed: 0.095,
  turn: 2.6, // max turn rate, rad/s: keeps headings smooth
  separation: 1,
  alignment: 0.9,
  cohesion: 0.3,
  goal: 0.5, // pull towards the slowly wandering goal
  wall: 3,
  margin: 0.12,
  wander: 0.05, // individual jostle, so the school never locks into a lattice
});

// Slow wandering goal: a broad loop with noise, so the school travels.
export function goalAt(t, aspect, seed = 0) {
  const th = t * 0.07 + seed;
  return {
    x: aspect * (0.5 + 0.32 * Math.cos(th) + 0.06 * noise1(t * 0.05, seed + 3)),
    y: 0.5 + 0.28 * Math.sin(th * 1.3) + 0.05 * noise1(t * 0.043, seed + 4),
  };
}

function seed(n, t, aspect, salt, space) {
  // A pure, already-orderly starting formation for time t: an evenly spaced
  // sunflower disc around the goal, everyone heading nearly the same way, so
  // even the first frame after a seek reads as a school, not a scatter.
  const g = goalAt(t, aspect, salt);
  const base = hash01(Math.floor(t), salt, 51) * TAU;
  const gap = space * 1.15;
  const boids = [];
  for (let i = 0; i < n; i++) {
    const r = gap * 0.62 * Math.sqrt(i + 0.5),
      a = i * 2.399963229728653 + base;
    const hd = base + (hash01(i, salt, 54) - 0.5) * 0.3;
    const sp = 0.07;
    boids.push({ x: g.x + Math.cos(a) * r, y: g.y + Math.sin(a) * r, vx: Math.cos(hd) * sp, vy: Math.sin(hd) * sp, turn: 0 });
  }
  return boids;
}

// One fixed step. Mutates boids in place. o = tuning, t = time at step start.
export function stepFlock(boids, t, aspect, o, salt = 0, dt = STEP) {
  const n = boids.length,
    g = goalAt(t, aspect, salt);
  const see2 = o.see * o.see,
    space2 = o.space * o.space;
  const acc = new Array(n);
  for (let i = 0; i < n; i++) {
    const b = boids[i];
    let ax = 0,
      ay = 0,
      cx = 0,
      cy = 0,
      vx = 0,
      vy = 0,
      sx = 0,
      sy = 0,
      k = 0;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const c = boids[j],
        dx = c.x - b.x,
        dy = c.y - b.y,
        d2 = dx * dx + dy * dy;
      if (d2 > see2) continue;
      k++;
      cx += dx;
      cy += dy;
      vx += c.vx;
      vy += c.vy;
      if (d2 < space2 && d2 > 1e-9) {
        const d = Math.sqrt(d2);
        // Stronger the closer they are; vanishes at the edge of space.
        const push = (o.space - d) / (o.space * d);
        sx -= dx * push;
        sy -= dy * push;
      }
    }
    if (k) {
      ax += (cx / k) * o.cohesion * 2 + (vx / k - b.vx) * o.alignment * 2;
      ay += (cy / k) * o.cohesion * 2 + (vy / k - b.vy) * o.alignment * 2;
    }
    ax += sx * o.separation * 0.6;
    ay += sy * o.separation * 0.6;
    // Goal: gentle, so the school wanders instead of beelining.
    const gx = g.x - b.x,
      gy = g.y - b.y,
      gl = Math.hypot(gx, gy) || 1;
    ax += (gx / gl) * o.goal * 0.1;
    ay += (gy / gl) * o.goal * 0.1;
    // Individual wander: smooth noise per boid, different on each axis.
    ax += noise1(t * 0.35 + i * 7.31, salt + 11 + i) * o.wander;
    ay += noise1(t * 0.31 + i * 3.17, salt + 61 + i) * o.wander;
    // Soft walls: a push that grows inside the margin.
    const m = o.margin;
    if (b.x < m) ax += ((m - b.x) / m) * o.wall * 0.3;
    if (b.x > aspect - m) ax -= ((b.x - (aspect - m)) / m) * o.wall * 0.3;
    if (b.y < m) ay += ((m - b.y) / m) * o.wall * 0.3;
    if (b.y > 1 - m) ay -= ((b.y - (1 - m)) / m) * o.wall * 0.3;
    acc[i] = [ax, ay];
  }
  for (let i = 0; i < n; i++) {
    const b = boids[i];
    let nvx = b.vx + acc[i][0] * dt,
      nvy = b.vy + acc[i][1] * dt;
    // Limit the turn rate so headings sweep, never snap.
    const h0 = Math.atan2(b.vy, b.vx);
    let h1 = Math.atan2(nvy, nvx);
    let dh = ((h1 - h0 + Math.PI * 3) % TAU) - Math.PI;
    const lim = o.turn * dt;
    dh = clamp(dh, -lim, lim);
    h1 = h0 + dh;
    const sp = clamp(Math.hypot(nvx, nvy), o.minSpeed, o.maxSpeed);
    b.vx = Math.cos(h1) * sp;
    b.vy = Math.sin(h1) * sp;
    b.turn = b.turn * 0.8 + (dh / dt) * 0.2; // smoothed turn rate for bending
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    // Last-resort fence: a boid squeezed past the soft wall is held at the
    // edge of the stage (the wall force then turns it back in).
    b.x = clamp(b.x, 0.02, aspect - 0.02);
    b.y = clamp(b.y, 0.02, 0.98);
  }
}

// Flock at travel time t, in stage pixels. memo is a per-renderer object.
// Returns [{ x, y, heading, turn }] with n entries.
export function flockAt(memo, key, n, t, w, h, tuning = {}, salt = 0) {
  const o = { ...FLOCK_DEFAULTS, ...tuning };
  const aspect = w / h;
  const sig = `${n}|${salt}|${JSON.stringify(tuning)}`;
  let st = memo && memo[key];
  const target = Math.max(0, t);
  const reseed = !st || st.sig !== sig || target < st.t - 1e-9 || target - st.t > MAX_GAP;
  if (reseed) {
    // Snap the seed time to the step grid so a seek is reproducible. The
    // warm-up may start before zero: time is only an input to the goal and
    // the wander noise, so the very first frame is already a settled school.
    const t0 = Math.floor((target - WARM) / STEP) * STEP;
    st = { sig, t: t0, aspect, boids: seed(n, t0, aspect, salt, o.space) };
  }
  if (Math.abs(st.aspect - aspect) > 1e-6) {
    const k = aspect / st.aspect;
    for (const b of st.boids) b.x *= k;
    st.aspect = aspect;
  }
  while (st.t + STEP <= target + 1e-9) {
    stepFlock(st.boids, st.t, aspect, o, salt);
    st.t += STEP;
  }
  if (memo) memo[key] = st;
  // Sub-step interpolation keeps motion smooth between fixed steps.
  const f = (target - st.t) / STEP;
  return st.boids.map((b) => ({
    x: (b.x + b.vx * STEP * f) * h,
    y: (b.y + b.vy * STEP * f) * h,
    heading: Math.atan2(b.vy, b.vx),
    turn: b.turn,
  }));
}
