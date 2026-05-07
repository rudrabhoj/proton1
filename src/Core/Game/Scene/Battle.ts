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

import { Graphic } from "../../Kernel/GameObjects/Graphic";
import { Text } from "../../Kernel/GameObjects/Text";
import { Display } from "../../Kernel/GameObjects/Component/Display";

import { Inventory } from "../Logic/Inventory";
import { RunState } from "../Logic/RunState";
import { simulate_battle, BattleResult, LogEntry } from "../Logic/BattleSim";
import { generate_opponent, OpponentSnapshot } from "../Logic/OpponentGen";
import { get_item, tiered_cd } from "../Logic/ItemDef";
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
  private _cont_btn: Button | null;
  private _speed: number;
  private _speed_btn: Button | null;

  private _player_hp: number;
  private _enemy_hp: number;
  private _player_hp_max: number;
  private _enemy_hp_max: number;

  // Per-slot cooldown bars + state. Index = board slot.
  private _player_cd_bars: (Graphic | null)[];
  private _enemy_cd_bars: (Graphic | null)[];
  private _player_last_fire: number[];
  private _enemy_last_fire: number[];
  private _player_cd_full: number[];
  private _enemy_cd_full: number[];

  private _result: BattleResult | null;
  private _opponent: OpponentSnapshot | null;
  private _playback_t: number;
  private _next_log_idx: number;
  private _finished: boolean;
  private _resolved: boolean;
  private _outcome_text: Text | null;
  private _outcome_pulse_low: number;
  private _outcome_pulse_high: number;

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
    this._cont_btn = null;
    this._player_hp = 1048;
    this._enemy_hp = 1048;
    this._player_hp_max = 1048;
    this._enemy_hp_max = 1048;
    this._result = null;
    this._opponent = null;
    this._playback_t = 0;
    this._next_log_idx = 0;
    this._finished = false;
    this._resolved = false;
    this._speed = 1;
    this._speed_btn = null;
    this._player_cd_bars = [null, null, null, null, null];
    this._enemy_cd_bars = [null, null, null, null, null];
    this._player_last_fire = [0, 0, 0, 0, 0];
    this._enemy_last_fire = [0, 0, 0, 0, 0];
    this._player_cd_full = [0, 0, 0, 0, 0];
    this._enemy_cd_full = [0, 0, 0, 0, 0];
    this._outcome_text = null;
    this._outcome_pulse_low = 0;
    this._outcome_pulse_high = 1;
  }

  public async preload(): Promise<void> {}

  // Scene is a DI singleton — drop transient playback state and view refs so
  // the next entry starts fresh. PIXI children are destroyed by swapSceneRoot;
  // we still own the wrapper refs and the playback flags.
  public shutdown(): void {
    this._playback_t = 0;
    this._next_log_idx = 0;
    this._finished = false;
    this._resolved = false;
    this._speed = 1;
    this._result = null;
    this._opponent = null;
    this._player_bar = null;
    this._enemy_bar = null;
    this._log_view = null;
    this._cont_btn = null;
    this._speed_btn = null;
    this._player_cd_bars = [null, null, null, null, null];
    this._enemy_cd_bars = [null, null, null, null, null];
    this._player_last_fire = [0, 0, 0, 0, 0];
    this._enemy_last_fire = [0, 0, 0, 0, 0];
    this._player_cd_full = [0, 0, 0, 0, 0];
    this._enemy_cd_full = [0, 0, 0, 0, 0];
    this._outcome_text = null;
    this._outcome_pulse_low = 0;
    this._outcome_pulse_high = 1;
  }

  public create(): void {
    // shutdown() (or constructor on first run) guarantees clean state.
    this._opponent = generate_opponent(this._runState.seed, this._runState.day, this._runState.level);
    this._result = simulate_battle(this._inventory.board_items(), this._opponent.board);
    this._player_hp = this._result.player_hp_max;
    this._enemy_hp = this._result.enemy_hp_max;
    this._player_hp_max = this._result.player_hp_max;
    this._enemy_hp_max = this._result.enemy_hp_max;

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

    // Advance playback time always — the pulse tween still needs a clock
    // after the battle has ended so the verdict text can keep breathing.
    this._playback_t += dt * (this._finished ? 1 : this._speed);

    if (!this._finished) {
      while (this._next_log_idx < this._result.log.length) {
        const entry = this._result.log[this._next_log_idx];
        if (entry.t_ms > this._playback_t) break;
        this._apply_log_entry(entry);
        this._next_log_idx += 1;
      }

      if (this._log_view) this._log_view.render(this._playback_t);
      this._update_bars();
      this._update_cd_bars();

      if (this._next_log_idx >= this._result.log.length) {
        this._finished = true;
        this._resolve_outcome();
        if (this._cont_btn) this._cont_btn.set_disabled(false);
      }
    }

    this._tick_outcome_pulse();
  }

  private _tick_outcome_pulse(): void {
    if (!this._outcome_text) return;
    this._outcome_text.display.alpha = Display.pulse_alpha(
      this._playback_t,
      this._outcome_pulse_low,
      this._outcome_pulse_high,
      900,
    );
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
      const slot_x = start_x + i * (SLOT_SIZE + SLOT_GAP);
      const slot = this._slot_proto.createNew();
      slot.init({ x: slot_x, y, size: SLOT_SIZE, tone: 'enemy' });
      if (item) {
        slot.set_state('filled');
        slot.set_glyph(get_item(item.defId).glyph, item.tier > 1 ? `v${item.tier}` : '');
        this._enemy_cd_full[i] = tiered_cd(get_item(item.defId).cooldownMs, item.tier);
        this._enemy_cd_bars[i] = this._build_cd_bar(slot_x, y + SLOT_SIZE + 6, 'enemy');
      } else {
        slot.set_state('empty');
        this._enemy_cd_full[i] = 0;
        this._enemy_cd_bars[i] = null;
      }
    }

    this._enemy_bar = this._bar_proto.createNew();
    this._enemy_bar.init({ x: 50, y: 620, w: 980, h: 60, tone: 'enemy', initial_kb: 1048, max_kb: 1048 });
  }

  // 6-tall horizontal bar centered under the slot. Logical units; Position+Display
  // scale to the viewport. Width is mutated each frame in _update_cd_bars.
  private _build_cd_bar(slot_x: number, y: number, tone: 'player' | 'enemy'): Graphic {
    const palette = tone === 'enemy' ? Theme.enemy : Theme.player;
    const g = this._entityFactory.graphic(slot_x, y);
    g.graphics.fillColor = palette.bright;
    g.graphics.fillAlpha = 0.85;
    g.graphics.borderStyle = 'none';
    g.graphics.rect(0, 0, 0, 6);  // start empty
    return g;
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
      const slot_x = start_x + i * (SLOT_SIZE + SLOT_GAP);
      const slot = this._slot_proto.createNew();
      slot.init({ x: slot_x, y, size: SLOT_SIZE, tone: 'player' });
      if (item) {
        slot.set_state('filled');
        slot.set_glyph(get_item(item.defId).glyph, item.tier > 1 ? `v${item.tier}` : '');
        this._player_cd_full[i] = tiered_cd(get_item(item.defId).cooldownMs, item.tier);
        this._player_cd_bars[i] = this._build_cd_bar(slot_x, y + SLOT_SIZE + 6, 'player');
      } else {
        slot.set_state('empty');
        this._player_cd_full[i] = 0;
        this._player_cd_bars[i] = null;
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
    if (!this._log_view) return;

    if (entry.kind === 'fire') {
      const mc = entry.multicast && entry.multicast > 1 ? ` x${entry.multicast}` : '';
      const label = this._side_label(entry.side, entry.slot);
      if (entry.side === 'player') {
        this._enemy_hp -= entry.dmg;
        this._player_last_fire[entry.slot] = entry.t_ms;
        this._log_view.add_line(entry.t_ms, label, `${entry.item}${mc} +${entry.dmg}`);
      } else {
        this._player_hp -= entry.dmg;
        this._enemy_last_fire[entry.slot] = entry.t_ms;
        this._log_view.add_line(entry.t_ms, label, `${entry.item}${mc} -${entry.dmg}`);
      }
      return;
    }

    if (entry.kind === 'effect_tick') {
      if (entry.side === 'player') this._player_hp -= entry.dmg;
      else this._enemy_hp -= entry.dmg;
      const label = this._side_label_no_slot(entry.side);
      this._log_view.add_line(entry.t_ms, label, `${entry.effect} -${entry.dmg}`);
      return;
    }

    if (entry.kind === 'effect_apply') {
      const label = this._side_label(entry.side, entry.slot);
      this._log_view.add_line(entry.t_ms, label, `${entry.effect} +${entry.stacks}`);
      return;
    }

    if (entry.kind === 'patch_block') {
      const label = this._side_label_no_slot(entry.side);
      this._log_view.add_line(entry.t_ms, label, `patch block ${entry.magnitude}`);
      return;
    }

    if (entry.kind === 'repair') {
      if (entry.side === 'player') this._player_hp = Math.min(this._player_hp_max, this._player_hp + entry.amount);
      else this._enemy_hp = Math.min(this._enemy_hp_max, this._enemy_hp + entry.amount);
      const label = this._side_label_no_slot(entry.side);
      this._log_view.add_line(entry.t_ms, label, `repair +${entry.amount}`);
      return;
    }

    if (entry.kind === 'death') {
      const label = this._side_label_no_slot(entry.side);
      this._log_view.add_line(entry.t_ms, label, `firewall breached`);
      return;
    }

    if (entry.kind === 'draw') {
      this._log_view.add_line(entry.t_ms, '----', `connections traced`);
      return;
    }
  }

  private _side_label(side: 'player' | 'enemy', slot: number): string {
    if (side === 'player') return `D${slot + 1}`;
    return this._opponent?.name ?? 'enemy';
  }

  private _side_label_no_slot(side: 'player' | 'enemy'): string {
    if (side === 'player') return 'you';
    return this._opponent?.name ?? 'enemy';
  }

  private _update_bars(): void {
    if (this._player_bar) this._player_bar.set_kb(Math.max(0, this._player_hp));
    if (this._enemy_bar) this._enemy_bar.set_kb(Math.max(0, this._enemy_hp));
  }

  // Per-slot cooldown bar: starts full, drains to 0 at the moment the item
  // fires, then snaps back to full as last_fire is updated. Alpha tweens up
  // and blend goes 'add' near zero so an imminent trigger glows as a cue.
  private _update_cd_bars(): void {
    this._tick_side_cd_bars(this._player_cd_bars, this._player_cd_full, this._player_last_fire);
    this._tick_side_cd_bars(this._enemy_cd_bars, this._enemy_cd_full, this._enemy_last_fire);
  }

  private _tick_side_cd_bars(bars: (Graphic | null)[], cd_full_arr: number[], last_fire_arr: number[]): void {
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      const cd = cd_full_arr[i];
      if (!bar || cd <= 0) continue;
      const elapsed = this._playback_t - last_fire_arr[i];
      const remaining = Math.max(0, Math.min(1, 1 - elapsed / cd));
      const w = SLOT_SIZE * remaining;
      // Re-rect updates the visual width; PxGraphics's _redraw clears + re-fills.
      bar.graphics.rect(0, 0, w, 6);
      if (remaining < 0.25) {
        // Imminent trigger — additive blend + smooth alpha pulse for the
        // "about to fire" cue. Sine tween between 0.7 and 1.0 over 240ms.
        bar.graphics.fillBlend = 'add';
        bar.graphics.fillAlpha = Display.pulse_alpha(this._playback_t, 0.7, 1.0, 240);
      } else {
        bar.graphics.fillBlend = 'normal';
        // Static ramp: alpha intensifies as the bar shrinks toward 0.25.
        bar.graphics.fillAlpha = 0.65 + (1 - remaining) * 0.35;
      }
    }
  }

  private _resolve_outcome(): void {
    if (this._resolved || !this._result) return;
    this._resolved = true;
    if (this._result.outcome === 'player_win') this._runState.on_battle_win();
    else if (this._result.outcome === 'enemy_win') this._runState.on_battle_loss();
    else this._runState.on_battle_draw();
    this._show_outcome();
  }

  // Big center-screen verdict, themed by who won. Pulse range varies so wins
  // breathe brightly while losses feel dim and ominous; the pulse itself is
  // driven by Display.pulse_alpha each frame in _tick_outcome_pulse.
  private _show_outcome(): void {
    if (!this._result) return;
    let label = 'TIMEOUT';
    let color = Theme.market.bright;
    let low = 0.55;
    let high = 1.0;
    if (this._result.outcome === 'player_win') {
      label = 'TARGET BREACHED';
      color = Theme.player.bright;
      low = 0.6;
      high = 1.0;
    } else if (this._result.outcome === 'enemy_win') {
      label = 'CONNECTION TRACED';
      color = Theme.enemy.bright;
      low = 0.35;
      high = 0.95;
    }
    this._outcome_pulse_low = low;
    this._outcome_pulse_high = high;
    this._outcome_text = this._entityFactory.text(540, 960, label, {
      fontSize: 110,
      fontFamily: Theme.font,
      fill: color,
    });
    this._outcome_text.position.anchorX = 0.5;
    this._outcome_text.position.anchorY = 0.5;
  }

  private _on_continue(): void {
    if (this._runState.is_won) this._sceneManager.startScene('Menu');
    else if (this._runState.is_lost) this._sceneManager.startScene('Menu');
    else this._sceneManager.startScene('Shop');
  }
}
