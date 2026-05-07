// A bordered terminal-style panel with optional inset title label.
// Uses Graphic for the rect, Text for the title.
//
// Composition over inheritance — TerminalPanel HAS-A Graphic and HAS-A Text.

import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { Graphic } from "../../Kernel/GameObjects/Graphic";
import { Text } from "../../Kernel/GameObjects/Text";
import { ISceneManager } from "../../Plugin/ISceneManager";
import { BlendModeName, BorderStyle } from "../../Plugin/IGraphics";
import { Theme } from "../Theme";

export type PanelTone = 'player' | 'enemy' | 'market' | 'muted';

export interface PanelOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  tone?: PanelTone;
  title?: string;
  fillAlpha?: number;
  borderStyle?: BorderStyle;
  borderWidth?: number;
}

export class TerminalPanel {
  private _entityFactory: EntityFactory;
  private _sceneManager: ISceneManager;

  private _bg: Graphic | null;
  private _titleText: Text | null;

  constructor(entityFactory: EntityFactory, sceneManager: ISceneManager) {
    this._entityFactory = entityFactory;
    this._sceneManager = sceneManager;
    this._bg = null;
    this._titleText = null;
  }

  public createNew(): TerminalPanel {
    return new TerminalPanel(this._entityFactory, this._sceneManager);
  }

  public init(opts: PanelOptions): void {
    const tone = opts.tone ?? 'player';
    const palette = pick_palette(tone);

    this._bg = this._entityFactory.graphic(opts.x, opts.y);
    this._bg.graphics.fillColor = Theme.bg;
    this._bg.graphics.fillAlpha = opts.fillAlpha ?? 0.4;
    this._bg.graphics.borderColor = palette.line;
    this._bg.graphics.borderWidth = opts.borderWidth ?? Theme.panel.borderWidth;
    this._bg.graphics.borderStyle = opts.borderStyle ?? 'solid';
    this._bg.graphics.roundRect(0, 0, opts.w, opts.h, Theme.panel.radius);

    if (opts.title) {
      // Inset title: small tag at top-left, slightly outside the border line.
      const titleX = opts.x + Theme.panel.padding;
      const titleY = opts.y;
      this._titleText = this._entityFactory.text(titleX, titleY, opts.title, {
        fontSize: Theme.panel.titleFontSize,
        fontFamily: Theme.font,
        fill: palette.bright,
      });
      this._titleText.position.anchorX = 0;
      this._titleText.position.anchorY = 0.5;
    }
  }

  get graphic(): Graphic {
    if (!this._bg) throw new Error("TerminalPanel not initialized");
    return this._bg;
  }

  public set_blend(b: BlendModeName): void {
    if (this._bg) this._bg.graphics.fillBlend = b;
  }
}

function pick_palette(tone: PanelTone) {
  switch (tone) {
    case 'enemy': return Theme.enemy;
    case 'market': return Theme.market;
    case 'muted': return { bright: Theme.muted, dim: Theme.muted, line: Theme.muted, text: Theme.muted };
    default: return Theme.player;
  }
}
