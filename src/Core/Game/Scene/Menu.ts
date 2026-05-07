// Boot/start screen. Minimal — title + start button.

import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { IScene } from "../../Kernel/GameObjects/IScene";
import { ISceneManager } from "../../Plugin/ISceneManager";
import { Button } from "../GameItems/Button";
import { ShopState } from "../Logic/ShopState";
import { Inventory } from "../Logic/Inventory";
import { RunState } from "../Logic/RunState";
import { rng_from_seed } from "../Logic/Rng";
import { Theme } from "../Theme";

export class Menu implements IScene {
  private _entityFactory: EntityFactory;
  private _sceneManager: ISceneManager;
  private _button: Button;
  private _shopState: ShopState;
  private _inventory: Inventory;
  private _runState: RunState;

  constructor(entityFactory: EntityFactory, sceneManager: ISceneManager, button: Button,
  shopState: ShopState, inventory: Inventory, runState: RunState) {
    this._entityFactory = entityFactory;
    this._sceneManager = sceneManager;
    this._button = button;
    this._shopState = shopState;
    this._inventory = inventory;
    this._runState = runState;
  }

  public async preload(): Promise<void> {}

  public create(): void {
    this._build_title();
    this._build_subtitle();
    this._build_start_button();
  }

  public update(): void {}
  public shutdown(): void {}

  private _build_title(): void {
    const t = this._entityFactory.text(540, 700, 'PROTON', {
      fontSize: 130,
      fontFamily: Theme.font,
      fill: Theme.player.bright,
    });
    t.position.anchorX = 0.5;
    t.position.anchorY = 0.5;

    const sub = this._entityFactory.text(540, 800, '/ 1 /', {
      fontSize: 50,
      fontFamily: Theme.font,
      fill: Theme.player.line,
    });
    sub.position.anchorX = 0.5;
    sub.position.anchorY = 0.5;
  }

  private _build_subtitle(): void {
    const lines = [
      'breach 9 firewalls.',
      'do not get traced.',
      `connections remaining: ${this._runState.lives}`,
    ];
    for (let i = 0; i < lines.length; i++) {
      const t = this._entityFactory.text(540, 1000 + i * 60, lines[i], {
        fontSize: Theme.text.body,
        fontFamily: Theme.font,
        fill: Theme.textDim,
      });
      t.position.anchorX = 0.5;
      t.position.anchorY = 0.5;
    }
  }

  private _build_start_button(): void {
    const btn = this._button.createNew();
    btn.init({
      x: 240,
      y: 1450,
      w: 600,
      h: 130,
      label: `${Theme.glyph.ui.cont} start_run`,
      tone: 'market',
      variant: 'filled',
      onClick: () => this._start_run(),
    });
  }

  private _start_run(): void {
    const rng = rng_from_seed(this._runState.seed);
    this._shopState.init_first_shop(rng);
    void this._inventory;  // wired but no init needed — fresh instance ready
    this._sceneManager.startScene('Shop');
  }
}
