// Tick-based deterministic battle simulator.
// Pure function: takes (player_board, opponent_board, max_time, tick_ms) → BattleResult.
// Both sides simulated simultaneously. Cooldowns count down, fire at 0, reset.
// First firewall to 0 loses. Time cap = draw (both lose 1 connection).

import { ItemInstance } from './ItemInstance';
import { get_item, tiered_dmg, tiered_cd, tiered_magnitude, ItemDef, EffectKind } from './ItemDef';

const STARTING_FIREWALL = 1048;
const TICK_MS = 100;
const DEFAULT_MAX_MS = 60_000;

export type Side = 'player' | 'enemy';

export type LogEntry =
  | { kind: 'fire'; t_ms: number; side: Side; slot: number; item: string; dmg: number; multicast?: number }
  | { kind: 'effect_apply'; t_ms: number; side: Side; slot: number; effect: EffectKind; magnitude: number; stacks: number }
  | { kind: 'effect_tick'; t_ms: number; side: Side; effect: EffectKind; dmg: number }
  | { kind: 'patch_block'; t_ms: number; side: Side; magnitude: number }
  | { kind: 'repair'; t_ms: number; side: Side; amount: number }
  | { kind: 'death'; t_ms: number; side: Side }
  | { kind: 'draw'; t_ms: number };

export interface BattleResult {
  outcome: 'player_win' | 'enemy_win' | 'draw';
  duration_ms: number;
  log: LogEntry[];
  player_hp_final: number;
  enemy_hp_final: number;
  player_hp_max: number;
  enemy_hp_max: number;
}

interface ActiveItem {
  def: ItemDef;
  inst: ItemInstance;
  slot: number;
  cd_remaining: number;
  cd_full: number;
  dmg: number;
  multicast: number;
}

interface SideState {
  side: Side;
  hp: number;
  hp_max: number;
  items: ActiveItem[];
  // active effects on this side (incoming, e.g. leak applied by enemy)
  effects: ActiveEffect[];
  // pending one-shot defenses
  patch_block: number;       // reduce next incoming hit by this much
  reflect_pending: boolean;  // reflect 50% of next incoming hit
}

interface ActiveEffect {
  kind: EffectKind;
  magnitude: number;
  stacks: number;
  remaining_ms: number;
  next_tick_ms: number;
}

const TICK_INTERVAL_MS = 1000;  // effect tick interval

// -- Public API ---------------------------------------------------------

export function simulate_battle(
  player_board: Array<ItemInstance | null>,
  enemy_board: Array<ItemInstance | null>,
  max_ms: number = DEFAULT_MAX_MS,
): BattleResult {
  const player_state = make_state('player', player_board);
  const enemy_state = make_state('enemy', enemy_board);
  const log: LogEntry[] = [];
  let t = 0;

  while (t < max_ms) {
    t += TICK_MS;

    tick_effects(player_state, t, log);
    tick_effects(enemy_state, t, log);

    if (player_state.hp <= 0 && enemy_state.hp <= 0) {
      log.push({ kind: 'draw', t_ms: t });
      return finalize(player_state, enemy_state, log, t, 'draw');
    }
    if (player_state.hp <= 0) {
      log.push({ kind: 'death', t_ms: t, side: 'player' });
      return finalize(player_state, enemy_state, log, t, 'enemy_win');
    }
    if (enemy_state.hp <= 0) {
      log.push({ kind: 'death', t_ms: t, side: 'enemy' });
      return finalize(player_state, enemy_state, log, t, 'player_win');
    }

    tick_items(player_state, enemy_state, t, log);
    tick_items(enemy_state, player_state, t, log);
  }

  log.push({ kind: 'draw', t_ms: t });
  return finalize(player_state, enemy_state, log, t, 'draw');
}

// -- State construction --------------------------------------------------

function make_state(side: Side, board: Array<ItemInstance | null>): SideState {
  const items: ActiveItem[] = [];
  for (let i = 0; i < board.length; i++) {
    const inst = board[i];
    if (!inst) continue;
    const def = get_item(inst.defId);
    let dmg = 0;
    let multicast = 1;
    if (def.behavior.kind === 'damage') {
      dmg = tiered_dmg(def.behavior.dmg, inst.tier);
      multicast = def.behavior.multicast ?? 1;
    } else if (def.behavior.kind === 'damage_and_effect') {
      dmg = tiered_dmg(def.behavior.dmg, inst.tier);
    } else if (def.behavior.kind === 'reactive_damage') {
      dmg = tiered_dmg(def.behavior.dmg, inst.tier);
    }
    const cd_full = tiered_cd(def.cooldownMs, inst.tier);
    items.push({ def, inst, slot: i, cd_remaining: cd_full, cd_full, dmg, multicast });
  }
  return {
    side,
    hp: STARTING_FIREWALL,
    hp_max: STARTING_FIREWALL,
    items,
    effects: [],
    patch_block: 0,
    reflect_pending: false,
  };
}

// -- Effect ticking ------------------------------------------------------

function tick_effects(s: SideState, t: number, log: LogEntry[]): void {
  for (let i = s.effects.length - 1; i >= 0; i--) {
    const e = s.effects[i];
    e.remaining_ms -= TICK_MS;
    if (t >= e.next_tick_ms) {
      let dmg = 0;
      if (e.kind === 'leak') dmg = e.magnitude * e.stacks;
      else if (e.kind === 'overflow') dmg = e.magnitude * (e.stacks * e.stacks);  // nonlinear
      else if (e.kind === 'repair') {
        s.hp = Math.min(s.hp_max, s.hp + e.magnitude);
        log.push({ kind: 'repair', t_ms: t, side: s.side, amount: e.magnitude });
      }
      if (dmg > 0) {
        s.hp -= dmg;
        log.push({ kind: 'effect_tick', t_ms: t, side: s.side, effect: e.kind, dmg });
      }
      e.next_tick_ms = t + TICK_INTERVAL_MS;
    }
    if (e.remaining_ms <= 0) {
      s.effects.splice(i, 1);
    }
  }
}

// -- Item ticking --------------------------------------------------------

function tick_items(self: SideState, opponent: SideState, t: number, log: LogEntry[]): void {
  for (const it of self.items) {
    it.cd_remaining -= TICK_MS;
    if (it.cd_remaining > 0) continue;

    it.cd_remaining = it.cd_full;
    fire_item(it, self, opponent, t, log);
  }
}

function fire_item(it: ActiveItem, self: SideState, opponent: SideState, t: number, log: LogEntry[]): void {
  const b = it.def.behavior;

  if (b.kind === 'damage') {
    const total = it.dmg * it.multicast;
    log.push({ kind: 'fire', t_ms: t, side: self.side, slot: it.slot, item: it.def.id, dmg: total, multicast: it.multicast });
    deal_damage(opponent, total, t, log);
    return;
  }

  if (b.kind === 'effect_self') {
    const mag = tiered_magnitude(b.magnitude, it.inst.tier);
    if (b.effect === 'patch') {
      self.patch_block += mag;
      log.push({ kind: 'patch_block', t_ms: t, side: self.side, magnitude: mag });
    } else if (b.effect === 'repair') {
      self.effects.push({
        kind: 'repair', magnitude: mag, stacks: 1,
        remaining_ms: b.durationMs ?? 5000,
        next_tick_ms: t + TICK_INTERVAL_MS,
      });
      log.push({ kind: 'effect_apply', t_ms: t, side: self.side, slot: it.slot, effect: 'repair', magnitude: mag, stacks: 1 });
    }
    return;
  }

  if (b.kind === 'effect_enemy') {
    const mag = tiered_magnitude(b.magnitude, it.inst.tier);
    const stacks = b.stacks ?? 1;
    apply_effect_to(opponent, b.effect, mag, stacks, b.durationMs ?? 5000, t, log, it.slot, self.side);
    return;
  }

  if (b.kind === 'reactive_damage') {
    log.push({ kind: 'fire', t_ms: t, side: self.side, slot: it.slot, item: it.def.id, dmg: 0 });
    return;
  }
}

function apply_effect_to(
  s: SideState, kind: EffectKind, magnitude: number, stacks: number, duration: number,
  t: number, log: LogEntry[], source_slot: number, source_side: Side,
): void {
  const existing = s.effects.find((e) => e.kind === kind);
  if (existing) {
    existing.stacks += stacks;
    existing.remaining_ms = Math.max(existing.remaining_ms, duration);
  } else {
    s.effects.push({
      kind, magnitude, stacks,
      remaining_ms: duration,
      next_tick_ms: t + TICK_INTERVAL_MS,
    });
  }
  log.push({ kind: 'effect_apply', t_ms: t, side: source_side, slot: source_slot, effect: kind, magnitude, stacks });
}

function deal_damage(s: SideState, dmg: number, t: number, log: LogEntry[]): void {
  let actual = dmg;
  if (s.patch_block > 0) {
    const blocked = Math.min(s.patch_block, actual);
    actual -= blocked;
    s.patch_block -= blocked;
    log.push({ kind: 'patch_block', t_ms: t, side: s.side, magnitude: blocked });
  }
  if (actual > 0) {
    s.hp -= actual;
  }
}

// -- Finalize -----------------------------------------------------------

function finalize(
  p: SideState, e: SideState, log: LogEntry[], t: number,
  outcome: BattleResult['outcome'],
): BattleResult {
  return {
    outcome,
    duration_ms: t,
    log,
    player_hp_final: p.hp,
    enemy_hp_final: e.hp,
    player_hp_max: p.hp_max,
    enemy_hp_max: e.hp_max,
  };
}
