// Opponent target dossier card. Avatar + 4-row data table inside a TerminalPanel.
//
//   ┌─[ avatar ]─┬───────────────┐
//   │            │ name   xDrzwv │
//   │            │ node   192... │
//   │            │ bank   $312   │
//   │            │ ping   23ms   │
//   └────────────┴───────────────┘

import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { ISceneManager } from "../../Plugin/ISceneManager";
import { Avatar } from "./Avatar";
import { TerminalPanel } from "./TerminalPanel";
import { Text } from "../../Kernel/GameObjects/Text";
import { Theme } from "../Theme";

export interface DossierData {
  name: string;
  ip: string;
  bank: number;
  ping_ms: number;
  seed: number;
}

export interface DossierOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  data: DossierData;
  tone?: 'player' | 'enemy';
}

export class Dossier {
  private _entityFactory: EntityFactory;
  private _sceneManager: ISceneManager;
  private _panel: TerminalPanel;
  private _avatar: Avatar;

  constructor(entityFactory: EntityFactory, sceneManager: ISceneManager, panel: TerminalPanel, avatar: Avatar) {
    this._entityFactory = entityFactory;
    this._sceneManager = sceneManager;
    this._panel = panel;
    this._avatar = avatar;
  }

  public createNew(): Dossier {
    return new Dossier(
      this._entityFactory,
      this._sceneManager,
      this._panel.createNew(),
      this._avatar.createNew(),
    );
  }

  public init(opts: DossierOptions): void {
    this._panel.init({
      x: opts.x, y: opts.y, w: opts.w, h: opts.h,
      tone: opts.tone ?? 'enemy',
      fillAlpha: 0.2,
    });

    const avatar_size = opts.h - 32;
    this._avatar.init({
      x: opts.x + 16,
      y: opts.y + 16,
      size: avatar_size,
      seed: opts.data.seed,
      tone: opts.tone ?? 'enemy',
    });

    this._render_rows(opts);
  }

  private _render_rows(opts: DossierOptions): void {
    const palette = opts.tone === 'player' ? Theme.player : Theme.enemy;
    const text_left = opts.x + opts.h;          // start to the right of avatar block
    const text_right = opts.x + opts.w - 18;
    const row_h = (opts.h - 36) / 4;
    const top = opts.y + 22;

    const rows: Array<[string, string]> = [
      ['name', opts.data.name],
      ['node', opts.data.ip],
      ['bank', `${Theme.glyph.ui.money} ${opts.data.bank}`],
      ['ping', `${opts.data.ping_ms}ms`],
    ];

    for (let i = 0; i < rows.length; i++) {
      const ky = top + i * row_h;
      const left_text: Text = this._entityFactory.text(text_left, ky, rows[i][0], {
        fontSize: Theme.text.body,
        fontFamily: Theme.font,
        fill: palette.text,
      });
      left_text.position.anchorX = 0;
      left_text.position.anchorY = 0;

      const right_text: Text = this._entityFactory.text(text_right, ky, rows[i][1], {
        fontSize: Theme.text.body,
        fontFamily: Theme.font,
        fill: palette.bright,
      });
      right_text.position.anchorX = 1;
      right_text.position.anchorY = 0;
    }
  }
}
