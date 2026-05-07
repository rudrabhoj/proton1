import { Resource } from "../Kernel/Data/Resource";
export interface IGfxLoader {
  addResources(resList: Resource[]): void;
  download(onProgress: Function, onComplete: Function): Promise<void>;
}
