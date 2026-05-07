// Run-level meta state. Lives, breaches (wins), gold, level, day, RNG seed.
// Pure mutable data holder — singleton in DI.
//
// Themed terms (display only):
//   "lives"     → "connections"  (conceptually still lives)
//   "breaches"  → wins-toward-target ("TARGETS 2/9")
//   "gold"      → "$" (bank)
//   "firewall"  → per-battle HP (tracked in BattleSim, not here)

const STARTING_GOLD = 50;
const STARTING_LEVEL = 1;
const STARTING_LIVES = 3;
const TARGET_BREACHES = 9;
const LEVEL_CAP = 7;

const LVL_UP_BASE = 5;
const LVL_UP_INCREMENT = 3;

const INCOME_BASE = 30;
const INCOME_PER_LEVEL = 5;
const INCOME_WIN_BONUS = 5;

export class RunState {
  private _gold: number;
  private _level: number;
  private _lives: number;
  private _breaches: number;
  private _day: number;
  private _seed: number;

  constructor() {
    this._gold = STARTING_GOLD;
    this._level = STARTING_LEVEL;
    this._lives = STARTING_LIVES;
    this._breaches = 0;
    this._day = 1;
    this._seed = Math.floor(Math.random() * 0xffffffff);
  }

  get gold(): number { return this._gold; }
  get level(): number { return this._level; }
  get lives(): number { return this._lives; }
  get breaches(): number { return this._breaches; }
  get day(): number { return this._day; }
  get seed(): number { return this._seed; }
  get target_breaches(): number { return TARGET_BREACHES; }
  get level_cap(): number { return LEVEL_CAP; }

  get is_won(): boolean { return this._breaches >= TARGET_BREACHES; }
  get is_lost(): boolean { return this._lives <= 0; }
  get is_over(): boolean { return this.is_won || this.is_lost; }

  get level_up_cost(): number {
    if (this._level >= LEVEL_CAP) return -1;
    return LVL_UP_BASE + (this._level - 1) * LVL_UP_INCREMENT;
  }

  get income(): number {
    return INCOME_BASE + this._level * INCOME_PER_LEVEL;
  }

  // -- Mutations ----------------------------------------------------------

  public spend(amount: number): boolean {
    if (this._gold < amount) return false;
    this._gold -= amount;
    return true;
  }

  public earn(amount: number): void {
    this._gold += amount;
  }

  public level_up(): boolean {
    const cost = this.level_up_cost;
    if (cost < 0) return false;
    if (!this.spend(cost)) return false;
    this._level += 1;
    return true;
  }

  public on_battle_win(): void {
    this._breaches += 1;
    this.earn(this.income + INCOME_WIN_BONUS);
    this._day += 1;
  }

  public on_battle_loss(): void {
    this._lives -= 1;
    this.earn(this.income);
    this._day += 1;
  }

  public on_battle_draw(): void {
    this._lives -= 1;
    this.earn(this.income);
    this._day += 1;
  }

  // For DI: Pino-singleton-style createNew not needed — RunState is a singleton.
}
