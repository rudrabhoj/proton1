export interface ITweenJs {
  createTween(object: any, to: any, time: number, onDone: Function, easing?: string): TweenObject;
}

export type TweenObject = {update: Function, stop: Function, start: Function};