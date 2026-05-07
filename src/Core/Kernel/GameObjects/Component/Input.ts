import { IAbstractGameObject } from "../../../Plugin/IAbstractGameObject";
export class Input {
  private _onMouseUp: Function[];

  private _foreignObject: IAbstractGameObject;

  private _abstractObject: IAbstractGameObject;

  constructor(foreignObject: IAbstractGameObject) {
    this._foreignObject = foreignObject;
    this._abstractObject = foreignObject;

    this._onMouseUp = [];
  }

  public addMouseUp(foo: Function) {
    this._onMouseUp.push(foo);
  }

  public init(foreignObject: IAbstractGameObject) {
    this._foreignObject = foreignObject;

    this._foreignObject.interactive = true;

    // pointertap fires only when pointerdown + pointerup happened on the
    // SAME element (PIXI federated event). Filter to button === 0 so
    // right-click and middle-click don't activate.
    this._foreignObject.on('pointertap', (e: any) => {
      if (e && typeof e.button === 'number' && e.button !== 0) return;
      this._executeAll();
    })
  }

  public createNew(): Input {
    return new Input(this._abstractObject.createNew());
  }

  private _executeAll() {
    for (let c = 0; c < this._onMouseUp.length; c++) {
      let foo = this._onMouseUp[c];
      foo();
    }
  }
}

