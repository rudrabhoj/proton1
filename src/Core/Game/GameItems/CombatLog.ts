// Streaming combat log. Pre-allocates one Text per visible line so each can
// fade independently with age. Newest line at the bottom at full alpha;
// older lines slide upward and dim toward transparency.

import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { Text } from "../../Kernel/GameObjects/Text";
import { Display } from "../../Kernel/GameObjects/Component/Display";
import { Theme } from "../Theme";

const MAX_VISIBLE = 5;
const LINE_HEIGHT = 38;
const NOW_THRESHOLD_MS = 200;
const ALPHA_OLDEST = 0.18;
const ALPHA_NEWEST = 1.0;
const EVICT_PULSE_LOW = 0.04;
const EVICT_PULSE_HIGH = 0.28;
const EVICT_PULSE_PERIOD_MS = 700;

interface LogLine {
  t_ms: number;
  side_label: string;
  body: string;
}

export interface CombatLogOptions {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class CombatLog {
  private _entityFactory: EntityFactory;
  private _line_texts: Text[];
  private _lines: LogLine[];

  constructor(entityFactory: EntityFactory) {
    this._entityFactory = entityFactory;
    this._line_texts = [];
    this._lines = [];
  }

  public createNew(): CombatLog {
    return new CombatLog(this._entityFactory);
  }

  public init(opts: CombatLogOptions): void {
    // One Text per slot, anchored bottom-left, positioned from bottom of panel up.
    // Index 0 = newest (bottom row), index MAX_VISIBLE-1 = oldest (top row).
    const bottom_y = opts.y + opts.h - 24;
    for (let i = 0; i < MAX_VISIBLE; i++) {
      const y = bottom_y - i * LINE_HEIGHT;
      const t = this._entityFactory.text(opts.x + 18, y, '', {
        fontSize: Theme.text.mono,
        fontFamily: Theme.font,
        fill: Theme.player.bright,
      });
      t.position.anchorX = 0;
      t.position.anchorY = 1;
      t.display.alpha = 0;
      this._line_texts.push(t);
    }
  }

  public reset(): void {
    this._lines = [];
    for (const t of this._line_texts) {
      t.label.text = '';
      t.display.alpha = 0;
    }
  }

  public add_line(t_ms: number, side_label: string, body: string): void {
    this._lines.push({ t_ms, side_label, body });
  }

  // Re-render visible tail with relative timestamps + per-line fade.
  public render(playback_t_ms: number): void {
    const tail = this._lines.slice(Math.max(0, this._lines.length - MAX_VISIBLE));
    const visible_count = tail.length;
    // Buffer has overflowed → the topmost visible line will be evicted on
    // next add. Pulse it to telegraph that.
    const overflowing = this._lines.length > MAX_VISIBLE;

    for (let i = 0; i < MAX_VISIBLE; i++) {
      const text = this._line_texts[i];
      // Slot i=0 (bottom) shows newest tail entry; i=MAX_VISIBLE-1 (top) shows oldest.
      const tail_idx = visible_count - 1 - i;
      const line = tail_idx >= 0 ? tail[tail_idx] : null;

      if (!line) {
        text.label.text = '';
        text.display.alpha = 0;
        continue;
      }

      const dt = playback_t_ms - line.t_ms;
      const tag = dt < NOW_THRESHOLD_MS ? '[ now ]' : `[-${(dt / 1000).toFixed(1)}s]`;
      text.label.text = `${tag} ${line.side_label} ${Theme.glyph.shape.play} ${line.body}`;

      if (i === MAX_VISIBLE - 1 && overflowing) {
        text.display.alpha = Display.pulse_alpha(
          playback_t_ms,
          EVICT_PULSE_LOW,
          EVICT_PULSE_HIGH,
          EVICT_PULSE_PERIOD_MS,
        );
      } else {
        const newness = MAX_VISIBLE > 1 ? 1 - (i / (MAX_VISIBLE - 1)) : 1;
        text.display.alpha = ALPHA_OLDEST + newness * (ALPHA_NEWEST - ALPHA_OLDEST);
      }
    }
  }
}
