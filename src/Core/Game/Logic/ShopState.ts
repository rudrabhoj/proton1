// Shop state: the 5 visible BLACK_MARKET items, freeze flag, refresh count, costs.
// Pure data + mutations.

import { ItemInstance, make_instance } from './ItemInstance';
import { pool_for_level } from './ItemDef';

const SHOP_SLOTS = 5;
const REFRESH_BASE_COST = 2;
const REFRESH_COST_INCREMENT = 1;
const FREEZE_COST = 1;

export class ShopState {
  private _slots: Array<ItemInstance | null>;
  private _frozen: boolean;
  private _refreshes_this_round: number;

  constructor() {
    this._slots = new Array(SHOP_SLOTS).fill(null);
    this._frozen = false;
    this._refreshes_this_round = 0;
  }

  get slots_count(): number { return SHOP_SLOTS; }
  get freeze_cost(): number { return FREEZE_COST; }
  get refresh_cost(): number {
    return REFRESH_BASE_COST + this._refreshes_this_round * REFRESH_COST_INCREMENT;
  }
  get is_frozen(): boolean { return this._frozen; }

  public slots(): Array<ItemInstance | null> {
    return this._slots.slice();
  }

  public slot_at(i: number): ItemInstance | null {
    return this._slots[i] ?? null;
  }

  public take(i: number): ItemInstance | null {
    const item = this._slots[i] ?? null;
    if (item) this._slots[i] = null;
    return item;
  }

  // -- Roll / refresh -----------------------------------------------------

  // Roll the visible slots. The pool is the same one OpponentGen draws from
  // at this level, so any item the player can buy, the opponent can also
  // field. Asymmetric pools translate directly into asymmetric win-rates.
  public roll(rng: () => number, level: number): void {
    const pool = pool_for_level(level);
    for (let i = 0; i < SHOP_SLOTS; i++) {
      const id = pool[Math.floor(rng() * pool.length)];
      this._slots[i] = make_instance(id, 1);
    }
  }

  public refresh(rng: () => number, level: number): void {
    this._refreshes_this_round += 1;
    this.roll(rng, level);
  }

  public freeze(): void {
    this._frozen = !this._frozen;
  }

  // Called between rounds. Refresh shop if not frozen, reset refresh counter.
  public on_round_end(rng: () => number, level: number): void {
    this._refreshes_this_round = 0;
    if (!this._frozen) {
      this.roll(rng, level);
    }
    this._frozen = false;
  }

  // Called when run starts.
  public init_first_shop(rng: () => number, level: number): void {
    this._refreshes_this_round = 0;
    this._frozen = false;
    this.roll(rng, level);
  }
}
