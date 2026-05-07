// Pixel-style avatar — drawn from a deterministic pattern based on a seed.
// 8x8 grid of cells; symmetrical horizontally for face-like feel.
// Pure graphics composition; one Graphic with multiple rect calls? No —
// our PxGraphics is one shape per object. So Avatar holds an array of
// Graphics, each a single cell. Performance is fine (≤32 cells).

import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { Graphic } from "../../Kernel/GameObjects/Graphic";
import { rng_from_seed } from "../Logic/Rng";
import { Theme } from "../Theme";

const GRID = 8;

export interface AvatarOptions {
  x: number;
  y: number;
  size: number;
  seed: number;
  tone?: 'player' | 'enemy';
}

export class Avatar {
  private _entityFactory: EntityFactory;
  private _cells: Graphic[];

  constructor(entityFactory: EntityFactory) {
    this._entityFactory = entityFactory;
    this._cells = [];
  }

  public createNew(): Avatar {
    return new Avatar(this._entityFactory);
  }

  public init(opts: AvatarOptions): void {
    const palette = opts.tone === 'enemy' ? Theme.enemy : Theme.player;
    const cell = opts.size / GRID;
    const rng = rng_from_seed(opts.seed >>> 0);

    // Generate left-half pattern; mirror to right.
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID / 2; col++) {
        if (rng() < 0.45) {
          const cellGfx = this._draw_cell(opts.x + col * cell, opts.y + row * cell, cell, palette.bright);
          this._cells.push(cellGfx);
          // Mirror
          const mirror_col = GRID - 1 - col;
          const cellMirror = this._draw_cell(opts.x + mirror_col * cell, opts.y + row * cell, cell, palette.bright);
          this._cells.push(cellMirror);
        }
      }
    }
  }

  private _draw_cell(x: number, y: number, size: number, color: number): Graphic {
    const g = this._entityFactory.graphic(x, y);
    g.graphics.fillColor = color;
    g.graphics.fillAlpha = 0.9;
    g.graphics.borderStyle = 'none';
    g.graphics.rect(0, 0, size, size);
    return g;
  }
}
