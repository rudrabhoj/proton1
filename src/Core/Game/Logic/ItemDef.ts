// Item definitions: pure data. No rendering, no DI.
//
// Each item has 3 levels: v1 (base) → v2 (3× v1 merged) → v3 (3× v2 merged).
// v2 = +50% dmg/effect, v3 = +120% dmg/effect.

import { Theme } from '../Theme';

export type EffectKind = 'leak' | 'overflow' | 'entropy' | 'jam' | 'patch' | 'repair';

export type ItemBehavior =
  | { kind: 'damage'; dmg: number; multicast?: number }
  | { kind: 'effect_self'; effect: EffectKind; magnitude: number; durationMs?: number }
  | { kind: 'effect_enemy'; effect: EffectKind; magnitude: number; stacks?: number; durationMs?: number }
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

export const CATALOG: ItemDef[] = [
  // Damage core
  {
    id: 'packet', name: 'packet', glyph: Theme.glyph.weapon.packet,
    cost: 10, cooldownMs: 3000,
    behavior: { kind: 'damage', dmg: 60 },
    description: 'basic ranged probe. cheap, reliable, ticks fast.',
  },
  {
    id: 'strike', name: 'strike', glyph: Theme.glyph.weapon.strike,
    cost: 20, cooldownMs: 2000,
    behavior: { kind: 'damage', dmg: 50 },
    description: 'fast tempo bolt. high uptime, lower per-hit.',
  },
  {
    id: 'chain', name: 'chain', glyph: Theme.glyph.weapon.chain,
    cost: 25, cooldownMs: 5000,
    behavior: { kind: 'damage', dmg: 40, multicast: 3 },
    description: 'fires 3× per trigger. devastating burst on long cd.',
  },
  {
    id: 'breach', name: 'breach', glyph: Theme.glyph.weapon.breach,
    cost: 25, cooldownMs: 4000,
    behavior: { kind: 'damage', dmg: 80 },
    description: 'heavy-hitting payload. punishes thin firewalls.',
  },
  {
    id: 'zero_day', name: '0-day', glyph: Theme.glyph.weapon.zeroDay,
    cost: 35, cooldownMs: 12000,
    behavior: { kind: 'damage', dmg: 200 },
    description: 'rare, expensive, slow. one shot can decide a match.',
  },

  // Defensive
  {
    id: 'shielded_ack', name: 'shielded_ack', glyph: Theme.glyph.defense.ack,
    cost: 20, cooldownMs: 3000,
    behavior: { kind: 'effect_self', effect: 'patch', magnitude: 40 },
    description: 'patches your firewall. reduces next incoming hit by 40.',
  },
  {
    id: 'fail2ban', name: 'fail2ban', glyph: Theme.glyph.defense.fail2ban,
    cost: 22, cooldownMs: 5000,
    behavior: { kind: 'effect_enemy', effect: 'jam', magnitude: 1000, durationMs: 1000 },
    description: 'jams opponent. extends their cooldowns by 1s.',
  },
  {
    id: 'honeypot', name: 'honeypot', glyph: Theme.glyph.defense.honeypot,
    cost: 25, cooldownMs: 6000,
    behavior: { kind: 'reactive_damage', dmg: 30, trigger: 'on_enemy_fire' },
    description: 'reactive trap. damages enemy when they trigger.',
  },

  // Effect specialists
  {
    id: 'leak', name: 'leak', glyph: Theme.glyph.effect.leak,
    cost: 22, cooldownMs: 4000,
    behavior: { kind: 'effect_enemy', effect: 'leak', magnitude: 10, stacks: 3, durationMs: 5000 },
    description: 'data leak. drains 10kb/sec per stack for 5s.',
  },
  {
    id: 'overflow', name: 'overflow', glyph: Theme.glyph.effect.overflow,
    cost: 28, cooldownMs: 6000,
    behavior: { kind: 'effect_enemy', effect: 'overflow', magnitude: 15, stacks: 1, durationMs: 8000 },
    description: 'buffer overflow. damage scales nonlinearly with stacks.',
  },
  {
    id: 'entropy', name: 'entropy', glyph: Theme.glyph.effect.entropy,
    cost: 20, cooldownMs: 4000,
    behavior: { kind: 'effect_enemy', effect: 'entropy', magnitude: 50, stacks: 1, durationMs: 10000 },
    description: 'corrupts state. next opponent trigger costs 50 hp.',
  },

  // Support
  {
    id: 'patch_kit', name: 'patch_kit', glyph: Theme.glyph.support.patch,
    cost: 25, cooldownMs: 8000,
    behavior: { kind: 'effect_self', effect: 'repair', magnitude: 10, durationMs: 5000 },
    description: 'medkit. repairs 10kb/sec for 5s.',
  },
  {
    id: 'deflect', name: 'deflect', glyph: Theme.glyph.support.deflect,
    cost: 30, cooldownMs: 5000,
    behavior: { kind: 'reactive_damage', dmg: 0, trigger: 'on_self_hit' },
    description: 'reflects 50% of next incoming hit back to sender.',
  },
  {
    id: 'sniffer', name: 'sniffer', glyph: Theme.glyph.support.sniffer,
    cost: 15, cooldownMs: 3000,
    behavior: { kind: 'damage', dmg: 20 },
    description: 'low-damage probe. cheap chip damage.',
  },
];

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
