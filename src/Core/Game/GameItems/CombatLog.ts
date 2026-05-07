// Streaming combat log. Shows last N entries with relative timestamps.
// Renders inside a TerminalPanel; uses a single multi-line Text for body.
//
// Pure presenter — given a list of formatted lines, draws them.

import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { Text } from "../../Kernel/GameObjects/Text";
import { Theme } from "../Theme";

const MAX_LINES = 5;
const LINE_HEIGHT = 38;

export interface CombatLogOptions {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class CombatLog {
  private _entityFactory: EntityFactory;
  private _bodyText: Text | null;
  private _opts: CombatLogOptions | null;

  constructor(entityFactory: EntityFactory) {
    this._entityFactory = entityFactory;
    this._bodyText = null;
    this._opts = null;
  }

  public createNew(): CombatLog {
    return new CombatLog(this._entityFactory);
  }

  public init(opts: CombatLogOptions): void {
    this._opts = opts;
    this._bodyText = this._entityFactory.text(opts.x + 18, opts.y + 18, '', {
      fontSize: Theme.text.mono,
      fontFamily: Theme.font,
      fill: Theme.player.bright,
      lineHeight: LINE_HEIGHT,
    });
    this._bodyText.position.anchorX = 0;
    this._bodyText.position.anchorY = 0;
  }

  public render_lines(lines: string[]): void {
    if (!this._bodyText) return;
    const tail = lines.slice(Math.max(0, lines.length - MAX_LINES));
    this._bodyText.label.text = tail.join('\n');
  }

  // Format a single battle event into a log line (e.g., "[-1.4s] D8 → chain x3 +120 dmg").
  // The renderer scene calls this per-event.
  public static format_line(t_relative_ms: number, side_label: string, item: string, value: string): string {
    const t_s = (t_relative_ms / 1000).toFixed(1);
    const sign = t_relative_ms === 0 ? ' now ' : `-${t_s}s`;
    return `[${sign}] ${side_label} ▶ ${item} ${value}`;
  }
}
