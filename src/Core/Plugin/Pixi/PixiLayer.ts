import { Application, Assets, Container, Sprite, Texture, Ticker } from "pixi.js";
import { Pino } from "../../Services/Pino";
import { Resource } from "../../Kernel/Data/Resource";
import { PxText } from "./PxText";
import { PxGraphics } from "./PxGraphics";
export class PixiLayer {
  private _pino: Pino;
  private _app: Application | null;
  private _pxText: PxText;
  private _pxGraphics: PxGraphics;
  private _pendingAliases: string[];

  constructor(pino: Pino, pxText: PxText, pxGraphics: PxGraphics) {
    this._pino = pino;
    this._app = null;
    this._pxText = pxText;
    this._pxGraphics = pxGraphics;
    this._pendingAliases = [];
  }

  get fps(): number {
    return Ticker.shared.FPS;
  }

  public async createApplication(width: number, height: number, antialias: boolean, transparent: boolean) {
    let alphaValue = 1;
    if (transparent) alphaValue = 0;

    let app = new Application();
    await app.init({
      width: width,
      height: height,
      antialias: antialias,
      backgroundAlpha: alphaValue
    });

    document.body.appendChild(app.canvas);

    this._app = app;
  }

  public resize(width: number, height: number) {
    if (this._app) {
      this._app.renderer.resize(width, height);
    }
  }

  // Make stage interactive across the entire visible area.
  // Required so stage-level pointermove / pointerup / pointerupoutside fire
  // even when the cursor is over empty area between children. Per pixi v8
  // canonical drag example.
  public ensureStageHitArea(): void {
    if (!this._app) return;
    const stage = this._app.stage;
    stage.eventMode = 'static';
    stage.hitArea = this._app.screen;
  }

  public swapSceneRoot(newContainer: any) {
    if (!this._app) return;

    let stage = this._app.stage;
    let oldRoot = stage.children[0] as Container;

    if (oldRoot) {
      for (let c = 0; c < oldRoot.children.length; c++) {
        let obj = oldRoot.children[c];
        obj.destroy();
      }
    }

    stage.removeChildren();
    stage.addChild(newContainer);
  }

  // Stage pointermove. Requires stage.hitArea = app.screen (set via ensureStageHitArea).
  public onStagePointerMove(cb: (x: number, y: number) => void): () => void {
    if (!this._app) return () => {};
    const stage = this._app.stage;
    this.ensureStageHitArea();
    const handler = (e: any) => cb(e.global.x, e.global.y);
    stage.on('pointermove', handler);
    return () => stage.off('pointermove', handler);
  }

  public onStagePointerUp(cb: (x: number, y: number) => void): () => void {
    if (!this._app) return () => {};
    const stage = this._app.stage;
    this.ensureStageHitArea();
    const handler = (e: any) => cb(e.global.x, e.global.y);
    stage.on('pointerup', handler);
    stage.on('pointerupoutside', handler);
    return () => {
      stage.off('pointerup', handler);
      stage.off('pointerupoutside', handler);
    };
  }

  // Overlay = stage child above the current scene container.
  // Survives until removed; killed if scene swap calls removeChildren on stage.
  public addOverlay(displayObj: any): void {
    if (!this._app) return;
    this._app.stage.addChild(displayObj);
  }

  public removeOverlay(displayObj: any): void {
    if (!this._app) return;
    this._app.stage.removeChild(displayObj);
  }

  public createContainer(): Container {
    return new Container();
  }

  public createText(text: string, style: any): PxText {
    let pt = this._pxText.createNew();
    pt.init(text, style);

    return pt;
  }

  public createGraphics(): PxGraphics {
    return this._pxGraphics.createNew();
  }

  public createSprite(sheet: string, frame?: string): Sprite | null {
    let texture = this._getTexture(sheet, frame);

    if (texture) {
      return new Sprite(texture);
    } else {
      return null;
    }
  }

  public updateTexture(sprite: Sprite, sheet: string, frame?: string) {
    let texture = this._getTexture(sheet, frame);
    if (texture) {
      sprite.texture = texture;
    }
  }

  public addObject(container: Container, child: any) {
    container.addChild(child);
  }

  public removeObject(container: Container, child: any) {
    container.removeChild(child);
  }

  public addImages(imgList: Resource[]) {
    this._addResources(imgList);
  }

  public addAtlases(atlasList: Resource[]) {
    this._addResources(atlasList);
  }

  public async downloadResources(onProgress: Function, onComplete: Function): Promise<void> {
    let aliases = this._pendingAliases;
    this._pendingAliases = [];

    if (aliases.length === 0) {
      onComplete();
      return;
    }

    await Assets.load(aliases, (progress: number) => {
      onProgress(progress);
    });

    onComplete();
  }

  private _addResources(resList: Resource[]) {
    for (let c = 0; c < resList.length; c++) {
      let name = resList[c].name;
      let url = resList[c].url;
      let family = resList[c].family;

      if (family) {
        Assets.add({ alias: name, src: url, data: { family } });
      } else {
        Assets.add({ alias: name, src: url });
      }
      this._pendingAliases.push(name);
    }
  }

  private _getTexture(sheet: string, frame?: string): Texture | null {
    if (frame) {
      let spritesheet = Assets.get(sheet);

      if (spritesheet && spritesheet.textures) {
        return spritesheet.textures[frame];
      } else {
        this._pino.error(`NO spritesheet '${sheet}' found!`);
        return null;
      }
    } else {
      return Texture.from(sheet);
    }
  }
}
