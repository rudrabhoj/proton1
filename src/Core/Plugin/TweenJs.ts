import TwLib from "@tweenjs/tween.js";
import { ITweenJs } from "./ITweenJs";
import {TweenObject} from "./ITweenJs";

export class TweenJs implements ITweenJs {
  constructor() {

  }

  public createTween(object: any, to: any, time: number, onDone: Function, easing: string = "Linear.None"): TweenObject {
    let tw = new TwLib.Tween(object);

    tw.to(to, time);
    tw.easing(TwLib.Easing.Linear.None);
    tw.onComplete(() => {
      onDone();
    });
    

    return tw;
  }
}

