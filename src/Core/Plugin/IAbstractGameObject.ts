export interface IAbstractGameObject {
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  visible: boolean;
  alpha: number;
  text: string;
  style: any;
  data: any;
  tint: number;
  interactive: boolean;
  // PIXI z-order. Active when the parent container has sortableChildren = true,
  // which our scene containers do (set in SceneManager._addScene). Higher
  // values render on top. Default 0.
  zIndex: number;
  scale: {x: number, y: number}
  on(eventName: string, foo: Function): void;
  destroy(): void;
  anchor: {set: (x: number, y?: number) => {}};
  createNew(): IAbstractGameObject;
}

