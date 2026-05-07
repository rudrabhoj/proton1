import { CoreEntity } from './CoreEntity';
import { Position } from './Component/Position';
import { Display } from './Component/Display';
import { IAbstractGameObject } from '../../Plugin/IAbstractGameObject';
import { IGraphics } from '../../Plugin/IGraphics';
import { IScreen } from "../../Plugin/IScreen";
import { ISceneManager } from "../../Plugin/ISceneManager";
import { Input } from './Component/Input';
import { ScaleManager } from '../Control/ScaleManager';
export class Graphic extends CoreEntity {
  private _screen: IScreen;
  private _sceneManager: ISceneManager;
  private _abstractObject: IAbstractGameObject;

  constructor(position: Position, display: Display, input: Input, scaleManager: ScaleManager,
  foreignObject: IAbstractGameObject, screen: IScreen, sceneManager: ISceneManager) {
    super(position, display, input, foreignObject, scaleManager);

    this._abstractObject = foreignObject;
    this._screen = screen;
    this._sceneManager = sceneManager;
  }

  get graphics(): IGraphics {
    return this._foreignObject as unknown as IGraphics;
  }

  public init(x: number, y: number) {
    let fo = this._screen.createGraphics();

    this._sceneManager.addObject(fo.data);
    this._activate(x, y, fo as IAbstractGameObject);

    this._scaleManager.addEntity(this);
  }

  public createNew(): Graphic {
    let pos = this._position.createNew();
    let dis = this._display.createNew();
    let inp = this._input.createNew();
    let fo = this._abstractObject.createNew();

    return new Graphic(pos, dis, inp, this._scaleManager, fo, this._screen, this._sceneManager);
  }
}
