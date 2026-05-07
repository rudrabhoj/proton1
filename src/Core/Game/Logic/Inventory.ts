// Inventory state: 5-slot battle board + paginated External HDD (5 × N pages).
// Pure data + mutations. No rendering.

import { ItemInstance } from './ItemInstance';

const BOARD_SLOTS = 5;
const HDD_SLOTS_PER_PAGE = 5;
const HDD_PAGE_COUNT = 3;
const HDD_TOTAL_SLOTS = HDD_SLOTS_PER_PAGE * HDD_PAGE_COUNT;

export type SlotLocation =
  | { kind: 'board'; index: number }
  | { kind: 'hdd'; index: number };  // absolute index 0 .. HDD_TOTAL_SLOTS-1

export class Inventory {
  private _board: Array<ItemInstance | null>;
  private _hdd: Array<ItemInstance | null>;
  private _hdd_page: number;

  constructor() {
    this._board = new Array(BOARD_SLOTS).fill(null);
    this._hdd = new Array(HDD_TOTAL_SLOTS).fill(null);
    this._hdd_page = 0;
  }

  get board_slots(): number { return BOARD_SLOTS; }
  get hdd_slots_per_page(): number { return HDD_SLOTS_PER_PAGE; }
  get hdd_page_count(): number { return HDD_PAGE_COUNT; }
  get hdd_page(): number { return this._hdd_page; }

  // -- Read ---------------------------------------------------------------

  public board_at(index: number): ItemInstance | null {
    return this._board[index] ?? null;
  }

  public hdd_at_absolute(index: number): ItemInstance | null {
    return this._hdd[index] ?? null;
  }

  public hdd_at_visible(visible_index: number): ItemInstance | null {
    return this._hdd[this._hdd_page * HDD_SLOTS_PER_PAGE + visible_index] ?? null;
  }

  public board_items(): Array<ItemInstance | null> {
    return this._board.slice();
  }

  public visible_hdd_items(): Array<ItemInstance | null> {
    const start = this._hdd_page * HDD_SLOTS_PER_PAGE;
    return this._hdd.slice(start, start + HDD_SLOTS_PER_PAGE);
  }

  public find(uid: number): SlotLocation | null {
    for (let i = 0; i < this._board.length; i++) {
      if (this._board[i]?.uid === uid) return { kind: 'board', index: i };
    }
    for (let i = 0; i < this._hdd.length; i++) {
      if (this._hdd[i]?.uid === uid) return { kind: 'hdd', index: i };
    }
    return null;
  }

  public first_empty_hdd(): number | null {
    for (let i = 0; i < this._hdd.length; i++) {
      if (this._hdd[i] === null) return i;
    }
    return null;
  }

  public first_empty_board(): number | null {
    for (let i = 0; i < this._board.length; i++) {
      if (this._board[i] === null) return i;
    }
    return null;
  }

  // -- Mutations ----------------------------------------------------------

  public place(item: ItemInstance, loc: SlotLocation): boolean {
    if (loc.kind === 'board') {
      if (loc.index < 0 || loc.index >= this._board.length) return false;
      if (this._board[loc.index] !== null) return false;
      this._board[loc.index] = item;
      return true;
    }
    if (loc.index < 0 || loc.index >= this._hdd.length) return false;
    if (this._hdd[loc.index] !== null) return false;
    this._hdd[loc.index] = item;
    return true;
  }

  public take(loc: SlotLocation): ItemInstance | null {
    if (loc.kind === 'board') {
      if (loc.index < 0 || loc.index >= this._board.length) return null;
      const item = this._board[loc.index];
      this._board[loc.index] = null;
      return item;
    }
    if (loc.index < 0 || loc.index >= this._hdd.length) return null;
    const item = this._hdd[loc.index];
    this._hdd[loc.index] = null;
    return item;
  }

  public swap(a: SlotLocation, b: SlotLocation): boolean {
    const ai = this.take(a);
    const bi = this.take(b);
    if (ai !== null) this.place(ai, b);
    if (bi !== null) this.place(bi, a);
    return true;
  }

  public next_page(): void {
    this._hdd_page = (this._hdd_page + 1) % HDD_PAGE_COUNT;
  }

  public prev_page(): void {
    this._hdd_page = (this._hdd_page - 1 + HDD_PAGE_COUNT) % HDD_PAGE_COUNT;
  }

  public set_page(page: number): void {
    if (page >= 0 && page < HDD_PAGE_COUNT) this._hdd_page = page;
  }

  // -- Merge logic --------------------------------------------------------
  // Three of same defId + tier in any locations → one of next tier.
  // Returns the resulting item, or null if no merge possible.

  public try_merge_after_place(loc: SlotLocation): ItemInstance | null {
    const placed = loc.kind === 'board' ? this._board[loc.index] : this._hdd[loc.index];
    if (!placed) return null;

    const matches: SlotLocation[] = [];
    for (let i = 0; i < this._board.length; i++) {
      const it = this._board[i];
      if (it && it.defId === placed.defId && it.tier === placed.tier) {
        matches.push({ kind: 'board', index: i });
      }
    }
    for (let i = 0; i < this._hdd.length; i++) {
      const it = this._hdd[i];
      if (it && it.defId === placed.defId && it.tier === placed.tier) {
        matches.push({ kind: 'hdd', index: i });
      }
    }
    if (matches.length < 3) return null;
    if (placed.tier === 3) return null;

    // Consume 3 (including the placed one). Take all three out.
    const survivor_loc = loc;
    const survivor = this.take(survivor_loc)!;
    let consumed = 1;
    for (const m of matches) {
      if (consumed >= 3) break;
      if (m.kind === survivor_loc.kind && m.index === survivor_loc.index) continue;
      const taken = this.take(m);
      if (taken) consumed += 1;
    }

    const upgraded: ItemInstance = {
      defId: survivor.defId,
      tier: (survivor.tier + 1) as 1 | 2 | 3,
      uid: survivor.uid,
    };
    this.place(upgraded, survivor_loc);
    return upgraded;
  }
}
