import { IAbstractGameObject } from "../../Plugin/IAbstractGameObject";
import { Position } from './Component/Position';
import { Display } from './Component/Display';
import { Input } from './Component/Input';
import { ScaleManager } from '../Control/ScaleManager';
export class CoreEntity {
  protected _position: Position;
  protected _display: Display;
  protected _input: Input;
  protected _foreignObject: IAbstractGameObject;
  protected _scaleManager: ScaleManager;
  private _information: any;

  constructor(position: Position, display: Display, input: Input, foreignObject: IAbstractGameObject,
  scaleManager: ScaleManager) {
    this._position = position;
    this._display = display;
    this._input = input;
    this._foreignObject = foreignObject;
    this._scaleManager = scaleManager;
  }

  //Attach extra information
  get information(): any {
    return this._information;
  }

  get position(): Position {
    return this._position;
  }

  get display(): Display {
    return this._display;
  }

  get input(): Input {
    return this._input;
  }

  get foreignObject(): IAbstractGameObject {
    return this._foreignObject;
  }

  set information(val: any) {
    this._information = val;
  }

  public enableInput() {
    this._input.init(this._foreignObject);
  }

  protected _activate(x: number, y: number, foreignObject: IAbstractGameObject) {
    this._position.init(x, y, foreignObject);
    this._display.init(foreignObject);

    this._foreignObject = foreignObject;
  }
}

