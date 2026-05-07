import { Pino } from "../../Services/Pino";
import { FunObj } from "../Data/FunObj";
export class Loop {
  private _pino: Pino;
  private _funObj: FunObj;
  private _fList: FunObj[];
  private _boundExecuteAll: any;
  private _paused: number;
  private _lastTime: number;
  private _delay: number;
  private _oldDelay: number;

  constructor(pino: Pino, funObj: FunObj) {
    this._pino = pino;
    this._funObj = funObj;

    this._fList = [];
    this._paused = 0;
    this._lastTime = 0;
    this._delay = 0;
    this._oldDelay = 0;

    this._boundExecuteAll = this._executeAll.bind(this);
  }

  public addFunction(f: Function, context: any) {
    let fObj: FunObj | null = this._getFunObj(f, context);

    if (fObj == null) {
      let o = this._newFunObj(f, context);
      this._fList.push(o);
    } else {
      this._pino.error(`trying to add function ${String(f)} twice with identical context: ${String(context)}`);
    }
  }

  public removeFunction(f: Function, context: any) {
    let i = this._getFunObj(f, context);

    if (i != null) {
      this._fList.splice(this._fList.indexOf(i), 1);
    } else {
      this._pino.warn(`Did not find loop listener with context ${String(context)}, so cannot remove`);
    }
  }

  public start(): void {
    window.requestAnimationFrame(this._boundExecuteAll);
  }

  private _executeAll(time: number) {

    for (let c = 0; c < this._fList.length; c++) {
      this._fList[c].execute(time - this._delay);
    }

    window.requestAnimationFrame(this._boundExecuteAll);
  }

  private _getFunObj(f: Function, context: any): FunObj | null {
    for (let c = 0; c < this._fList.length; c++) {
      if (f == this._fList[c].function && this._fList[c].context == context) return this._fList[c];
    }

    this._pino.warn(`Did not find loop listener with context ${String(context)}`);
    return null;
  }

  private _newFunObj(f: Function, context: any): FunObj {
    let obj = this._funObj.createNew();
    obj.init(f, context);

    return obj;
  }

  private _pauseAll() {
    this._paused = 2;
  }

  private _resumeAll() {
    this._paused = 0;
  }
}

