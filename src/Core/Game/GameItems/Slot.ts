// A square slot for items. Has multiple visual states:
//   - filled (border + colored bg + glyph)
//   - empty (dashed border, no fill)
//   - drop_target (highlighted dashed)
//   - disabled (dim border)
//
// Slot composes a Graphic (border/bg) plus an optional Text (glyph).
// State transitions just re-style the existing Graphic.

import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { Graphic } from "../../Kernel/GameObjects/Graphic";
import { Text } from "../../Kernel/GameObjects/Text";
import { Theme } from "../Theme";

export type SlotTone = 'player' | 'enemy' | 'market';

export type SlotState = 'filled' | 'empty' | 'drop_target' | 'disabled';

export interface SlotOptions {
  x: number;          // logical top-left
  y: number;
  size?: number;      // override Theme.slot.size
  tone?: SlotTone;    // color palette
}

export class Slot {
  private _entityFactory: EntityFactory;

  private _bg: Graphic | null;
  private _glyphText: Text | null;
  private _tierText: Text | null;
  private _opts: SlotOptions | null;

  private _state: SlotState;
  private _glyph: string;

  constructor(entityFactory: EntityFactory) {
    this._entityFactory = entityFactory;
    this._bg = null;
    this._glyphText = null;
    this._tierText = null;
    this._opts = null;
    this._state = 'empty';
    this._glyph = '';
  }

  public createNew(): Slot {
    return new Slot(this._entityFactory);
  }

  public init(opts: SlotOptions): void {
    this._opts = opts;
    const size = opts.size ?? Theme.slot.size;

    this._bg = this._entityFactory.graphic(opts.x, opts.y);
    this._bg.graphics.rect(0, 0, size, size);
    this._apply_visual_state();
  }

  // -- State / data -------------------------------------------------------

  public set_state(s: SlotState): void {
    this._state = s;
    this._apply_visual_state();
  }

  // Swap the slot's palette without touching state/glyph. Used by the shop
  // when a sell-drag is hovering over the market: the source slot recolors
  // to market tone so the player sees "this is where I came from" in the
  // market color, then reverts when the drag leaves the market.
  public set_tone(tone: SlotTone): void {
    if (!this._opts) return;
    this._opts.tone = tone;
    this._apply_visual_state();
  }

  get tone(): SlotTone {
    return this._opts?.tone ?? 'player';
  }

  // Logical-coord bounds, used by callers that need to position something
  // (a hold-progress arc, a tooltip pointer, etc.) relative to the slot.
  get bounds(): { x: number; y: number; size: number } | null {
    if (!this._opts) return null;
    return {
      x: this._opts.x,
      y: this._opts.y,
      size: this._opts.size ?? Theme.slot.size,
    };
  }

  public set_glyph(glyph: string, tier_label?: string): void {
    if (!this._opts) return;
    this._glyph = glyph;
    const size = this._opts.size ?? Theme.slot.size;
    const palette = pick_palette(this._opts.tone ?? 'player');

    if (!this._glyphText) {
      this._glyphText = this._entityFactory.text(
        this._opts.x + size / 2,
        this._opts.y + size / 2,
        glyph,
        {
          fontSize: size * 0.55,
          fontFamily: Theme.font,
          fill: palette.bright,
        },
      );
      this._glyphText.position.anchorX = 0.5;
      this._glyphText.position.anchorY = 0.5;
    } else {
      this._glyphText.label.text = glyph;
    }

    if (tier_label) {
      if (!this._tierText) {
        this._tierText = this._entityFactory.text(
          this._opts.x + size - 10,
          this._opts.y + size - 6,
          tier_label,
          {
            fontSize: Theme.text.small,
            fontFamily: Theme.font,
            fill: palette.bright,
          },
        );
        this._tierText.position.anchorX = 1;
        this._tierText.position.anchorY = 1;
      } else {
        this._tierText.label.text = tier_label;
      }
    }
  }

  public clear_glyph(): void {
    this._glyph = '';
    if (this._glyphText) this._glyphText.label.text = '';
    if (this._tierText) this._tierText.label.text = '';
  }

  get graphic(): Graphic {
    if (!this._bg) throw new Error("Slot not initialized");
    return this._bg;
  }

  // -- internals ----------------------------------------------------------

  private _apply_visual_state(): void {
    if (!this._bg || !this._opts) return;
    const palette = pick_palette(this._opts.tone ?? 'player');

    switch (this._state) {
      case 'filled':
        this._bg.graphics.fillColor = palette.dim;
        this._bg.graphics.fillAlpha = 0.6;
        this._bg.graphics.borderColor = palette.bright;
        this._bg.graphics.borderWidth = Theme.slot.borderWidth;
        this._bg.graphics.borderStyle = 'solid';
        break;
      case 'empty':
        this._bg.graphics.fillAlpha = 0;
        this._bg.graphics.borderColor = palette.line;
        this._bg.graphics.borderWidth = Theme.slot.borderWidth;
        this._bg.graphics.borderStyle = 'dashed';
        break;
      case 'drop_target':
        this._bg.graphics.fillColor = palette.dim;
        this._bg.graphics.fillAlpha = 0.3;
        this._bg.graphics.borderColor = palette.bright;
        this._bg.graphics.borderWidth = Theme.slot.borderWidth + 1;
        this._bg.graphics.borderStyle = 'dashed';
        break;
      case 'disabled':
        this._bg.graphics.fillAlpha = 0;
        this._bg.graphics.borderColor = Theme.muted;
        this._bg.graphics.borderWidth = Theme.slot.borderWidth;
        this._bg.graphics.borderStyle = 'solid';
        break;
    }
  }
}

function pick_palette(tone: SlotTone) {
  switch (tone) {
    case 'enemy': return Theme.enemy;
    case 'market': return Theme.market;
    default: return Theme.player;
  }
}
