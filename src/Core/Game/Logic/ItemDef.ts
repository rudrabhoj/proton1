// Item definitions: pure data. No rendering, no DI.
//
// Star tiers: v1 (base) → v2 (3× v1 merged, +50%) → v3 (3× v2 merged, +120%).
//
// Effect lifetime is stack-driven (see balance.md). For effect_self/repair
// and effect_enemy/leak/overflow, magnitude is per-stack-per-tick and stacks
// is how many ticks the effect runs (each tick consumes one stack). No
// duration field; duration in seconds equals the starting stack count.
//
// jam and entropy are special-cased in BattleSim and don't follow the
// stack-decay model — they apply once per fire and do not tick.

import { Theme } from '../Theme';

export type EffectKind = 'leak' | 'overflow' | 'entropy' | 'jam' | 'patch' | 'repair';

export type ItemBehavior =
  | { kind: 'damage'; dmg: number; multicast?: number }
  | { kind: 'effect_self'; effect: EffectKind; magnitude: number; stacks?: number }
  | { kind: 'effect_enemy'; effect: EffectKind; magnitude: number; stacks?: number }
  | { kind: 'damage_and_effect'; dmg: number; effect: EffectKind; magnitude: number; stacks?: number }
  | { kind: 'reactive_damage'; dmg: number; trigger: 'on_enemy_fire' | 'on_self_hit' };

export type ItemColor = 'player' | 'enemy' | 'market';

export type ItemTier = 1 | 2 | 3;

export interface ItemDef {
  id: string;
  name: string;
  glyph: string;
  cost: number;          // base shop cost (v1)
  cooldownMs: number;
  behavior: ItemBehavior;
  description: string;   // shown on hold-for-info
}

// Tier multipliers applied to dmg/magnitude/cd.
const TIER_DMG_MULT: Record<ItemTier, number> = { 1: 1, 2: 1.5, 3: 2.2 };
const TIER_CD_MULT: Record<ItemTier, number> = { 1: 1, 2: 0.85, 3: 0.7 };

// -- Catalog -------------------------------------------------------------
//
// Numbers anchored to balance.md. Our HP scale (1048) is roughly 8x Oaken
// Tower's early game (~120). Damage / heal / block magnitudes target the
// dps/gold band derived there: damage core ~1.0–2.0 dps/g, DoTs ~0.8–1.0,
// utility lower.

export const CATALOG: ItemDef[] = [
  // Damage core
  {
    id: 'packet', name: 'packet', glyph: Theme.glyph.weapon.packet,
    cost: 18, cooldownMs: 3000,
    behavior: { kind: 'damage', dmg: 60 },
    description: 'basic ranged probe. 60 dmg every 3s.',
  },
  {
    id: 'strike', name: 'strike', glyph: Theme.glyph.weapon.strike,
    cost: 22, cooldownMs: 2500,
    behavior: { kind: 'damage', dmg: 90 },
    description: 'high-impact bolt. 90 dmg every 2.5s.',
  },
  {
    id: 'chain', name: 'chain', glyph: Theme.glyph.weapon.chain,
    cost: 25, cooldownMs: 5000,
    behavior: { kind: 'damage', dmg: 40, multicast: 3 },
    description: 'fires 3 times per trigger. each shot resolves separately.',
  },
  {
    id: 'breach', name: 'breach', glyph: Theme.glyph.weapon.breach,
    cost: 28, cooldownMs: 4000,
    behavior: { kind: 'damage', dmg: 110 },
    description: 'heavy intrusion payload. 110 every 4s.',
  },
  {
    id: 'zero_day', name: '0-day', glyph: Theme.glyph.weapon.zeroDay,
    cost: 50, cooldownMs: 11000,
    behavior: { kind: 'damage', dmg: 320 },
    description: 'rare exploit. one shot can decide a match.',
  },

  // Defensive
  {
    id: 'shielded_ack', name: 'shielded_ack', glyph: Theme.glyph.defense.ack,
    cost: 20, cooldownMs: 3000,
    behavior: { kind: 'effect_self', effect: 'patch', magnitude: 50 },
    description: 'queues 50 block on the firewall. absorbs incoming hits.',
  },
  {
    id: 'fail2ban', name: 'fail2ban', glyph: Theme.glyph.defense.fail2ban,
    cost: 22, cooldownMs: 5000,
    behavior: { kind: 'effect_enemy', effect: 'jam', magnitude: 1000 },
    description: 'jams opponent. adds 1s to every enemy cooldown.',
  },
  {
    id: 'honeypot', name: 'honeypot', glyph: Theme.glyph.defense.honeypot,
    cost: 26, cooldownMs: 5000,
    behavior: { kind: 'reactive_damage', dmg: 60, trigger: 'on_enemy_fire' },
    description: 'reactive trap. 60 dmg back when enemy fires.',
  },

  // Effect specialists. magnitude is per-stack-per-tick. stacks is the
  // number of ticks (== effect lifetime in seconds). Stacks decay 1 per
  // tick, so total per fire = magnitude * triangular(stacks). Cooldowns are
  // chosen at or above the stack lifetime so cycles don't overlap into the
  // MAX_STACKS=10 cap.
  {
    id: 'leak', name: 'leak', glyph: Theme.glyph.effect.leak,
    cost: 22, cooldownMs: 5000,
    behavior: { kind: 'effect_enemy', effect: 'leak', magnitude: 4, stacks: 5 },
    description: 'data leak. 5 stacks of 4kb/stack/sec. decays 1 stack/sec.',
  },
  {
    id: 'overflow', name: 'overflow', glyph: Theme.glyph.effect.overflow,
    cost: 28, cooldownMs: 6000,
    behavior: { kind: 'effect_enemy', effect: 'overflow', magnitude: 6, stacks: 6 },
    description: 'buffer overflow. 6 stacks of 6kb/stack/sec. decays 1/sec.',
  },
  {
    id: 'entropy', name: 'entropy', glyph: Theme.glyph.effect.entropy,
    cost: 22, cooldownMs: 4000,
    behavior: { kind: 'effect_enemy', effect: 'entropy', magnitude: 100, stacks: 1 },
    description: 'corrupts state. opponent loses 100 hp on their next fire.',
  },

  // Support
  {
    id: 'patch_kit', name: 'patch_kit', glyph: Theme.glyph.support.patch,
    cost: 26, cooldownMs: 8000,
    behavior: { kind: 'effect_self', effect: 'repair', magnitude: 140 },
    description: 'medkit. heals 140 immediately on fire.',
  },
  {
    id: 'deflect', name: 'deflect', glyph: Theme.glyph.support.deflect,
    cost: 30, cooldownMs: 5000,
    behavior: { kind: 'reactive_damage', dmg: 0, trigger: 'on_self_hit' },
    description: 'reflects 50% of next incoming hit back to sender.',
  },
  {
    id: 'sniffer', name: 'sniffer', glyph: Theme.glyph.support.sniffer,
    cost: 14, cooldownMs: 2500,
    behavior: { kind: 'damage', dmg: 35 },
    description: 'low-damage probe. 35 dmg every 2.5s.',
  },
];

// -- Pools ---------------------------------------------------------------
//
// Item rarity tiers, used by both the shop and the opponent generator. Both
// sides MUST draw from the same pool at the same level — pool asymmetry
// translates directly into win-rate asymmetry. Defenses (tier_c) need to be
// available to the opponent as soon as they're available to the player; if
// the player can buy fail2ban at level 1 but the opponent can't field one
// until level 4, the player wins on access alone.

const TIER_A = ['packet', 'strike', 'sniffer'] as const;            // common: damage core
const TIER_B = ['chain', 'breach', 'shielded_ack', 'leak'] as const; // mid: bursts and DoT
const TIER_C = ['fail2ban', 'honeypot', 'overflow', 'patch_kit',     // epic: defenses + heavy effect
                'entropy', 'deflect'] as const;
const TIER_D = ['zero_day'] as const;                                // legendary

// Weighted pool for a given level. Higher levels skew toward rarer items
// without locking commons out entirely. Tiers are not hard-gated past level
// 1; they are weighted so progression feels meaningful but doesn't cliff.
export function pool_for_level(level: number): string[] {
  return [
    ...TIER_A, ...TIER_A, ...TIER_A,
    ...TIER_B, ...TIER_B, ...(level >= 2 ? TIER_B : []),
    ...TIER_C, ...(level >= 4 ? TIER_C : []),
    ...(level >= 3 ? TIER_D : []),
  ];
}

// -- Helpers --------------------------------------------------------------

export function get_item(id: string): ItemDef {
  const def = CATALOG.find((x) => x.id === id);
  if (!def) throw new Error(`unknown item id: ${id}`);
  return def;
}

export function tiered_dmg(base: number, tier: ItemTier): number {
  return Math.round(base * TIER_DMG_MULT[tier]);
}

export function tiered_cd(baseMs: number, tier: ItemTier): number {
  return Math.round(baseMs * TIER_CD_MULT[tier]);
}

export function tiered_magnitude(base: number, tier: ItemTier): number {
  return Math.round(base * TIER_DMG_MULT[tier]);
}
