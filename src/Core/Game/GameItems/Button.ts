// Graphics-based button. Replaces the old sprite-based Button.
// Composition of Graphic (rect) + Text (label, optional icon, optional cost).

import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { Graphic } from "../../Kernel/GameObjects/Graphic";
import { Text } from "../../Kernel/GameObjects/Text";
import { Theme } from "../Theme";

export type ButtonTone = 'player' | 'enemy' | 'market';
export type ButtonVariant = 'outlined' | 'filled';

export interface ButtonOptions {
  x: number;          // top-left
  y: number;
  w: number;
  h?: number;
  label: string;
  iconGlyph?: string;
  costLabel?: string; // e.g. "$5"  — small line under label
  tone?: ButtonTone;
  variant?: ButtonVariant;
  onClick: () => void;
}

export class Button {
  private _entityFactory: EntityFactory;

  private _bg: Graphic | null;
  private _labelText: Text | null;
  private _costText: Text | null;
  private _iconText: Text | null;

  private _opts: ButtonOptions | null;
  private _disabled: boolean;

  constructor(entityFactory: EntityFactory) {
    this._entityFactory = entityFactory;
    this._bg = null;
    this._labelText = null;
    this._costText = null;
    this._iconText = null;
    this._opts = null;
    this._disabled = false;
  }

  public createNew(): Button {
    return new Button(this._entityFactory);
  }

  public init(opts: ButtonOptions): void {
    this._opts = opts;
    const h = opts.h ?? Theme.button.height;
    const palette = pick_palette(opts.tone ?? 'player');

    this._bg = this._entityFactory.graphic(opts.x, opts.y);
    this._bg.graphics.rect(0, 0, opts.w, h);
    this._apply_visual();

    this._bg.enableInput();
    this._bg.input.addMouseUp(() => {
      if (!this._disabled) opts.onClick();
    });

    // Label position depends on whether we have icon and/or cost.
    const cx = opts.x + opts.w / 2;
    const cy = opts.y + h / 2;
    const has_cost = !!opts.costLabel;
    const label_y = has_cost ? cy - h * 0.12 : cy;
    const cost_y = cy + h * 0.22;

    this._labelText = this._entityFactory.text(cx, label_y, opts.label, {
      fontSize: Theme.button.fontSize,
      fontFamily: Theme.font,
      fill: opts.variant === 'filled' ? Theme.bg : palette.bright,
    });
    this._labelText.position.anchorX = 0.5;
    this._labelText.position.anchorY = 0.5;

    if (opts.iconGlyph) {
      this._iconText = this._entityFactory.text(opts.x + Theme.button.paddingX, cy, opts.iconGlyph, {
        fontSize: Theme.button.fontSize * 0.8,
        fontFamily: Theme.font,
        fill: opts.variant === 'filled' ? Theme.bg : palette.bright,
      });
      this._iconText.position.anchorX = 0;
      this._iconText.position.anchorY = 0.5;
    }

    if (opts.costLabel) {
      this._costText = this._entityFactory.text(cx, cost_y, opts.costLabel, {
        fontSize: Theme.text.small,
        fontFamily: Theme.font,
        fill: opts.variant === 'filled' ? Theme.bg : palette.text,
      });
      this._costText.position.anchorX = 0.5;
      this._costText.position.anchorY = 0.5;
    }
  }

  public set_disabled(disabled: boolean): void {
    this._disabled = disabled;
    this._apply_visual();
  }

  public set_label(text: string): void {
    if (this._labelText) this._labelText.label.text = text;
  }

  public set_cost(text: string): void {
    if (this._costText) this._costText.label.text = text;
  }

  get graphic(): Graphic {
    if (!this._bg) throw new Error("Button not initialized");
    return this._bg;
  }

  // -- internals ----------------------------------------------------------

  private _apply_visual(): void {
    if (!this._bg || !this._opts) return;
    const palette = pick_palette(this._opts.tone ?? 'player');
    const variant = this._opts.variant ?? 'outlined';

    if (this._disabled) {
      this._bg.graphics.fillAlpha = 0;
      this._bg.graphics.borderColor = Theme.muted;
      this._bg.graphics.borderWidth = Theme.button.borderWidth;
      this._bg.graphics.borderStyle = 'solid';
      return;
    }

    if (variant === 'filled') {
      this._bg.graphics.fillColor = palette.bright;
      this._bg.graphics.fillAlpha = 0.85;
      this._bg.graphics.borderColor = palette.bright;
      this._bg.graphics.borderWidth = Theme.button.borderWidth;
      this._bg.graphics.borderStyle = 'solid';
    } else {
      this._bg.graphics.fillColor = palette.dim;
      this._bg.graphics.fillAlpha = 0.5;
      this._bg.graphics.borderColor = palette.bright;
      this._bg.graphics.borderWidth = Theme.button.borderWidth;
      this._bg.graphics.borderStyle = 'solid';
    }
  }
}

function pick_palette(tone: ButtonTone) {
  switch (tone) {
    case 'enemy': return Theme.enemy;
    case 'market': return Theme.market;
    default: return Theme.player;
  }
}
