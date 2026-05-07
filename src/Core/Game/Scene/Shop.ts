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
// Long-press to reveal a tooltip card. Threshold is short enough to feel
// responsive but long enough to not collide with a tap-and-flick drag.
const HOLD_MS = 600;
const TOOLTIP_CARD_X = 50;
const TOOLTIP_CARD_Y = 540;
const TOOLTIP_CARD_W = 980;
const TOOLTIP_CARD_H = 580;

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

  // Long-press tooltip. _hold_timer is a setTimeout handle (number in
  // browser, NodeJS.Timeout in node — keep as `any` to avoid lib-dom dance).
  // _tooltip_entities is every Graphic/Text the popup spawns; kept as a
  // single array so tear-down is one loop and we don't lose any to a
  // rename. The dimmer/catcher graphic is also in there.
  private _hold_timer: any;
  private _hold_indicator: Graphic | null;
  private _tooltip_entities: Array<Graphic | Text>;
  private _tooltip_open: boolean;

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
    this._hold_timer = null;
    this._hold_indicator = null;
    this._tooltip_entities = [];
    this._tooltip_open = false;
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
    // Long-press / tooltip state. Cancel the timer so it can't fire after
    // the scene swap. Wrapper refs are dropped; PIXI children die with the
    // scene root, ScaleManager is wiped by SceneManager.
    if (this._hold_timer !== null) {
      clearTimeout(this._hold_timer);
      this._hold_timer = null;
    }
    this._hold_indicator = null;
    this._tooltip_entities = [];
    this._tooltip_open = false;
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
  // Also arms the long-press tooltip timer; a tap that doesn't move within
  // HOLD_MS reveals the tooltip and cancels the drag.
  private _on_pointerdown(view: SlotView, e: any): void {
    // Only primary button / first touch starts a drag.
    if (e && typeof e.button === 'number' && e.button !== 0) return;
    // If a tooltip is open, swallow the gesture — taps inside the tooltip
    // are handled by its own children, taps outside are handled by the
    // tooltip's catcher. A pointerdown reaching here means the underlying
    // slot somehow received it; just ignore.
    if (this._tooltip_open) return;

    const start_x = e.global.x;
    const start_y = e.global.y;
    const src: SourceRef = { origin: view.origin, index: view.index };

    let captured_item: ItemInstance | null = null;

    this._start_hold(view);

    this._dragManager.arm_drag({
      pointer_x: start_x,
      pointer_y: start_y,
      request: (): DragPayload | null => {
        // Drag committed (threshold crossed) before the hold fired — abort
        // the long-press so a flick doesn't pop a tooltip mid-drag.
        this._cancel_hold();
        const item = this._take_for_drag(src);
        if (!item) return null;
        captured_item = item;
        view.slot.set_state('empty');
        view.slot.clear_glyph();
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
        // Tap or release before hold fired — kill the timer.
        this._cancel_hold();
        if (!accepted && captured_item) {
          this._return_drag(src, captured_item);
        }
        if (this._drag_source_view && this._drag_source_tone) {
          this._drag_source_view.slot.set_tone(this._tone_for(this._drag_source_tone));
        }
        this._drag_source_view = null;
        this._drag_source_tone = null;
        this._refresh_all();
      },
    });
  }

  // ---------- long-press tooltip ----------

  private _start_hold(view: SlotView): void {
    // Only market items currently get tooltips. Board/hdd holds could be
    // added later but the user's design only spec'd market.
    if (view.origin !== 'shop') return;
    if (!this._shopState.slot_at(view.index)) return;  // empty slot — nothing to inspect
    this._cancel_hold();
    this._show_hold_indicator(view);
    this._hold_timer = setTimeout(() => {
      this._hold_timer = null;
      this._on_hold_complete(view);
    }, HOLD_MS);
  }

  private _cancel_hold(): void {
    if (this._hold_timer !== null) {
      clearTimeout(this._hold_timer);
      this._hold_timer = null;
    }
    this._destroy_hold_indicator();
  }

  private _on_hold_complete(view: SlotView): void {
    // Long-press wins over any pending drag. Cancel the arm so a later
    // pointermove/pointerup doesn't commit a drag we no longer want.
    this._dragManager.cancel_arm();
    this._destroy_hold_indicator();
    this._show_tooltip(view);
  }

  private _show_hold_indicator(view: SlotView): void {
    const b = view.slot.bounds;
    if (!b) return;
    // Position the graphic at the slot's center (logical coords) and use
    // anchor(0.5, 0.5) so the shape's center aligns with that position.
    // Without anchor, PxGraphics defaults to top-left and the circle would
    // sit shifted by (r, r) from where we want it. Using the engine's
    // position system properly avoids hand-rolled offset math.
    const cx = b.x + b.size / 2;
    const cy = b.y + b.size / 2;
    // Diameter ~= slot width so the ring hugs the slot like in the
    // reference, not a giant halo.
    const radius = b.size / 2;
    const arc = this._entityFactory.graphic(cx, cy);
    arc.graphics.anchor.set(0.5, 0.5);
    arc.graphics.fillAlpha = 0;
    // Status indicator stays player-tone (green) regardless of slot palette
    // — it represents the gesture state, not the item.
    arc.graphics.borderColor = Theme.player.bright;
    arc.graphics.borderAlpha = 0.95;
    arc.graphics.borderWidth = 3;
    arc.graphics.borderStyle = 'dashed';
    arc.graphics.circle(0, 0, radius);
    this._hold_indicator = arc;
  }

  private _destroy_hold_indicator(): void {
    if (!this._hold_indicator) return;
    this._scaleManager.removeEntity(this._hold_indicator);
    this._hold_indicator.display.destroy();
    this._hold_indicator = null;
  }

  private _show_tooltip(view: SlotView): void {
    const item = this._shopState.slot_at(view.index);
    if (!item) return;
    const def = get_item(item.defId);
    const market = Theme.market;
    const player = Theme.player;
    const px = TOOLTIP_CARD_X, py = TOOLTIP_CARD_Y, pw = TOOLTIP_CARD_W, ph = TOOLTIP_CARD_H;
    const pad = 36;

    // -- Catcher (full-viewport, dim + click-to-close) ------------------
    // Added first so it's the bottom layer — card and its children sit
    // above and intercept their own taps. PIXI walks children top-down for
    // hit-test, so this only catches taps OUTSIDE the card.
    const catcher = this._entityFactory.graphic(0, 0);
    catcher.graphics.fillColor = 0x000000;
    catcher.graphics.fillAlpha = 0.55;
    catcher.graphics.borderStyle = 'none';
    catcher.graphics.rect(0, 0, 1080, 1920);
    catcher.graphics.interactive = true;
    catcher.graphics.on('pointertap', () => this._destroy_tooltip());
    this._tooltip_entities.push(catcher);

    // -- Card frame ------------------------------------------------------
    const card = this._entityFactory.graphic(px, py);
    card.graphics.fillColor = market.dim;
    card.graphics.fillAlpha = 0.95;
    card.graphics.borderColor = market.bright;
    card.graphics.borderWidth = 4;
    card.graphics.borderStyle = 'solid';
    card.graphics.rect(0, 0, pw, ph);
    card.graphics.interactive = true;  // eats clicks; card body itself is not a close button
    this._tooltip_entities.push(card);

    // -- Title (left) + × (right) ---------------------------------------
    const title_y = py + pad + 24;
    const title = this._entityFactory.text(px + pad, title_y, def.name, {
      fontSize: 56, fontFamily: Theme.font, fill: market.bright,
    });
    title.position.anchorX = 0;
    title.position.anchorY = 0.5;
    this._tooltip_entities.push(title);

    const close_size = 60;
    const close_x = px + pw - pad - close_size;
    const close_y = py + pad - 6;
    const close_bg = this._entityFactory.graphic(close_x, close_y);
    close_bg.graphics.fillColor = 0x000000;
    close_bg.graphics.fillAlpha = 0.001;
    close_bg.graphics.borderStyle = 'none';
    close_bg.graphics.rect(0, 0, close_size, close_size);
    close_bg.graphics.interactive = true;
    close_bg.graphics.on('pointertap', () => this._destroy_tooltip());
    this._tooltip_entities.push(close_bg);
    const close_x_text = this._entityFactory.text(close_x + close_size / 2, close_y + close_size / 2, '×', {
      fontSize: 56, fontFamily: Theme.font, fill: market.bright,
    });
    close_x_text.position.anchorX = 0.5;
    close_x_text.position.anchorY = 0.5;
    this._tooltip_entities.push(close_x_text);

    // -- Stats row: cooldown (left) + damage summary (right) ------------
    const stats_y = title_y + 90;
    const cd_s = (def.cooldownMs / 1000).toFixed(1);
    const cd_text = this._entityFactory.text(px + pad, stats_y, `${Theme.glyph.ui.clock} ${cd_s}s`, {
      fontSize: 44, fontFamily: Theme.font, fill: player.bright,
    });
    cd_text.position.anchorX = 0;
    cd_text.position.anchorY = 0.5;
    this._tooltip_entities.push(cd_text);

    const dmg_summary = this._dmg_summary(def);
    if (dmg_summary) {
      const dmg_text = this._entityFactory.text(px + pw / 2 + 20, stats_y, dmg_summary, {
        fontSize: 44, fontFamily: Theme.font, fill: player.bright,
      });
      dmg_text.position.anchorX = 0;
      dmg_text.position.anchorY = 0.5;
      this._tooltip_entities.push(dmg_text);
    }

    // -- "on trigger:" label + description -------------------------------
    const trigger_y = stats_y + 70;
    const trigger_label = this._entityFactory.text(px + pad, trigger_y, 'on trigger:', {
      fontSize: Theme.text.body, fontFamily: Theme.font, fill: player.text,
    });
    trigger_label.position.anchorX = 0;
    trigger_label.position.anchorY = 0;
    this._tooltip_entities.push(trigger_label);

    const desc = this._entityFactory.text(px + pad, trigger_y + 40, def.description, {
      fontSize: Theme.text.body, fontFamily: Theme.font, fill: player.bright,
      wordWrap: true, wordWrapWidth: pw - pad * 2,
    });
    desc.position.anchorX = 0;
    desc.position.anchorY = 0;
    this._tooltip_entities.push(desc);

    // -- Sell value (right-aligned) -------------------------------------
    const sell_value = Math.max(1, Math.floor(def.cost * SELL_REFUND_FRACTION));
    const sell_y = py + ph - pad - 110;
    const sell_label = this._entityFactory.text(px + pad, sell_y, 'sell value:', {
      fontSize: Theme.text.body, fontFamily: Theme.font, fill: player.text,
    });
    sell_label.position.anchorX = 0;
    sell_label.position.anchorY = 0.5;
    this._tooltip_entities.push(sell_label);
    const sell_amount = this._entityFactory.text(px + pw - pad, sell_y, `${Theme.glyph.ui.money} ${sell_value}`, {
      fontSize: Theme.text.body, fontFamily: Theme.font, fill: market.bright,
    });
    sell_amount.position.anchorX = 1;
    sell_amount.position.anchorY = 0.5;
    this._tooltip_entities.push(sell_amount);

    // -- Buy button (bottom, filled market tone) ------------------------
    const buy_x = px + pad;
    const buy_y = py + ph - pad - 70;
    const buy_w = pw - pad * 2;
    const buy_h = 70;
    const buy_bg = this._entityFactory.graphic(buy_x, buy_y);
    buy_bg.graphics.fillColor = market.dim;
    buy_bg.graphics.fillAlpha = 0.95;
    buy_bg.graphics.borderColor = market.bright;
    buy_bg.graphics.borderWidth = 3;
    buy_bg.graphics.borderStyle = 'solid';
    buy_bg.graphics.rect(0, 0, buy_w, buy_h);
    buy_bg.graphics.interactive = true;
    buy_bg.graphics.on('pointertap', () => this._tooltip_buy(view, item));
    this._tooltip_entities.push(buy_bg);
    const buy_label = this._entityFactory.text(buy_x + buy_w / 2, buy_y + buy_h / 2, `buy ${Theme.glyph.ui.dot} ${Theme.glyph.ui.money} ${def.cost}`, {
      fontSize: 38, fontFamily: Theme.font, fill: market.bright,
    });
    buy_label.position.anchorX = 0.5;
    buy_label.position.anchorY = 0.5;
    this._tooltip_entities.push(buy_label);

    this._tooltip_open = true;
  }

  private _destroy_tooltip(): void {
    if (!this._tooltip_open) return;
    for (const e of this._tooltip_entities) {
      this._scaleManager.removeEntity(e);
      e.display.destroy();
    }
    this._tooltip_entities = [];
    this._tooltip_open = false;
  }

  private _dmg_summary(def: ReturnType<typeof get_item>): string | null {
    const b = def.behavior;
    if (b.kind === 'damage') {
      const m = b.multicast && b.multicast > 1 ? ` x${b.multicast}` : '';
      return `${b.dmg}${m} dmg`;
    }
    if (b.kind === 'reactive_damage') return `${b.dmg} reactive`;
    if (b.kind === 'effect_self' && b.effect === 'patch') return `block ${b.magnitude}`;
    if (b.kind === 'effect_self' && b.effect === 'repair') return `heal ${b.magnitude}`;
    if (b.kind === 'effect_enemy') {
      const stacks = b.stacks ? ` x${b.stacks}` : '';
      return `${b.effect} ${b.magnitude}${stacks}`;
    }
    return null;
  }

  private _tooltip_buy(view: SlotView, item: ItemInstance): void {
    if (view.origin !== 'shop') {
      this._destroy_tooltip();
      return;
    }
    const def = get_item(item.defId);
    if (!this._runState.spend(def.cost)) {
      this._pino.info('not enough $');
      return;
    }
    this._shopState.take(view.index);
    let placed = false;
    for (let i = 0; i < this._inventory.board_slots; i++) {
      if (!this._inventory.board_at(i)) {
        placed = this._inventory.place(item, { kind: 'board', index: i });
        if (placed) break;
      }
    }
    if (!placed) {
      const total_hdd = this._inventory.hdd_slots_per_page * this._inventory.hdd_page_count;
      for (let i = 0; i < total_hdd; i++) {
        if (!this._inventory.hdd_at_absolute(i)) {
          placed = this._inventory.place(item, { kind: 'hdd', index: i });
          if (placed) break;
        }
      }
    }
    if (!placed) {
      // Refund and put the item back in the shop slot it came from.
      this._runState.earn(def.cost);
      this._shopState.place_in_first_empty(item);
    }
    this._destroy_tooltip();
    this._refresh_all();
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
