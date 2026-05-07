import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { Sprite } from "../../Kernel/GameObjects/Sprite";
import { Button } from "../GameItems/Button";
import { IScene } from "../../Kernel/GameObjects/IScene";
import { ISceneManager } from "../../Plugin/ISceneManager";
import { IScreen } from "../../Plugin/IScreen";
import { IGraphics } from "../../Plugin/IGraphics";
import { Background } from "../GameItems/Background";
import { Config } from "../../Kernel/Control/Config";

const FONT = "Maple Mono NF";
const HACKER_GREEN = 0x00ff66;

export class Menu implements IScene {
  private _entityFactory: EntityFactory;
  private _sceneManager: ISceneManager;
  private _screen: IScreen;
  private _config: Config;
  private _card: Button;
  private _mix: Button;
  private _fire: Button;
  private _background: Background;
  private _logo: Sprite;
  private _hackerBtnBg: IGraphics | null;

  constructor(entityFactory: EntityFactory, sceneManager: ISceneManager, screen: IScreen, config: Config,
  button: Button, sprite: Sprite, background: Background) {
    this._entityFactory = entityFactory;
    this._sceneManager = sceneManager;
    this._screen = screen;
    this._config = config;
    this._card = button;
    this._mix = button;
    this._fire = button;

    this._background = background;
    this._logo = sprite;
    this._hackerBtnBg = null;
  }

  public async preload(): Promise<void> {

  }

  public create() {
    this._initBackground();
    this._initButtons();
    this._initHackerButton();
  }

  public update() {
    this._background.update();
  }

  public shutdown() {
    this._background.shutdown();
  }

  private _initBackground() {
    this._background.init('main');
    this._logo = this._entityFactory.sprite(162, 150, 'preload', 'logo');
  }

  private  _initButtons() {
    this._card = this._card.createNew();
    this._mix = this._mix.createNew();
    this._fire = this._fire.createNew();

    let startY = 750;

    this._card.init(303, startY + 0, 'btn_card', () => { this._startLevel('CardMode'); });
    this._mix.init(303, startY + 220, 'btn_mixed', () => { this._startLevel('MixMode'); });
    this._fire.init(303, startY + 440, 'btn_fire', () => { this._startLevel('FireMode'); });
  }

  private _initHackerButton() {
    const x = 303;
    const y = 1410;
    const w = 474;
    const h = 130;

    const ratio = Math.min(
      this._config.displayWidth / this._config.width,
      this._config.displayHeight / this._config.height,
    );
    const offsetX = (this._config.displayWidth - this._config.width * ratio) / 2;
    const offsetY = (this._config.displayHeight - this._config.height * ratio) / 2;

    const g = this._screen.createGraphics();
    g.fillColor = 0x000000;
    g.fillAlpha = 0.85;
    g.borderColor = HACKER_GREEN;
    g.borderWidth = 4;
    g.borderStyle = 'dashed';
    g.rect(0, 0, w, h);
    g.x = offsetX + x * ratio;
    g.y = offsetY + y * ratio;
    g.data.scale.set(ratio);
    g.interactive = true;
    g.on('pointerup', () => { this._startLevel('HackerMode'); });
    this._hackerBtnBg = g;
    this._sceneManager.addObject(g.data);

    const label = this._entityFactory.text(x + w / 2, y + h / 2, "> HACK_MODE", {
      fontSize: 56,
      fontFamily: FONT,
      fill: HACKER_GREEN,
    });
    label.position.anchorX = 0.5;
    label.position.anchorY = 0.5;
  }

  private _startLevel(levelName: string) {
    this._sceneManager.startScene(levelName);
  }

}
