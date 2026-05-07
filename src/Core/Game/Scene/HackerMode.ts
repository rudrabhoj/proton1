import { Pino } from "../../Services/Pino";
import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { Text } from "../../Kernel/GameObjects/Text";
import { IScene } from "../../Kernel/GameObjects/IScene";
import { ISceneManager } from "../../Plugin/ISceneManager";
import { IScreen } from "../../Plugin/IScreen";
import { IGraphics } from "../../Plugin/IGraphics";
import { Button } from "../GameItems/Button";
import { Positions } from "../../Kernel/Data/ScaleMode";
import { Config } from "../../Kernel/Control/Config";

const FONT = "Maple Mono NF";
const GREEN = 0x00ff66;
const DIM_GREEN = 0x004422;

const HACKER_LINES = [
  "> CONNECTING TO MAINFRAME...",
  "> ESTABLISHING SECURE TUNNEL [443]",
  "> BYPASSING FIREWALL... OK",
  "> ROOT ACCESS GRANTED.",
  "",
  "$ whoami",
  "anonymous",
  "$ ls /secrets/",
  "  - launch_codes.bin",
  "  - secrets.dat",
  "  - evidence/",
  "$ cat secrets.dat",
  "<<<<< ENCRYPTED PAYLOAD >>>>>",
  "$ decrypt --quantum secrets.dat",
  "ATTEMPTING DECRYPTION",
  "[####------]  40%",
  "[########--]  80%",
  "[##########] 100%",
  "DECRYPTED.",
  "$ echo \"I'M IN.\"",
  "I'M IN.",
  "",
  "> THE QUICK BROWN FOX JUMPS",
  "  OVER THE LAZY DOG.",
  "  0123456789 !@#$%^&*()",
];

export class HackerMode implements IScene {
  private _pino: Pino;
  private _entityFactory: EntityFactory;
  private _sceneManager: ISceneManager;
  private _screen: IScreen;
  private _config: Config;
  private _back: Button;
  private _ratio: number;
  private _offsetX: number;
  private _offsetY: number;

  private _bg: IGraphics | null;
  private _box: IGraphics | null;
  private _scanlines: IGraphics[];
  private _circle1: IGraphics | null;
  private _circle2: IGraphics | null;
  private _ellipse: IGraphics | null;
  private _dottedRect: IGraphics | null;
  private _headerText: Text | null;
  private _terminalText: Text | null;
  private _cursorRect: IGraphics | null;

  private _lineIndex: number;
  private _displayed: string;
  private _charTimer: number;
  private _cursorTimer: number;
  private _cursorVisible: boolean;

  constructor(pino: Pino, entityFactory: EntityFactory, sceneManager: ISceneManager, screen: IScreen,
  config: Config, button: Button) {
    this._pino = pino;
    this._entityFactory = entityFactory;
    this._sceneManager = sceneManager;
    this._screen = screen;
    this._config = config;
    this._back = button;
    this._ratio = 1;
    this._offsetX = 0;
    this._offsetY = 0;

    this._bg = null;
    this._box = null;
    this._scanlines = [];
    this._circle1 = null;
    this._circle2 = null;
    this._ellipse = null;
    this._dottedRect = null;
    this._headerText = null;
    this._terminalText = null;
    this._cursorRect = null;

    this._lineIndex = 0;
    this._displayed = "";
    this._charTimer = 0;
    this._cursorTimer = 0;
    this._cursorVisible = true;
  }

  public async preload(): Promise<void> {}

  public create() {
    this._ratio = Math.min(
      this._config.displayWidth / this._config.width,
      this._config.displayHeight / this._config.height,
    );
    this._offsetX = (this._config.displayWidth - this._config.width * this._ratio) / 2;
    this._offsetY = (this._config.displayHeight - this._config.height * this._ratio) / 2;
    this._buildBackground();
    this._buildScanlines();
    this._buildOuterBox();
    this._buildHeader();
    this._buildTerminal();
    this._buildCursor();
    this._buildBlinkenLights();
    this._buildBackButton();
  }

  private _placeGraphics(g: IGraphics, lx: number, ly: number) {
    g.x = this._offsetX + lx * this._ratio;
    g.y = this._offsetY + ly * this._ratio;
    g.data.scale.set(this._ratio);
  }

  public update(dt: number) {
    this._tickType(dt);
    this._tickCursor(dt);
  }

  public shutdown() {
    this._lineIndex = 0;
    this._displayed = "";
    this._scanlines = [];
  }

  // ---------- builders ----------

  private _buildBackground() {
    const g = this._screen.createGraphics();
    g.fillColor = 0x000000;
    g.fillAlpha = 1;
    g.borderStyle = 'none';
    g.rect(0, 0, 1080, 1920);
    this._placeGraphics(g, 0, 0);
    this._bg = g;
    this._sceneManager.addObject(g.data);
  }

  private _buildScanlines() {
    for (let y = 0; y < 1920; y += 6) {
      const g = this._screen.createGraphics();
      g.fillColor = GREEN;
      g.fillAlpha = 0.05;
      g.borderStyle = 'none';
      g.rect(0, 0, 1080, 1);
      this._placeGraphics(g, 0, y);
      this._scanlines.push(g);
      this._sceneManager.addObject(g.data);
    }
  }

  private _buildOuterBox() {
    const g = this._screen.createGraphics();
    g.fillAlpha = 0;
    g.borderColor = GREEN;
    g.borderWidth = 4;
    g.borderStyle = 'solid';
    g.rect(0, 0, 1000, 1500);
    this._placeGraphics(g, 40, 200);
    this._box = g;
    this._sceneManager.addObject(g.data);
  }

  private _buildHeader() {
    this._headerText = this._entityFactory.text(540, 130, "▓▒░ TERMINAL v0.42  ░▒▓", {
      fontSize: 44,
      fontFamily: FONT,
      fill: GREEN,
    });
    this._headerText.position.anchorX = 0.5;
    this._headerText.position.anchorY = 0.5;
  }

  private _buildTerminal() {
    this._terminalText = this._entityFactory.text(80, 240, "", {
      fontSize: 30,
      fontFamily: FONT,
      fill: GREEN,
      lineHeight: 38,
    });
    this._terminalText.position.anchorX = 0;
    this._terminalText.position.anchorY = 0;
  }

  private _buildCursor() {
    const g = this._screen.createGraphics();
    g.fillColor = GREEN;
    g.fillAlpha = 1;
    g.borderStyle = 'none';
    g.rect(0, 0, 18, 32);
    this._placeGraphics(g, 80, 244);
    this._cursorRect = g;
    this._sceneManager.addObject(g.data);
  }

  // Demonstrates circles, ellipse, dotted/dashed borders, alpha blends.
  private _buildBlinkenLights() {
    const c1 = this._screen.createGraphics();
    c1.fillColor = 0xff3344;
    c1.fillAlpha = 0.85;
    c1.fillBlend = 'add';
    c1.borderColor = GREEN;
    c1.borderWidth = 2;
    c1.borderStyle = 'dotted';
    c1.circle(0, 0, 26);
    this._placeGraphics(c1, 120, 1750);
    this._circle1 = c1;
    this._sceneManager.addObject(c1.data);

    const c2 = this._screen.createGraphics();
    c2.fillColor = 0xffaa00;
    c2.fillAlpha = 0.85;
    c2.fillBlend = 'add';
    c2.borderColor = GREEN;
    c2.borderWidth = 2;
    c2.borderStyle = 'dotted';
    c2.circle(0, 0, 26);
    this._placeGraphics(c2, 200, 1750);
    this._circle2 = c2;
    this._sceneManager.addObject(c2.data);

    const e = this._screen.createGraphics();
    e.fillColor = DIM_GREEN;
    e.fillAlpha = 0.4;
    e.borderColor = GREEN;
    e.borderWidth = 3;
    e.borderStyle = 'dashed';
    e.ellipse(0, 0, 180, 40);
    this._placeGraphics(e, 800, 1750);
    this._ellipse = e;
    this._sceneManager.addObject(e.data);

    const dr = this._screen.createGraphics();
    dr.fillAlpha = 0;
    dr.borderColor = GREEN;
    dr.borderWidth = 2;
    dr.borderStyle = 'dashed';
    dr.rect(0, 0, 960, 60);
    this._placeGraphics(dr, 60, 1620);
    this._dottedRect = dr;
    this._sceneManager.addObject(dr.data);
  }

  private _buildBackButton() {
    this._back = this._back.createNew();
    this._back.init(-100, 150, 'back_btn', () => {
      this._sceneManager.startScene('Menu');
    });
    this._back.sprite.position.anchorX = 1;
    this._back.sprite.position.anchorY = 0.5;
    this._back.sprite.position.fitInsideContainer(false);
    this._back.sprite.position.setScaleMode(Positions.right, Positions.left, 1);
  }

  // ---------- ticks ----------

  private _tickType(dt: number) {
    if (this._lineIndex >= HACKER_LINES.length) return;

    this._charTimer += dt;
    const msPerChar = 1000 / 35;

    while (this._charTimer >= msPerChar && this._lineIndex < HACKER_LINES.length) {
      this._charTimer -= msPerChar;
      this._advance();
    }
  }

  private _advance() {
    const target = HACKER_LINES[this._lineIndex];
    const lines = this._displayed.split('\n');
    const current = lines[lines.length - 1];

    if (current.length < target.length) {
      this._displayed += target[current.length];
    } else {
      this._displayed += '\n';
      this._lineIndex++;
    }

    if (this._terminalText) this._terminalText.label.text = this._displayed;
    this._updateCursorPosition();
  }

  private _updateCursorPosition() {
    if (!this._cursorRect) return;
    const lines = this._displayed.split('\n');
    const currentLine = lines[lines.length - 1];
    const lineNum = lines.length - 1;
    const charWidth = 18;
    const lineHeight = 38;
    this._cursorRect.x = this._offsetX + (80 + currentLine.length * charWidth) * this._ratio;
    this._cursorRect.y = this._offsetY + (244 + lineNum * lineHeight) * this._ratio;
  }

  private _tickCursor(dt: number) {
    this._cursorTimer += dt;
    if (this._cursorTimer >= 480) {
      this._cursorTimer = 0;
      this._cursorVisible = !this._cursorVisible;
      if (this._cursorRect) {
        this._cursorRect.fillAlpha = this._cursorVisible ? 1 : 0;
      }
    }
  }
}
