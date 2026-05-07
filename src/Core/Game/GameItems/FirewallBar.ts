// HP bar with kb label and percent. Uses two Graphics (track + fill) and a Text.
// Player vs enemy palette.

import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { Graphic } from "../../Kernel/GameObjects/Graphic";
import { Text } from "../../Kernel/GameObjects/Text";
import { Theme } from "../Theme";

export type BarTone = 'player' | 'enemy';

export interface FirewallBarOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  tone: BarTone;
  initial_kb?: number;
  max_kb?: number;
  show_label?: boolean;  // "1,048 kb firewall ... 79%"
}

export class FirewallBar {
  private _entityFactory: EntityFactory;

  private _track: Graphic | null;
  private _fill: Graphic | null;
  private _labelText: Text | null;
  private _pctText: Text | null;
  private _opts: FirewallBarOptions | null;
  private _max_kb: number;

  constructor(entityFactory: EntityFactory) {
    this._entityFactory = entityFactory;
    this._track = null;
    this._fill = null;
    this._labelText = null;
    this._pctText = null;
    this._opts = null;
    this._max_kb = 1048;
  }

  public createNew(): FirewallBar {
    return new FirewallBar(this._entityFactory);
  }

  public init(opts: FirewallBarOptions): void {
    this._opts = opts;
    this._max_kb = opts.max_kb ?? 1048;
    const palette = opts.tone === 'enemy' ? Theme.enemy : Theme.player;

    this._track = this._entityFactory.graphic(opts.x, opts.y);
    this._track.graphics.fillColor = palette.dim;
    this._track.graphics.fillAlpha = 0.5;
    this._track.graphics.borderColor = palette.line;
    this._track.graphics.borderWidth = 2;
    this._track.graphics.borderStyle = 'solid';
    this._track.graphics.roundRect(0, 0, opts.w, opts.h, 4);

    this._fill = this._entityFactory.graphic(opts.x, opts.y);
    this._fill.graphics.fillColor = palette.bright;
    this._fill.graphics.fillAlpha = 1;
    this._fill.graphics.borderStyle = 'none';
    this._fill.graphics.roundRect(0, 0, opts.w, opts.h, 4);

    if (opts.show_label !== false) {
      this._labelText = this._entityFactory.text(opts.x + 12, opts.y + opts.h / 2, '', {
        fontSize: Theme.text.label,
        fontFamily: Theme.font,
        fill: Theme.bg,
      });
      this._labelText.position.anchorX = 0;
      this._labelText.position.anchorY = 0.5;

      this._pctText = this._entityFactory.text(opts.x + opts.w - 12, opts.y + opts.h / 2, '', {
        fontSize: Theme.text.label,
        fontFamily: Theme.font,
        fill: Theme.bg,
      });
      this._pctText.position.anchorX = 1;
      this._pctText.position.anchorY = 0.5;
    }

    this.set_kb(opts.initial_kb ?? this._max_kb);
  }

  public set_kb(kb: number): void {
    if (!this._opts || !this._fill) return;
    const safe = Math.max(0, Math.min(this._max_kb, kb));
    const ratio = this._max_kb > 0 ? safe / this._max_kb : 0;

    this._fill.graphics.rect(0, 0, this._opts.w * ratio, this._opts.h);
    if (this._labelText) {
      this._labelText.label.text = `${Math.round(safe).toLocaleString()} kb firewall`;
    }
    if (this._pctText) {
      this._pctText.label.text = `${Math.round(ratio * 100)}%`;
    }
  }
}
