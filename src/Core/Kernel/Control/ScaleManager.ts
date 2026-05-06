import { CoreEntity } from "../../Kernel/GameObjects/CoreEntity";
export class ScaleManager {
  private _entities: CoreEntity[];

  constructor() {
    this._entities = [];

  }

  public init(renderer: any) {
    window.addEventListener("resize", () => {
      renderer.resize(document.documentElement.clientWidth, document.documentElement.clientHeight);

      this._onUpdate();
    });
  }

  public addEntity(entity: CoreEntity) {
    this._entities.push(entity);
  }

  public clearEntities() {
    this._entities = [];
  }

  private _onUpdate() {
    for (let c = 0; c < this._entities.length; c++) {
      let ent = this._entities[c];
      ent.position.updatePosition();
      ent.display.updateScale();
    }
  }
}

