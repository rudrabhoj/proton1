import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { ExecTime } from "../../Kernel/Control/ExecTime";
import { Sprite } from "../../Kernel/GameObjects/Sprite";
import { Button } from "../GameItems/Button";
import { Deck } from "../GameItems/Deck";
import { IScene } from "../../Kernel/GameObjects/IScene";
import { ISceneManager } from "../../Plugin/ISceneManager";
import { Background } from "../GameItems/Background";
import {Positions} from "../../Kernel/Data/ScaleMode";



export class CardMode implements IScene {
  private _entityFactory: EntityFactory;
  private _sceneManager: ISceneManager;
  private _back: Button;
  private _execTime: ExecTime;
  private _deck1: Deck;
  private _deck2: Deck;
  private _background: Background;

  constructor(entityFactory: EntityFactory, sceneManager: ISceneManager, execTime: ExecTime,
  button: Button, sprite: Sprite, deck1: Deck, deck2: Deck, background: Background) {
    this._entityFactory = entityFactory;
    this._sceneManager = sceneManager;
    this._execTime = execTime;
    
    this._deck1 = deck1;
    this._deck2 = deck2;

    this._back = button;

    this._background = background;
  }

  public async preload(): Promise<void> {

  }

  public create() {
    //console.log("CardMode Level");
    this._initBackground();
    this._initButtons();
    this._initCards();
    this._startMoveListners();
  }

  public update(dt: number) {
    this._execTime.update();
    this._deck1.update(dt);
    this._deck2.update(dt);
    this._background.update();
  }

  public shutdown() {
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

  private _initCards() {
    this._deck2.init(814);
    this._deck1.init(100);
  }

  private _startMoveListners() {
    this._execTime.addFoo(() => {
      this._moveCard();
    })
    this._execTime.start(1000, 72);
  }

  private _moveCard() {
    let elm = this._deck1.shift();
      if (elm) {
        this._deck2.moveBack(elm);
      }
  }

}

