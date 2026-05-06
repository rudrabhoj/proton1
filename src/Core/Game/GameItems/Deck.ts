import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { TweenObject } from "../../Plugin/ITweenJs";
import { Sprite } from "../../Kernel/GameObjects/Sprite";
export class Deck {
  private _entityFactory: EntityFactory;
  private _cards: Sprite[];
  private _tweens: TweenObject[];

  private _maxCards: number;
  private _cardHeight: number;
  private _cardStart: number;
  private _cardGap: number;

  constructor(entityFactory: EntityFactory) {
    this._entityFactory = entityFactory;

    this._cards = [];
    this._tweens = [];
    this._maxCards = 72;
    this._cardHeight = 232;
    this._cardStart = 250;
    this._cardGap = 7;
  }

  public init(x: number) {
    this._cards = [];
    this._tweens = [];
    
    this._populateCards(x);
  }

  public shift(): Sprite | undefined {
    return this._cards.shift();
  }

  public moveBack(card: Sprite) {
    let xy = this._getNextXY();
    let tw =  this._entityFactory.tween(card.position, {x: xy.x, y: xy.y}, 2000, () => {
      let twIndex = this._tweens.indexOf(tw);
      this._tweens.splice(twIndex, 1);
    });

    tw.start();

    this._tweens.push(tw);

    this._cards.push(card);
  }

  public update(dt: number) {
    for (let c = 0; c < this._tweens.length; c++) {
      let to = this._tweens[c];
      //console.log("Updating ", dt);
      to.update(dt);
    }
  }

  private _populateCards(x: number) {
    for (let c = 0; c < this._maxCards; c++) {
      let cardName = "card_" + this._rnd(1, 4);

      let card = this._entityFactory.sprite(x, this._cardStart + (c * this._cardGap), 'main', cardName);

      this._cards.push(card);
    }
  }

  private _getNextXY(): {x: number, y: number} {
    let x = this._cards[0].position.x;
    let y = this._cardStart + (this._cards.length * this._cardGap);

    return {x: x, y: y};
  }

  private _rnd(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.ceil(max);

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

}

