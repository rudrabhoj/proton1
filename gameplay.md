# Oaken Tower — Gameplay Reference

> Note on the name: the game is officially titled **Oaken Tower** (two words). "Oakentower" is informal/community usage. Not to be confused with **Oaken** (a separate deckbuilder roguelike) or **Towerfall**.

## Game Identity

- **Title:** Oaken Tower
- **Developer / Publisher:** Bocary Studios (developer); Alibi Games + Bocary Studios (publisher)
- **Platform:** PC / Steam (App ID 3400960). A demo also exists (App ID 3692220).
- **Released:** 28 April 2026, Early Access.
- **Model:** Free-to-Play.
- **Genre:** Synergy-heavy **PvP auto-battler** with roguelite per-run progression. Sometimes described as a "roguelike auto-battler." Battles are asynchronous PvP — your tower fights a snapshot of another player's tower, no real-time inputs needed.
- **Session length:** ~30 minutes per run (per Gigazine).

## Core Game Loop

A run is structured as a series of **days** (rounds). Each day repeats roughly:

1. **Shop phase.** You browse the shop (7 random items by default), buy items with gold, spend gold to level up, optionally reroll the shop, and arrange items in your tower's slots. You may freeze the shop to preserve its current contents.
2. **(Optional) Encounter phase.** On certain days, an NPC encounter appears with two choices that grant items, stats, or other bonuses.
3. **Combat phase.** Your tower auto-battles a matched opponent's tower. Items trigger on cooldown automatically until one tower's HP hits 0.
4. **Resolution.** Winner gains a trophy; loser loses hearts (escalating per day). Income is paid out for the next day.

You repeat until you reach **10 trophies (win)** or **0 hearts (loss)**.

## Tower / Build Layout

- The tower has **6 item slots** (per Gigazine's demo coverage). Items snap into slots; multiple slot-granting perks can extend layout.
- **Position matters.** Some items are directional (arrow indicators). **Ranged weapons (e.g., Bow) perform better on the right side** of the tower because of projectile travel distance. Melee items don't care about side.
- **"Slots" granted by perks** (Heal Slot, Shock Slot, Poison Slot, Time Slot, Damage/Crit Slot, Shield Slot) appear to be passive bonus slots tied to specific perks — they don't behave like ordinary item slots in any documented way; the wiki does not fully spell out their mechanics. *Unverified detail: exact behavior.*

## Items

### Stats on every item

- **Damage** (a number)
- **Damage type:** Melee or Ranged
- **Cooldown** (seconds — how often the item triggers in combat)
- **Crit Chance** (% — crit deals 2× damage)
- **Multicast** (how many extra times the trigger fires per activation)
- **Charges** (uses before cooldown / limit on triggers)
- **Cost** (gold)
- **Tags** — Weapon Type + Element/Pack
- **Ability** — unique on-trigger or passive text
- Optional applied effects: **Poison, Burn, Bleed, Shock, Block, Heal**

### Weapon types (tags)

Mace, Axe, Dagger, Sword, Spear, Bow, Shield, Magic, Spell, Artifact.

### Elemental packs

Arcane, Crystal, Dark, Elven, Flame, Frosty, Holy, Moon, Storm, Witch, plus Neutral.

Each pack has an identity:

| Pack | Identity |
|---|---|
| Arcane | Rainbow / random debuffs (poison, bleed, shock, burn) |
| Crystal | Defensive / status enhancement |
| Dark | Stacking damage per Dark item |
| Elven | Support / buffing neighbors |
| Flame | Burn acceleration |
| Frosty | Trigger-on-trigger chains |
| Holy | Debuff cleansing |
| Moon | XP / level-up rewards |
| Storm | Shock multiplication |
| Witch | Potion generation, crit interactions |

### Rarity ladder

Common → Rare → Epic → Legendary, plus categories Special, Cursed, Forged, and Potions. Items also have **Star tiers**: 0★ (base), 1★, 2★, 3★.

### Upgrading (merging)

- **3 identical items → 1★ version.**
- **2 identical 1★ items → 1 2★ item.**
- **3★ items** are rare and only obtainable via specific routes:
  1. **Celestia's wish** (Day 9 encounter)
  2. **Crownforge Brew** potion (200g)
  3. **Merge Perk** (unlocked at a trophy milestone)

Stat scaling per star is dramatic. Example given by the wiki: 0★ Arcane Mace = 10 dmg / 3.2s cooldown / 3 multicast / 25g cost. The 3★ version = 80 dmg / cost 300g / "permanent random debuffs on trigger."

### Potions

30+ potions exist. They are consumables/triggers (e.g., Crit Vial, Value Potion, Crownforge Brew, Cloud in a Vial). Witch-pack items can generate potions on crit.

## Combat System

- **Fully automated.** Both towers' items tick down their cooldowns and trigger automatically. The first tower to reach 0 HP loses.
- **Trigger speed cap:** items can fire **at most 10 times per second** (20/s in 2× speed mode).
- **Cooldown floor:** an item's effective cooldown **cannot go below 1 second** (0.5s in 2× mode), no matter how many cooldown reducers you stack.
- **Crit:** crit chance % roll on each trigger; crits deal 2× damage.
- **Multicast:** the trigger fires N times in one activation. Stacks with crits and per-trigger effects.
- **Charges:** some items have limited charges; once exhausted, they stop firing for the match (or until refreshed).

### Status effects

Each effect is tracked as a **stacking number** on the target. They are applied on item triggers and tick over time. Visual cues per the wiki: poison = green bubbles, burn = fire icon, bleed = red droplets, heal = yellow.

| Effect | Behavior (as documented) |
|---|---|
| **Poison** | Damage over time. |
| **Burn** | Damage over time (fire). Boosted by Flame pack (e.g., Flare grants +4 bonus burn to burn items). |
| **Bleed** | Damage over time. |
| **Shock** | Debuff; central to Storm pack. Storm items multi-apply shock (e.g., Lightning To-Go applies shock 4×). |
| **Block** | Shield / damage absorption. |
| **Heal** | Restore HP. |

The wiki does not publish a precise damage-per-tick formula or decay rate for poison/burn/bleed. Burn and poison "work correctly with 2× speed" per patch notes — they tick on game-time, not turn-count. *Unverified: the exact tick interval and per-stack damage; reverse-engineering from items is needed for a faithful clone.*

The wiki also references Holy items "cleansing" debuffs (e.g., Divine Axe removes 20 of each debuff stack), confirming debuffs are stack-counted and reducible.

## Market / Shop / Economy

### Shop layout

- **7 random items per refresh** (default). The Stock perk raises this to 8.
- **Auto-refreshes** at the start of each day.
- **Manual reroll cost:** 3 gold initially. **After 15 rerolls in a run, each additional reroll costs +2 gold** (so reroll 16 = 5g, reroll 17 = 7g, …).
- **Freeze:** keep the current 7 items until you unfreeze or manually reroll.

> Discrepancy: Gigazine's coverage of the demo says the shop displays 9 items and gold income is 45/day. The wiki — which is more current and aligns with perk text ("Stock: shop has 8 instead of 7") — says 7. Going with **7** as canonical.

### Gold

- **Starting gold:** 55 (Gigazine).
- **Daily income:** baseline + **+5 per character level**. (Gigazine cites a flat 45/day; the wiki phrasing is "boosts income by 5 per level" implying a base + level-based add. *Unverified which is canonical for current EA.*)
- Selling items refunds some gold (used as a build-influencing tool — selling unwanted items reduces their odds of reappearing).

### Leveling (player level, separate from item star tier)

- Levels up to **7 (cap)**.
- **Cost formula:** `cost = 4 × (level − 1) + 48` gold to reach the next level. (Wiki.) So Lv1→2 costs 48g, Lv2→3 = 52g, … Lv6→7 = 68g.
- Each level: **+5 daily income**, **+max HP**, better item rarity odds, better treasure-chest rolls.

### Rarity odds by level (item-pool weights in the shop)

| Level | Common | Rare | Epic | Legendary |
|---|---|---|---|---|
| 1 | 75% | 25% | 0% | 0% |
| 3 | 54% | 35% | 10% | 1% |
| 7 (cap) | 20% | 30% | 30% | 20% |

Intermediate levels interpolate; wiki only publishes 1, 3, 7. *Unverified: 2/4/5/6 exact values.*

### Item bias

Holding items from a given pack increases the chance the shop rolls more from that pack — the **bias cap is 4 items** of a pack. Selling items from a pack reduces that bias.

## Encounters

Trigger on **days 3, 4, 6, 8, 9, 11**. Days **4, 6, and 9** are **double encounters** (you choose between two NPCs, then make a choice within that NPC's two options). You can preview both options before committing.

Examples (regular):

- **Priest (Day 3):** "Healing Touch — +100% Max HP and +10 gold," or a Blessing alternative.
- **Warrior (Day 4):** Weapon loot vs. permanent damage boost on existing weapons.
- **Elder (Day 6):** Immediate XP vs. permanent daily XP bonus.
- **Bishop (Day 11):** Significant max HP vs. damage / lucky-reroll bonus.
- **Day 9 special NPCs:** King Midas, Carmen, Lyra, **Celestia (the only routine source of a 3★ item via "Celestia's wish")**.

Seasonal encounters add holiday-themed NPCs (Mr. Spook on Day 6 in autumn, Nicholas on Day 9 in winter).

## Run Structure: Days, Hearts, Trophies

- **Win condition:** earn **10 trophies** (10 match wins) before running out of hearts.
- **Lose condition:** drop to **0 hearts**.
- **Heart loss per match defeat scales with day:**
  - Days 1–2: **−1 heart**
  - Days 3–4: **−2 hearts**
  - Day 5+: **−3 hearts**
- Starting hearts total **10** (implied: you survive ~3–4 late losses max).
- Days run from Day 0 / Day 1 up through Day 11+ in the documented build; the player target by Day 11 is **Level 7 + ~13k HP**, by Day 8 is **3,500+ HP**.

There is **no documented permadeath meta-loss** beyond losing the run; meta-progression takes the form of **unlocking perks** by completing achievements across runs.

## Perks (meta-progression)

- You select **4 perks per run** before starting.
- Most perks grant **starting items, starting slots, or starting gold**, with additional bonuses unlocked on specific days during the run.
- Default unlocked at install: **Tempo, Scorch, Toxic, Chosen.**
- Others unlock through challenges, e.g.:
  - **Lucky** — "Get a lucky roll on day 3"
  - **Turtle** — "Buy 30 Shields"
  - **Darkness** — "Earn the 10th Trophy with a full Dark build 3 times"
- **Random** ("Gain a random perk each game") only unlocks once you have all the others.

20+ perks total in EA. Categories include early-game boosters (Tempo: +10 gold), slot providers (Chosen/Turtle/Power/Growth), build specialists (Archmage, Melee, Artillery), economy (Sugar Rush, Flash Sale, Essential Oils), and high-risk (Gambit: epic items but −25% HP and −15 gold to start).

## Modes

- **Casual** — pressure-free; no ELO impact.
- **Ranked** — same rules, but match outcomes update your ELO. Mechanically identical otherwise per wiki: *"the only difference between ranked and casual is that you gain or lose elo."*
- **Endless Mode** — extended play past the standard win condition. *Unverified: details of scaling/rewards not on the wiki.*
- **Dummy battles** — hit a stationary opponent for a fixed time; used to test builds.

### Ranked specifics

- ELO-based ladder, with trophy tiers (Bronze, Silver, Gold+).
- **±20% ELO swing** if opponent average rating differs by 500+.
- **+5% ELO** for selecting the "fully random perk" option.
- 100 documented target ELO milestones; the wiki has a target table but it's incomplete.

## Resources / Currencies

- **Gold** — main currency: items, rerolls, level-ups, brews.
- **XP / Level** — gained by spending gold or by Moon-pack item triggers; level 7 cap.
- **HP** — your tower's life total in a single match (resets each match).
- **Hearts** — run-life total (10 at start; you lose if you reach 0).
- **Trophies** — wins toward the 10-trophy victory condition.
- **Charges** — per-item cap on activations within a single match.

## Synergies / Archetypes

Common build archetypes per perk and pack:

- **Magic / Spell tower** (Archmage perk + Arcane pack) — multi-debuff scaling.
- **Melee swarm** (Melee perk, 6-melee builds) — high attack density.
- **Artillery / Bow** (Artillery perk) — ranged stacked on the right side.
- **Dark stacker** — Eclipse and Dark items: each Dark item adds +damage to others ("+4 damage per dark item" example).
- **Flame burn** — Flare-style amplifiers turn small burn ticks into win conditions.
- **Frosty chains** — Coldshot fires twice when other Frosty items trigger; chain-trigger cascades.
- **Storm shock** — Lightning To-Go-style multi-shock spam; pairs with Arcane debuffs.
- **Witch potions** — generate potions mid-fight via crits; high variance.
- **Holy cleanse** — anti-debuff hard counter.
- **Shield turtle** (Turtle perk) — block-stacking defense.

## UI / UX notes

- **2× speed** mode supported (changes trigger cap and cooldown floor; status effects tick correctly under 2×).
- **Build codes** — share your tower as a string with friends.
- **Right-click on shop item** places it directly into the tower (skips inventory) if a slot is open.
- **Hover preview** on encounters before choosing.
- **Freeze shop** toggle.
- **Star/triple visualization** on items so you can see merge progress at a glance.

## Major uncertainties (flagged)

1. **Status-effect tick formula** (per-stack damage, tick interval, decay) is not published on the wiki. Items' applied numbers are visible but the resolution math isn't. A faithful clone needs reverse-engineering from gameplay video.
2. **Daily gold income** — Gigazine says flat 45/day; wiki says "+5 per level." Likely a base + level scaling, but the base value is unconfirmed for the current patch.
3. **Shop size** — Gigazine (demo build) says 9; wiki and Stock perk text say 7. **Going with 7.**
4. **Slot mechanics from perks** (Heal Slot, Shock Slot, Poison Slot, Time Slot) — wiki references them but doesn't fully document how they apply effects to attached items.
5. **Endless Mode scaling** — known to exist; specifics not documented.
6. **Intermediate level rarity odds** (levels 2, 4, 5, 6) are not published.
7. **Exact starting hearts** — implied to be 10 (since "lose 10 hearts = game over"), but not stated as a starting amount explicitly anywhere I found.
8. **Total day count for a run** — content stretches to Day 11+; the maximum day before forced resolution isn't explicitly stated. A run effectively ends on first to 10 trophies / 0 hearts.

## Sources

- [Oaken Tower on Steam](https://store.steampowered.com/app/3400960/Oaken_Tower/)
- [Oaken Tower Demo on Steam](https://store.steampowered.com/app/3692220/Oaken_Tower_Demo/)
- [Oaken Tower Wiki — Home](https://oakentower.wiki.gg/)
- [Oaken Tower Wiki — Shop](https://oakentower.wiki.gg/wiki/Shop)
- [Oaken Tower Wiki — Items](https://oakentower.wiki.gg/wiki/Items)
- [Oaken Tower Wiki — Example Item](https://oakentower.wiki.gg/wiki/Example_Item)
- [Oaken Tower Wiki — Encounter](https://oakentower.wiki.gg/wiki/Encounter)
- [Oaken Tower Wiki — Perks](https://oakentower.wiki.gg/wiki/Perks)
- [Oaken Tower Wiki — Ranked](https://oakentower.wiki.gg/wiki/Ranked)
- [Oaken Tower Wiki — Beginner's guide](https://oakentower.wiki.gg/wiki/Beginner%27s_guide)
- [GIGAZINE — hands-on with the Oaken Tower demo (April 2026)](https://gigazine.net/gsc_news/en/20260420-oaken-tower/)
- [The Games Edge — Oaken Tower Beginner Guide: Leveling Strategy & Tips](https://thegamesedge.com/oaken-tower-beginner-guide-leveling-strategy-tips/)
- [PC Gamer — "This roguelike auto-battler has me obsessed…"](https://www.pcgamer.com/games/roguelike/this-roguelike-auto-battler-has-me-obsessed-with-doing-entire-rpg-adventures-in-5-minutes/)
- [Games Press — "Oaken Tower Catapults into Early Access Today"](https://www.gamespress.com/en-US/Oaken-Tower-Catapults-into-Early-Access-Today)
