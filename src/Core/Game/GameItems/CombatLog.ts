// Streaming combat log. Stores raw entries; re-renders with relative timestamps
// every render(playback_t) call so older lines age into "[-1.4s]" form.

import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { Text } from "../../Kernel/GameObjects/Text";
import { Theme } from "../Theme";

const MAX_VISIBLE = 5;
const NOW_THRESHOLD_MS = 200;

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
  private _bodyText: Text | null;
  private _lines: LogLine[];

  constructor(entityFactory: EntityFactory) {
    this._entityFactory = entityFactory;
    this._bodyText = null;
    this._lines = [];
  }

  public createNew(): CombatLog {
    return new CombatLog(this._entityFactory);
  }

  public init(opts: CombatLogOptions): void {
    this._bodyText = this._entityFactory.text(opts.x + 18, opts.y + 18, '', {
      fontSize: Theme.text.mono,
      fontFamily: Theme.font,
      fill: Theme.player.bright,
      lineHeight: 38,
    });
    this._bodyText.position.anchorX = 0;
    this._bodyText.position.anchorY = 0;
  }

  public reset(): void {
    this._lines = [];
    if (this._bodyText) this._bodyText.label.text = '';
  }

  public add_line(t_ms: number, side_label: string, body: string): void {
    this._lines.push({ t_ms, side_label, body });
  }

  // Re-render visible tail with relative timestamps based on playback time.
  public render(playback_t_ms: number): void {
    if (!this._bodyText) return;
    const tail = this._lines.slice(Math.max(0, this._lines.length - MAX_VISIBLE));
    const formatted = tail.map((l) => {
      const dt = playback_t_ms - l.t_ms;
      const tag = dt < NOW_THRESHOLD_MS ? '[ now ]' : `[-${(dt / 1000).toFixed(1)}s]`;
      return `${tag} ${l.side_label} ${Theme.glyph.shape.play} ${l.body}`;
    });
    this._bodyText.label.text = formatted.join('\n');
  }
}
