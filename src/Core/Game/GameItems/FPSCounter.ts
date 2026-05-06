import { Sprite } from "../../Kernel/GameObjects/Sprite";
import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import {Positions, Sizes} from "../../Kernel/Data/ScaleMode";
import { Config } from "../../Kernel/Control/Config";
import { Text } from "../../Kernel/GameObjects/Text";
import { IScreen } from "../../Plugin/IScreen";
export class FPSCounter {
  private _entityFactory: EntityFactory;
  private _screen: IScreen;
  private _text: Text;
  private _tickerCounter: number;
  private _showPerTicker: number;

  constructor(entityFactory: EntityFactory, text: Text, screen: IScreen) {
    this._entityFactory = entityFactory;
    this._text = text;
    this._screen = screen;
    this._tickerCounter = 0;
    this._showPerTicker = 120;
  }

  get text() {
    return this._text;
  }

  public init() {
    this._text = this._entityFactory.text(30, 50, "FPS: <Calculating>", {"fontSize": 60, "fill": "white"});
    this._text.position.anchorX = 0;
    this._text.position.anchorY = 0.5;
    this._text.position.fitInsideContainer(false);
    this._text.position.setScaleMode(Positions.left, Positions.left, 1);
  }

  public createNew(): FPSCounter {
    return new FPSCounter(this._entityFactory, this._text.createNew(), this._screen);
  }

  public update() {
    this._tickerCounter++;

    if (this._tickerCounter >= this._showPerTicker) {
      let fpsLabel = "FPS: " + this._screen.fps.toFixed(2);
      this._text.label.text = fpsLabel;
      this._tickerCounter = 0;
      console.log("FPS calculated ", fpsLabel);
    }
  }
}

