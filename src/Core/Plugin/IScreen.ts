import { IAbstractGameObject } from "./IAbstractGameObject";
import { IGraphics } from "./IGraphics";
export interface IScreen {
  startRenderer(width: number, height: number, antialias: boolean, transparent: boolean): Promise<void>;

  createContainer(): any;

  createSprite(sheet: string, frame?: string): IAbstractGameObject;
  createText(text: string, style: any): IAbstractGameObject;
  createGraphics(): IGraphics;
  updateTexture(sprite: IAbstractGameObject, sheet: string, frame?: string): void;
  fps: number;
}
