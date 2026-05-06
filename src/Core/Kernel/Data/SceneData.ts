import { IScene } from "../GameObjects/IScene";
import { IScreen } from "../../Plugin/IScreen";
export class SceneData {
  private _name: string;
  private _scene: IScene | null;
  private _container: any;

  constructor() {
    this._name = "";
    this._scene = null;
  }

  get name(): string {
    return this._name;
  }

  get scene(): IScene {
    return (this._scene as IScene);
  }

  get container(): any {
    return this._container;
  }

  set name(val: string) {
    this._name = val;
  }

  set scene(val: IScene) {
    this._scene = val;
  }

  set container(val: any) {
    this._container = val;
  }

  public createNew(name: string, scene: IScene): SceneData {
    let sd = new SceneData();
    sd.name = name;
    sd.scene = scene;

    return sd;
  }
}

