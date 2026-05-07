import { PxPoint } from './PxPoint';
import { Pino } from '../../Services/Pino';
import { Text } from 'pixi.js';

export class PxText {
  private _pino: Pino;
  private _pxPoint: PxPoint;
  private _data: Text | null;
  private _scale: PxPoint | null;
  private _anchor: PxPoint | null;
  protected _style: any;
  protected _fill: any;

  constructor(pino: Pino, pxPoint: PxPoint) {
    this._pino = pino;
    this._pxPoint = pxPoint;
    this._data = null;
    this._scale = null;
    this._anchor = null;
  }

  get visible(): boolean {
    return this._data !== null ? this._data.visible : false;
  }

  set visible(visible: boolean) {
    if (this._data) this._data.visible = visible;
  }

  get width(): number {
    return this._data ? this._data.width : -1;
  }

  set width(width: number) {
    if (this._data) this._data.width = width;
  }

  get height(): number {
    return this._data ? this._data.height : -1;
  }

  set height(height: number) {
    if (this._data) this._data.height = height;
  }

  get pivot() {
    if (this._data) return this._data.pivot;
  }

  set pivot(val: any) {
    if (this._data) this._data.pivot = val;
  }

  get style() {
    return this._style;
  }

  set style(style: any) {
    this._style = style;
    if (this._data) {
      this._data.style = style;
      this._fill = style.fill;
    }
  }

  get text(): string {
    return this._data ? String(this._data.text) : "";
  }

  set text(val: string) {
    if (this._data) this._data.text = val;
  }

  get fill() {
    return this._fill;
  }

  set fill(fill: string) {
    this._style.fill = fill;
    this._fill = fill;
    if (this._data) this._data.style = this._style;
  }

  get alpha(): number {
    if (this._data) return this._data.alpha;
    this._pino.warn("cannot return alpha for object that is not initialized!");
    return -1;
  }

  set alpha(alpha: number) {
    if (this._data) this._data.alpha = alpha;
  }

  get anchor(): PxPoint {
    return (this._anchor as PxPoint);
  }

  get scale(): any {
    return this._scale;
  }

  get x(): number {
    if (this._data) return this._data.x;
    this._pino.error("Can not access data before initializing text!");
    return 0;
  }

  set x(xval: number) {
    if (this._data) this._data.x = xval;
    else this._pino.error("Can not access data before initializing text!");
  }

  get y(): number {
    if (this._data) return this._data.y;
    this._pino.error("Can not access data before initializing text!");
    return 0;
  }

  set y(yval: number) {
    if (this._data) this._data.y = yval;
    else this._pino.error("Can not access data before initializing text!");
  }

  get data(): Text {
    if (this._data) return this._data;
    this._pino.error("Can not access data before initializing text!");
    return null as any as Text;
  }

  createNew(): PxText {
    return new PxText(this._pino, this._pxPoint.createNew(1, 1, () => {}, () => {}));
  }

  public init(text: string, style: any = undefined) {
    this._style = style;
    this._fill = style.fill;
    this._data = new Text({ text, style });

    this._scale = this._pxPoint.createNew(1, 1, (xVal: number) => {
      if (this._data) this._data.scale.x = xVal;
    }, (yVal: number) => {
      if (this._data) this._data.scale.y = yVal;
    });

    this._anchor = this._pxPoint.createNew(1, 1, (xVal: number) => {
      if (this._data) this._data.anchor.x = xVal;
    }, (yVal: number) => {
      if (this._data) this._data.anchor.y = yVal;
    });
  }

  addChild(object: any) {
    this.data.addChild(object);
  }

  removeChild(object: any) {
    this.data.removeChild(object);
  }

  public destroy() {
    if (this._data) {
      this._data.destroy();
      this._data = null;
    }
  }
}
