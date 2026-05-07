// Battle scene. Simulate the fight on create, play back log over time.

import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { IScene } from "../../Kernel/GameObjects/IScene";
import { ISceneManager } from "../../Plugin/ISceneManager";

import { Slot } from "../GameItems/Slot";
import { TerminalPanel } from "../GameItems/TerminalPanel";
import { Button } from "../GameItems/Button";
import { FirewallBar } from "../GameItems/FirewallBar";
import { CombatLog } from "../GameItems/CombatLog";
import { Dossier } from "../GameItems/Dossier";

import { Inventory } from "../Logic/Inventory";
import { RunState } from "../Logic/RunState";
import { simulate_battle, BattleResult, LogEntry } from "../Logic/BattleSim";
import { generate_opponent, OpponentSnapshot } from "../Logic/OpponentGen";
import { get_item } from "../Logic/ItemDef";
import { Theme } from "../Theme";

const SLOT_SIZE = 130;
const SLOT_GAP = 18;

export class Battle implements IScene {
  private _entityFactory: EntityFactory;
  private _sceneManager: ISceneManager;

  private _slot_proto: Slot;
  private _panel_proto: TerminalPanel;
  private _button_proto: Button;
  private _bar_proto: FirewallBar;
  private _log_proto: CombatLog;
  private _dossier_proto: Dossier;

  private _inventory: Inventory;
  private _runState: RunState;

  private _player_bar: FirewallBar | null;
  private _enemy_bar: FirewallBar | null;
  private _log_view: CombatLog | null;
  private _log_lines: string[];
  private _cont_btn: Button | null;
  private _speed: number;
  private _speed_btn: Button | null;

  private _result: BattleResult | null;
  private _opponent: OpponentSnapshot | null;
  private _playback_t: number;
  private _next_log_idx: number;
  private _finished: boolean;
  private _resolved: boolean;

  constructor(entityFactory: EntityFactory, sceneManager: ISceneManager,
  slot: Slot, panel: TerminalPanel, button: Button, firewallBar: FirewallBar, combatLog: CombatLog, dossier: Dossier,
  inventory: Inventory, runState: RunState) {
    this._entityFactory = entityFactory;
    this._sceneManager = sceneManager;
    this._slot_proto = slot;
    this._panel_proto = panel;
    this._button_proto = button;
    this._bar_proto = firewallBar;
    this._log_proto = combatLog;
    this._dossier_proto = dossier;
    this._inventory = inventory;
    this._runState = runState;

    this._player_bar = null;
    this._enemy_bar = null;
    this._log_view = null;
    this._log_lines = [];
    this._cont_btn = null;
    this._result = null;
    this._opponent = null;
    this._playback_t = 0;
    this._next_log_idx = 0;
    this._finished = false;
    this._resolved = false;
    this._speed = 1;
    this._speed_btn = null;
  }

  public async preload(): Promise<void> {}
  public shutdown(): void {}

  public create(): void {
    this._opponent = generate_opponent(this._runState.seed, this._runState.day, this._runState.level);
    this._result = simulate_battle(this._inventory.board_items(), this._opponent.board);

    this._build_chrome();
    this._build_speed_toggle();
    this._build_dossier();
    this._build_enemy_row();
    this._build_log();
    this._build_player_row();
    this._build_continue();
  }

  public update(dt: number): void {
    if (!this._result || !this._opponent) return;
    if (this._finished) return;

    this._playback_t += dt * this._speed;

    while (this._next_log_idx < this._result.log.length) {
      const entry = this._result.log[this._next_log_idx];
      if (entry.t_ms > this._playback_t) break;
      this._apply_log_entry(entry);
      this._next_log_idx += 1;
    }

    if (this._next_log_idx >= this._result.log.length) {
      this._finished = true;
      this._resolve_outcome();
      if (this._cont_btn) this._cont_btn.set_disabled(false);
    }
  }

  // ---------- builders ----------

  private _build_chrome(): void {
    const t = this._entityFactory.text(50, 60, `TARGETS ${this._runState.breaches}/${this._runState.target_breaches}`, {
      fontSize: 38,
      fontFamily: Theme.font,
      fill: Theme.player.bright,
    });
    t.position.anchorX = 0;
    t.position.anchorY = 0.5;
  }

  private _build_speed_toggle(): void {
    this._speed_btn = this._button_proto.createNew();
    this._speed_btn.init({
      x: 880, y: 30, w: 150, h: 70,
      label: '1x',
      tone: 'player',
      onClick: () => this._toggle_speed(),
    });
  }

  private _toggle_speed(): void {
    this._speed = this._speed === 1 ? 2 : 1;
    if (this._speed_btn) this._speed_btn.set_label(`${this._speed}x`);
  }

  private _build_dossier(): void {
    if (!this._opponent) return;
    const d = this._dossier_proto.createNew();
    d.init({
      x: 50, y: 130, w: 980, h: 240,
      tone: 'enemy',
      data: {
        name: this._opponent.name,
        ip: this._opponent.ip,
        bank: this._opponent.bank,
        ping_ms: this._opponent.ping_ms,
        seed: this._runState.seed ^ this._runState.day,
      },
    });
  }

  private _build_enemy_row(): void {
    if (!this._opponent) return;
    const id = this._entityFactory.text(50, 410, this._opponent.name, {
      fontSize: Theme.text.body,
      fontFamily: Theme.font,
      fill: Theme.enemy.bright,
    });
    id.position.anchorX = 0;
    id.position.anchorY = 0.5;
    const lvl = this._entityFactory.text(1030, 410, `lvl_${this._opponent.level}`, {
      fontSize: Theme.text.body,
      fontFamily: Theme.font,
      fill: Theme.enemy.text,
    });
    lvl.position.anchorX = 1;
    lvl.position.anchorY = 0.5;

    const total_w = SLOT_SIZE * 5 + SLOT_GAP * 4;
    const start_x = (1080 - total_w) / 2;
    const y = 450;

    for (let i = 0; i < 5; i++) {
      const item = this._opponent.board[i];
      const slot = this._slot_proto.createNew();
      slot.init({ x: start_x + i * (SLOT_SIZE + SLOT_GAP), y, size: SLOT_SIZE, tone: 'enemy' });
      if (item) {
        slot.set_state('filled');
        slot.set_glyph(get_item(item.defId).glyph, item.tier > 1 ? `v${item.tier}` : '');
      } else {
        slot.set_state('empty');
      }
    }

    this._enemy_bar = this._bar_proto.createNew();
    this._enemy_bar.init({ x: 50, y: 620, w: 980, h: 60, tone: 'enemy', initial_kb: 1048, max_kb: 1048 });
  }

  private _build_log(): void {
    const panel = this._panel_proto.createNew();
    panel.init({ x: 50, y: 720, w: 980, h: 280, tone: 'player' });
    this._log_view = this._log_proto.createNew();
    this._log_view.init({ x: 50, y: 720, w: 980, h: 280 });
  }

  private _build_player_row(): void {
    this._player_bar = this._bar_proto.createNew();
    this._player_bar.init({ x: 50, y: 1030, w: 980, h: 60, tone: 'player', initial_kb: 1048, max_kb: 1048 });

    const total_w = SLOT_SIZE * 5 + SLOT_GAP * 4;
    const start_x = (1080 - total_w) / 2;
    const y = 1130;

    for (let i = 0; i < 5; i++) {
      const item = this._inventory.board_at(i);
      const slot = this._slot_proto.createNew();
      slot.init({ x: start_x + i * (SLOT_SIZE + SLOT_GAP), y, size: SLOT_SIZE, tone: 'player' });
      if (item) {
        slot.set_state('filled');
        slot.set_glyph(get_item(item.defId).glyph, item.tier > 1 ? `v${item.tier}` : '');
      } else {
        slot.set_state('empty');
      }
    }

    const id = this._entityFactory.text(50, 1320, 'DylanDan', {
      fontSize: Theme.text.body,
      fontFamily: Theme.font,
      fill: Theme.player.bright,
    });
    id.position.anchorX = 0;
    id.position.anchorY = 0.5;
    const lvl = this._entityFactory.text(280, 1320, `${Theme.glyph.ui.dot} lvl_${this._runState.level}`, {
      fontSize: Theme.text.body,
      fontFamily: Theme.font,
      fill: Theme.player.text,
    });
    lvl.position.anchorX = 0;
    lvl.position.anchorY = 0.5;
  }

  private _build_continue(): void {
    this._cont_btn = this._button_proto.createNew();
    this._cont_btn.init({
      x: 80, y: 1450, w: 920, h: 130,
      label: `cont ${Theme.glyph.ui.cont}`,
      tone: 'market',
      variant: 'filled',
      onClick: () => this._on_continue(),
    });
    this._cont_btn.set_disabled(true);
  }

  // ---------- playback ----------

  private _apply_log_entry(entry: LogEntry): void {
    const side_label = entry.kind === 'draw'
      ? '----'
      : (entry as any).side === 'player' ? 'D5' : (this._opponent?.name ?? 'enemy');

    let line = '';
    if (entry.kind === 'fire') {
      const sign = entry.side === 'player' ? '+' : '-';
      const mc = entry.multicast && entry.multicast > 1 ? ` x${entry.multicast}` : '';
      line = CombatLog.format_line(0, side_label, `${entry.item}${mc}`, `${sign}${entry.dmg}`);
      if (entry.side === 'player') {
        this._damage_enemy(entry.dmg);
      } else {
        this._damage_player(entry.dmg);
      }
    } else if (entry.kind === 'effect_apply') {
      line = CombatLog.format_line(0, side_label, entry.effect, `+${entry.stacks}`);
    } else if (entry.kind === 'effect_tick') {
      line = CombatLog.format_line(0, side_label, entry.effect, `-${entry.dmg}`);
      if (entry.side === 'player') this._damage_player(entry.dmg);
      else this._damage_enemy(entry.dmg);
    } else if (entry.kind === 'patch_block') {
      line = CombatLog.format_line(0, side_label, 'patch', `block ${entry.magnitude}`);
    } else if (entry.kind === 'repair') {
      line = CombatLog.format_line(0, side_label, 'repair', `+${entry.amount}`);
      if (entry.side === 'player') this._heal_player(entry.amount);
      else this._heal_enemy(entry.amount);
    } else if (entry.kind === 'death') {
      line = CombatLog.format_line(0, side_label, 'firewall', 'breached');
    } else if (entry.kind === 'draw') {
      line = `[ now ] both connections traced`;
    }

    if (line) {
      this._log_lines.push(line);
      if (this._log_view) this._log_view.render_lines(this._log_lines);
    }
  }

  private _damage_player(dmg: number): void {
    if (!this._result || !this._player_bar) return;
    const cur = this._result.player_hp_max;  // gross approx — drift via partial sim
    // We don't track running HP separately; for v1, just rebuild from final + log scrub
    const ratio = 1 - (this._cumulative_self_damage('player') / cur);
    this._player_bar.set_kb(Math.max(0, cur * ratio));
  }

  private _damage_enemy(dmg: number): void {
    if (!this._result || !this._enemy_bar) return;
    const cur = this._result.enemy_hp_max;
    const ratio = 1 - (this._cumulative_self_damage('enemy') / cur);
    this._enemy_bar.set_kb(Math.max(0, cur * ratio));
  }

  private _heal_player(_amt: number): void {
    if (!this._result || !this._player_bar) return;
    const cur = this._result.player_hp_max;
    const ratio = 1 - (this._cumulative_self_damage('player') / cur);
    this._player_bar.set_kb(Math.max(0, cur * Math.min(1, ratio)));
  }

  private _heal_enemy(_amt: number): void {
    if (!this._result || !this._enemy_bar) return;
    const cur = this._result.enemy_hp_max;
    const ratio = 1 - (this._cumulative_self_damage('enemy') / cur);
    this._enemy_bar.set_kb(Math.max(0, cur * Math.min(1, ratio)));
  }

  // Compute cumulative damage applied to a side up to current playback index.
  private _cumulative_self_damage(side: 'player' | 'enemy'): number {
    if (!this._result) return 0;
    let total = 0;
    for (let i = 0; i < this._next_log_idx + 1 && i < this._result.log.length; i++) {
      const e = this._result.log[i];
      if (e.kind === 'fire' && e.side !== side) total += e.dmg;
      if (e.kind === 'effect_tick' && e.side === side) total += e.dmg;
      if (e.kind === 'repair' && e.side === side) total -= e.amount;
    }
    return total;
  }

  private _resolve_outcome(): void {
    if (this._resolved || !this._result) return;
    this._resolved = true;
    if (this._result.outcome === 'player_win') this._runState.on_battle_win();
    else if (this._result.outcome === 'enemy_win') this._runState.on_battle_loss();
    else this._runState.on_battle_draw();
  }

  private _on_continue(): void {
    if (this._runState.is_won) this._sceneManager.startScene('Menu');
    else if (this._runState.is_lost) this._sceneManager.startScene('Menu');
    else this._sceneManager.startScene('Shop');
  }
}
