import SmartDepend from '../Dep/SmartDepend.js';

import { Avatar } from '../Core/Game/GameItems/Avatar.js';
import { Button } from '../Core/Game/GameItems/Button.js';
import { CombatLog } from '../Core/Game/GameItems/CombatLog.js';
import { Dossier } from '../Core/Game/GameItems/Dossier.js';
import { FPSCounter } from '../Core/Game/GameItems/FPSCounter.js';
import { FirewallBar } from '../Core/Game/GameItems/FirewallBar.js';
import { Slot } from '../Core/Game/GameItems/Slot.js';
import { TerminalPanel } from '../Core/Game/GameItems/TerminalPanel.js';
import { Inventory } from '../Core/Game/Logic/Inventory.js';
import { RunState } from '../Core/Game/Logic/RunState.js';
import { ShopState } from '../Core/Game/Logic/ShopState.js';
import { Battle } from '../Core/Game/Scene/Battle.js';
import { Loading } from '../Core/Game/Scene/Loading.js';
import { Menu } from '../Core/Game/Scene/Menu.js';
import { Shop } from '../Core/Game/Scene/Shop.js';
import { Config } from '../Core/Kernel/Control/Config.js';
import { DragManager } from '../Core/Kernel/Control/DragManager.js';
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
import { Graphic } from '../Core/Kernel/GameObjects/Graphic.js';
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
import { Proton } from '../Core/Proton.js';
import { Pino } from '../Core/Services/Pino.js';




class ControlContainer {
  private _smartDepend: SmartDepend;

  protected _Avatar: any;
protected _Button: any;
protected _CombatLog: any;
protected _Dossier: any;
protected _FPSCounter: any;
protected _FirewallBar: any;
protected _Slot: any;
protected _TerminalPanel: any;
protected _Inventory: any;
protected _RunState: any;
protected _ShopState: any;
protected _Battle: any;
protected _Loading: any;
protected _Menu: any;
protected _Shop: any;
protected _Config: any;
protected _DragManager: any;
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
protected _Graphic: any;
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
protected _Proton: any;
protected _Pino: any;


  constructor() {
    this._smartDepend = new SmartDepend();

    this._addModules();
    this._addDepends();
  }

  public getMain(): Proton {
    const spEntity = this._smartDepend.resolve(this._Proton) as Proton;

    return spEntity;
  }

  private _addModules() {
    this._Avatar = this._smartDepend.addModule(Avatar, false);
this._Button = this._smartDepend.addModule(Button, false);
this._CombatLog = this._smartDepend.addModule(CombatLog, false);
this._Dossier = this._smartDepend.addModule(Dossier, false);
this._FPSCounter = this._smartDepend.addModule(FPSCounter, false);
this._FirewallBar = this._smartDepend.addModule(FirewallBar, false);
this._Slot = this._smartDepend.addModule(Slot, false);
this._TerminalPanel = this._smartDepend.addModule(TerminalPanel, false);
this._Inventory = this._smartDepend.addModule(Inventory, true);
this._RunState = this._smartDepend.addModule(RunState, true);
this._ShopState = this._smartDepend.addModule(ShopState, true);
this._Battle = this._smartDepend.addModule(Battle, false);
this._Loading = this._smartDepend.addModule(Loading, false);
this._Menu = this._smartDepend.addModule(Menu, false);
this._Shop = this._smartDepend.addModule(Shop, false);
this._Config = this._smartDepend.addModule(Config, false);
this._DragManager = this._smartDepend.addModule(DragManager, true);
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
this._Graphic = this._smartDepend.addModule(Graphic, false);
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
this._Proton = this._smartDepend.addModule(Proton, false);
this._Pino = this._smartDepend.addModule(Pino, true);

  }

  private _addDepends() {
    this._smartDepend.addDependency(this._Avatar, this._EntityFactory);


this._smartDepend.addDependency(this._Button, this._EntityFactory);


this._smartDepend.addDependency(this._CombatLog, this._EntityFactory);


this._smartDepend.addDependency(this._Dossier, this._EntityFactory);
this._smartDepend.addDependency(this._Dossier, this._SceneManager);
this._smartDepend.addDependency(this._Dossier, this._TerminalPanel);
this._smartDepend.addDependency(this._Dossier, this._Avatar);


this._smartDepend.addDependency(this._FPSCounter, this._Pino);
this._smartDepend.addDependency(this._FPSCounter, this._EntityFactory);
this._smartDepend.addDependency(this._FPSCounter, this._Text);
this._smartDepend.addDependency(this._FPSCounter, this._Screen);


this._smartDepend.addDependency(this._FirewallBar, this._EntityFactory);


this._smartDepend.addDependency(this._Slot, this._EntityFactory);


this._smartDepend.addDependency(this._TerminalPanel, this._EntityFactory);
this._smartDepend.addDependency(this._TerminalPanel, this._SceneManager);


this._smartDepend.addDependency(this._Battle, this._EntityFactory);
this._smartDepend.addDependency(this._Battle, this._SceneManager);
this._smartDepend.addDependency(this._Battle, this._Slot);
this._smartDepend.addDependency(this._Battle, this._TerminalPanel);
this._smartDepend.addDependency(this._Battle, this._Button);
this._smartDepend.addDependency(this._Battle, this._FirewallBar);
this._smartDepend.addDependency(this._Battle, this._CombatLog);
this._smartDepend.addDependency(this._Battle, this._Dossier);
this._smartDepend.addDependency(this._Battle, this._Inventory);
this._smartDepend.addDependency(this._Battle, this._RunState);


this._smartDepend.addDependency(this._Loading, this._GfxLoader);
this._smartDepend.addDependency(this._Loading, this._Resource);
this._smartDepend.addDependency(this._Loading, this._EntityFactory);
this._smartDepend.addDependency(this._Loading, this._SceneManager);


this._smartDepend.addDependency(this._Menu, this._EntityFactory);
this._smartDepend.addDependency(this._Menu, this._SceneManager);
this._smartDepend.addDependency(this._Menu, this._Button);
this._smartDepend.addDependency(this._Menu, this._ShopState);
this._smartDepend.addDependency(this._Menu, this._Inventory);
this._smartDepend.addDependency(this._Menu, this._RunState);


this._smartDepend.addDependency(this._Shop, this._EntityFactory);
this._smartDepend.addDependency(this._Shop, this._SceneManager);
this._smartDepend.addDependency(this._Shop, this._DragManager);
this._smartDepend.addDependency(this._Shop, this._ScaleManager);
this._smartDepend.addDependency(this._Shop, this._Pino);
this._smartDepend.addDependency(this._Shop, this._Slot);
this._smartDepend.addDependency(this._Shop, this._TerminalPanel);
this._smartDepend.addDependency(this._Shop, this._Button);
this._smartDepend.addDependency(this._Shop, this._FirewallBar);
this._smartDepend.addDependency(this._Shop, this._ShopState);
this._smartDepend.addDependency(this._Shop, this._Inventory);
this._smartDepend.addDependency(this._Shop, this._RunState);


this._smartDepend.addDependency(this._DragManager, this._Pino);
this._smartDepend.addDependency(this._DragManager, this._PixiLayer);


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
this._smartDepend.addDependency(this._EntityFactory, this._Graphic);
this._smartDepend.addDependency(this._EntityFactory, this._TweenJs);


this._smartDepend.addDependency(this._Graphic, this._Position);
this._smartDepend.addDependency(this._Graphic, this._Display);
this._smartDepend.addDependency(this._Graphic, this._Input);
this._smartDepend.addDependency(this._Graphic, this._ScaleManager);
this._smartDepend.addDependency(this._Graphic, this._AbstractGameObject);
this._smartDepend.addDependency(this._Graphic, this._Screen);
this._smartDepend.addDependency(this._Graphic, this._SceneManager);


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


this._smartDepend.addDependency(this._Proton, this._Config);
this._smartDepend.addDependency(this._Proton, this._Loop);
this._smartDepend.addDependency(this._Proton, this._DragManager);
this._smartDepend.addDependency(this._Proton, this._Screen);
this._smartDepend.addDependency(this._Proton, this._SceneManager);
this._smartDepend.addDependency(this._Proton, this._Loading);
this._smartDepend.addDependency(this._Proton, this._Menu);
this._smartDepend.addDependency(this._Proton, this._Shop);
this._smartDepend.addDependency(this._Proton, this._Battle);



  }

}

export default ControlContainer;
