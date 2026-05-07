import { IScene } from "../Kernel/GameObjects/IScene";
export interface ISceneManager {
  init(): void;
  addScene(name: string, scene: IScene): void;
  startScene(name: string): void;
  addObject(obj: any): void;
  removeObject(obj: any): void;
}

