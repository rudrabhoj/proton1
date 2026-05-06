import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { Sprite } from "../../Kernel/GameObjects/Sprite";
import { Button } from "../GameItems/Button";
import { IScene } from "../../Kernel/GameObjects/IScene";
import { ISceneManager } from "../../Plugin/ISceneManager";
import { Background } from "../GameItems/Background";
import {Positions} from "../../Kernel/Data/ScaleMode";
import { ParticleSystem } from "../../Kernel/Control/ParticleSystem";
export class FireMode implements IScene {
  private _entityFactory: EntityFactory;
  private _sceneManager: ISceneManager;
  private _back: Button;
  private _background: Background;
  private _particleSystem: ParticleSystem;

  constructor(entityFactory: EntityFactory, sceneManager: ISceneManager, button: Button, background: Background,
  particleSystem: ParticleSystem) {
    this._entityFactory = entityFactory;
    this._sceneManager = sceneManager;
    this._particleSystem = particleSystem;

    this._back = button;

    this._background = background;
  }

  public async preload(): Promise<void> {

  }

  public create() {
    //console.log("FireMode Level");
    this._initBackground();
    this._initButtons();
    
    this._addFire();
    this._addCig();
  }

  public update(dt: number) {
    //console.log("dt: ", dt);

    this._particleSystem.update(dt);
    this._background.update();
  }

  public shutdown() {
    this._background.shutdown();
    this._particleSystem.shutdown();
  }

  private _addCig() {
    let cig = this._entityFactory.sprite(540, 960, 'main', 'cig');
    cig.position.anchorX = 0.5;
    cig.position.anchorY = 0.5;
    cig.position.fitInsideContainer(true);
  }

  //Fire works best with max 60 particles on screen.
  //Can change maxParticle to 10, and emitBurst to 10/6 to get a smaller less attractive but still working flame
  private _addFire() {
    let config = {
      x: 540,
      y: 720,
      maxParticle: 60,
      sheet: 'main',
      frame: 'Fire',
      scale: {start: {x: 0.3, y: 0.3}, end: {x: 1.8, y: 2.1}, varianceX: {min: 1, max: 1}, varianceY: {min: 1, max: 1}},
      tint: {start: {r: 255, g: 241, b: 145}, end: {r: 255, g: 132, b: 36}},
      alpha: {start: 1, end: 0.15},
      angle: {start: 0, end: 65},
      motion: {velocity: {x: 2/1.5, y: -14/1.5}, varianceX: {min: -1.5, max: 1.5}, varianceY: {min: 1, max: 2}},
      life: 300,
      emitTime: 50,
      emitBurst: 60/6,
      varianceMultiple: {min: -1.25, max: 1.25}
    };

    this._particleSystem.init(config);
  }

  private _initBackground() {
    this._background.init('main');
  }

  private  _initButtons() {
    this._back.init(-100, 150, 'back_btn', () => {
      this._sceneManager.startScene('Menu');
    });
    this._back.sprite.position.anchorX = 1;
    this._back.sprite.position.anchorY = 0.5;
    this._back.sprite.position.fitInsideContainer(false);
    this._back.sprite.position.setScaleMode(Positions.right, Positions.left, 1);
  }

}

