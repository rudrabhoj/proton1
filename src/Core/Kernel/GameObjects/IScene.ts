export interface IScene {
  preload(): Promise<any>;
  create(): void;
  update(dt?: number): void;
  shutdown(): void;
}

