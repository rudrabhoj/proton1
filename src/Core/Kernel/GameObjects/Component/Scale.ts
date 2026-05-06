import { IAbstractGameObject } from "../../../Plugin/IAbstractGameObject";
import { Config } from "../../Control/Config";
import { ScaleMode, Positions, Sizes, ContainerMode } from "../../Data/ScaleMode";

export class Scale {
  private _config: Config;
  private _scaleMode: ScaleMode;
  private _foreignObject: IAbstractGameObject;
  private _abstractObject: IAbstractGameObject;

  private _x: number;
  private _y: number;

  constructor(config: Config, scaleMode: ScaleMode, foreignObject: IAbstractGameObject) {
    this._config = config;
    this._scaleMode = scaleMode;
    this._foreignObject = foreignObject;
    this._abstractObject = foreignObject;

    
    this._x = 1;
    this._y = 1;
  }

  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  get mode(): ScaleMode {
    return this._scaleMode;
  }

  get originalWidth(): number {
    return this._foreignObject.width / this._foreignObject.scale.x;
  }

  get originalHeight(): number {
    return this._foreignObject.height / this._foreignObject.scale.y;
  }

  set x(val: number) {
    this._x = val;
  }

  set y(val: number) {
    this._y = val;
  }

  public init(foreignObject: IAbstractGameObject) {
    this._foreignObject = foreignObject;
  }

  public reverseScale(val: number): number {
    return (val / this._getRatio());
  }

  public resizeX(val: number): number {
    if (this._scaleMode.sizeMode.x == Sizes.fill) {
      return this._getFillXScale();
    } else if (this._scaleMode.sizeMode.x == Sizes.maintain_ratio) {
      return this._foreignObject.scale.y;
    } else {
      return (val * this._x) * this._getRatio();
    }
  }

  public resizeY(val: number): number {
    if (this._scaleMode.sizeMode.y == Sizes.fill) {
      
      return this._getFillYScale();
    } else if (this._scaleMode.sizeMode.y == Sizes.maintain_ratio) {
      return this._foreignObject.scale.x;
    } else {
      return (val * this._y) * this._getRatio();
    }
  }

  public placeX(val: number): number {
    let base = this._getContainerXStart();

    if (this._scaleMode.positionMode.x == Positions.left) {
      //Do nothing
    } else if (this._scaleMode.positionMode.x == Positions.center) {
      base = this._getScreen().x / 2;
    } else {
      base = this._getScreen().x;
    }

    let scaledVal = this._getRatio() * val;

    return base + scaledVal;
  }

  public placeY(val: number): number {
    let base = this._getContainerYStart();

    if (this._scaleMode.positionMode.y == Positions.left) {
      //Do nothing
    } else if (this._scaleMode.positionMode.y == Positions.center) {
      base = this._getScreen().y / 2;
    } else {
      base = this._getScreen().y;
    }

    let scaledVal = this._getRatio() * val;

    return base + scaledVal;
  }


  public createNew(): Scale {
    return new Scale(this._config, this._scaleMode.createNew(), this._abstractObject.createNew());
  }

  private _getFillXScale() {
    let width = this.originalWidth;
    let gameWidth = this._config.displayWidth;

    //console.log("fill x: ", gameWidth / width, this._foreignObject.x);

    return gameWidth / width;
  }

  private _getFillYScale() {
    let height = this.originalHeight;
    let gameHeight = this._config.displayHeight;

    return gameHeight / height;
  }


  private _getContainerXStart(): number {
    if (this._scaleMode.containerMode == ContainerMode.gameplay) {
      let screen = this._getScreen();
      let current = this._getCurrentXY();
      let diff = current.x - screen.x;

      return (diff / 2);
    } else {
      return 0;
    }
  }

  private _getContainerYStart(): number {
    if (this._scaleMode.containerMode == ContainerMode.gameplay) {
      let screen = this._getScreen();
      let current = this._getCurrentXY();
      let diff = current.y - screen.y;

      return diff / 2;
    } else {
      return 0;
    }
  }
  

  private _getScreen(): {x: number, y: number} {
    if (this._scaleMode.containerMode == ContainerMode.gameplay) {
      return this._getContainerXY();
    } else {
      return this._getCurrentXY();
    }
  }

  private _getContainerXY() {
    let original = this._getOriginalXY();
    let ratio = this._getRatio();

    return {x: original.x * ratio, y: original.y * ratio};
  }

  private _getRatio() {
    let original = this._getOriginalXY();
    let current = this._getCurrentXY();


    let ratio1 = current.y / original.y;
    let ratio2 = current.x / original.x;

    if (ratio1 * original.x <= current.x) {
      return ratio1;
    } else {
      return ratio2;
    }
  }


  private _getOriginalXY() {
    return {x: this._config.width, y: this._config.height};
  }

  private _getCurrentXY() {
    return {x: document.documentElement.clientWidth, y: document.documentElement.clientHeight};
  }


}

