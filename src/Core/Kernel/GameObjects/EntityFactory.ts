import { Sprite } from "../GameObjects/Sprite";
import { Text } from "../GameObjects/Text";
import { Graphic } from "../GameObjects/Graphic";
import { ITweenJs, TweenObject } from "../../Plugin/ITweenJs";

export class EntityFactory {
  private _sprite: Sprite;
  private _text: Text;
  private _graphic: Graphic;
  private _tweenJS: ITweenJs;

  constructor(sprite: Sprite, text: Text, graphic: Graphic, tweenJS: ITweenJs) {
    this._sprite = sprite;
    this._text = text;
    this._graphic = graphic;
    this._tweenJS = tweenJS;
  }

  sprite(x: number, y: number, sheet: string, frame?: string): Sprite {
    let spr = this._sprite.createNew();
    spr.init(x, y, sheet, frame);

    return spr;
  }

  text(x: number, y: number, text: string, style: any) {
    let txt = this._text.createNew();
    txt.init(x, y, text, style);

    return txt;
  }

  graphic(x: number, y: number): Graphic {
    let g = this._graphic.createNew();
    g.init(x, y);

    return g;
  }

  tween(object: any, to: any, time: number, onDone: Function, easing?: string): TweenObject {
    return this._tweenJS.createTween(object, to, time, onDone, easing);
  }
}
