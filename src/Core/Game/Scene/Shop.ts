// Shop scene. Drag items from BLACK_MARKET / EXTERNAL_HDD into board.
// Drag own items to BLACK_MARKET row to sell.

import { EntityFactory } from "../../Kernel/GameObjects/EntityFactory";
import { IScene } from "../../Kernel/GameObjects/IScene";
import { ISceneManager } from "../../Plugin/ISceneManager";
import { DragManager, DragPayload, DropTarget } from "../../Kernel/Control/DragManager";
import { ScaleManager } from "../../Kernel/Control/ScaleManager";
import { Pino } from "../../Services/Pino";

import { Slot } from "../GameItems/Slot";
import { TerminalPanel } from "../GameItems/TerminalPanel";
import { Button } from "../GameItems/Button";
import { FirewallBar } from "../GameItems/FirewallBar";

import { Graphic } from "../../Kernel/GameObjects/Graphic";
import { Text } from "../../Kernel/GameObjects/Text";

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
const SELL_REFUND_FRACTION = 0.5;
const SELL_FADE_MS = 600;

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
  private _scaleManager: ScaleManager;
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

  // Market sell-back: invisible bounds node for the drop target, plus the
  // ephemeral overlay shown while a draggable hovers over the market row.
  private _market_drop_node: Graphic | null;
  private _sell_zone_bg: Graphic | null;
  private _sell_amount_text: Text | null;
  private _sell_fade_remaining_ms: number;
  private _last_drag_active: boolean;
  // The slot the current drag came from. While a sell-drag is over the
  // market we recolor this slot to market tone so the player sees its
  // origin highlighted in yellow; we also retint the ghost. We keep the
  // original tone so we can restore it on leave / drag complete.
  private _drag_source_view: SlotView | null;
  private _drag_source_tone: 'shop' | 'board' | 'hdd' | null;

  constructor(entityFactory: EntityFactory, sceneManager: ISceneManager, dragManager: DragManager,
  scaleManager: ScaleManager, pino: Pino,
  slot: Slot, panel: TerminalPanel, button: Button, firewallBar: FirewallBar,
  shopState: ShopState, inventory: Inventory, runState: RunState) {
    this._entityFactory = entityFactory;
    this._sceneManager = sceneManager;
    this._dragManager = dragManager;
    this._scaleManager = scaleManager;
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

    this._market_drop_node = null;
    this._sell_zone_bg = null;
    this._sell_amount_text = null;
    this._sell_fade_remaining_ms = 0;
    this._last_drag_active = false;
    this._drag_source_view = null;
    this._drag_source_tone = null;
  }

  public async preload(): Promise<void> {}

  // Per-frame: drive the sell-overlay fade and re-disable buttons while a
  // drag is committed (matches Oaken Tower-style "dim everything except the
  // drag and its drop targets").
  public update(dt: number): void {
    this._tick_sell_fade(dt);
    this._tick_drag_button_state();
  }

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
    this._market_drop_node = null;
    // Sell overlay refs are wrapper handles to PIXI children that the scene
    // root will destroy via swapSceneRoot. We just drop the references; the
    // ScaleManager registry is wiped by SceneManager before swap.
    this._sell_zone_bg = null;
    this._sell_amount_text = null;
    this._sell_fade_remaining_ms = 0;
    this._last_drag_active = false;
    this._drag_source_view = null;
    this._drag_source_tone = null;
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

    // Bounds node spanning the whole 5-slot row. This is what DragManager
    // hit-tests against to fire the market drop target. fillAlpha must be
    // non-zero or PxGraphics._buildFill skips .fill() entirely and PIXI
    // Graphics.getBounds() returns an empty rectangle, so the drop target
    // never matches the cursor (took an embarrassing amount of time to find).
    const node = this._entityFactory.graphic(start_x, y);
    node.graphics.fillColor = 0x000000;
    node.graphics.fillAlpha = 0.001;
    node.graphics.borderStyle = 'none';
    node.graphics.rect(0, 0, total_w, SLOT_SIZE);
    this._market_drop_node = node;
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

    // 7 elements: arrow + 5 slots + arrow. Arrows use the same box size as
    // slots so the row reads as a uniform strip; reserving anything other
    // than SLOT_SIZE for them desyncs the layout math from the rendered
    // boxes and causes overlap.
    const total_w = SLOT_SIZE * 7 + HDD_GAP * 6;
    const start_x = (1080 - total_w) / 2;
    const y = 830;

    const left_arrow = this._slot_proto.createNew();
    left_arrow.init({ x: start_x, y, size: SLOT_SIZE, tone: 'player' });
    left_arrow.set_state('filled');
    left_arrow.set_glyph(Theme.glyph.ui.arrowL);
    left_arrow.graphic.graphics.interactive = true;
    left_arrow.graphic.graphics.on('pointerup', () => this._on_hdd_prev());

    const slot_start = start_x + SLOT_SIZE + HDD_GAP;
    for (let i = 0; i < 5; i++) {
      const x = slot_start + i * (SLOT_SIZE + HDD_GAP);
      const slot = this._slot_proto.createNew();
      slot.init({ x, y, size: SLOT_SIZE, tone: 'player' });
      this._hdd_views.push({ slot, origin: 'hdd', index: i });
    }

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
    this._register_market_target();
  }

  private _register_market_target(): void {
    if (!this._market_drop_node) return;
    const target: DropTarget = {
      bounds_node: this._market_drop_node.graphics.data,
      on_drag_enter: (p) => this._on_market_enter(p),
      on_drag_leave: () => this._on_market_leave(),
      on_drop: (p) => this._on_drop_to_market(p),
    };
    this._drop_targets.push(target);
    this._dragManager.register(target);
  }

  // ---------- sell-back ----------

  private _on_market_enter(payload: DragPayload): void {
    const src: SourceRef = payload.data.src;
    if (src.origin === 'shop') return;  // can't sell what you haven't bought
    // If a previous drop is still fading out, snap it away so we don't stack
    // two overlays on top of each other.
    this._destroy_sell_overlay();
    const item: ItemInstance = payload.data.item;
    const def = get_item(item.defId);
    const refund = Math.max(1, Math.floor(def.cost * SELL_REFUND_FRACTION));
    this._build_sell_overlay(refund);

    // Recolor the drag ghost to market tone, solid-bordered. Source slot
    // goes to drop_target state in market tone, which is bright-yellow
    // dashed thicker — telegraphs "you can drop back here" alongside the
    // market drop zone. The 'empty' state uses palette.line (a dark line
    // color) which read as muted-orange and prompted the "looks solid"
    // confusion.
    this._dragManager.retint_ghost(Theme.market.dim, Theme.market.bright, false);
    if (this._drag_source_view) {
      this._drag_source_view.slot.set_tone('market');
      this._drag_source_view.slot.set_state('drop_target');
    }
  }

  private _on_market_leave(): void {
    // Always revert the cosmetic recolors on leave — the drag may continue
    // and land on a different target. The sell-overlay itself only goes
    // away if no fade is in progress.
    this._dragManager.retint_ghost(Theme.player.dim, Theme.player.bright, true);
    if (this._drag_source_view && this._drag_source_tone) {
      this._drag_source_view.slot.set_tone(this._tone_for(this._drag_source_tone));
      this._drag_source_view.slot.set_state('empty');
    }
    if (this._sell_fade_remaining_ms <= 0) {
      this._destroy_sell_overlay();
    }
  }

  private _on_drop_to_market(payload: DragPayload): boolean {
    const src: SourceRef = payload.data.src;
    if (src.origin === 'shop') return false;
    const item: ItemInstance = payload.data.item;
    const def = get_item(item.defId);
    const refund = Math.max(1, Math.floor(def.cost * SELL_REFUND_FRACTION));
    this._runState.earn(refund);
    // Best-effort placement: full market = sale completes anyway, item gone.
    this._shopState.place_in_first_empty(item);
    // Reveal the slots underneath now so the placed item is visible behind
    // the fading band — the band's alpha tween becomes a cross-fade.
    this._set_market_visible(true);
    this._sell_fade_remaining_ms = SELL_FADE_MS;
    return true;
  }

  private _build_sell_overlay(amount: number): void {
    const total_w = SLOT_SIZE * 5 + SHOP_GAP * 4;
    const start_x = (1080 - total_w) / 2;
    const y = 400;

    // Slots and their price labels go invisible while the band is up so the
    // row reads as one big sell zone instead of five small slots with stuff
    // bleeding through. They come back when _destroy_sell_overlay runs.
    this._set_market_visible(false);

    // Dashed outer band covering the whole row. Opaque enough to read as a
    // single zone rather than as a stack of slots.
    const bg = this._entityFactory.graphic(start_x, y);
    bg.graphics.fillColor = Theme.market.dim;
    bg.graphics.fillAlpha = 0.95;
    bg.graphics.borderColor = Theme.market.bright;
    bg.graphics.borderAlpha = 1;
    bg.graphics.borderWidth = 4;
    bg.graphics.borderStyle = 'dashed';
    bg.graphics.rect(0, 0, total_w, SLOT_SIZE);
    this._sell_zone_bg = bg;

    // Big "+ $N" centered. The dragged item itself is communicated by the
    // ghost (now retinted to market tone) and the dashed-yellow source slot
    // — no separate preview box inside the band.
    const txt = this._entityFactory.text(start_x + total_w / 2, y + SLOT_SIZE / 2, `+ ${Theme.glyph.ui.money} ${amount}`, {
      fontSize: 80,
      fontFamily: Theme.font,
      fill: Theme.market.bright,
    });
    txt.position.anchorX = 0.5;
    txt.position.anchorY = 0.5;
    this._sell_amount_text = txt;
  }

  private _destroy_sell_overlay(): void {
    // Each entity needs three things cleaned up: the ScaleManager registry
    // entry (otherwise the next resize calls updatePosition on a wrapper
    // whose underlying PIXI object is destroyed and null-derefs on PIXI's
    // nulled _position), the underlying foreign object (PIXI Text/Graphics),
    // and our own field reference so GC can collect the wrapper.
    const drop = (e: Graphic | Text | null) => {
      if (!e) return;
      this._scaleManager.removeEntity(e);
      e.display.destroy();
    };
    drop(this._sell_zone_bg);
    drop(this._sell_amount_text);
    this._sell_zone_bg = null;
    this._sell_amount_text = null;
    this._sell_fade_remaining_ms = 0;
    this._set_market_visible(true);
  }

  private _set_market_visible(v: boolean): void {
    for (const view of this._shop_views) view.slot.graphic.display.visible = v;
    for (const t of this._shop_price_texts) t.display.visible = v;
  }

  private _tick_sell_fade(dt: number): void {
    if (this._sell_fade_remaining_ms <= 0) return;
    this._sell_fade_remaining_ms -= dt;
    const alpha = Math.max(0, this._sell_fade_remaining_ms / SELL_FADE_MS);
    if (this._sell_zone_bg) this._sell_zone_bg.display.alpha = alpha;
    if (this._sell_amount_text) this._sell_amount_text.display.alpha = alpha;
    if (this._sell_fade_remaining_ms <= 0) {
      this._destroy_sell_overlay();
    }
  }

  private _tick_drag_button_state(): void {
    const dragging = this._dragManager.is_dragging;
    if (dragging === this._last_drag_active) return;
    this._last_drag_active = dragging;
    this._refresh_all();
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
        // Remember the source view so the market hover handlers can recolor
        // it (and restore it later) — needs to happen here, when the drag
        // actually commits, not on pointerdown.
        this._drag_source_view = view;
        this._drag_source_tone = view.origin;
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
        // Restore source slot tone in case the drag ended while over the
        // market (the market-leave callback bails on fade and never reverts
        // the recolor on a drop).
        if (this._drag_source_view && this._drag_source_tone) {
          this._drag_source_view.slot.set_tone(this._tone_for(this._drag_source_tone));
        }
        this._drag_source_view = null;
        this._drag_source_tone = null;
        this._refresh_all();
      },
    });
  }

  private _tone_for(origin: 'shop' | 'board' | 'hdd'): 'market' | 'player' {
    return origin === 'shop' ? 'market' : 'player';
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

    // Buttons go inert during a committed drag so the row reads as a single
    // drop zone instead of competing call-to-actions.
    const dragging = this._last_drag_active;

    if (this._lvl_btn) {
      const cap_reached = this._runState.level_up_cost < 0;
      this._lvl_btn.set_cost(cap_reached ? '--' : `$${this._runState.level_up_cost}`);
      this._lvl_btn.set_disabled(cap_reached || dragging);
    }
    if (this._refresh_btn) {
      this._refresh_btn.set_cost(`$${this._shopState.refresh_cost}`);
      this._refresh_btn.set_disabled(dragging);
    }
    if (this._freeze_btn) {
      this._freeze_btn.set_cost(this._shopState.is_frozen ? 'frozen' : `$${this._shopState.freeze_cost}`);
      this._freeze_btn.set_disabled(dragging);
    }
    if (this._cont_btn) this._cont_btn.set_disabled(dragging);
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
