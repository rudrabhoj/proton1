// Generate a deterministic opponent snapshot given run state.
// No backend; v1 just picks plausible items by player level + day + seed.

import { CATALOG } from './ItemDef';
import { ItemInstance, make_instance } from './ItemInstance';
import { rng_from_seed, rng_int, rng_pick } from './Rng';

export interface OpponentSnapshot {
  name: string;
  ip: string;
  bank: number;
  ping_ms: number;
  level: number;
  board: Array<ItemInstance | null>;
}

const NAMES: ReadonlyArray<string> = [
  'xDrzwv', 'n0p3', 'r00t_dr0p', 'phr3akr', 'shellc0w',
  'nullc4t', 'kr1pt0', 'gh0st_byte', 'd34d_l0op', 'ze_b0t',
  'l00p_back', 'sn1pp3r', '0xC4FE', 'kek_w', 'b1nary_st0rm',
];

function pick_items_for_level(rng: () => number, level: number): string[] {
  // Pool of item ids appropriate for the level.
  // Higher levels may include rarer items.
  const tier_a = ['packet', 'strike', 'sniffer'];                  // common
  const tier_b = ['chain', 'breach', 'shielded_ack', 'leak'];      // mid
  const tier_c = ['fail2ban', 'honeypot', 'overflow', 'patch_kit', 'entropy', 'deflect']; // higher
  const tier_d = ['zero_day'];                                     // rare

  const pool = [
    ...tier_a, ...tier_a,
    ...tier_b, ...(level >= 3 ? tier_b : []),
    ...(level >= 4 ? tier_c : []),
    ...(level >= 6 ? tier_d : []),
  ];
  return pool.length > 0 ? pool : tier_a;
}

export function generate_opponent(run_seed: number, day: number, player_level: number): OpponentSnapshot {
  const rng = rng_from_seed((run_seed ^ (day * 0x9E3779B1)) >>> 0);
  const op_level = Math.max(1, player_level - 1 + rng_int(rng, 0, 2));
  const slots_filled = Math.min(5, 3 + Math.floor(day / 2));
  const board: Array<ItemInstance | null> = new Array(5).fill(null);
  const pool = pick_items_for_level(rng, op_level);
  for (let i = 0; i < slots_filled; i++) {
    const id = rng_pick(rng, pool);
    const has_def = CATALOG.some((d) => d.id === id);
    if (!has_def) continue;
    // Tier: low level → almost always v1, higher → small chance v2/v3
    const tier_roll = rng();
    let tier: 1 | 2 | 3 = 1;
    if (op_level >= 4 && tier_roll > 0.85) tier = 2;
    if (op_level >= 6 && tier_roll > 0.97) tier = 3;
    board[i] = make_instance(id, tier);
  }

  return {
    name: rng_pick(rng, NAMES),
    ip: `${rng_int(rng, 10, 250)}.${rng_int(rng, 0, 256)}.${rng_int(rng, 0, 256)}.${rng_int(rng, 1, 250)}`,
    bank: 50 + rng_int(rng, 0, 300),
    ping_ms: rng_int(rng, 8, 80),
    level: op_level,
    board,
  };
}
