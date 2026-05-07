import { Config } from './Kernel/Control/Config';
import { Loop } from './Kernel/Control/Loop';
import { DragManager } from './Kernel/Control/DragManager';
import { IScreen } from './Plugin/IScreen';
import { ISceneManager } from './Plugin/ISceneManager';
import { Loading } from './Game/Scene/Loading';
import { Menu } from './Game/Scene/Menu';
import { Shop } from './Game/Scene/Shop';
import { Battle } from './Game/Scene/Battle';
export class Proton {
  private _config: Config;
  private _loop: Loop;
  private _dragManager: DragManager;
  private _screen: IScreen;
  private _sceneManager: ISceneManager;

  private _loading: Loading;
  private _menu: Menu;
  private _shop: Shop;
  private _battle: Battle;

  constructor(config: Config, loop: Loop, dragManager: DragManager, screen: IScreen, sceneManager: ISceneManager,
  loading: Loading, menu: Menu, shop: Shop, battle: Battle) {
    this._config = config;
    this._loop = loop;
    this._dragManager = dragManager;
    this._screen = screen;
    this._sceneManager = sceneManager;

    this._loading = loading;
    this._menu = menu;
    this._shop = shop;
    this._battle = battle;
  }

  public async startGame() {
    await this._screen.startRenderer(document.documentElement.clientWidth, document.documentElement.clientHeight, true, false);

    this._dragManager.init();
    this._startLoop();
    this._initScenes();
    this._startFirstScene();
  }

  private _startLoop() {
    this._loop.start();
  }

  private _initScenes() {
    this._sceneManager.init();

    this._sceneManager.addScene('Loading', this._loading);
    this._sceneManager.addScene('Menu', this._menu);
    this._sceneManager.addScene('Shop', this._shop);
    this._sceneManager.addScene('Battle', this._battle);
  }

  private _startFirstScene() {
    this._sceneManager.startScene('Loading');
  }
}
