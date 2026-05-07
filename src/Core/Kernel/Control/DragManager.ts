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
//
// Ghost is built from real engine entities (Graphic + Text via EntityFactory)
// so it auto-scales through Position/Display/Scale and lives in the scene
// container like every other game object. We don't poke raw PIXI here — the
// previous version did, and every subsequent bug (wrong size at non-1.0
// viewport ratios, anchor-pivot offset, mid-resize stuck size) was a
// workaround for skipping the engine.

import { Pino } from "../../Services/Pino";
import { PixiLayer } from "../../Plugin/Pixi/PixiLayer";
import { EntityFactory } from "../GameObjects/EntityFactory";
import { Graphic } from "../GameObjects/Graphic";
import { Text } from "../GameObjects/Text";
import { ScaleManager } from "./ScaleManager";

const DRAG_THRESHOLD_PX = 8;
// Ghost is the slot itself, picked up. Same 130 box, same 71 glyph as the
// source slot (Slot uses size * 0.55 = 71 for its glyph). Both ghost and
// slot go through the engine's scale pipeline so they render at the same
// physical size at every viewport — picking the item up doesn't change
// its size, only its position.
const GHOST_SIZE = 130;
const GHOST_GLYPH_SIZE = 71;
// zIndex high enough to sit above any in-scene overlay. Scene containers
// have sortableChildren = true, so children with this zIndex render on top
// of regular children (zIndex 0) regardless of addChild order.
const GHOST_Z_INDEX = 1000;
// Logical viewport (must match Config.width / Config.height).
const LOGICAL_W = 1080;
const LOGICAL_H = 1920;

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
  private _entityFactory: EntityFactory;
  private _scaleManager: ScaleManager;

  private _targets: DropTarget[];
  private _armed: ArmedDrag | null;
  private _payload: DragPayload | null;
  private _hovered: DropTarget | null;
  private _committed: boolean;
  // Ghost is two engine entities, not a raw Container. _ghost_bg is the
  // dashed/solid box; _ghost_glyph is the centered glyph text. They live in
  // the active scene's container and inherit its scale.
  private _ghost_bg: Graphic | null;
  private _ghost_glyph: Text | null;
  // Cache the font so retint_ghost can reassign Label.style with a complete
  // TextStyle object (Label._updateForeignObject pushes the whole style at
  // once). Glyph text itself stays inside the Text entity's Label.
  private _ghost_glyph_font: string;

  private _unbind_move: (() => void) | null;
  private _unbind_up: (() => void) | null;
  private _initialized: boolean;

  constructor(pino: Pino, pixiLayer: PixiLayer, entityFactory: EntityFactory, scaleManager: ScaleManager) {
    this._pino = pino;
    this._pixiLayer = pixiLayer;
    this._entityFactory = entityFactory;
    this._scaleManager = scaleManager;
    this._targets = [];
    this._armed = null;
    this._payload = null;
    this._hovered = null;
    this._committed = false;
    this._ghost_bg = null;
    this._ghost_glyph = null;
    this._ghost_glyph_font = '';
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

  // Cancel a pending arm without firing on_complete. Used by gesture handlers
  // that want to take precedence over a tap-and-drag (e.g. long-press
  // tooltip): once the long-press fires, subsequent pointermove/pointerup
  // should not commit/release a drag. No-op once the drag has committed —
  // by then the gesture is already a drag and the caller should let it
  // finish through the normal path.
  public cancel_arm(): void {
    if (!this._armed || this._committed) return;
    this._armed = null;
  }

  // Re-skin the ghost mid-drag. Border + fill go through the IGraphics
  // setters (which redraw via PxGraphics._redraw); glyph color is updated by
  // re-assigning Label.style which triggers Label._updateForeignObject and
  // pushes the new TextStyle to PIXI Text.
  public retint_ghost(bg_color: number, border_color: number, dashed: boolean): void {
    if (this._ghost_bg) {
      const g = this._ghost_bg.graphics;
      g.fillColor = bg_color;
      g.fillAlpha = 0.6;
      g.borderColor = border_color;
      g.borderWidth = 4;
      g.borderStyle = dashed ? 'dashed' : 'solid';
    }
    if (this._ghost_glyph) {
      this._ghost_glyph.label.style = {
        fontSize: GHOST_GLYPH_SIZE,
        fontFamily: this._ghost_glyph_font,
        fill: border_color,
      };
    }
  }

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

    // Cursor events are screen pixels. Entity positions are logical. Convert
    // and assign — the engine's Scale takes care of the per-frame physical
    // placement, including any mid-drag viewport resize.
    const lp = this._screen_to_logical(x, y);
    if (this._ghost_bg) {
      this._ghost_bg.position.x = lp.x;
      this._ghost_bg.position.y = lp.y;
    }
    if (this._ghost_glyph) {
      this._ghost_glyph.position.x = lp.x;
      this._ghost_glyph.position.y = lp.y;
    }
    this._update_hovered_target(x, y);
  }

  // Inverse of Scale.placeX/placeY for the default gameplay container mode
  // (centered letterbox). Same letterbox math as Scale._getRatio +
  // _getContainerXStart, but inlined here so DragManager doesn't have to
  // borrow a Scale instance just to read its ratio.
  private _screen_to_logical(sx: number, sy: number): { x: number; y: number } {
    const cur_x = document.documentElement.clientWidth;
    const cur_y = document.documentElement.clientHeight;
    const r1 = cur_y / LOGICAL_H;
    const r2 = cur_x / LOGICAL_W;
    const ratio = r1 * LOGICAL_W <= cur_x ? r1 : r2;
    const base_x = (cur_x - LOGICAL_W * ratio) / 2;
    const base_y = (cur_y - LOGICAL_H * ratio) / 2;
    return {
      x: (sx - base_x) / ratio,
      y: (sy - base_y) / ratio,
    };
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
    // Destroy the ghost entities. Each has a ScaleManager registration that
    // would otherwise null-deref on the next resize, plus a foreign PIXI
    // object that needs explicit destroy.
    if (this._ghost_bg) {
      this._scaleManager.removeEntity(this._ghost_bg);
      this._ghost_bg.display.destroy();
      this._ghost_bg = null;
    }
    if (this._ghost_glyph) {
      this._scaleManager.removeEntity(this._ghost_glyph);
      this._ghost_glyph.display.destroy();
      this._ghost_glyph = null;
    }
    this._ghost_glyph_font = '';
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

  // Build the ghost as two engine entities centered on the cursor. Position
  // is logical, so PIXI scaling at the current viewport ratio is automatic.
  // Both entities have anchor (0.5, 0.5) so their position IS the centerline.
  private _build_ghost(payload: DragPayload, screen_x: number, screen_y: number): void {
    const lp = this._screen_to_logical(screen_x, screen_y);
    const half = GHOST_SIZE / 2;

    const bg = this._entityFactory.graphic(lp.x, lp.y);
    bg.position.anchorX = 0.5;
    bg.position.anchorY = 0.5;
    bg.graphics.anchor.set(0.5, 0.5);
    bg.graphics.fillColor = payload.bg_color;
    bg.graphics.fillAlpha = 0.6;
    bg.graphics.borderColor = payload.border_color;
    bg.graphics.borderWidth = 4;
    bg.graphics.borderStyle = 'dashed';
    bg.graphics.rect(-half, -half, GHOST_SIZE, GHOST_SIZE);
    bg.display.zIndex = GHOST_Z_INDEX;
    this._ghost_bg = bg;

    const glyph = this._entityFactory.text(lp.x, lp.y, payload.glyph, {
      fontSize: GHOST_GLYPH_SIZE,
      fontFamily: payload.font,
      fill: payload.border_color,
    });
    glyph.position.anchorX = 0.5;
    glyph.position.anchorY = 0.5;
    // Glyph one above the bg so the box doesn't paint over the icon at the
    // same z-level. Both still above scene UI.
    glyph.display.zIndex = GHOST_Z_INDEX + 1;
    this._ghost_glyph = glyph;
    this._ghost_glyph_font = payload.font;
  }
}
