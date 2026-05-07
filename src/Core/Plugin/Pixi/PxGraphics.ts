import { Circle, Ellipse, Graphics, Rectangle, RoundedRectangle, type BLEND_MODES } from 'pixi.js';
import { Pino } from '../../Services/Pino';
import { IGraphics, BlendModeName, BorderStyle } from '../IGraphics';

type ShapeData =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'roundRect'; x: number; y: number; w: number; h: number; radius: number };

export class PxGraphics implements IGraphics {
  private _pino: Pino;
  private _live: Graphics;

  private _shape: ShapeData | null;

  private _fillColor: number;
  private _fillAlpha: number;
  private _fillBlend: BlendModeName;

  private _borderWidth: number;
  private _borderColor: number;
  private _borderAlpha: number;
  private _borderStyle: BorderStyle;

  constructor(pino: Pino) {
    this._pino = pino;
    this._live = new Graphics();
    this._shape = null;

    this._fillColor = 0xffffff;
    this._fillAlpha = 1;
    this._fillBlend = 'normal';

    this._borderWidth = 0;
    this._borderColor = 0x000000;
    this._borderAlpha = 1;
    this._borderStyle = 'none';
  }

  public createNew(): PxGraphics {
    return new PxGraphics(this._pino);
  }

  // -- Shape primitives --

  public rect(x: number, y: number, w: number, h: number): PxGraphics {
    this._shape = { kind: 'rect', x, y, w, h };
    this._redraw();
    return this;
  }

  public circle(cx: number, cy: number, r: number): PxGraphics {
    this._shape = { kind: 'circle', cx, cy, r };
    this._redraw();
    return this;
  }

  public ellipse(cx: number, cy: number, rx: number, ry: number): PxGraphics {
    this._shape = { kind: 'ellipse', cx, cy, rx, ry };
    this._redraw();
    return this;
  }

  public roundRect(x: number, y: number, w: number, h: number, radius: number): PxGraphics {
    this._shape = { kind: 'roundRect', x, y, w, h, radius };
    this._redraw();
    return this;
  }

  // -- Fill --

  get fillColor(): number { return this._fillColor; }
  set fillColor(v: number) { this._fillColor = v; this._redraw(); }

  get fillAlpha(): number { return this._fillAlpha; }
  set fillAlpha(v: number) { this._fillAlpha = v; this._redraw(); }

  get fillBlend(): BlendModeName { return this._fillBlend; }
  set fillBlend(v: BlendModeName) { this._fillBlend = v; this._redraw(); }

  // -- Border --

  get borderWidth(): number { return this._borderWidth; }
  set borderWidth(v: number) { this._borderWidth = v; this._redraw(); }

  get borderColor(): number { return this._borderColor; }
  set borderColor(v: number) { this._borderColor = v; this._redraw(); }

  get borderAlpha(): number { return this._borderAlpha; }
  set borderAlpha(v: number) { this._borderAlpha = v; this._redraw(); }

  get borderStyle(): BorderStyle { return this._borderStyle; }
  set borderStyle(v: BorderStyle) { this._borderStyle = v; this._redraw(); }

  public redraw() {
    this._redraw();
  }

  get x(): number { return this._live.x; }
  set x(v: number) { this._live.x = v; }

  get y(): number { return this._live.y; }
  set y(v: number) { this._live.y = v; }

  get interactive(): boolean { return this._live.interactive === true; }
  set interactive(v: boolean) { this._live.interactive = v; }

  public on(event: 'pointerup', cb: () => void): void {
    this._live.on(event, cb);
  }

  get data(): Graphics {
    return this._live;
  }

  public destroy() {
    this._live.destroy();
  }

  // -- internals --

  private _redraw() {
    if (!this._shape) return;

    this._live.clear();
    this._buildShape();
    this._buildFill();
    this._buildStroke();
    this._live.blendMode = this._fillBlend as BLEND_MODES;
    this._setHitArea();
  }

  private _setHitArea() {
    const s = this._shape!;
    switch (s.kind) {
      case 'rect':
        this._live.hitArea = new Rectangle(s.x, s.y, s.w, s.h);
        break;
      case 'circle':
        this._live.hitArea = new Circle(s.cx, s.cy, s.r);
        break;
      case 'ellipse':
        this._live.hitArea = new Ellipse(s.cx, s.cy, s.rx, s.ry);
        break;
      case 'roundRect':
        this._live.hitArea = new RoundedRectangle(s.x, s.y, s.w, s.h, s.radius);
        break;
    }
  }

  private _buildShape() {
    const s = this._shape!;
    switch (s.kind) {
      case 'rect': this._live.rect(s.x, s.y, s.w, s.h); break;
      case 'circle': this._live.circle(s.cx, s.cy, s.r); break;
      case 'ellipse': this._live.ellipse(s.cx, s.cy, s.rx, s.ry); break;
      case 'roundRect': this._live.roundRect(s.x, s.y, s.w, s.h, s.radius); break;
    }
  }

  private _buildFill() {
    if (this._fillAlpha > 0) {
      this._live.fill({ color: this._fillColor, alpha: this._fillAlpha });
    }
  }

  private _buildStroke() {
    if (this._borderStyle === 'none' || this._borderWidth <= 0) return;

    if (this._borderStyle === 'solid') {
      this._live.stroke({
        color: this._borderColor,
        alpha: this._borderAlpha,
        width: this._borderWidth,
      });
      return;
    }

    const dashLen = this._borderStyle === 'dotted' ? this._borderWidth : this._borderWidth * 4;
    const gapLen = this._borderStyle === 'dotted' ? this._borderWidth * 1.5 : this._borderWidth * 3;
    const opts = {
      color: this._borderColor,
      alpha: this._borderAlpha,
      width: this._borderWidth,
      cap: 'butt' as const,
    };

    const s = this._shape!;
    if (s.kind === 'rect') {
      this._dashRect(s.x, s.y, s.w, s.h, dashLen, gapLen, opts);
    } else if (s.kind === 'circle') {
      this._dashCircle(s.cx, s.cy, s.r, dashLen, gapLen, opts);
    } else if (s.kind === 'ellipse') {
      this._dashEllipse(s.cx, s.cy, s.rx, s.ry, dashLen, gapLen, opts);
    } else {
      this._pino.warn(`Dashed/dotted on roundRect not supported, falling back to solid`);
      this._live.stroke({
        color: this._borderColor,
        alpha: this._borderAlpha,
        width: this._borderWidth,
      });
    }
  }

  private _dashRect(x: number, y: number, w: number, h: number, dashLen: number, gapLen: number, opts: any) {
    const corners: Array<[number, number]> = [
      [x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y],
    ];
    for (let i = 0; i < 4; i++) {
      this._dashLine(corners[i][0], corners[i][1], corners[i + 1][0], corners[i + 1][1], dashLen, gapLen, opts);
    }
  }

  private _dashLine(x1: number, y1: number, x2: number, y2: number, dashLen: number, gapLen: number, opts: any) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len === 0) return;
    const dx = (x2 - x1) / len;
    const dy = (y2 - y1) / len;
    let dist = 0;
    let drawing = true;
    while (dist < len) {
      const segLen = Math.min(drawing ? dashLen : gapLen, len - dist);
      if (drawing && segLen > 0) {
        this._live.moveTo(x1 + dx * dist, y1 + dy * dist);
        this._live.lineTo(x1 + dx * (dist + segLen), y1 + dy * (dist + segLen));
        this._live.stroke(opts);
      }
      dist += segLen;
      drawing = !drawing;
    }
  }

  private _dashCircle(cx: number, cy: number, r: number, dashLen: number, gapLen: number, opts: any) {
    const circ = 2 * Math.PI * r;
    const period = dashLen + gapLen;
    const dashes = Math.max(1, Math.floor(circ / period));
    const angleStep = (2 * Math.PI) / dashes;
    const dashRatio = dashLen / period;
    for (let i = 0; i < dashes; i++) {
      const startA = i * angleStep;
      const endA = startA + angleStep * dashRatio;
      this._live.moveTo(cx + r * Math.cos(startA), cy + r * Math.sin(startA));
      this._live.arc(cx, cy, r, startA, endA);
      this._live.stroke(opts);
    }
  }

  private _dashEllipse(cx: number, cy: number, rx: number, ry: number, dashLen: number, gapLen: number, opts: any) {
    const h = ((rx - ry) ** 2) / ((rx + ry) ** 2);
    const perim = Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
    const period = dashLen + gapLen;
    const dashes = Math.max(1, Math.floor(perim / period));
    const angleStep = (2 * Math.PI) / dashes;
    const dashRatio = dashLen / period;
    const stepsPerDash = 8;
    for (let i = 0; i < dashes; i++) {
      const startA = i * angleStep;
      const endA = startA + angleStep * dashRatio;
      for (let s = 0; s <= stepsPerDash; s++) {
        const a = startA + (endA - startA) * (s / stepsPerDash);
        const px = cx + rx * Math.cos(a);
        const py = cy + ry * Math.sin(a);
        if (s === 0) this._live.moveTo(px, py);
        else this._live.lineTo(px, py);
      }
      this._live.stroke(opts);
    }
  }
}
