import { Sprite } from "../../Kernel/GameObjects/Sprite";
import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import {Positions, Sizes} from "../../Kernel/Data/ScaleMode";
import { Config } from "../../Kernel/Control/Config";
import { FPSCounter } from "./FPSCounter";
export class Background {
  private _entityFactory: EntityFactory;
  private _sprite: Sprite;
  private _resizeListner: Function;
  private _config: Config;
  private _fpsCounter: FPSCounter;

  constructor(entityFactory: EntityFactory, sprite: Sprite, fpsCounter: FPSCounter, config: Config) {
    this._entityFactory = entityFactory;
    this._sprite = sprite;
    this._config = config;
    this._fpsCounter = fpsCounter;
    this._resizeListner = () => {};
  }

  get sprite(): Sprite {
    return this._sprite;
  }

  public init(sheet: string) {
    this._sprite = this._entityFactory.sprite(0, 0, sheet, 'bg');
    this._sprite.position.anchorX = 0.5;
    this._sprite.position.anchorY = 0.5;
    this._sprite.position.fitInsideContainer(false);
    this._sprite.position.setScaleMode(Positions.center, Positions.center, 1);

    this._calculateScale();
    this._addListners();
    if (this._config.showFPS) {
      this._showFPS();
    }
  }

  public createNew(): Background {
    return new Background(this._entityFactory, this._sprite.createNew(), this._fpsCounter.createNew(), this._config);
  }

  public shutdown() {
    window.removeEventListener("resize", (this._resizeListner as any));
  }

  public update() {
    if (this._config.showFPS) this._fpsCounter.update();
  }

  private _showFPS() {
    this._fpsCounter.init();
  }

  private _addListners() {
    this._resizeListner = () => {
      this._calculateScale();
    }

    window.addEventListener("resize", (this._resizeListner as any));
  }

  private _calculateScale() {
    if (document.documentElement.clientWidth / document.documentElement.clientHeight > 1) {
      this._sprite.display.setScaleMode(Sizes.fill, Sizes.maintain_ratio, 1);  
    } else if (document.documentElement.clientWidth / document.documentElement.clientHeight < 0.56) {
      this._sprite.display.setScaleMode(Sizes.maintain_ratio, Sizes.fill, 1);
    } else {
      this._sprite.display.setScaleMode(Sizes.normal, Sizes.normal, 1);
    }
  }
}

