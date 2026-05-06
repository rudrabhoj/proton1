import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { CoreEntity } from "../../Kernel/GameObjects/CoreEntity";
import { TweenObject } from "../../Plugin/ITweenJs";
import { Sprite } from "../../Kernel/GameObjects/Sprite";
import { Text } from "../../Kernel/GameObjects/Text";
export class TextImage {
  private _entityFactory: EntityFactory;
  private _imageEntities: Sprite[];
  private _textEntities: Text[];
  private _imageList: string[];
  private _textList: string[];

  private _positions: {x: number, y: number}[];
  private _maxEntities: number;

  constructor(entityFactory: EntityFactory) {
    this._imageEntities = [];
    this._textEntities = [];
    this._imageList = [];
    this._textList = [];

    this._positions = [];
    this._maxEntities = 3;


    for (let c = 0; c < this._maxEntities; c++) {
      this._positions.push({x: 180 + (c * 360), y: 960});
    }

    this._entityFactory = entityFactory;
  }

  public showRandom() {
    this._resetAll();

    let width = 0;

    for (let c = 0; c < this._maxEntities; c++) {
      width += this._showEntity(c, this._rnd(1, 2), width) as number;
    }
  }

  public init() {
    this._allocateEntities();
  }

  public shutdown() {
    this._clearOld();
  }

  private _allocateEntities() {
    for (let c = 0; c < this._maxEntities; c++) {
      let img = this._entityFactory.sprite(-5000, -5000, 'main', this._imageList[0]);
      this._imageEntities.push(img);

      let txt = this._entityFactory.text(-5000, -5000, 'None', {});
      this._textEntities.push(txt);
    }
  }

  private _resetAll() {
    this._resetObjects(this._imageEntities);
    this._resetObjects(this._textEntities);
  }

  private _clearOld() {
    this._clearObjects(this._imageEntities);
    this._clearObjects(this._textEntities);

    this._imageEntities = [];
    this._textEntities = [];
  }

  private _clearObjects(arr: CoreEntity[]) {
    for (let c = 0; c < arr.length; c++) {
      let entity = arr[c];
      entity.display.destroy();
    }
  }

  private _resetObjects(arr: CoreEntity[]) {
    for (let c = 0; c < arr.length; c++) {
      let entity = arr[c];
      entity.position.x = -5000;
      entity.position.y = -5000;
    }
  }

  private _showEntity(position: number, form: number, width: number = 0) {
    if (form == 1) {
      let sprNum = this._rnd(0, this._imageList.length - 1);
      let sprName = this._imageList[sprNum];
      
      let entity = this._imageEntities.shift();
      if (entity) {
        this._imageEntities.push(entity);

        entity.display.updateTexture('main', sprName);
        entity.position.x = this._positions[position].x;
        entity.position.y = this._positions[position].y;
        entity.position.anchorX = 0.5;
        entity.position.anchorY = 0.5;

        return entity.display.width;
      }
    } else {
      let txtNum = this._rnd(0, this._textList.length -1);
      let txt = this._textList[txtNum];
      let fnSize = this._rnd(45, 85);

      let txtEntity = this._textEntities.shift();
      if (txtEntity) {
        this._textEntities.push(txtEntity);

        txtEntity.position.x = this._positions[position].x;
        txtEntity.position.y = this._positions[position].y;
        txtEntity.position.anchorX = 0.5;
        txtEntity.position.anchorY = 0.5;
        txtEntity.label.text = txt;
        txtEntity.label.style = {fill: 'white', fontSize: fnSize};

        return txtEntity.display.width;
      }
    }
  }

  public addImages(imgList: string[]) {
    for (let c = 0; c < imgList.length; c++) {
      this._imageList.push(imgList[c]);
    }
  }

  public addTexts(txtList: string[]) {
    for (let c = 0; c < txtList.length; c++) {
      this._textList.push(txtList[c]);
    }
  }

  private _rnd(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.ceil(max);

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

