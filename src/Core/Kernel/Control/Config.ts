export class Config {
  constructor() {

  }

  get width(): number {
    return 1080;
  }

  get height(): number {
    return 1920;
  }

  get displayWidth(): number {
    return document.documentElement.clientWidth;
  }

  get displayHeight(): number {
    return document.documentElement.clientHeight;
  }

  get showFPS(): boolean {
    return true;
  }
}

