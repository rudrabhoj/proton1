import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { Text } from "../../Kernel/GameObjects/Text";
import { Graphic } from "../../Kernel/GameObjects/Graphic";
import { IScene } from "../../Kernel/GameObjects/IScene";
import { ISceneManager } from "../../Plugin/ISceneManager";
import { Button } from "../GameItems/Button";
import { Positions } from "../../Kernel/Data/ScaleMode";

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
  private _entityFactory: EntityFactory;
  private _sceneManager: ISceneManager;
  private _back: Button;

  private _terminalText: Text | null;
  private _cursorRect: Graphic | null;
  private _scanlines: Graphic[];

  private _lineIndex: number;
  private _displayed: string;
  private _charTimer: number;
  private _cursorTimer: number;
  private _cursorVisible: boolean;

  constructor(entityFactory: EntityFactory, sceneManager: ISceneManager, button: Button) {
    this._entityFactory = entityFactory;
    this._sceneManager = sceneManager;
    this._back = button;

    this._terminalText = null;
    this._cursorRect = null;
    this._scanlines = [];

    this._lineIndex = 0;
    this._displayed = "";
    this._charTimer = 0;
    this._cursorTimer = 0;
    this._cursorVisible = true;
  }

  public async preload(): Promise<void> {}

  public create() {
    this._buildBackground();
    this._buildScanlines();
    this._buildOuterBox();
    this._buildHeader();
    this._buildTerminal();
    this._buildCursor();
    this._buildBlinkenLights();
    this._buildBackButton();
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

  // ---------- builders (all coords in logical 1080x1920 space) ----------

  private _buildBackground() {
    const g = this._entityFactory.graphic(0, 0);
    g.graphics.fillColor = 0x000000;
    g.graphics.fillAlpha = 1;
    g.graphics.borderStyle = 'none';
    g.graphics.rect(0, 0, 1080, 1920);
  }

  private _buildScanlines() {
    for (let y = 0; y < 1920; y += 6) {
      const g = this._entityFactory.graphic(0, y);
      g.graphics.fillColor = GREEN;
      g.graphics.fillAlpha = 0.05;
      g.graphics.borderStyle = 'none';
      g.graphics.rect(0, 0, 1080, 1);
      this._scanlines.push(g);
    }
  }

  private _buildOuterBox() {
    const g = this._entityFactory.graphic(40, 200);
    g.graphics.fillAlpha = 0;
    g.graphics.borderColor = GREEN;
    g.graphics.borderWidth = 4;
    g.graphics.borderStyle = 'solid';
    g.graphics.rect(0, 0, 1000, 1500);
  }

  private _buildHeader() {
    const headerText = this._entityFactory.text(540, 130, "▓▒░ TERMINAL v0.42  ░▒▓", {
      fontSize: 44,
      fontFamily: FONT,
      fill: GREEN,
    });
    headerText.position.anchorX = 0.5;
    headerText.position.anchorY = 0.5;
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
    const g = this._entityFactory.graphic(80, 244);
    g.graphics.fillColor = GREEN;
    g.graphics.fillAlpha = 1;
    g.graphics.borderStyle = 'none';
    g.graphics.rect(0, 0, 18, 32);
    this._cursorRect = g;
  }

  // Demonstrates circles, ellipse, dotted/dashed borders, alpha blends.
  private _buildBlinkenLights() {
    const c1 = this._entityFactory.graphic(120, 1750);
    c1.graphics.fillColor = 0xff3344;
    c1.graphics.fillAlpha = 0.85;
    c1.graphics.fillBlend = 'add';
    c1.graphics.borderColor = GREEN;
    c1.graphics.borderWidth = 2;
    c1.graphics.borderStyle = 'dotted';
    c1.graphics.circle(0, 0, 26);

    const c2 = this._entityFactory.graphic(200, 1750);
    c2.graphics.fillColor = 0xffaa00;
    c2.graphics.fillAlpha = 0.85;
    c2.graphics.fillBlend = 'add';
    c2.graphics.borderColor = GREEN;
    c2.graphics.borderWidth = 2;
    c2.graphics.borderStyle = 'dotted';
    c2.graphics.circle(0, 0, 26);

    const e = this._entityFactory.graphic(800, 1750);
    e.graphics.fillColor = DIM_GREEN;
    e.graphics.fillAlpha = 0.4;
    e.graphics.borderColor = GREEN;
    e.graphics.borderWidth = 3;
    e.graphics.borderStyle = 'dashed';
    e.graphics.ellipse(0, 0, 180, 40);

    const dr = this._entityFactory.graphic(60, 1620);
    dr.graphics.fillAlpha = 0;
    dr.graphics.borderColor = GREEN;
    dr.graphics.borderWidth = 2;
    dr.graphics.borderStyle = 'dashed';
    dr.graphics.rect(0, 0, 960, 60);
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
    this._cursorRect.position.x = 80 + currentLine.length * charWidth;
    this._cursorRect.position.y = 244 + lineNum * lineHeight;
  }

  private _tickCursor(dt: number) {
    this._cursorTimer += dt;
    if (this._cursorTimer >= 480) {
      this._cursorTimer = 0;
      this._cursorVisible = !this._cursorVisible;
      if (this._cursorRect) {
        this._cursorRect.graphics.fillAlpha = this._cursorVisible ? 1 : 0;
      }
    }
  }
}
