import { CoreEntity } from "../../Kernel/GameObjects/CoreEntity";
export class ScaleManager {
  private _entities: CoreEntity[];

  constructor() {
    this._entities = [];

  }

  public init(onResize: (width: number, height: number) => void) {
    window.addEventListener("resize", () => {
      onResize(document.documentElement.clientWidth, document.documentElement.clientHeight);

      this._onUpdate();
    });
  }

  public addEntity(entity: CoreEntity) {
    this._entities.push(entity);
  }

  // Remove a single entity. Required when an ephemeral entity (e.g. the
  // shop's transient "+amount" sell-refund text) is destroyed mid-scene; if
  // we leave it in the registry, the next window resize will invoke
  // updatePosition on a wrapper whose foreignObject has been destroyed and
  // null-deref on PIXI's nulled _position field.
  public removeEntity(entity: CoreEntity) {
    const i = this._entities.indexOf(entity);
    if (i >= 0) this._entities.splice(i, 1);
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

