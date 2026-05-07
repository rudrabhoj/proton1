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
  // silent: this fire produces no combat-log line. Used for reactive arming
  //   (honeypot/deflect) so the bar ticks without spamming "+0" entries, and
  //   for the trailing shots of a multicast (only the first shows in the log).
  // trigger: this is a reactive item triggering (honeypot striking the enemy
  //   for damage, deflect reflecting an incoming hit). The slot's cooldown
  //   cycle continues from its arm time, NOT from the trigger time, so bar
  //   refreshes belong only to arm fires. With this flag the player still
  //   sees the combat-log line and the HP changes, but the bar is left alone.
  | {
      kind: 'fire';
      t_ms: number;
      side: Side;
      slot: number;
      item: string;
      dmg: number;
      multicast?: number;
      silent?: boolean;
      trigger?: boolean;
    }
  | { kind: 'effect_apply'; t_ms: number; side: Side; slot: number; effect: EffectKind; magnitude: number; stacks: number }
  | { kind: 'effect_tick'; t_ms: number; side: Side; effect: EffectKind; dmg: number }
  // patch_block has two origins: (a) shielded_ack firing on cooldown — slot is
  // set, used to refresh the slot's cooldown bar; (b) a queued block being
  // consumed by an incoming hit — no slot.
  | { kind: 'patch_block'; t_ms: number; side: Side; magnitude: number; slot?: number }
  | { kind: 'repair'; t_ms: number; side: Side; amount: number; slot?: number }
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
  // pending one-shot defenses (queued, FIFO)
  patch_block: number;        // pooled absorption from shielded_ack fires
  honeypot_traps: HoneypotTrap[];     // armed by our honeypot, triggers on enemy fire
  deflect_armed: DeflectCharge[];     // armed by our deflect, triggers on incoming hit
  entropy_pending: EntropyCharge[];   // placed on us by enemy entropy, drains on our next fire
}

interface HoneypotTrap {
  slot: number;
  dmg: number;
}

interface DeflectCharge {
  slot: number;
  ratio: number;
}

interface EntropyCharge {
  slot: number;        // slot of the enemy's entropy that placed this charge
  source_side: Side;   // for log attribution
  magnitude: number;
}

// Tickable status. Lifetime is stack-driven (see balance.md): each tick
// applies stacks * magnitude damage/heal then decrements stacks by 1. Effect
// is gone when stacks hits 0. No remaining_ms — duration equals current
// stack count in seconds.
interface ActiveEffect {
  kind: EffectKind;
  magnitude: number;   // per-stack-per-tick value
  stacks: number;
  next_tick_ms: number;
}

const TICK_INTERVAL_MS = 1000;  // effect tick interval (1 second)
const MAX_STACKS = 10;          // hard cap on any tickable status

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
    // Cooldown floor (gameplay.md "Cooldown floor: an item's effective
    // cooldown cannot go below 1 second"). Defensive — no current item
    // tier-reduces below 1s, but the clamp belongs at the source.
    const cd_full = Math.max(1000, tiered_cd(def.cooldownMs, inst.tier));
    items.push({ def, inst, slot: i, cd_remaining: cd_full, cd_full, dmg, multicast });
  }
  return {
    side,
    hp: STARTING_FIREWALL,
    hp_max: STARTING_FIREWALL,
    items,
    effects: [],
    patch_block: 0,
    honeypot_traps: [],
    deflect_armed: [],
    entropy_pending: [],
  };
}

// -- Effect ticking ------------------------------------------------------

// Stack-decay model for DoTs (gameplay.md: "stacking number on the target,
// applied on triggers, ticks over time"):
//   each tick: damage = stacks * magnitude; stacks -= 1
//   effect expires when stacks hits 0
// Mirrors Oaken Tower's burn / poison / bleed where applied stacks decay.
//
// Heal does NOT use this model — it is a flat instant value (matches Oaken
// "Heal X" stat, e.g. Healing Word). See fire_item's effect_self/repair
// branch. Only leak and overflow live in s.effects.
function tick_effects(s: SideState, t: number, log: LogEntry[]): void {
  for (let i = s.effects.length - 1; i >= 0; i--) {
    const e = s.effects[i];
    if (t < e.next_tick_ms) continue;

    const dmg = e.magnitude * e.stacks;
    if (dmg > 0) {
      s.hp -= dmg;
      log.push({ kind: 'effect_tick', t_ms: t, side: s.side, effect: e.kind, dmg });
    }

    e.stacks -= 1;
    e.next_tick_ms = t + TICK_INTERVAL_MS;

    if (e.stacks <= 0) s.effects.splice(i, 1);
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

  // -- Pre-fire reactions ---------------------------------------------------
  // Anything that responds to "self is firing" runs here, before the fire
  // resolves. Skipped for reactive items themselves: arming a honeypot or a
  // deflect is not a real fire and shouldn't trigger the opponent's traps or
  // burn an entropy charge.
  if (b.kind !== 'reactive_damage') {
    // Opponent's honeypot pops first. One trap per opposing fire (FIFO).
    // Direct hp subtraction: trap damage bypasses patch/deflect to keep the
    // reactive chain bounded (no honeypot-vs-deflect ping-pong).
    if (opponent.honeypot_traps.length > 0) {
      const trap = opponent.honeypot_traps.shift()!;
      self.hp -= trap.dmg;
      log.push({ kind: 'fire', t_ms: t, side: opponent.side, slot: trap.slot, item: 'honeypot', dmg: trap.dmg, trigger: true });
    }
    // Entropy charges drain self when self triggers. One charge per fire.
    if (self.entropy_pending.length > 0) {
      const charge = self.entropy_pending.shift()!;
      const drain = Math.min(charge.magnitude, Math.max(0, self.hp));
      if (drain > 0) {
        self.hp -= drain;
        log.push({ kind: 'effect_tick', t_ms: t, side: self.side, effect: 'entropy', dmg: drain });
      }
    }
  }

  // -- Resolve the fire -----------------------------------------------------
  if (b.kind === 'damage') {
    // Multicast = N events per activation (gameplay.md: "the trigger fires
    // N times in one activation, stacks with crits and per-trigger effects").
    // Each shot goes through deal_damage independently so patch/deflect can
    // interact per-shot. First entry is loud (combat-log line); the rest are
    // silent so we don't spam N identical lines for one trigger.
    for (let i = 0; i < it.multicast; i++) {
      const is_first = i === 0;
      log.push({
        kind: 'fire',
        t_ms: t,
        side: self.side,
        slot: it.slot,
        item: it.def.id,
        dmg: it.dmg,
        multicast: is_first && it.multicast > 1 ? it.multicast : undefined,
        silent: !is_first,
      });
      deal_damage(opponent, self, it.dmg, t, log);
    }
    return;
  }

  if (b.kind === 'effect_self') {
    const mag = tiered_magnitude(b.magnitude, it.inst.tier);
    if (b.effect === 'patch') {
      self.patch_block += mag;
      log.push({ kind: 'patch_block', t_ms: t, side: self.side, magnitude: mag, slot: it.slot });
    } else if (b.effect === 'repair') {
      // Instant heal (Oaken-Tower-faithful: "Heal X" is a flat per-fire
      // value, not a DoT-style ticking number). One log entry, one hp move.
      const healed = Math.min(mag, self.hp_max - self.hp);
      if (healed > 0) self.hp += healed;
      // Always log the fire even if at full hp so the slot's bar refreshes.
      log.push({ kind: 'repair', t_ms: t, side: self.side, amount: healed, slot: it.slot });
    }
    return;
  }

  if (b.kind === 'effect_enemy') {
    const mag = tiered_magnitude(b.magnitude, it.inst.tier);

    if (b.effect === 'jam') {
      // Adds magnitude ms to every enemy item's remaining cooldown. One-shot,
      // no accumulating effect — applied once per fire.
      for (const item of opponent.items) {
        item.cd_remaining += mag;
      }
      log.push({ kind: 'effect_apply', t_ms: t, side: self.side, slot: it.slot, effect: 'jam', magnitude: mag, stacks: 1 });
      return;
    }

    if (b.effect === 'entropy') {
      // Charge consumed on opponent's next fire. Cap at one pending charge so
      // a chain of entropy fires doesn't queue multiple drains for one event.
      if (opponent.entropy_pending.length === 0) {
        opponent.entropy_pending.push({ slot: it.slot, source_side: self.side, magnitude: mag });
      }
      log.push({ kind: 'effect_apply', t_ms: t, side: self.side, slot: it.slot, effect: 'entropy', magnitude: mag, stacks: 1 });
      return;
    }

    // Tickable status (leak, overflow). Stack-decay handles lifetime.
    const stacks = b.stacks ?? 1;
    apply_effect_to(opponent, b.effect, mag, stacks, t, log, it.slot, self.side);
    return;
  }

  if (b.kind === 'reactive_damage') {
    // Arm a charge on our side. Cap each queue at one charge so consecutive
    // arms don't pile into a "save up six honeypots and dump them" exploit.
    if (b.trigger === 'on_enemy_fire') {
      if (self.honeypot_traps.length === 0) {
        self.honeypot_traps.push({ slot: it.slot, dmg: it.dmg });
      }
    } else if (b.trigger === 'on_self_hit') {
      if (self.deflect_armed.length === 0) {
        self.deflect_armed.push({ slot: it.slot, ratio: 0.5 });
      }
    }
    log.push({ kind: 'fire', t_ms: t, side: self.side, slot: it.slot, item: it.def.id, dmg: 0, silent: true });
    return;
  }
}

function apply_effect_to(
  s: SideState, kind: EffectKind, magnitude: number, stacks: number,
  t: number, log: LogEntry[], source_slot: number, source_side: Side,
): void {
  const existing = s.effects.find((e) => e.kind === kind);
  if (existing) {
    // Stack accumulation. Cap is global (MAX_STACKS) so a single item
    // can't pin enemy at 10+ stacks indefinitely.
    existing.stacks = Math.min(MAX_STACKS, existing.stacks + stacks);
  } else {
    s.effects.push({
      kind, magnitude,
      stacks: Math.min(MAX_STACKS, stacks),
      next_tick_ms: t + TICK_INTERVAL_MS,
    });
  }
  log.push({ kind: 'effect_apply', t_ms: t, side: source_side, slot: source_slot, effect: kind, magnitude, stacks });
}

function deal_damage(victim: SideState, attacker: SideState, dmg: number, t: number, log: LogEntry[]): void {
  let actual = dmg;

  // patch_block: pooled absorption from shielded_ack fires. Eats from the top.
  if (victim.patch_block > 0 && actual > 0) {
    const blocked = Math.min(victim.patch_block, actual);
    actual -= blocked;
    victim.patch_block -= blocked;
    log.push({ kind: 'patch_block', t_ms: t, side: victim.side, magnitude: blocked });
  }

  // deflect: pop one charge, split the remaining hit. Reflected portion goes
  // direct to the attacker, bypassing their patch/deflect (no chaining).
  if (victim.deflect_armed.length > 0 && actual > 0) {
    const charge = victim.deflect_armed.shift()!;
    const reflected = Math.floor(actual * charge.ratio);
    if (reflected > 0) {
      actual -= reflected;
      attacker.hp -= reflected;
      log.push({ kind: 'fire', t_ms: t, side: victim.side, slot: charge.slot, item: 'deflect', dmg: reflected, trigger: true });
    }
  }

  if (actual > 0) {
    victim.hp -= actual;
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
