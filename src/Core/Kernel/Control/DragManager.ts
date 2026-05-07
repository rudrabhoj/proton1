// Drag-and-drop coordination service.
//
// Workflow:
//   1. Game registers DropTarget objects (slot graphics that accept drops).
//   2. On pointerdown of a draggable, game calls start_drag(payload, on_complete).
//   3. DragManager listens to global pointer move/up via PixiLayer.
//   4. On move: detect hovered target, fire enter/leave callbacks.
//   5. On up: fire on_drop on hovered target, call on_complete with result.
//
// Touch-compatible: PIXI v8 unifies pointer events across mouse and touch.
//
// Scenes that use it must call unregister_all() on shutdown to drop dangling refs.

import { Pino } from "../../Services/Pino";
import { PixiLayer } from "../../Plugin/Pixi/PixiLayer";

export type DragPayload = {
  source_id: string;   // free-form caller-defined identifier of origin
  data: any;           // game-defined item or whatever
  glyph?: string;      // optional ghost render hint
};

export interface DropTarget {
  // The graphic whose getBounds() defines the drop hit area. PIXI display object.
  bounds_node: any;
  on_drag_enter?(payload: DragPayload): void;
  on_drag_leave?(): void;
  // Return true if the drop is accepted.
  on_drop(payload: DragPayload): boolean;
}

export class DragManager {
  private _pino: Pino;
  private _pixiLayer: PixiLayer;

  private _targets: DropTarget[];
  private _payload: DragPayload | null;
  private _hovered: DropTarget | null;
  private _on_complete: ((accepted: boolean) => void) | null;

  private _unbind_move: (() => void) | null;
  private _unbind_up: (() => void) | null;
  private _initialized: boolean;

  constructor(pino: Pino, pixiLayer: PixiLayer) {
    this._pino = pino;
    this._pixiLayer = pixiLayer;
    this._targets = [];
    this._payload = null;
    this._hovered = null;
    this._on_complete = null;
    this._unbind_move = null;
    this._unbind_up = null;
    this._initialized = false;
  }

  // Bind once after PixiLayer.createApplication completes.
  public init(): void {
    if (this._initialized) return;
    this._unbind_move = this._pixiLayer.onGlobalPointerMove((x, y) => this._on_move(x, y));
    this._unbind_up = this._pixiLayer.onGlobalPointerUp(() => this._on_up());
    this._initialized = true;
  }

  public register(t: DropTarget): void {
    if (!this._targets.includes(t)) this._targets.push(t);
  }

  public unregister(t: DropTarget): void {
    this._targets = this._targets.filter((x) => x !== t);
  }

  public unregister_all(): void {
    this._targets = [];
    this.cancel();
  }

  public start_drag(payload: DragPayload, on_complete: (accepted: boolean) => void): void {
    if (this._payload) {
      this._pino.warn('drag started while another drag in progress; cancelling first');
      this.cancel();
    }
    this._payload = payload;
    this._on_complete = on_complete;
  }

  public cancel(): void {
    if (this._hovered) {
      this._hovered.on_drag_leave?.();
      this._hovered = null;
    }
    if (this._on_complete) this._on_complete(false);
    this._payload = null;
    this._on_complete = null;
  }

  public destroy(): void {
    if (this._unbind_move) this._unbind_move();
    if (this._unbind_up) this._unbind_up();
    this._unbind_move = null;
    this._unbind_up = null;
    this._initialized = false;
  }

  public get is_dragging(): boolean { return this._payload !== null; }

  // -- internals ---------------------------------------------------------

  private _on_move(x: number, y: number): void {
    if (!this._payload) return;
    const hit = this._find_target(x, y);
    if (hit !== this._hovered) {
      if (this._hovered) this._hovered.on_drag_leave?.();
      this._hovered = hit;
      if (hit) hit.on_drag_enter?.(this._payload);
    }
  }

  private _on_up(): void {
    if (!this._payload) return;
    let accepted = false;
    if (this._hovered) {
      try {
        accepted = this._hovered.on_drop(this._payload);
      } catch (err) {
        this._pino.error(`drop handler threw: ${String(err)}`);
      }
      this._hovered.on_drag_leave?.();
    }
    if (this._on_complete) this._on_complete(accepted);
    this._payload = null;
    this._on_complete = null;
    this._hovered = null;
  }

  private _find_target(x: number, y: number): DropTarget | null {
    for (const t of this._targets) {
      const node = t.bounds_node;
      if (!node || node.destroyed) continue;
      try {
        const b = node.getBounds();
        const r = b.rectangle ?? b;  // v8 returns Bounds with .rectangle; older may return Rectangle
        if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
          return t;
        }
      } catch {
        // dangling target
      }
    }
    return null;
  }
}
