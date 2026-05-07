export class Resource {
  private _name: string;
  private _url: string;
  private _family: string | null;

  constructor() {
    this._name = "";
    this._url = "";
    this._family = null;
  }

  get name(): string {
    return this._name;
  }

  get url(): string {
    return this._url;
  }

  get family(): string | null {
    return this._family;
  }

  set name(val: string) {
    this._name = val;
  }

  set url(val: string) {
    this._url = val;
  }

  set family(val: string | null) {
    this._family = val;
  }

  public createNew(name: string, url: string, family: string | null = null): Resource {
    let res = new Resource();
    res.name = name;
    res.url = url;
    res.family = family;

    return res;
  }

  public createArray(arr: {name: string, url: string, family?: string}[]): Resource[] {
    let snd: Resource[] = [];

    for (let c = 0; c < arr.length; c++) {
      let res = this.createNew(arr[c].name, arr[c].url, arr[c].family ?? null);
      snd.push(res);
    }

    return snd;
  }
}

