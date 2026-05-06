export class Resource {
  private _name: string;
  private _url: string;

  constructor() {
    this._name = "";
    this._url = "";
  }

  get name(): string {
    return this._name;
  }

  get url(): string {
    return this._url;
  }

  set name(val: string) {
    this._name = val;
  }

  set url(val: string) {
    this._url = val;
  }

  public createNew(name: string, url: string): Resource {
    let res = new Resource();
    res.name = name;
    res.url = url;

    return res;
  }

  public createArray(arr: {name: string, url: string}[]): Resource[] {
    let snd: Resource[] = [];

    for (let c = 0; c < arr.length; c++) {
      let res = this.createNew(arr[c].name, arr[c].url);
      snd.push(res);
    }

    return snd;
  }
}

