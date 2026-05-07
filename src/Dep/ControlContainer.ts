import SmartDepend from '../Dep/SmartDepend.js';

import { CardWorld } from '../Core/CardWorld.js';
import { Background } from '../Core/Game/GameItems/Background.js';
import { Button } from '../Core/Game/GameItems/Button.js';
import { Deck } from '../Core/Game/GameItems/Deck.js';
import { FPSCounter } from '../Core/Game/GameItems/FPSCounter.js';
import { TextImage } from '../Core/Game/GameItems/TextImage.js';
import { CardMode } from '../Core/Game/Scene/CardMode.js';
import { FireMode } from '../Core/Game/Scene/FireMode.js';
import { Loading } from '../Core/Game/Scene/Loading.js';
import { Menu } from '../Core/Game/Scene/Menu.js';
import { MixMode } from '../Core/Game/Scene/MixMode.js';
import { Config } from '../Core/Kernel/Control/Config.js';
import { ExecTime } from '../Core/Kernel/Control/ExecTime.js';
import { Loop } from '../Core/Kernel/Control/Loop.js';
import { ParticleSystem } from '../Core/Kernel/Control/ParticleSystem.js';
import { ScaleManager } from '../Core/Kernel/Control/ScaleManager.js';
import { FunObj } from '../Core/Kernel/Data/FunObj.js';
import { Resource } from '../Core/Kernel/Data/Resource.js';
import { ScaleMode } from '../Core/Kernel/Data/ScaleMode.js';
import { SceneData } from '../Core/Kernel/Data/SceneData.js';
import { Display } from '../Core/Kernel/GameObjects/Component/Display.js';
import { Input } from '../Core/Kernel/GameObjects/Component/Input.js';
import { Label } from '../Core/Kernel/GameObjects/Component/Label.js';
import { Position } from '../Core/Kernel/GameObjects/Component/Position.js';
import { Scale } from '../Core/Kernel/GameObjects/Component/Scale.js';
import { CoreEntity } from '../Core/Kernel/GameObjects/CoreEntity.js';
import { CoreScene } from '../Core/Kernel/GameObjects/CoreScene.js';
import { EntityFactory } from '../Core/Kernel/GameObjects/EntityFactory.js';
import { Sprite } from '../Core/Kernel/GameObjects/Sprite.js';
import { Text } from '../Core/Kernel/GameObjects/Text.js';
import { AbstractGameObject } from '../Core/Plugin/AbstractGameObject.js';
import { GfxLoader } from '../Core/Plugin/GfxLoader.js';
import { PixiLayer } from '../Core/Plugin/Pixi/PixiLayer.js';
import { PxGraphics } from '../Core/Plugin/Pixi/PxGraphics.js';
import { PxPoint } from '../Core/Plugin/Pixi/PxPoint.js';
import { PxText } from '../Core/Plugin/Pixi/PxText.js';
import { SceneManager } from '../Core/Plugin/SceneManager.js';
import { Screen } from '../Core/Plugin/Screen.js';
import { TweenJs } from '../Core/Plugin/TweenJs.js';
import { Pino } from '../Core/Services/Pino.js';




class ControlContainer {
  private _smartDepend: SmartDepend;

  protected _CardWorld: any;
protected _Background: any;
protected _Button: any;
protected _Deck: any;
protected _FPSCounter: any;
protected _TextImage: any;
protected _CardMode: any;
protected _FireMode: any;
protected _Loading: any;
protected _Menu: any;
protected _MixMode: any;
protected _Config: any;
protected _ExecTime: any;
protected _Loop: any;
protected _ParticleSystem: any;
protected _ScaleManager: any;
protected _FunObj: any;
protected _Resource: any;
protected _ScaleMode: any;
protected _SceneData: any;
protected _Display: any;
protected _Input: any;
protected _Label: any;
protected _Position: any;
protected _Scale: any;
protected _CoreEntity: any;
protected _CoreScene: any;
protected _EntityFactory: any;
protected _Sprite: any;
protected _Text: any;
protected _AbstractGameObject: any;
protected _GfxLoader: any;
protected _PixiLayer: any;
protected _PxGraphics: any;
protected _PxPoint: any;
protected _PxText: any;
protected _SceneManager: any;
protected _Screen: any;
protected _TweenJs: any;
protected _Pino: any;


  constructor() {
    this._smartDepend = new SmartDepend();

    this._addModules();
    this._addDepends();
  }

  public getMain(): CardWorld {
    const spEntity = this._smartDepend.resolve(this._CardWorld) as CardWorld;

    return spEntity;
  }

  private _addModules() {
    this._CardWorld = this._smartDepend.addModule(CardWorld, false);
this._Background = this._smartDepend.addModule(Background, false);
this._Button = this._smartDepend.addModule(Button, false);
this._Deck = this._smartDepend.addModule(Deck, false);
this._FPSCounter = this._smartDepend.addModule(FPSCounter, false);
this._TextImage = this._smartDepend.addModule(TextImage, false);
this._CardMode = this._smartDepend.addModule(CardMode, false);
this._FireMode = this._smartDepend.addModule(FireMode, false);
this._Loading = this._smartDepend.addModule(Loading, false);
this._Menu = this._smartDepend.addModule(Menu, false);
this._MixMode = this._smartDepend.addModule(MixMode, false);
this._Config = this._smartDepend.addModule(Config, false);
this._ExecTime = this._smartDepend.addModule(ExecTime, false);
this._Loop = this._smartDepend.addModule(Loop, true);
this._ParticleSystem = this._smartDepend.addModule(ParticleSystem, false);
this._ScaleManager = this._smartDepend.addModule(ScaleManager, true);
this._FunObj = this._smartDepend.addModule(FunObj, false);
this._Resource = this._smartDepend.addModule(Resource, false);
this._ScaleMode = this._smartDepend.addModule(ScaleMode, false);
this._SceneData = this._smartDepend.addModule(SceneData, false);
this._Display = this._smartDepend.addModule(Display, false);
this._Input = this._smartDepend.addModule(Input, false);
this._Label = this._smartDepend.addModule(Label, false);
this._Position = this._smartDepend.addModule(Position, false);
this._Scale = this._smartDepend.addModule(Scale, false);
this._CoreEntity = this._smartDepend.addModule(CoreEntity, false);
this._CoreScene = this._smartDepend.addModule(CoreScene, false);
this._EntityFactory = this._smartDepend.addModule(EntityFactory, false);
this._Sprite = this._smartDepend.addModule(Sprite, false);
this._Text = this._smartDepend.addModule(Text, false);
this._AbstractGameObject = this._smartDepend.addModule(AbstractGameObject, false);
this._GfxLoader = this._smartDepend.addModule(GfxLoader, false);
this._PixiLayer = this._smartDepend.addModule(PixiLayer, true);
this._PxGraphics = this._smartDepend.addModule(PxGraphics, false);
this._PxPoint = this._smartDepend.addModule(PxPoint, false);
this._PxText = this._smartDepend.addModule(PxText, false);
this._SceneManager = this._smartDepend.addModule(SceneManager, true);
this._Screen = this._smartDepend.addModule(Screen, false);
this._TweenJs = this._smartDepend.addModule(TweenJs, false);
this._Pino = this._smartDepend.addModule(Pino, true);

  }

  private _addDepends() {
    this._smartDepend.addDependency(this._CardWorld, this._Config);
this._smartDepend.addDependency(this._CardWorld, this._Loop);
this._smartDepend.addDependency(this._CardWorld, this._Screen);
this._smartDepend.addDependency(this._CardWorld, this._SceneManager);
this._smartDepend.addDependency(this._CardWorld, this._Loading);
this._smartDepend.addDependency(this._CardWorld, this._Menu);
this._smartDepend.addDependency(this._CardWorld, this._CardMode);
this._smartDepend.addDependency(this._CardWorld, this._MixMode);
this._smartDepend.addDependency(this._CardWorld, this._FireMode);


this._smartDepend.addDependency(this._Background, this._EntityFactory);
this._smartDepend.addDependency(this._Background, this._Sprite);
this._smartDepend.addDependency(this._Background, this._FPSCounter);
this._smartDepend.addDependency(this._Background, this._Config);


this._smartDepend.addDependency(this._Button, this._EntityFactory);
this._smartDepend.addDependency(this._Button, this._Sprite);


this._smartDepend.addDependency(this._Deck, this._EntityFactory);


this._smartDepend.addDependency(this._FPSCounter, this._Pino);
this._smartDepend.addDependency(this._FPSCounter, this._EntityFactory);
this._smartDepend.addDependency(this._FPSCounter, this._Text);
this._smartDepend.addDependency(this._FPSCounter, this._Screen);


this._smartDepend.addDependency(this._TextImage, this._EntityFactory);


this._smartDepend.addDependency(this._CardMode, this._EntityFactory);
this._smartDepend.addDependency(this._CardMode, this._SceneManager);
this._smartDepend.addDependency(this._CardMode, this._ExecTime);
this._smartDepend.addDependency(this._CardMode, this._Button);
this._smartDepend.addDependency(this._CardMode, this._Sprite);
this._smartDepend.addDependency(this._CardMode, this._Deck);
this._smartDepend.addDependency(this._CardMode, this._Deck);
this._smartDepend.addDependency(this._CardMode, this._Background);


this._smartDepend.addDependency(this._FireMode, this._EntityFactory);
this._smartDepend.addDependency(this._FireMode, this._SceneManager);
this._smartDepend.addDependency(this._FireMode, this._Button);
this._smartDepend.addDependency(this._FireMode, this._Background);
this._smartDepend.addDependency(this._FireMode, this._ParticleSystem);


this._smartDepend.addDependency(this._Loading, this._GfxLoader);
this._smartDepend.addDependency(this._Loading, this._Resource);
this._smartDepend.addDependency(this._Loading, this._Background);
this._smartDepend.addDependency(this._Loading, this._EntityFactory);
this._smartDepend.addDependency(this._Loading, this._SceneManager);


this._smartDepend.addDependency(this._Menu, this._EntityFactory);
this._smartDepend.addDependency(this._Menu, this._SceneManager);
this._smartDepend.addDependency(this._Menu, this._Button);
this._smartDepend.addDependency(this._Menu, this._Sprite);
this._smartDepend.addDependency(this._Menu, this._Background);


this._smartDepend.addDependency(this._MixMode, this._EntityFactory);
this._smartDepend.addDependency(this._MixMode, this._ExecTime);
this._smartDepend.addDependency(this._MixMode, this._SceneManager);
this._smartDepend.addDependency(this._MixMode, this._Button);
this._smartDepend.addDependency(this._MixMode, this._Background);
this._smartDepend.addDependency(this._MixMode, this._TextImage);


this._smartDepend.addDependency(this._Loop, this._Pino);
this._smartDepend.addDependency(this._Loop, this._FunObj);


this._smartDepend.addDependency(this._ParticleSystem, this._EntityFactory);


this._smartDepend.addDependency(this._Display, this._AbstractGameObject);
this._smartDepend.addDependency(this._Display, this._Scale);
this._smartDepend.addDependency(this._Display, this._Screen);


this._smartDepend.addDependency(this._Input, this._AbstractGameObject);


this._smartDepend.addDependency(this._Label, this._AbstractGameObject);


this._smartDepend.addDependency(this._Position, this._AbstractGameObject);
this._smartDepend.addDependency(this._Position, this._Scale);


this._smartDepend.addDependency(this._Scale, this._Config);
this._smartDepend.addDependency(this._Scale, this._ScaleMode);
this._smartDepend.addDependency(this._Scale, this._AbstractGameObject);


this._smartDepend.addDependency(this._CoreEntity, this._Position);
this._smartDepend.addDependency(this._CoreEntity, this._Display);
this._smartDepend.addDependency(this._CoreEntity, this._Input);
this._smartDepend.addDependency(this._CoreEntity, this._AbstractGameObject);
this._smartDepend.addDependency(this._CoreEntity, this._ScaleManager);


this._smartDepend.addDependency(this._CoreScene, this._Position);
this._smartDepend.addDependency(this._CoreScene, this._Display);
this._smartDepend.addDependency(this._CoreScene, this._Input);
this._smartDepend.addDependency(this._CoreScene, this._AbstractGameObject);
this._smartDepend.addDependency(this._CoreScene, this._ScaleManager);


this._smartDepend.addDependency(this._EntityFactory, this._Sprite);
this._smartDepend.addDependency(this._EntityFactory, this._Text);
this._smartDepend.addDependency(this._EntityFactory, this._TweenJs);


this._smartDepend.addDependency(this._Sprite, this._Position);
this._smartDepend.addDependency(this._Sprite, this._Display);
this._smartDepend.addDependency(this._Sprite, this._Input);
this._smartDepend.addDependency(this._Sprite, this._ScaleManager);
this._smartDepend.addDependency(this._Sprite, this._AbstractGameObject);
this._smartDepend.addDependency(this._Sprite, this._Screen);
this._smartDepend.addDependency(this._Sprite, this._SceneManager);


this._smartDepend.addDependency(this._Text, this._Position);
this._smartDepend.addDependency(this._Text, this._Display);
this._smartDepend.addDependency(this._Text, this._Input);
this._smartDepend.addDependency(this._Text, this._Label);
this._smartDepend.addDependency(this._Text, this._AbstractGameObject);
this._smartDepend.addDependency(this._Text, this._Screen);
this._smartDepend.addDependency(this._Text, this._SceneManager);
this._smartDepend.addDependency(this._Text, this._ScaleManager);


this._smartDepend.addDependency(this._AbstractGameObject, this._Pino);


this._smartDepend.addDependency(this._GfxLoader, this._PixiLayer);


this._smartDepend.addDependency(this._PixiLayer, this._Pino);
this._smartDepend.addDependency(this._PixiLayer, this._PxText);
this._smartDepend.addDependency(this._PixiLayer, this._PxGraphics);


this._smartDepend.addDependency(this._PxGraphics, this._Pino);


this._smartDepend.addDependency(this._PxText, this._Pino);
this._smartDepend.addDependency(this._PxText, this._PxPoint);


this._smartDepend.addDependency(this._SceneManager, this._Pino);
this._smartDepend.addDependency(this._SceneManager, this._PixiLayer);
this._smartDepend.addDependency(this._SceneManager, this._SceneData);
this._smartDepend.addDependency(this._SceneManager, this._Loop);
this._smartDepend.addDependency(this._SceneManager, this._ScaleManager);


this._smartDepend.addDependency(this._Screen, this._PixiLayer);



  }

}

export default ControlContainer;
