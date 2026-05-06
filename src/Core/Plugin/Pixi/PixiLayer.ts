import * as PIXI from "pixi.js"
import { Resource } from "../../Kernel/Data/Resource";
import type { Dict } from '@pixi/utils';
import { PxText } from "./PxText";
export class PixiLayer {
  private _app: PIXI.Application | null;
  private _pxText: PxText;

  constructor(pxText: PxText) {
    this._app = null;
    this._pxText = pxText;
  }

  get renderer(): PIXI.Renderer | PIXI.AbstractRenderer | null {
    if (this._app) {
      return this._app.renderer;
    } else {
      return null;
    }
  }

  get fps(): number {
    return PIXI.Ticker.shared.FPS;
  }

  get stage(): PIXI.Container | null {
    if (this._app) {
      return this._app.stage;
    } else {
      return null;
    }
  }

  public createApplication(width: number, height: number, antialias: boolean, transparent: boolean) {
    let alphaValue = 1;
    if (transparent) alphaValue = 0;

    let app = new PIXI.Application({
      width: width,
      height: height,
      antialias: antialias,
      backgroundAlpha: alphaValue
    });

    document.body.appendChild(app.view);

    this._app = app;
  }

  public createContainer(): PIXI.Container {
    return new PIXI.Container();
  }

  public createText(text: string, style: any): PxText {
    let pt = this._pxText.createNew();
    pt.init(text, ((this._app as PIXI.Application).renderer as PIXI.Renderer), style);

    return pt;
  }

  public createParticleContainer(
    maxSize: number = 1500,
    properties: PIXI.IParticleProperties = {},
    batchSize?: number,
    autoResize?: boolean
  ): PIXI.ParticleContainer {
    return new PIXI.ParticleContainer(maxSize, properties, batchSize, autoResize);
  }

  public createSprite(sheet: string, frame?: string): PIXI.Sprite | null {
    let texture = this._getTexture(sheet, frame);

    if (texture) {
      return new PIXI.Sprite(texture);
    } else {
      return null;
    }
  }

  public updateTexture(sprite: PIXI.Sprite, sheet: string, frame?: string) {
    let texture = this._getTexture(sheet, frame);
    if (texture) {
      sprite.texture = texture;
    }
  }

  public addObject(container: PIXI.Container, child: any) {
    container.addChild(child);
  }

  public removeObject(container: PIXI.Container, child: any) {
    container.removeChild(child);
  }

  public addImages(imgList: Resource[]) {
    this._addResources(imgList);
  }

  public addAtlases(atlasList: Resource[]) {
    this._addResources(atlasList);
  }

  public async downloadResources(onProgress: Function, onComplete: Function): Promise<Dict<PIXI.LoaderResource>> {
    return new Promise((resolve: Function, reject: Function) => {
      PIXI.Loader.shared.onProgress.once(() => {
        onProgress(PIXI.Loader.shared.progress);
      });

      PIXI.Loader.shared.load((loader: PIXI.Loader, resources: Dict<PIXI.LoaderResource>) => {
        resolve(resources);

        onComplete();
      });
    });
  }

  private _addResources(resList: Resource[]) {
    for (let c = 0; c < resList.length; c++) {
      let name = resList[c].name;
      let url = resList[c].url;

      PIXI.Loader.shared.add(name, url);
    }
  }

  private _getTexture(sheet: string, frame?: string): PIXI.Texture | null {
    if (frame) {
      let spritesheet = PIXI.Loader.shared.resources[sheet].spritesheet;

      if (spritesheet) {
        return spritesheet.textures[frame];
      } else {
        console.error("NO spritesheet '%s' found!", sheet);
        return null;
      }
    } else {
      return PIXI.Texture.from(sheet);
    }
  }
}

