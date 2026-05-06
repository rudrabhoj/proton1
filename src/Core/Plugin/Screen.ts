import { IAbstractGameObject } from './IAbstractGameObject';
import { IScreen } from './IScreen';
import { PixiLayer } from './Pixi/PixiLayer';
export class Screen implements IScreen {
  private _pixiLayer: PixiLayer;

  constructor(pixiLayer: PixiLayer) {
    this._pixiLayer = pixiLayer;
  }

  get fps(): number {
    return this._pixiLayer.fps;
  }

  public startRenderer(width: number, height: number, antialias: boolean, transparent: boolean) {
    this._pixiLayer.createApplication(width, height, antialias, transparent);
  }

  public createContainer(
    particleMode: boolean = false,
    maxSize: number = 1500,
    properties: any = {},
    batchSize?: number,
    autoResize?: boolean
  ): any {
    if (particleMode) {
      return this._pixiLayer.createParticleContainer(maxSize, properties, batchSize, autoResize);
    } else {
      return this._pixiLayer.createContainer();
    }
  }

  public createSprite(sheet: string, frame?: string): IAbstractGameObject {
    return this._pixiLayer.createSprite(sheet, frame) as unknown as IAbstractGameObject;
  }

  public createText(text: string, style: any): IAbstractGameObject {
    let textObj = this._pixiLayer.createText(text, style);
    return textObj as unknown as IAbstractGameObject;
  }

  public updateTexture(sprite: IAbstractGameObject, sheet: string, frame?: string) {
    this._pixiLayer.updateTexture((sprite as any), sheet, frame);
  }
}

