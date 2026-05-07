import { CoreEntity } from './CoreEntity';
import { Position } from './Component/Position';
import { Display } from './Component/Display';
import { Label } from './Component/Label';
import { IAbstractGameObject } from '../../Plugin/IAbstractGameObject';
import { IScreen } from "../../Plugin/IScreen";
import { ISceneManager } from "../../Plugin/ISceneManager";
import { Input } from './Component/Input';
import { ScaleManager } from '../Control/ScaleManager';
export class Text extends CoreEntity {
  private _label: Label;

  private _screen: IScreen;
  private _sceneManager: ISceneManager;
  private _abstractObject: IAbstractGameObject;

  constructor(position: Position, display: Display, input: Input, label: Label, foreignObject: IAbstractGameObject,
  screen: IScreen, sceneManager: ISceneManager, scaleManager: ScaleManager) {
    super(position, display, input, foreignObject, scaleManager);

    this._label = label;

    this._abstractObject = foreignObject;

    this._screen = screen;
    this._sceneManager = sceneManager;
  }

  get label(): Label {
    return this._label;
  }

  public init(x: number, y: number, text: string, style: any) {
    let fo = this._screen.createText(text, style);

    this._sceneManager.addObject(fo.data);
    this._activate(x, y, fo);

    this._label.init(text, style, fo);

    // Register with ScaleManager so window resize re-runs position+display
    // updates. Without this, text is positioned once (at scene create) and
    // never re-flowed when the viewport ratio changes — it stays at the old
    // computed pixel coords while siblings (Sprite/Graphic) reposition.
    this._scaleManager.addEntity(this);
  }

  public createNew(): Text {
    let pos = this._position.createNew();
    let dis = this._display.createNew();
    let inp = this._input.createNew();
    let lab = this._label.createNew();
    let fo = this._abstractObject.createNew();

    return new Text(pos, dis, inp, lab, fo, this._screen, this._sceneManager, this._scaleManager);
  }
}

