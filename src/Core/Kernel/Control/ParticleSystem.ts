import { EntityFactory } from "../GameObjects/EntityFactory";
import { Sprite } from "../GameObjects/Sprite";
import { ITweenJs } from "../../Plugin/ITweenJs";
export type Vector = {
  x: number,
  y: number
}

export type RGB = {
  r: number,
  g: number,
  b: number
}

export type Information = {birth: number, scale: {start: Vector, end: Vector}, velocity: Vector,
alpha: {start: number, end: number}, tint: {start: RGB, end: RGB}, angle: {start: number, end: number}};

export type ParticleConfig = {
  x: number,
  y: number,
  maxParticle: number,
  sheet: string,
  frame: string,
  scale: {start: Vector, end: Vector, varianceX: {min: number, max: number}, varianceY: {min: number, max: number}},
  tint: {start: RGB, end: RGB},
  angle: {start: number, end: number},
  alpha: {start: number, end: number},
  motion: {velocity: Vector, varianceX: {min: number, max: number}, varianceY: {min: number, max: number}},
  life: number,
  emitTime: number,
  emitBurst: number
}

export class ParticleSystem {
  private _entityFactory: EntityFactory;

  private _dead: Sprite[];
  private _active: Sprite[];

  private _config: ParticleConfig;
  private _timeElapsed: number;
  private _timeStart: number;

  constructor(entityFactory: EntityFactory) {
    this._entityFactory = entityFactory;
    this._timeElapsed = 0;
    this._timeStart = 0;

    this._dead = [];
    this._active = [];

    this._config = {
      x: 0,
      y: 0,
      maxParticle: 10,
      sheet: 'main',
      frame: 'test',
      alpha: {start: 1, end: 0.15},
      angle: {start: 0, end: 25},
      scale: {start: {x: 0.25, y: 0.25}, end: {x: 1.25, y: 1.25}, varianceX: {min: -1.35, max: 1.35}, varianceY: {min: -1.35, max: 1.35}},
      tint: {start: {r: 0, g: 0, b: 0}, end: {r: 0, g: 0, b: 0}},
      motion: {velocity: {x: 2, y: 3}, varianceX: {min: -1.35, max: 1.35}, varianceY: {min: -1.35, max: 1.35}},
      life: 3000,
      emitTime: 1000,
      emitBurst: 3,
    }
  }

  public init(config: ParticleConfig) {
    this._config = config;

    this._allocate(this._config.sheet, this._config.frame, this._config.maxParticle);
  }

  public update(delta: number) {
    if (this._timeStart == 0) this._timeStart = Date.now();

    this._timeElapsed = Date.now() - this._timeStart;

    this._tryEmit();
    this._animate();
  }

  public shutdown() {
    this._loadDefaults();
  }

  private _tryEmit() {
    if (this._timeElapsed >= this._config.emitTime) {
      this._timeStart = Date.now();

      this._emit();
    }
  }

  private _emit() {
    for (let c = 0; c < this._config.emitBurst; c++) {
      if (this._dead.length > 0) this._makeAlive();
    }
  }

  private _animate() {
    let currentTime = Date.now();

    for (let c = 0; c < this._active.length; c++) {
      let particle = this._active[c];
      let info = (particle.information as Information);
      
      let age =  currentTime - info.birth;

      if (age <= this._config.life) {
        this._moveParticle(particle, age);
        this._scaleParticle(particle, age);
        this._scaleAlpha(particle, age);
        this._scaleTint(particle, age);
        this._scaleAngle(particle, age);
      } else {
        this._recycle(particle);
      }
    }
  }

  private _moveParticle(particle: Sprite, age: number) {
    let info = (particle.information as Information);
    let tenthAge = age / 10; //to speed down a bit

    particle.position.x = this._config.x + (info.velocity.x * tenthAge);
    particle.position.y = this._config.y + (info.velocity.y * tenthAge);
  }

  private _scaleParticle(particle: Sprite, age: number) {
    let info = (particle.information as Information);

    let startX = info.scale.start.x;
    let startY = info.scale.start.y;
    let endX = info.scale.end.x;
    let endY = info.scale.end.y;


    particle.display.scaleX = this._getCurrentValue(startX, endX, age, this._config.life);
    particle.display.scaleX = this._getCurrentValue(startY, endY, age, this._config.life);
  }

  private _scaleAlpha(particle: Sprite, age: number) {
    let info = (particle.information as Information);
    let debugMode = false;

    if (((particle as any)).debug) debugMode = true;

    particle.display.alpha = this._getCurrentValue(info.alpha.start, info.alpha.end, age, this._config.life);
  }

  private _scaleTint(particle: Sprite, age: number) {
    let info = (particle.information as Information);
    particle.display.tint = this._getCurrentValueRGB(info.tint.start, info.tint.end, age, this._config.life);
  }

  private _scaleAngle(particle: Sprite, age: number) {
    let info = (particle.information as Information);
    particle.position.angle = this._getCurrentValue(info.angle.start, info.angle.end, age, this._config.life);
  }

  private _getCurrentValue(start: number, end: number, age: number, life: number) {
    let diff = end - start;
    let agePerc = age / life;

    return start + (diff * agePerc);
  }

  private _getCurrentValueRGB(start: RGB, end: RGB, age: number, life: number): number {
    let r = this._getCurrentValue(start.r, end.r, age, life);
    let g = this._getCurrentValue(start.g, end.g, age, life);
    let b = this._getCurrentValue(start.b, end.b, age, life);

    let target = {r: r, g: g, b: b};

    //console.log("Hex Code: '%s', rgb: ", this._rgbToHex(target), target);

    return Number(this._rgbToHex(target));
  }

  private _rgbToHex(color: RGB) {
    let r = parseInt((color.r as any)).toString(16);
    let g = parseInt((color.g as any)).toString(16);
    let b = parseInt((color.b as any)).toString(16);
  
    if (r.length == 1)
      r = "0" + r;
    if (g.length == 1)
      g = "0" + g;
    if (b.length == 1)
      b = "0" + b;
  
    return "0x" + r + g + b;
  }


  private _allocate(sheet: string, frame: string, max: number) {
    for (let c = 0; c < max; c++) {
      let particle = this._entityFactory.sprite(0, 0,  sheet, frame);
      this._moveToDeath(particle);
      this._dead.push(particle)

      if (c == 0) ((particle as any)).debug = true;
    }
  }

  private _recycle(particle: Sprite) {
    let index = this._active.indexOf(particle);
    if (index > -1) {
      this._active.splice(index, 1);

      this._moveToDeath(particle);

      this._dead.push(particle);
    }
  }

  private _makeAlive(): Sprite | null {
    let asset = this._dead.shift();

    if (asset) {
      
      this._addInformation(asset);
      this._moveToInitial(asset);

      this._active.push(asset);
      return asset;
    } else {
      return null;
    }
  }

  private _moveToDeath(particle: Sprite) {
    particle.position.x = 0;
    particle.position.y = 0;
    particle.display.visible = false;
  }

  private _moveToInitial(particle: Sprite) {
    particle.position.x = this._config.x;
    particle.position.y = this._config.y;
    particle.display.visible = true;
    particle.display.scaleX = 1;
    particle.display.scaleY = 1;
  }

  private _addInformation(particle: Sprite) {
    if (this._config) {
      particle.information = {
        birth: Date.now(),
        scale: {
          start: {
            x: this._config.scale.start.x * this._randomize(this._config.scale.varianceX),
            y: this._config.scale.start.y * this._randomize(this._config.scale.varianceY)
          },
          end: {
            x: this._config.scale.end.x * this._randomize(this._config.scale.varianceX),
            y: this._config.scale.end.y * this._randomize(this._config.scale.varianceY)
          }
        },
        velocity: {
          x: this._config.motion.velocity.x * this._randomize(this._config.motion.varianceX),
          y: this._config.motion.velocity.y * this._randomize(this._config.motion.varianceY)
        },
        alpha: {start: this._config.alpha.start, end: this._config.alpha.end},
        tint: {start: this._config.tint.start, end: this._config.tint.end},
        angle: {start: this._config.angle.start, end: this._config.angle.end}
      } as Information;
    }

    ////console.log("velocity y: ", particle.information.velocity.y, this._config.motion.varianceY);
  }


  private _loadDefaults() {
    this._timeElapsed = 0;
    this._timeStart = 0;

    this._dead = [];
    this._active = [];

    this._config = {
      x: 0,
      y: 0,
      maxParticle: 10,
      sheet: 'main',
      frame: 'test',
      alpha: {start: 1, end: 0.15},
      angle: {start: 0, end: 25},
      scale: {start: {x: 0.25, y: 0.25}, end: {x: 1.25, y: 1.25}, varianceX: {min: -1.35, max: 1.35}, varianceY: {min: -1.35, max: 1.35}},
      tint: {start: {r: 0, g: 0, b: 0}, end: {r: 0, g: 0, b: 0}},
      motion: {velocity: {x: 2, y: 3}, varianceX: {min: -1.35, max: 1.35}, varianceY: {min: -1.35, max: 1.35}},
      life: 3000,
      emitTime: 1000,
      emitBurst: 3,
    }
  }

  private _randomize(val: {min: number, max: number}) {
    let num = 0;

    while (true) {
      num = this._rnd((val.min * 1000), (val.max * 1000));

      if (num != 0) break;
    }

    return num / 1000;
  }

  private _rnd(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.ceil(max);

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

