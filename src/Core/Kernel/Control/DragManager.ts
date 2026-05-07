// Drag-and-drop coordination service.
//
// API:
//   1. arm_drag(opts)            on pointerdown of a draggable
//   2. register(target)/unregister/unregister_all
//
// Internal flow:
//   - pointerdown + arm  -> just remember start pos + lazy payload getter
//   - pointermove        -> if not committed and moved past threshold,
//                           call request() to get payload, build ghost, commit
//                         -> if committed, move ghost, update target hover
//   - pointerup before commit -> tap, no source taken, on_complete(false)
//   - pointerup after commit  -> drop on hovered target if any, on_complete(accepted)
//
// Touch-compatible (PIXI v8 unifies pointer + touch).
// Payload carries its own colors + glyph + font, so DragManager stays theme-agnostic.

import { Container, Graphics, Text } from 'pixi.js';
import { Pino } from "../../Services/Pino";
import { PixiLayer } from "../../Plugin/Pixi/PixiLayer";

const DRAG_THRESHOLD_PX = 8;
const GHOST_SIZE = 110;

export type DragPayload = {
  source_id: string;
  data: any;
  glyph: string;
  font: string;
  bg_color: number;
  border_color: number;
};

export interface DropTarget {
  bounds_node: any;
  on_drag_enter?(payload: DragPayload): void;
  on_drag_leave?(): void;
  on_drop(payload: DragPayload): boolean;
}

interface ArmedDrag {
  start_x: number;
  start_y: number;
  request: () => DragPayload | null;
  on_complete: (accepted: boolean) => void;
}

export class DragManager {
  private _pino: Pino;
  private _pixiLayer: PixiLayer;

  private _targets: DropTarget[];
  private _armed: ArmedDrag | null;
  private _payload: DragPayload | null;
  private _hovered: DropTarget | null;
  private _committed: boolean;
  private _ghost: Container | null;

  private _unbind_move: (() => void) | null;
  private _unbind_up: (() => void) | null;
  private _initialized: boolean;

  constructor(pino: Pino, pixiLayer: PixiLayer) {
    this._pino = pino;
    this._pixiLayer = pixiLayer;
    this._targets = [];
    this._armed = null;
    this._payload = null;
    this._hovered = null;
    this._committed = false;
    this._ghost = null;
    this._unbind_move = null;
    this._unbind_up = null;
    this._initialized = false;
  }

  public init(): void {
    if (this._initialized) return;
    this._pixiLayer.ensureStageHitArea();
    this._unbind_move = this._pixiLayer.onStagePointerMove((x: number, y: number) => this._on_move(x, y));
    this._unbind_up = this._pixiLayer.onStagePointerUp(() => this._on_up());
    this._initialized = true;
  }

  public destroy(): void {
    if (this._unbind_move) this._unbind_move();
    if (this._unbind_up) this._unbind_up();
    this._unbind_move = null;
    this._unbind_up = null;
    this._initialized = false;
  }

  public register(t: DropTarget): void {
    if (!this._targets.includes(t)) this._targets.push(t);
  }

  public unregister(t: DropTarget): void {
    this._targets = this._targets.filter((x) => x !== t);
  }

  public unregister_all(): void {
    this._targets = [];
    this._tear_down();
  }

  // Pointerdown of a draggable -> arm. Threshold + commit happen on movement.
  public arm_drag(opts: {
    pointer_x: number;
    pointer_y: number;
    request: () => DragPayload | null;
    on_complete: (accepted: boolean) => void;
  }): void {
    if (this._armed) {
      this._cancel();
    }
    this._armed = {
      start_x: opts.pointer_x,
      start_y: opts.pointer_y,
      request: opts.request,
      on_complete: opts.on_complete,
    };
  }

  public get is_dragging(): boolean { return this._committed; }

  // -- internals ---------------------------------------------------------

  private _on_move(x: number, y: number): void {
    if (!this._armed) return;

    if (!this._committed) {
      const dx = x - this._armed.start_x;
      const dy = y - this._armed.start_y;
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
      this._commit_drag(x, y);
      return;
    }

    if (this._ghost) {
      this._ghost.position.set(x, y);
    }
    this._update_hovered_target(x, y);
  }

  private _commit_drag(x: number, y: number): void {
    if (!this._armed) return;
    const payload = this._armed.request();
    if (!payload) {
      this._armed = null;
      return;
    }
    this._payload = payload;
    this._committed = true;
    this._build_ghost(payload, x, y);
    this._update_hovered_target(x, y);
  }

  private _on_up(): void {
    if (!this._armed) return;

    if (!this._committed) {
      const armed = this._armed;
      this._armed = null;
      armed.on_complete(false);
      return;
    }

    let accepted = false;
    if (this._hovered && this._payload) {
      try {
        accepted = this._hovered.on_drop(this._payload);
      } catch (err) {
        this._pino.error(`drop handler threw: ${String(err)}`);
      }
      this._hovered.on_drag_leave?.();
    }
    const on_complete = this._armed.on_complete;
    this._tear_down();
    on_complete(accepted);
  }

  private _cancel(): void {
    if (!this._armed) return;
    if (this._committed && this._hovered) {
      this._hovered.on_drag_leave?.();
    }
    const on_complete = this._armed.on_complete;
    const was_committed = this._committed;
    this._tear_down();
    if (was_committed) on_complete(false);
  }

  private _tear_down(): void {
    if (this._ghost) {
      this._pixiLayer.removeOverlay(this._ghost);
      this._ghost.destroy({ children: true });
      this._ghost = null;
    }
    this._armed = null;
    this._payload = null;
    this._hovered = null;
    this._committed = false;
  }

  private _update_hovered_target(x: number, y: number): void {
    const hit = this._find_target(x, y);
    if (hit !== this._hovered) {
      if (this._hovered) this._hovered.on_drag_leave?.();
      this._hovered = hit;
      if (hit && this._payload) hit.on_drag_enter?.(this._payload);
    }
  }

  private _find_target(x: number, y: number): DropTarget | null {
    for (const t of this._targets) {
      const node = t.bounds_node;
      if (!node || node.destroyed) continue;
      try {
        const b = node.getBounds();
        const r = b.rectangle ?? b;
        if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
          return t;
        }
      } catch {
        // dangling
      }
    }
    return null;
  }

  // Ghost: dashed-border square + glyph centered at pointer.
  private _build_ghost(payload: DragPayload, x: number, y: number): void {
    const container = new Container();
    container.position.set(x, y);
    container.eventMode = 'none';

    const half = GHOST_SIZE / 2;
    const bg = new Graphics();
    bg
      .rect(-half, -half, GHOST_SIZE, GHOST_SIZE)
      .fill({ color: payload.bg_color, alpha: 0.6 });
    draw_dashed_rect(bg, -half, -half, GHOST_SIZE, GHOST_SIZE, payload.border_color, 4);
    container.addChild(bg);

    const txt = new Text({
      text: payload.glyph,
      style: {
        fontSize: GHOST_SIZE * 0.55,
        fontFamily: payload.font,
        fill: payload.border_color,
      },
    });
    txt.anchor.set(0.5, 0.5);
    container.addChild(txt);

    this._pixiLayer.addOverlay(container);
    this._ghost = container;
  }
}

// -- helpers (file-local) ------------------------------------------------

function draw_dashed_rect(g: Graphics, x: number, y: number, w: number, h: number, color: number, width: number): void {
  const dash_len = width * 4;
  const gap_len = width * 3;
  const corners: Array<[number, number]> = [
    [x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y],
  ];
  for (let i = 0; i < 4; i++) {
    draw_dashed_line(g, corners[i][0], corners[i][1], corners[i + 1][0], corners[i + 1][1], dash_len, gap_len, color, width);
  }
}

function draw_dashed_line(g: Graphics, x1: number, y1: number, x2: number, y2: number, dash_len: number, gap_len: number, color: number, width: number): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len === 0) return;
  const dx = (x2 - x1) / len;
  const dy = (y2 - y1) / len;
  let dist = 0;
  let drawing = true;
  while (dist < len) {
    const seg_len = Math.min(drawing ? dash_len : gap_len, len - dist);
    if (drawing && seg_len > 0) {
      g.moveTo(x1 + dx * dist, y1 + dy * dist);
      g.lineTo(x1 + dx * (dist + seg_len), y1 + dy * (dist + seg_len));
      g.stroke({ color, width });
    }
    dist += seg_len;
    drawing = !drawing;
  }
}
