# Proton 1 Balance Contract

The rules our items and battle system must follow. Anchored to Oaken Tower documented mechanics where they exist; designed-from-archetype where they do not. Every number in `ItemDef.ts` and every behavior in `BattleSim.ts` must be justifiable from this document or it should not exist.

## Combat invariants (from gameplay.md and the wiki Beginner's guide)

| Rule | Value | Status in our sim |
|---|---|---|
| Trigger speed cap | 10 fires / sec / item (20 in 2x) | not enforced (no current item exceeds it, but cooldown reducers could) |
| Cooldown floor | 1.0s minimum effective cooldown (0.5s in 2x) | not enforced |
| Multicast | trigger fires N times in one activation, each with own crit roll | violated: we bundle into one damage event |
| Charges | per-item per-match cap on activations | not implemented |
| Crit | crit chance % per trigger, 2x damage | not implemented |
| Status effects | stacking number on target, ticks over time | implemented but model differs from source |

## Status effect model

DoTs (`leak`, `overflow`) use stack-decay. Each trigger applies `N` stacks. Per tick (1s):
- Damage = `stacks * per_stack_damage`
- `stacks -= 1`
- Effect ends when `stacks == 0`

Heal (`repair`) is **instant per fire**, not stack-decay. Mirrors Oaken Tower's "Heal X" stat (Healing Word 0★ heals 10 per fire). One log entry, one HP move, no ticking. Symmetrising it with DoTs produced a confusing 5-tick triangular spike (60, 48, 36, 24, 12) on every patch_kit fire.

Concrete anchor numbers (from wiki Items page):
- Wildfire 0★ (Common, 25g): Burn 5 / 3.7s cd
- Wildfire 1★ (75g): Burn 10 / 3.7s cd
- Wildfire 3★ (300g): Burn 40 / 3.7s cd
- Poison Dagger 0★ (Rare, 35g): 8 dmg + Poison 3 / 2.9s cd
- Healing Word 0★ (25g): Heal 10 / 3s cd

So "Burn 5" means 5 stacks per fire. With 1 hp per stack per tick (Oaken's apparent default) and 3.7s cd, equilibrium stack count is `apply_per_fire * stack_lifetime_sec / cd_sec = 5 * 5 / 3.7 = 6.7 stacks`, sustained ~7 dps. For 25g, that is **0.28 dps/gold**.

Per-star scaling: damage doubles per star. 0★ -> 1★ = 2x, 0★ -> 3★ = 8x. Cost: 25 / 75 / 150 / 300 (3x then 2x then 2x).

## Block (from Sturdy Shield)

Sturdy Shield 0★ (Common, 15g): Block 15 / 2.8s cd. Sustained block = 15 / 2.8 = 5.4 block/sec for 15g = **0.36 block/gold**.

Block accumulates as a pool that absorbs damage on hit. (Our `patch_block` already does this.)

## Heal (from Healing Word)

Healing Word 0★ (Common, 25g): Heal 10 / 3s cd = 3.3 hps for 25g = **0.13 hps/gold**.

In our scale (towers are roughly 10x larger than Oaken's early game) we should aim for ~10x these numbers per cost unit.

## Damage (from Arcane Mace anchor in gameplay.md line 83)

Arcane Mace 0★ (25g): 10 dmg, multicast 3, 3.2s cd = 9.4 dps for 25g = **0.38 dps/gold**.

## Our scale

Fixed firewall = 1048 hp. Roughly 8-10x Oaken Tower's early-game tower. We do not implement HP scaling (gameplay.md target is 13k by Day 11). Anchor multiplier: **about 8-10x**. So our DPS targets should land around 0.3 dps/gold * 8 = **~2.4 dps per cost unit**, with damage core at the high end and DoT/disrupt at the low end.

Equivalently, for a 22g item we target ~30-50 dps; for a 38g legendary, 50-90 dps.

## Per-item plan

Status of each catalog entry against the contract:

### Final values shipped

DoT/heal totals are computed as `magnitude * triangular(stacks)`, where `triangular(n) = n*(n+1)/2`. Cooldown is chosen >= stack lifetime so cycles don't overlap into the `MAX_STACKS=10` cap.

| Item | Behavior | Per-fire | Cooldown | Sustained | Cost | dps/g |
|---|---|---|---|---|---|---|
| sniffer | 35 dmg | 35 | 2.5s | 14 dps | 14g | 1.00 |
| packet | 60 dmg | 60 | 3s | 20 dps | 18g | 1.11 |
| strike | 90 dmg | 90 | 2.5s | 36 dps | 22g | 1.64 |
| chain | 40 dmg, multicast 3 | 120 | 5s | 24 dps | 25g | 0.96 |
| breach | 110 dmg | 110 | 4s | 27.5 dps | 28g | 0.98 |
| 0-day | 320 dmg | 320 | 11s | 29 dps | 50g | 0.58 |
| leak | DoT 4 mag * 5 stacks | 60 | 5s | 12 dps | 22g | 0.55 |
| overflow | DoT 6 mag * 6 stacks | 126 | 6s | 21 dps | 28g | 0.75 |
| entropy | 100 hp on enemy's next fire | 100 | 4s | ~25 dps* | 22g | 1.14 |
| shielded_ack | queue 50 block | 50 block | 3s | ~17 block/s | 20g | 0.83 (block/g) |
| fail2ban | +1s to every enemy cd | n/a | 5s | ~25% cd-tax | 22g | utility |
| honeypot | 60 reactive | 60 | 5s | ~12 dps | 26g | 0.46 |
| deflect | reflect 50% of next hit | varies | 5s | ~equiv 15-20 dps | 30g | utility |
| patch_kit | heal 140 instant per fire | 140 heal | 8s | 17.5 hps | 26g | 0.67 (heal/g) |

\* entropy DPS depends on opponent fire rate. Capped at 1 pending charge.

### Stack-decay arithmetic, worked example for `leak`

Apply 5 stacks of magnitude 4. Each second tick: damage = stacks * mag, then stacks -= 1.

- t+1s: 5 * 4 = 20 dmg, stacks → 4
- t+2s: 4 * 4 = 16 dmg, stacks → 3
- t+3s: 3 * 4 = 12 dmg, stacks → 2
- t+4s: 2 * 4 = 8 dmg, stacks → 1
- t+5s: 1 * 4 = 4 dmg, stacks → 0, effect removed

Total = 60 dmg over 5 seconds. Cooldown = 5 s (matches lifetime, no overlap). Sustained ≈ 12 dps.

This matches the gameplay.md spec ("stacking number on the target, applied on triggers, ticks over time") and the Wildfire / Poison Dagger anchor pattern from the wiki Items page.

## Things explicitly out of scope for this rebuild

These are documented gameplay features we do not implement yet, listed so we know what is missing rather than what is broken:

- Crit, multicast-with-crit-rolls, charges
- Cooldown floor + trigger speed cap enforcement (no item currently violates them but the clamp belongs in `make_state`)
- HP scaling per level / day
- Encounters, perks, packs, item bias, freeze, sell-to-bias-pool
- Star tier merging (we only ever roll v1 today; ItemInstance.tier is a field but no merge code)

## Conventions for this repo

- BattleSim outputs a deterministic log. Battle scene is a pure replay.
- Display HP must equal sim HP at all times. Any new event that reduces sim HP by less than its `fire` entry suggests must emit a compensating restore in Battle.ts (already done for `patch_block` consumption and `deflect` reflection).
- Per-stack damage is the same scalar across all DoTs (`5` in our scale, mirrored from "1 hp/stack" in source). Per-fire stack count varies by item.
- Costs respect the dps/gold band: roughly 1-2 in our scale, with utility items lower and hard-to-use items even lower.
