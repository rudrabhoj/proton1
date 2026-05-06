import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { ExecTime } from "../../Kernel/Control/ExecTime";
import { Sprite } from "../../Kernel/GameObjects/Sprite";
import { Button } from "../GameItems/Button";
import { TextImage } from "../GameItems/TextImage";
import { IScene } from "../../Kernel/GameObjects/IScene";
import { ISceneManager } from "../../Plugin/ISceneManager";
import { Background } from "../GameItems/Background";
import {Positions} from "../../Kernel/Data/ScaleMode";


export class MixMode implements IScene {
  private _entityFactory: EntityFactory;
  private _sceneManager: ISceneManager;
  private _back: Button;
  private _background: Background;
  private _textImage: TextImage;
  private _execTime: ExecTime;

  constructor(entityFactory: EntityFactory, execTime: ExecTime, sceneManager: ISceneManager, button: Button, 
  background: Background, textImage: TextImage) {
    this._entityFactory = entityFactory;
    this._execTime = execTime;
    this._sceneManager = sceneManager;

    this._back = button;
    this._textImage = textImage;

    this._background = background;
  }

  public async preload(): Promise<void> {

  }

  public create() {
    //console.log("MixMode Level");
    this._initBackground();
    this._initButtons();
    this._initTextImage();
  }

  public update() {
    this._execTime.update();
    this._background.update();
  }

  public shutdown() {
    this._textImage.shutdown();
    this._background.shutdown();
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

  private _initTextImage() {
    this._textImage.addImages(['Green', 'Orange', 'Pink', 'Red', 'Yellow']);
    this._textImage.addTexts(["My", "Name", "is", "Rawal", "Rudrabhoj", "Singh", "Bhati"]);
    this._textImage.init();

    this._execTime.addFoo(() => {
      this._textImage.showRandom();
    });

    this._execTime.start(2000);
  }

}

