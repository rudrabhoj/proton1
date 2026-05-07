// Shop state: the 5 visible BLACK_MARKET items, freeze flag, refresh count, costs.
// Pure data + mutations.

import { ItemInstance, make_instance } from './ItemInstance';
import { CATALOG } from './ItemDef';

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

  public roll(rng: () => number): void {
    for (let i = 0; i < SHOP_SLOTS; i++) {
      const def = CATALOG[Math.floor(rng() * CATALOG.length)];
      this._slots[i] = make_instance(def.id, 1);
    }
  }

  public refresh(rng: () => number): void {
    this._refreshes_this_round += 1;
    this.roll(rng);
  }

  public freeze(): void {
    this._frozen = !this._frozen;
  }

  // Called between rounds. Refresh shop if not frozen, reset refresh counter.
  public on_round_end(rng: () => number): void {
    this._refreshes_this_round = 0;
    if (!this._frozen) {
      this.roll(rng);
    }
    this._frozen = false;
  }

  // Called when run starts.
  public init_first_shop(rng: () => number): void {
    this._refreshes_this_round = 0;
    this._frozen = false;
    this.roll(rng);
  }
}
