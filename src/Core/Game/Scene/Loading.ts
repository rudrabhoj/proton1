import { IGfxLoader } from "../../Plugin/IGfxLoader";
import { Resource } from "../../Kernel/Data/Resource";
import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { IScene } from "../../Kernel/GameObjects/IScene";
import { ISceneManager } from "../../Plugin/ISceneManager";
import { Theme } from "../Theme";

export class Loading implements IScene {
  private _gfxLoader: IGfxLoader;
  private _resource: Resource;
  private _entityFactory: EntityFactory;
  private _sceneManager: ISceneManager;

  constructor(gfxLoader: IGfxLoader, resource: Resource, entityFactory: EntityFactory, sceneManager: ISceneManager) {
    this._gfxLoader = gfxLoader;
    this._resource = resource;
    this._entityFactory = entityFactory;
    this._sceneManager = sceneManager;
  }

  public async preload(): Promise<void> {
    return Promise.resolve();
  }

  public create() {
    this._entityFactory.text(540, 960, "booting...", {
      fontSize: Theme.text.title,
      fontFamily: Theme.font,
      fill: Theme.player.bright,
    }).position.anchorX = 0.5;

    this._loadFont().then(() => { this._startMenu(); });
  }

  public update() {}

  public shutdown() {}

  private async _loadFont(): Promise<void> {
    return new Promise((resolve: Function) => {
      const list = this._resource.createArray([
        { name: "maple-font", url: "assets/fonts/MapleMono-NF-Subset.woff2", family: Theme.font },
      ]);
      this._gfxLoader.addResources(list);
      this._gfxLoader.download(() => {}, () => { resolve(); });
    });
  }

  private _startMenu() {
    this._sceneManager.startScene('Menu');
  }
}
