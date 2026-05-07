import { Pino } from "../Services/Pino";
import { IAbstractGameObject } from "./IAbstractGameObject";
//Place holder object allocated by default to avoid IAbstractGameObject | null situations

export class AbstractGameObject implements IAbstractGameObject {
  private _pino: Pino;
  get x(): number {
    this._denyAccess();
    return 0;
  }

  get y(): number {
    this._denyAccess();
    return 0;
  }

  get angle(): number {
    this._denyAccess();
    return 0;
  }

  get visible(): boolean {
    this._denyAccess();
    return true;
  }

  get alpha(): number {
    this._denyAccess();
    return 1;
  }

  get interactive(): boolean {
    this._denyAccess();
    return false;
  }

  get style(): any {
    this._denyAccess();
    return {};
  }

  get text(): string {
    this._denyAccess();
    return "";
  }

  get data(): any {
    this._denyAccess();
    return {};
  }

  get destroy(): any {
    this._denyAccess();
    return {};
  }

  get anchor(): any {
    this._denyAccess();
    return {};
  }

  get width(): number {
    this._denyAccess();
    return 0;
  }

  get height(): number {
    this._denyAccess();
    return 0;
  }

  get scale() {
    this._denyAccess();
    return {x: 1, y: 1};
  }

  get tint(): number {
    this._denyAccess();
    return 1;
  }

  get zIndex(): number {
    this._denyAccess();
    return 0;
  }

  set zIndex(val: number) {
    this._denyAccess();
  }


  set x(val: number) {
    this._denyAccess();
  }

  set y(val: number) {
    this._denyAccess();
  }

  set angle(val: number) {
    this._denyAccess();
  }

  set visible(val: boolean) {
    this._denyAccess();
  }

  set alpha(val: number) {
    this._denyAccess();
  }

  set style(val: any) {
    this._denyAccess();
  }

  set interactive(val: boolean) {
    this._denyAccess();
  }

  set text(val: string) {
    this._denyAccess();
  }

  set data(val: any) {
    this._denyAccess();
  }

  set destroy(val: any) {
    this._denyAccess();
  }

  set width(val: number) {
    this._denyAccess();
  }

  set height(val: number) {
    this._denyAccess();
  }

  set scale(val: any) {
    this._denyAccess();
  }

  set tint(val: number) {
    this._denyAccess();
  }


  constructor(pino: Pino) {
    this._pino = pino;
  }

  public createNew(): IAbstractGameObject {
    return new AbstractGameObject(this._pino);
  }

  public on(eventName: string, foo: Function) {

  }

  private _denyAccess() {
    this._pino.error("Can not access the AbstractGameObject!");
  }
}

