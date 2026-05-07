// Shop scene. Drag items from BLACK_MARKET / EXTERNAL_HDD into board.
// Drag own items to BLACK_MARKET row to sell.

import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { IScene } from "../../Kernel/GameObjects/IScene";
import { ISceneManager } from "../../Plugin/ISceneManager";
import { DragManager, DragPayload, DropTarget } from "../../Kernel/Control/DragManager";
import { Pino } from "../../Services/Pino";

import { Slot } from "../GameItems/Slot";
import { TerminalPanel } from "../GameItems/TerminalPanel";
import { Button } from "../GameItems/Button";
import { FirewallBar } from "../GameItems/FirewallBar";

import { ShopState } from "../Logic/ShopState";
import { Inventory, SlotLocation } from "../Logic/Inventory";
import { RunState } from "../Logic/RunState";
import { ItemInstance } from "../Logic/ItemInstance";
import { get_item } from "../Logic/ItemDef";
import { rng_from_seed } from "../Logic/Rng";
import { Theme } from "../Theme";

const SLOT_SIZE = 130;
const SHOP_GAP = 18;
const HDD_GAP = 12;

interface SourceRef {
  origin: 'shop' | 'board' | 'hdd';
  index: number;            // shop index OR board index OR hdd absolute index
}

interface SlotView {
  slot: Slot;
  origin: 'shop' | 'board' | 'hdd';
  index: number;
}

export class Shop implements IScene {
  private _entityFactory: EntityFactory;
  private _sceneManager: ISceneManager;
  private _dragManager: DragManager;
  private _pino: Pino;

  private _slot_proto: Slot;
  private _panel_proto: TerminalPanel;
  private _button_proto: Button;
  private _bar_proto: FirewallBar;

  private _shopState: ShopState;
  private _inventory: Inventory;
  private _runState: RunState;

  // views
  private _shop_views: SlotView[];
  private _hdd_views: SlotView[];
  private _board_views: SlotView[];
  private _shop_price_texts: any[];
  private _bank_text: any | null;
  private _income_text: any | null;
  private _level_text: any | null;
  private _lvl_btn: Button | null;
  private _cont_btn: Button | null;
  private _refresh_btn: Button | null;
  private _freeze_btn: Button | null;
  private _hdd_page_text: any | null;
  private _drop_targets: DropTarget[];

  constructor(entityFactory: EntityFactory, sceneManager: ISceneManager, dragManager: DragManager, pino: Pino,
  slot: Slot, panel: TerminalPanel, button: Button, firewallBar: FirewallBar,
  shopState: ShopState, inventory: Inventory, runState: RunState) {
    this._entityFactory = entityFactory;
    this._sceneManager = sceneManager;
    this._dragManager = dragManager;
    this._pino = pino;
    this._slot_proto = slot;
    this._panel_proto = panel;
    this._button_proto = button;
    this._bar_proto = firewallBar;
    this._shopState = shopState;
    this._inventory = inventory;
    this._runState = runState;

    this._shop_views = [];
    this._hdd_views = [];
    this._board_views = [];
    this._shop_price_texts = [];
    this._bank_text = null;
    this._income_text = null;
    this._level_text = null;
    this._lvl_btn = null;
    this._cont_btn = null;
    this._refresh_btn = null;
    this._freeze_btn = null;
    this._hdd_page_text = null;
    this._drop_targets = [];
  }

  public async preload(): Promise<void> {}
  public update(): void {}

  public create(): void {
    // shutdown() (or constructor on first run) guarantees clean state here.
    this._build_chrome();
    this._build_darkweb();
    this._build_market();
    this._build_freeze_refresh();
    this._build_hdd();
    this._build_player_bar();
    this._build_board();
    this._build_footer();
    this._setup_drag();
    this._refresh_all();
  }

  // Scene is a DI singleton — fields outlive the scene instance. swapSceneRoot
  // destroys our PIXI children, but our wrapper objects (Slots, Buttons, Texts)
  // remain in the view arrays holding refs to those destroyed PIXI nodes.
  // Drop them here so the next create() starts on a clean slate.
  public shutdown(): void {
    this._dragManager.unregister_all();
    this._shop_views = [];
    this._hdd_views = [];
    this._board_views = [];
    this._shop_price_texts = [];
    this._drop_targets = [];
    this._bank_text = null;
    this._income_text = null;
    this._level_text = null;
    this._lvl_btn = null;
    this._cont_btn = null;
    this._refresh_btn = null;
    this._freeze_btn = null;
    this._hdd_page_text = null;
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

  private _build_darkweb(): void {
    const panel = this._panel_proto.createNew();
    panel.init({ x: 50, y: 130, w: 980, h: 170, tone: 'market', title: 'darkweb' });

    this._bank_text = this._entityFactory.text(80, 200, '', {
      fontSize: Theme.text.body,
      fontFamily: Theme.font,
      fill: Theme.market.bright,
    });
    this._bank_text.position.anchorX = 0;
    this._bank_text.position.anchorY = 0;

    this._income_text = this._entityFactory.text(80, 245, '', {
      fontSize: Theme.text.body,
      fontFamily: Theme.font,
      fill: Theme.market.text,
    });
    this._income_text.position.anchorX = 0;
    this._income_text.position.anchorY = 0;
  }

  private _build_market(): void {
    const t = this._entityFactory.text(50, 360, 'BLACK_MARKET', {
      fontSize: Theme.text.body,
      fontFamily: Theme.font,
      fill: Theme.market.bright,
    });
    t.position.anchorX = 0;
    t.position.anchorY = 0.5;

    const total_w = SLOT_SIZE * 5 + SHOP_GAP * 4;
    const start_x = (1080 - total_w) / 2;
    const y = 400;

    for (let i = 0; i < 5; i++) {
      const x = start_x + i * (SLOT_SIZE + SHOP_GAP);
      const slot = this._slot_proto.createNew();
      slot.init({ x, y, size: SLOT_SIZE, tone: 'market' });
      this._shop_views.push({ slot, origin: 'shop', index: i });

      const price = this._entityFactory.text(x + SLOT_SIZE / 2, y + SLOT_SIZE + 30, '', {
        fontSize: Theme.text.body,
        fontFamily: Theme.font,
        fill: Theme.market.bright,
      });
      price.position.anchorX = 0.5;
      price.position.anchorY = 0.5;
      this._shop_price_texts.push(price);
    }
  }

  private _build_freeze_refresh(): void {
    const total_w = 460 * 2 + 24;
    const start_x = (1080 - total_w) / 2;
    const y = 620;
    const h = 90;

    this._freeze_btn = this._button_proto.createNew();
    this._freeze_btn.init({
      x: start_x, y, w: 460, h,
      label: `${Theme.glyph.ui.snowflake} freeze`,
      costLabel: `$${this._shopState.freeze_cost}`,
      tone: 'market',
      onClick: () => this._on_freeze(),
    });

    this._refresh_btn = this._button_proto.createNew();
    this._refresh_btn.init({
      x: start_x + 460 + 24, y, w: 460, h,
      label: `${Theme.glyph.ui.refresh} refresh`,
      costLabel: '',
      tone: 'market',
      onClick: () => this._on_refresh(),
    });
  }

  private _build_hdd(): void {
    const t = this._entityFactory.text(50, 770, 'EXTERNAL_HDD', {
      fontSize: Theme.text.body,
      fontFamily: Theme.font,
      fill: Theme.player.bright,
    });
    t.position.anchorX = 0;
    t.position.anchorY = 0.5;

    this._hdd_page_text = this._entityFactory.text(1030, 770, '', {
      fontSize: Theme.text.body,
      fontFamily: Theme.font,
      fill: Theme.player.text,
    });
    this._hdd_page_text.position.anchorX = 1;
    this._hdd_page_text.position.anchorY = 0.5;

    // 7 elements: ◀ + 5 slots + ▶
    const arrow_w = 100;
    const total_w = arrow_w * 2 + SLOT_SIZE * 5 + HDD_GAP * 6;
    const start_x = (1080 - total_w) / 2;
    const y = 830;

    // Left arrow
    const left_arrow = this._slot_proto.createNew();
    left_arrow.init({ x: start_x, y, size: SLOT_SIZE, tone: 'player' });
    left_arrow.set_state('filled');
    left_arrow.set_glyph(Theme.glyph.ui.arrowL);
    left_arrow.graphic.graphics.interactive = true;
    left_arrow.graphic.graphics.on('pointerup', () => this._on_hdd_prev());

    // 5 slots
    const slot_start = start_x + arrow_w + HDD_GAP;
    for (let i = 0; i < 5; i++) {
      const x = slot_start + i * (SLOT_SIZE + HDD_GAP);
      const slot = this._slot_proto.createNew();
      slot.init({ x, y, size: SLOT_SIZE, tone: 'player' });
      this._hdd_views.push({ slot, origin: 'hdd', index: i });
    }

    // Right arrow
    const right_arrow_x = slot_start + 5 * (SLOT_SIZE + HDD_GAP);
    const right_arrow = this._slot_proto.createNew();
    right_arrow.init({ x: right_arrow_x, y, size: SLOT_SIZE, tone: 'player' });
    right_arrow.set_state('filled');
    right_arrow.set_glyph(Theme.glyph.ui.arrowR);
    right_arrow.graphic.graphics.interactive = true;
    right_arrow.graphic.graphics.on('pointerup', () => this._on_hdd_next());
  }

  private _build_player_bar(): void {
    const bar = this._bar_proto.createNew();
    bar.init({ x: 50, y: 1010, w: 980, h: 70, tone: 'player', initial_kb: 1048, max_kb: 1048 });
  }

  private _build_board(): void {
    const total_w = SLOT_SIZE * 5 + SHOP_GAP * 4;
    const start_x = (1080 - total_w) / 2;
    const y = 1110;

    for (let i = 0; i < 5; i++) {
      const x = start_x + i * (SLOT_SIZE + SHOP_GAP);
      const slot = this._slot_proto.createNew();
      slot.init({ x, y, size: SLOT_SIZE, tone: 'player' });
      this._board_views.push({ slot, origin: 'board', index: i });
    }
  }

  private _build_footer(): void {
    // identity row + lvl_up
    const id = this._entityFactory.text(50, 1320, 'DylanDan', {
      fontSize: Theme.text.body,
      fontFamily: Theme.font,
      fill: Theme.player.bright,
    });
    id.position.anchorX = 0;
    id.position.anchorY = 0.5;

    this._level_text = this._entityFactory.text(280, 1320, '', {
      fontSize: Theme.text.body,
      fontFamily: Theme.font,
      fill: Theme.player.text,
    });
    this._level_text.position.anchorX = 0;
    this._level_text.position.anchorY = 0.5;

    this._lvl_btn = this._button_proto.createNew();
    this._lvl_btn.init({
      x: 720, y: 1280, w: 290, h: 90,
      label: 'lvl_up',
      costLabel: '',
      tone: 'player',
      onClick: () => this._on_level_up(),
    });

    this._cont_btn = this._button_proto.createNew();
    this._cont_btn.init({
      x: 80, y: 1450, w: 920, h: 130,
      label: `cont ${Theme.glyph.ui.cont}`,
      tone: 'market',
      variant: 'filled',
      onClick: () => this._on_continue(),
    });
  }

  // ---------- drag wiring ----------

  private _setup_drag(): void {
    this._setup_source_drags(this._shop_views);
    this._setup_source_drags(this._hdd_views);
    this._setup_source_drags(this._board_views);
    this._register_targets(this._board_views);
    this._register_targets(this._hdd_views);
  }

  private _setup_source_drags(views: SlotView[]): void {
    for (const v of views) {
      v.slot.graphic.graphics.interactive = true;
      v.slot.graphic.graphics.on('pointerdown', (e: any) => this._on_pointerdown(v, e));
    }
  }

  // Arm a drag on pointerdown. The actual extraction (take from inventory + visual)
  // happens only when threshold is crossed via the `request` callback.
  private _on_pointerdown(view: SlotView, e: any): void {
    // Only primary button / first touch starts a drag.
    if (e && typeof e.button === 'number' && e.button !== 0) return;
    const start_x = e.global.x;
    const start_y = e.global.y;
    const src: SourceRef = { origin: view.origin, index: view.index };

    let captured_item: ItemInstance | null = null;

    this._dragManager.arm_drag({
      pointer_x: start_x,
      pointer_y: start_y,
      request: (): DragPayload | null => {
        const item = this._take_for_drag(src);
        if (!item) return null;
        captured_item = item;
        view.slot.set_state('empty');
        view.slot.clear_glyph();
        const def = get_item(item.defId);
        return {
          source_id: `${src.origin}:${src.index}`,
          data: { src, item },
          glyph: def.glyph,
          font: Theme.font,
          bg_color: this._tone_palette(view.origin).dim,
          border_color: this._tone_palette(view.origin).bright,
        };
      },
      on_complete: (accepted: boolean) => {
        if (!accepted && captured_item) {
          this._return_drag(src, captured_item);
        }
        this._refresh_all();
      },
    });
  }

  private _tone_palette(origin: 'shop' | 'board' | 'hdd') {
    if (origin === 'shop') return Theme.market;
    return Theme.player;
  }

  private _take_for_drag(src: SourceRef): ItemInstance | null {
    if (src.origin === 'shop') {
      // For shop, don't remove yet — slot_at peeks. Drop logic commits the buy.
      return this._shopState.slot_at(src.index);
    }
    if (src.origin === 'board') {
      const loc: SlotLocation = { kind: 'board', index: src.index };
      return this._inventory.take(loc);
    }
    if (src.origin === 'hdd') {
      const abs = this._inventory.hdd_page * this._inventory.hdd_slots_per_page + src.index;
      return this._inventory.take({ kind: 'hdd', index: abs });
    }
    return null;
  }

  private _return_drag(src: SourceRef, item: ItemInstance): void {
    if (src.origin === 'shop') return;
    if (src.origin === 'board') {
      this._inventory.place(item, { kind: 'board', index: src.index });
      return;
    }
    if (src.origin === 'hdd') {
      const abs = this._inventory.hdd_page * this._inventory.hdd_slots_per_page + src.index;
      this._inventory.place(item, { kind: 'hdd', index: abs });
    }
  }

  private _register_targets(views: SlotView[]): void {
    for (const v of views) {
      const target: DropTarget = {
        bounds_node: v.slot.graphic.graphics.data,
        on_drag_enter: () => v.slot.set_state('drop_target'),
        on_drag_leave: () => v.slot.set_state(this._slot_state_for(v)),
        on_drop: (p) => this._on_drop_to_slot(v, p),
      };
      this._drop_targets.push(target);
      this._dragManager.register(target);
    }
  }

  private _on_drop_to_slot(view: SlotView, payload: DragPayload): boolean {
    const src: SourceRef = payload.data.src;
    const item: ItemInstance = payload.data.item;

    // Buying from shop
    if (src.origin === 'shop') {
      const def = get_item(item.defId);
      if (!this._runState.spend(def.cost)) {
        this._pino.warn('not enough $');
        return false;
      }
      this._shopState.take(src.index);
      const dest_loc = this._loc_of(view);
      if (dest_loc.kind === 'hdd') dest_loc.index += this._inventory.hdd_page * this._inventory.hdd_slots_per_page;
      const placed = this._inventory.place(item, dest_loc);
      if (!placed) {
        // refund
        this._runState.earn(def.cost);
        this._shopState.slots()[src.index] = item;
        return false;
      }
      this._inventory.try_merge_after_place(dest_loc);
      return true;
    }

    // Moving / swapping owned items
    const dest_loc = this._loc_of(view);
    if (dest_loc.kind === 'hdd') dest_loc.index += this._inventory.hdd_page * this._inventory.hdd_slots_per_page;
    const occupant = this._inventory.take(dest_loc);
    this._inventory.place(item, dest_loc);
    if (occupant) {
      const src_loc = this._src_loc(src);
      if (src_loc) this._inventory.place(occupant, src_loc);
    }
    this._inventory.try_merge_after_place(dest_loc);
    return true;
  }

  private _src_loc(src: SourceRef): SlotLocation | null {
    if (src.origin === 'board') return { kind: 'board', index: src.index };
    if (src.origin === 'hdd') {
      return { kind: 'hdd', index: this._inventory.hdd_page * this._inventory.hdd_slots_per_page + src.index };
    }
    return null;
  }

  private _loc_of(v: SlotView): SlotLocation {
    if (v.origin === 'board') return { kind: 'board', index: v.index };
    return { kind: 'hdd', index: v.index };  // caller adjusts for page
  }

  private _slot_state_for(v: SlotView): 'filled' | 'empty' {
    if (v.origin === 'shop') {
      return this._shopState.slot_at(v.index) ? 'filled' : 'empty';
    }
    if (v.origin === 'board') {
      return this._inventory.board_at(v.index) ? 'filled' : 'empty';
    }
    return this._inventory.hdd_at_visible(v.index) ? 'filled' : 'empty';
  }

  // ---------- buttons ----------

  private _on_freeze(): void {
    if (!this._runState.spend(this._shopState.freeze_cost)) {
      this._pino.info('not enough $ to freeze');
      return;
    }
    this._shopState.freeze();
    this._refresh_all();
  }

  private _on_refresh(): void {
    if (!this._runState.spend(this._shopState.refresh_cost)) {
      this._pino.info('not enough $ to refresh');
      return;
    }
    const rng = rng_from_seed((this._runState.seed ^ (Date.now() & 0xffffffff)) >>> 0);
    this._shopState.refresh(rng, this._runState.level);
    this._refresh_all();
  }

  private _on_level_up(): void {
    if (this._runState.level_up()) this._refresh_all();
  }

  private _on_hdd_prev(): void {
    this._inventory.prev_page();
    this._refresh_all();
  }

  private _on_hdd_next(): void {
    this._inventory.next_page();
    this._refresh_all();
  }

  private _on_continue(): void {
    this._sceneManager.startScene('Battle');
  }

  // ---------- view refresh ----------

  private _refresh_all(): void {
    if (this._bank_text) this._bank_text.label.text = `${Theme.chrome.h} proton1.local:8042 ${Theme.chrome.h}${Theme.chrome.h}${Theme.chrome.h} up`;
    if (this._income_text) this._income_text.label.text = `${Theme.chrome.h} bank: $ ${this._runState.gold} ${Theme.glyph.ui.dot} income +${this._runState.income}`;
    if (this._level_text) this._level_text.label.text = `${Theme.glyph.ui.dot} lvl_${this._runState.level}`;

    if (this._lvl_btn) {
      const cap_reached = this._runState.level_up_cost < 0;
      this._lvl_btn.set_cost(cap_reached ? '--' : `$${this._runState.level_up_cost}`);
      this._lvl_btn.set_disabled(cap_reached);
    }

    if (this._refresh_btn) {
      this._refresh_btn.set_cost(`$${this._shopState.refresh_cost}`);
    }
    if (this._freeze_btn) {
      this._freeze_btn.set_cost(this._shopState.is_frozen ? 'frozen' : `$${this._shopState.freeze_cost}`);
    }
    if (this._hdd_page_text) this._hdd_page_text.label.text = `page ${this._inventory.hdd_page + 1}/${this._inventory.hdd_page_count}`;

    // Shop slots
    for (let i = 0; i < this._shop_views.length; i++) {
      const v = this._shop_views[i];
      const item = this._shopState.slot_at(i);
      if (item) {
        v.slot.set_state('filled');
        v.slot.set_glyph(get_item(item.defId).glyph, item.tier > 1 ? `v${item.tier}` : '');
        this._shop_price_texts[i].label.text = `$${get_item(item.defId).cost}`;
      } else {
        v.slot.set_state('empty');
        v.slot.clear_glyph();
        this._shop_price_texts[i].label.text = '';
      }
    }

    // Board
    for (let i = 0; i < this._board_views.length; i++) {
      const v = this._board_views[i];
      const item = this._inventory.board_at(i);
      if (item) {
        v.slot.set_state('filled');
        v.slot.set_glyph(get_item(item.defId).glyph, item.tier > 1 ? `v${item.tier}` : '');
      } else {
        v.slot.set_state('empty');
        v.slot.clear_glyph();
      }
    }

    // HDD (visible page)
    for (let i = 0; i < this._hdd_views.length; i++) {
      const v = this._hdd_views[i];
      const item = this._inventory.hdd_at_visible(i);
      if (item) {
        v.slot.set_state('filled');
        v.slot.set_glyph(get_item(item.defId).glyph, item.tier > 1 ? `v${item.tier}` : '');
      } else {
        v.slot.set_state('empty');
        v.slot.clear_glyph();
      }
    }
  }
}
