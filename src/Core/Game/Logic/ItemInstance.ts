// An item instance is a (id, tier) pair. Stats derive from ItemDef + tier multipliers.
// Plain data; serializable for snapshots.

import { ItemTier } from './ItemDef';

export interface ItemInstance {
  defId: string;
  tier: ItemTier;
  uid: number;  // unique-per-run id, used by drag/merge to identify across moves
}

let _next_uid = 1;
export function fresh_uid(): number {
  return _next_uid++;
}

export function make_instance(defId: string, tier: ItemTier = 1): ItemInstance {
  return { defId, tier, uid: fresh_uid() };
}
