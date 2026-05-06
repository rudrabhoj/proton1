import * as PIXI from "pixi.js"
import type { Dict } from '@pixi/utils';

import { PixiLayer } from "./Pixi/PixiLayer";
import { Resource } from "../Kernel/Data/Resource";
export class GfxLoader {
  private _pixiLayer: PixiLayer;

  constructor(pixiLayer: PixiLayer) {
    this._pixiLayer = pixiLayer;
  }

  public addResources(resList: Resource[]) {
    this._pixiLayer.addImages(resList);
  }

  public async download(onProgress: Function, onComplete: Function): Promise<Dict<PIXI.LoaderResource>> {
    return this._pixiLayer.downloadResources(onProgress, onComplete);
  }
}

