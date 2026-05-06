export class ExecTime {
  private _fooList: Function[];
  private _lastExec: number;
  private _maxExec: number;
  private _time: number;
  private _completeExecutions: number;

  constructor() {
    this._fooList = [];
    this._lastExec = 0;
    this._maxExec = -1;
    this._time = 200;
    this._completeExecutions = 0;
  }

  public addFoo(foo: Function) {
    this._fooList.push(foo);
  }

  public start(time: number, maxExecutions: number = -1) {
    this._lastExec = new Date().getTime();
    this._maxExec = maxExecutions;
    this._time = time;
    this._completeExecutions = 0;

    this._tryExecution();
  }

  public update() {
    if (this._lastExec > 0) {
      let currentTime = new Date().getTime();

      if (currentTime - this._lastExec >= this._time) this._tryExecution();
    }
  }

  private _tryExecution() {
    if (this._maxExec == -1 || this._completeExecutions < this._maxExec) {
      
      this._completeExecutions++;
      this._lastExec = new Date().getTime();

      this._executeAll();
    }
  }

  private _executeAll() {
    for (let c = 0; c < this._fooList.length; c++) {
      let foo = this._fooList[c];
      foo();
    }
  }
}

