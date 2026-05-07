import { Pino } from "../Services/Pino";
import { SceneData } from "../Kernel/Data/SceneData";
import { IScene } from "../Kernel/GameObjects/IScene";
import { PixiLayer } from "./Pixi/PixiLayer";
import { Loop } from "../Kernel/Control/Loop";
import { IAbstractGameObject } from "./IAbstractGameObject";
import { ScaleManager } from "../Kernel/Control/ScaleManager";
export class SceneManager {
  private _pino: Pino;
  private _pixiLayer: PixiLayer;
  private _sceneData: SceneData;
  private _loop: Loop;
  private _scaleManager: ScaleManager;
  private _currentScene: SceneData | null;

  private _canUpdate: boolean;

  private _sceneList:SceneData[];

  constructor(pino: Pino, pixiLayer: PixiLayer, sceneData: SceneData, loop: Loop, scaleManager: ScaleManager) {
    this._pino = pino;
    this._pixiLayer = pixiLayer;
    this._sceneData = sceneData;
    this._scaleManager = scaleManager;
    this._loop = loop;

    this._currentScene = null;

    this._canUpdate = false;

    this._sceneList = [];
  }

  public init() {
    this._loop.addFunction(this._update, this);

    this._scaleManager.init((w: number, h: number) => this._pixiLayer.resize(w, h));
    //console.log("Scale manager started");
  }

  public addScene(name: string, scene: any) {
    if (!this._exists(name)) {
      this._addScene(name, scene);
    } else {
      this._pino.error(`Scene name '${name}' already exists!`);
    }
  }

  public startScene(name: string) {
    let scn = this._getScene(name);

    if (scn) {
      this._handleSceneStart(scn);
    } else {
      this._pino.error(`No scene with the name '${name}' found`);
    }
  }

  public addObject(obj: any) {
    if (this._currentScene) {
      this._pixiLayer.addObject(this._currentScene.container, obj);
    }
  }

  public removeObject(obj: any) {
    if (this._currentScene) {
      this._pixiLayer.removeObject(this._currentScene.container, obj);
    }
  }

  private _update(dt: number) {
    if (this._currentScene && this._canUpdate) {
      this._currentScene.scene.update(dt);
    }
  }

  private _addScene(name: string, scene: IScene) {
    let sd = this._createSceneData(name, scene);
    sd.container = this._createContainer();
    // Enable z-order sorting so entities can opt into "always on top"
    // semantics via display.zIndex (e.g. drag ghost above sell overlay).
    // Children with the default zIndex of 0 keep their addChild order.
    sd.container.sortableChildren = true;

    this._sceneList.push(sd);
  }

  private _handleSceneStart(scene: SceneData) {
    if (this._currentScene != null) {
      this._scaleManager.clearEntities();
      this._currentScene.scene.shutdown();
    }

    this._pixiLayer.swapSceneRoot(scene.container);

    this._canUpdate = false;
    this._currentScene = scene;

    this._currentScene.scene.preload().then(() => {
      this._canUpdate = true;

      scene.scene.create();
    });
  }

  private _exists(name: string): boolean {
    let scn = this._getScene(name);

    if (scn == null) {
      return false;
    } else {
      return true;
    }
  }

  private _getScene(name: string): SceneData | null {
    for (let c = 0; c < this._sceneList.length; c++) {
      if (this._sceneList[c].name == name) return this._sceneList[c];
    }

    return null;
  }


  private _createSceneData(name: string, scene: any): SceneData {
    return this._sceneData.createNew(name, scene);
  }

  private _createContainer(): any {
    return this._pixiLayer.createContainer();
  }
}

