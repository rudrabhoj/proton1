import { Assets, Container, Sprite, Texture, Ticker, WebGLRenderer } from "pixi.js";
import { Pino } from "../../Services/Pino";
import { Resource } from "../../Kernel/Data/Resource";
import { PxText } from "./PxText";
import { PxGraphics } from "./PxGraphics";

// We construct WebGLRenderer + Container + Ticker manually instead of using
// pixi.js's Application entry point. The default Application setup calls
// autoDetectRenderer() which dynamic-imports WebGL, WebGPU, AND Canvas2D
// backends — rolldown then inlines all three into the main bundle (~120-180
// KB raw of dead code). By going direct, only WebGLRenderer ships. WebGPU +
// Canvas2D become unreachable from any static import and tree-shake out.
//
// The price of skipping the high-level entry point: ResizePlugin and
// TickerPlugin from app/init don't auto-attach. Neither matters here — we
// manage resize through ScaleManager and our render loop runs off
// Ticker.shared directly, not app.ticker.

export class PixiLayer {
  private _pino: Pino;
  private _renderer: WebGLRenderer | null;
  private _stage: Container | null;
  private _render_tick: (() => void) | null;
  private _pxText: PxText;
  private _pxGraphics: PxGraphics;
  private _pendingAliases: string[];

  constructor(pino: Pino, pxText: PxText, pxGraphics: PxGraphics) {
    this._pino = pino;
    this._renderer = null;
    this._stage = null;
    this._render_tick = null;
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

    const renderer = new WebGLRenderer();
    await renderer.init({
      width: width,
      height: height,
      antialias: antialias,
      backgroundAlpha: alphaValue,
    });

    document.body.appendChild(renderer.canvas);

    const stage = new Container();
    this._renderer = renderer;
    this._stage = stage;

    // Render once per Ticker frame. Ticker.shared is the global PIXI ticker
    // instance — same one Application.init would have tied to app.ticker
    // via TickerPlugin. We attach our render directly and start the ticker
    // since TickerPlugin (which does this) isn't loaded.
    this._render_tick = () => renderer.render({ container: stage });
    Ticker.shared.add(this._render_tick);
    Ticker.shared.start();
  }

  public resize(width: number, height: number) {
    if (this._renderer) {
      this._renderer.resize(width, height);
    }
  }

  // Make stage interactive across the entire visible area.
  // Required so stage-level pointermove / pointerup / pointerupoutside fire
  // even when the cursor is over empty area between children. Per pixi v8
  // canonical drag example.
  public ensureStageHitArea(): void {
    if (!this._stage || !this._renderer) return;
    this._stage.eventMode = 'static';
    this._stage.hitArea = this._renderer.screen;
  }

  public swapSceneRoot(newContainer: any) {
    if (!this._stage) return;
    const stage = this._stage;

    // Stage layout: children[0] = current scene root, children[1..] = transient
    // overlays (drag ghost). Each SceneData.container is created ONCE in
    // SceneManager._addScene and reused on every re-entry to that scene —
    // destroying the root itself would mark it `destroyed=true` and brick
    // the next visit. PIXI's Container.destroy nulls _position/_scale/_pivot,
    // so any subsequent render of the re-attached destroyed root null-derefs
    // during transform compute, AND the early-return in destroy() means a
    // second destroy() on the same root never reaches its children — they
    // pile up across re-entries (the leak).
    //
    // Strategy: destroy descendants + transient overlays, but only DETACH
    // the scene root via removeChild.

    // 1. Destroy transient overlays (drag ghost etc). Walk top-down so the
    //    array shrink during iteration only affects indices we've passed.
    while (stage.children.length > 1) {
      const overlay = stage.children[stage.children.length - 1];
      overlay.destroy({ children: true, texture: false, textureSource: false });
    }

    // 2. Tear down the old scene's contents. Snapshot via slice() because
    //    each destroy() detaches itself from oldRoot — a forward index over
    //    the live children array would skip every other entry (the original
    //    bug here). children:true cascades destruction recursively.
    const oldRoot = stage.children[0] as Container | undefined;
    if (oldRoot) {
      const kids = oldRoot.children.slice();
      for (let i = 0; i < kids.length; i++) {
        kids[i].destroy({ children: true, texture: false, textureSource: false });
      }
      // Detach the root but DO NOT destroy it — it gets re-attached when its
      // owning scene is re-entered.
      stage.removeChild(oldRoot);
    }

    stage.addChild(newContainer);
  }

  // Stage pointermove. Requires stage.hitArea = renderer.screen (set via ensureStageHitArea).
  public onStagePointerMove(cb: (x: number, y: number) => void): () => void {
    if (!this._stage) return () => {};
    const stage = this._stage;
    this.ensureStageHitArea();
    const handler = (e: any) => cb(e.global.x, e.global.y);
    stage.on('pointermove', handler);
    return () => stage.off('pointermove', handler);
  }

  public onStagePointerUp(cb: (x: number, y: number) => void): () => void {
    if (!this._stage) return () => {};
    const stage = this._stage;
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
    if (!this._stage) return;
    this._stage.addChild(displayObj);
  }

  public removeOverlay(displayObj: any): void {
    if (!this._stage) return;
    this._stage.removeChild(displayObj);
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
