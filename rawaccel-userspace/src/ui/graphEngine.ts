// Canvas renderer for the curve graph. It redraws only when the curves change:
// discrete changes morph from the drawn state, edits while dragging draw
// directly, and live-input dots use a separate overlay so the curves are not
// redrawn per input event.

export type SeriesKind = 'sensitivity' | 'velocity' | 'gain';

export interface GraphSeries {
  kind: SeriesKind;
  axis: 'x' | 'y';
  values: Float64Array;
  dashed: boolean;
  alpha: number;
  leaving?: boolean;
}

export interface GraphTarget {
  domain: number;
  left: number; // multiplier axis top (sensitivity and gain)
  right: number; // velocity axis top
  series: Map<string, GraphSeries>;
  bands: { start: number; end: number | null }[];
  handles: { x: number; y: number }[];
}

export interface GraphColors {
  sensitivity: string; velocity: string; gain: string;
  grid: string; faint: string; line: string; surface: string; accent: string; font: string;
}

export interface LiveDot { speed: number; axis: 'x' | 'y'; values: Float64Array | null; hollow: boolean }

const PAD = { l: 46, r: 54, t: 30, b: 28 };
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function fmt(value: number, digits: number) {
  return Math.abs(value) < 1e-9 ? '0' : value.toFixed(digits);
}

export class GraphEngine {
  private base: CanvasRenderingContext2D;
  private overlay: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private colors: GraphColors | null = null;
  private current: GraphTarget = { domain: 80, left: 2, right: 100, series: new Map(), bands: [], handles: [] };
  private animation: { from: GraphTarget; to: GraphTarget; start: number; duration: number } | null = null;
  private frame = 0;
  private lastDots: LiveDot[] = [];
  activeHandle = -1;

  constructor(private baseCanvas: HTMLCanvasElement, private overlayCanvas: HTMLCanvasElement, private reducedMotion: () => boolean) {
    this.base = baseCanvas.getContext('2d')!;
    this.overlay = overlayCanvas.getContext('2d')!;
  }

  get ready() { return this.width > 0 && this.height > 0; }
  get domain() { return this.current.domain; }
  get leftTop() { return this.current.left; }

  resize(width: number, height: number, dpr: number) {
    this.width = width; this.height = height; this.dpr = dpr;
    for (const canvas of [this.baseCanvas, this.overlayCanvas]) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    this.draw();
    this.drawLive(this.lastDots);
  }

  setColors(colors: GraphColors) {
    this.colors = colors;
    this.draw();
    this.drawLive(this.lastDots);
  }

  setTarget(target: GraphTarget, how: 'morph' | 'direct' | 'grow') {
    if (how === 'direct' || this.reducedMotion() || !this.ready) {
      this.cancel();
      this.current = { ...target, series: new Map([...target.series].map(([k, s]) => [k, { ...s, values: Float64Array.from(s.values) }])) };
      this.draw();
      return;
    }
    const zeros = new Float64Array(target.series.values().next().value?.values.length ?? 0);
    const from: GraphTarget = { ...this.current, series: new Map() };
    const to: GraphTarget = { ...target, series: new Map(target.series) };
    for (const [key, s] of target.series) {
      const drawn = this.current.series.get(key);
      from.series.set(key, how === 'grow' || !drawn || drawn.values.length !== s.values.length
        ? { ...s, values: new Float64Array(s.values.length), alpha: 0 }
        : { ...drawn, values: Float64Array.from(drawn.values) });
    }
    for (const [key, drawn] of this.current.series) {
      if (to.series.has(key) || drawn.values.length !== zeros.length) continue;
      from.series.set(key, { ...drawn, values: Float64Array.from(drawn.values) });
      to.series.set(key, { ...drawn, values: zeros, alpha: 0, leaving: true });
    }
    if (how === 'grow') { from.domain = target.domain; from.left = target.left; from.right = target.right; }
    this.animation = { from, to, start: performance.now(), duration: how === 'grow' ? 700 : 380 };
    this.current.bands = target.bands;
    this.current.handles = target.handles;
    if (!this.frame) this.frame = requestAnimationFrame(this.step);
  }

  private cancel() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.animation = null;
  }

  private step = (now: number) => {
    const a = this.animation;
    if (!a) { this.frame = 0; return; }
    const p = clamp((now - a.start) / a.duration, 0, 1), e = ease(p);
    const series = new Map<string, GraphSeries>();
    for (const [key, to] of a.to.series) {
      const from = a.from.series.get(key)!;
      const previous = this.current.series.get(key);
      const values = previous && previous.values.length === to.values.length && previous !== from ? previous.values : new Float64Array(to.values.length);
      for (let i = 0; i < values.length; i++) values[i] = from.values[i] + (to.values[i] - from.values[i]) * e;
      series.set(key, { ...to, values, alpha: from.alpha + (to.alpha - from.alpha) * e });
    }
    const lerp = (x: number, y: number) => x + (y - x) * e;
    this.current = { ...this.current, series, domain: lerp(a.from.domain, a.to.domain), left: lerp(a.from.left, a.to.left), right: lerp(a.from.right, a.to.right) };
    this.draw();
    this.drawLive(this.lastDots);
    if (p < 1) { this.frame = requestAnimationFrame(this.step); return; }
    for (const [key, s] of this.current.series) if (s.leaving) this.current.series.delete(key);
    this.animation = null;
    this.frame = 0;
    this.draw();
  };

  // Geometry shared by drawing and pointer hit-testing.
  private px = (x: number) => PAD.l + (x / this.current.domain) * (this.width - PAD.l - PAD.r);
  private pyLeft = (v: number) => this.height - PAD.b - (v / this.current.left) * (this.height - PAD.t - PAD.b);
  private pyRight = (v: number) => this.height - PAD.b - (v / this.current.right) * (this.height - PAD.t - PAD.b);

  handleAt(clientX: number, clientY: number): number {
    const r = this.overlayCanvas.getBoundingClientRect();
    const X = clientX - r.left, Y = clientY - r.top;
    let best = -1, distance = 14;
    this.current.handles.forEach((h, i) => {
      const d = Math.hypot(this.px(h.x) - X, this.pyLeft(h.y) - Y);
      if (d < distance) { distance = d; best = i; }
    });
    return best;
  }

  toData(clientX: number, clientY: number) {
    const r = this.overlayCanvas.getBoundingClientRect();
    const plotW = this.width - PAD.l - PAD.r, plotH = this.height - PAD.t - PAD.b;
    return {
      x: clamp((clientX - r.left - PAD.l) / plotW, 0, 1) * this.current.domain,
      y: clamp((this.height - PAD.b - (clientY - r.top)) / plotH, 0, 1) * this.current.left,
    };
  }

  draw() {
    const c = this.colors, ctx = this.base;
    if (!c || !this.ready) return;
    const { width: W, height: H } = this;
    const top = PAD.t, bottom = H - PAD.b;
    const cur = this.current;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = `11px ${c.font}`;
    ctx.textBaseline = 'middle';

    // Tiered transitions: shaded blends (Linear) or start lines (Natural).
    cur.bands.forEach((band, i) => {
      const x0 = this.px(clamp(band.start, 0, cur.domain));
      const x1 = band.end === null ? x0 + 1.5 : this.px(clamp(band.end, 0, cur.domain));
      ctx.globalAlpha = band.end === null ? 0.4 : 0.07;
      ctx.fillStyle = c.accent;
      ctx.fillRect(x0, top, Math.max(1, x1 - x0), bottom - top);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = c.faint;
      ctx.textAlign = 'left';
      ctx.fillText(`T${i + 1}`, x0 + 5, top + 9);
    });
    ctx.globalAlpha = 1;

    // Grid with multiplier labels on the left.
    const ticks = 5;
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
    ctx.fillStyle = c.faint; ctx.textAlign = 'right';
    for (let i = 0; i <= ticks; i++) {
      const v = (cur.left * i) / ticks, y = Math.round(this.pyLeft(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
      ctx.fillText(fmt(v, cur.left < 4 ? 2 : 1), PAD.l - 8, y);
    }
    const showRight = [...cur.series.values()].some(s => s.kind === 'velocity' && s.alpha > 0.02);
    if (showRight) {
      ctx.textAlign = 'left';
      for (let i = 0; i <= ticks; i++) {
        const v = (cur.right * i) / ticks;
        ctx.fillText(fmt(v, 0), W - PAD.r + 8, Math.round(this.pyRight(v)) + 0.5);
      }
    }
    // Speed axis.
    const stepX = cur.domain > 120 ? 20 : 10;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let x = 0; x <= cur.domain + 1e-6; x += stepX) {
      const xx = Math.round(this.px(x)) + 0.5;
      ctx.beginPath(); ctx.moveTo(xx, top); ctx.lineTo(xx, bottom); ctx.stroke();
      ctx.fillText(String(Math.round(x)), xx, bottom + 7);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('input speed, counts/ms', W - PAD.r - 6, bottom - 6);
    ctx.textBaseline = 'middle';

    // 1× reference.
    const one = Math.round(this.pyLeft(1)) + 0.5;
    if (one > top && one < bottom) {
      ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = c.line;
      ctx.beginPath(); ctx.moveTo(PAD.l, one); ctx.lineTo(W - PAD.r, one); ctx.stroke(); ctx.restore();
    }

    const order: Record<SeriesKind, number> = { velocity: 0, gain: 1, sensitivity: 2 };
    const list = [...cur.series.values()].sort((a, b) => order[a.kind] - order[b.kind] || Number(a.axis === 'y') - Number(b.axis === 'y'));
    for (const s of list) {
      if (s.alpha <= 0.01) continue;
      const py = s.kind === 'velocity' ? this.pyRight : this.pyLeft;
      const color = c[s.kind];
      const n = s.values.length;
      const trace = () => {
        ctx.beginPath();
        let open = false;
        for (let i = 0; i < n; i++) {
          const v = s.values[i];
          if (!Number.isFinite(v)) { open = false; continue; }
          const X = this.px((i / (n - 1)) * cur.domain), Y = clamp(py(v), top - 2, bottom);
          if (open) ctx.lineTo(X, Y); else { ctx.moveTo(X, Y); open = true; }
        }
      };
      if (s.kind === 'sensitivity' && !s.dashed) {
        trace();
        ctx.save();
        ctx.lineTo(this.px(cur.domain), bottom); ctx.lineTo(this.px(0), bottom); ctx.closePath();
        const g = ctx.createLinearGradient(0, top, 0, bottom);
        g.addColorStop(0, color); g.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.1 * s.alpha; ctx.fillStyle = g; ctx.fill();
        ctx.restore();
      }
      trace();
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = s.kind === 'sensitivity' ? 2.2 : 1.8;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (s.dashed) ctx.setLineDash([6, 5]);
      ctx.stroke();
      ctx.restore();
    }

    if (!this.animation) {
      cur.handles.forEach((h, i) => {
        ctx.beginPath();
        ctx.arc(this.px(h.x), clamp(this.pyLeft(h.y), top, bottom), i === this.activeHandle ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = c.surface; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = c.sensitivity; ctx.stroke();
      });
    }
  }

  // Dots sit on the sensitivity curve at the reported input speed.
  drawLive(dots: LiveDot[]) {
    this.lastDots = dots;
    const c = this.colors, ctx = this.overlay;
    if (!c || !this.ready) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    const top = PAD.t, bottom = this.height - PAD.b;
    for (const dot of dots) {
      // Follow the drawn curve, which differs from the target while it morphs.
      const drawn = this.current.series.get(`sensitivity-${dot.axis}`);
      const values = drawn && drawn.alpha > 0.5 ? drawn.values : dot.values;
      if (!values || !Number.isFinite(dot.speed)) continue;
      const n = values.length;
      const t = clamp(dot.speed / this.current.domain, 0, 1) * (n - 1);
      const i0 = Math.floor(t), i1 = Math.min(n - 1, i0 + 1);
      const v = values[i0] + (values[i1] - values[i0]) * (t - i0);
      if (!Number.isFinite(v)) continue;
      const X = this.px(Math.min(dot.speed, this.current.domain)), Y = clamp(this.pyLeft(v), top, bottom);
      ctx.globalAlpha = 0.3; ctx.strokeStyle = c.sensitivity; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X, top); ctx.lineTo(X, bottom); ctx.stroke();
      ctx.globalAlpha = 0.18; ctx.fillStyle = c.sensitivity;
      ctx.beginPath(); ctx.arc(X, Y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = dot.hollow ? c.surface : c.surface; ctx.strokeStyle = c.sensitivity; ctx.lineWidth = 2;
      if (dot.hollow) ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.arc(X, Y, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }

  destroy() { this.cancel(); }
}
