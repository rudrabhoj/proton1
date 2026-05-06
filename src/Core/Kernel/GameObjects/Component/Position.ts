import { IAbstractGameObject } from "../../../Plugin/IAbstractGameObject";
import { Scale } from "./Scale";
import {PositionMode, ContainerMode, Positions} from "../../Data/ScaleMode";

export class Position {
  private _scale: Scale;

  private _x: number;
  private _y: number;
  private _anchorX: number;
  private _anchorY: number;
  private _angle: number;
  private _scaleMode: PositionMode;
  private _containerMode: ContainerMode;

  private _foreignObject: IAbstractGameObject;
  private _abstractObject: IAbstractGameObject;

  constructor(foreignObject: IAbstractGameObject, scale: Scale) {
    this._foreignObject = foreignObject;
    this._abstractObject  = foreignObject;
    this._scale = scale;

    this._x = 0;
    this._y = 0;
    this._angle = 0;
    this._anchorX = 0;
    this._anchorY = 0;
    this._scaleMode = {x: Positions.left, y: Positions.left, modifier: 1};
    this._containerMode = ContainerMode.gameplay;
  }

  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  get angle(): number {
    return this._angle;
  }

  set x(val: number) {
    this._x = val;
    this._updatePosition();
  }

  set y(val: number) {
    this._y = val;
    this._updatePosition();
  }

  set angle(val: number) {
    this._angle = val;
    this._updatePosition();
  }

  set anchorX(val: number) {
    this._anchorX = val;
    this._updatePosition();
  }

  set anchorY(val: number) {
    this._anchorY = val;
    this._updatePosition();
  }

  public setScaleMode(x: Positions, y: Positions, modifier: number) {
    this._scaleMode.x = x;
    this._scaleMode.y = y;
    this._scaleMode.modifier = modifier;

    this._updatePosition();
  }

  public fitInsideContainer(val: boolean) {
    if (val) {
      this._containerMode = ContainerMode.gameplay;
    } else {
      this._containerMode = ContainerMode.global;
    }

    this._updatePosition();
  }

  public init(x: number, y: number, foreignObject: IAbstractGameObject) {
    this._foreignObject = foreignObject;

    this.x = x;
    this.y = y;
  }

  public createNew(): Position {
    return new Position(this._abstractObject.createNew(), this._scale.createNew());
  }

  public updatePosition() {
    this._updatePosition();
  }

  private _updatePosition() {
    this._scale.mode.positionMode = this._scaleMode;
    this._scale.mode.containerMode = this._containerMode;

    this._foreignObject.x = this._scale.placeX(this._x);
    this._foreignObject.y = this._scale.placeY(this._y);
    this._foreignObject.angle = this._angle;
    this._foreignObject.anchor.set(this._anchorX, this._anchorY);
  }
  
}

