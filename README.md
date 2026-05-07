# Proton 1

A hacker-themed async auto-battler. You sit at a terminal, queue exploits and defenses into five slots, and watch them trade against an opponent's tower on a fixed cooldown loop. Inspired by Oaken Tower, retold in green-on-black with Maple Mono NF glyphs.

The full design notes live in `gameplay.md`.

## Stack

- pixi.js v8 for rendering. No sprites - everything is shapes and Nerd Font codepoints.
- TypeScript 6, strict-ish (see `tsconfig.json`).
- Vite for dev server and production bundling.
- Biome for lint and format. Config in `biome.json`.
- pnpm as the package manager.
- pino for browser-side structured logging.
- @tweenjs/tween.js is wired through DI but most tweening is hand-rolled for now.

## Quick start

```sh
pnpm install
pnpm dev          # vite dev server, hot reload, regenerates DI on file changes
pnpm build        # CalculateDeps + tsc + vite build, output in dist/
pnpm preview      # serve dist/
pnpm deps         # regenerate src/Dep/ControlContainer.ts manually
```

The dev server picks up changes under `src/Core/**` and re-runs `CalculateDeps.js` automatically. You usually do not need `pnpm deps` by hand.

The browser tab needs to be tall and narrow. Logical canvas is 1080x1920; the renderer letterboxes whatever client viewport you give it.

## Project layout

```
src/
  proton.ts                 entry. spins up the DI container and calls startGame().
  main.css                  body reset, no-touch-callout, full-bleed canvas.
  Dep/                      hand-rolled DI.
    ControlContainer.ts     GENERATED. do not hand-edit.
    SmartDepend.ts          builds the dep graph by scanning class constructors.
    Dep.ts, DepNode.ts, DepResolver.ts, ObjectMaker.ts
  Core/
    Proton.ts               root composition. registers scenes, starts loop.
    Services/Pino.ts        logger.
    Plugin/                 abstract layer over the renderer.
      IScreen.ts, IGfxLoader.ts, ISceneManager.ts,
      IAbstractGameObject.ts, IGraphics.ts, ITweenJs.ts
      Screen.ts, GfxLoader.ts, SceneManager.ts, AbstractGameObject.ts, TweenJs.ts
      Pixi/                 the only place that imports from 'pixi.js'.
        PixiLayer.ts        wraps Application, stage, scene-root swap, overlays.
        PxText.ts           IAbstractGameObject backed by PIXI.Text.
        PxGraphics.ts       IAbstractGameObject + IGraphics, dashed strokes etc.
        PxPoint.ts
    Kernel/                 generic engine pieces. no game knowledge.
      Control/Loop.ts       requestAnimationFrame loop. Calls registered fns with real dt.
      Control/ScaleManager.ts   tracks entities, repositions on window resize.
      Control/DragManager.ts    arm/threshold/ghost drag with stage-level pointermove.
      Control/ParticleSystem.ts retained from prior project, currently idle.
      Control/Config.ts, ExecTime.ts
      Data/                 plain data holders (FunObj, Resource, ScaleMode, SceneData).
      GameObjects/
        CoreEntity.ts       base class. holds Position, Display, Input, foreign object.
        Text.ts, Graphic.ts, Sprite.ts   thin entities composed of components.
        EntityFactory.ts    creates new entities from prototypes.
        IScene.ts, CoreScene.ts
        Component/
          Position.ts       logical x/y, anchors, resize-aware placement.
          Display.ts        alpha, visible, scale, tint. Owns the alpha pulse helper.
          Input.ts          pointer-tap, hover, hit-area routing.
          Label.ts          text content + style, lives on Text.
          Scale.ts          maps logical 1080x1920 onto the actual viewport.
    Game/                   game-specific code. depends on Kernel and Plugin, never reverse.
      Theme.ts              colors, glyphs, dimensions, ASCII chrome. single source of truth.
      Logic/
        BattleSim.ts        pure deterministic tick simulator. Returns a log.
        ItemDef.ts          catalog. damage core, defense, effects, support.
        ItemInstance.ts     a board item with tier and merge state.
        Inventory.ts, ShopState.ts, RunState.ts
        OpponentGen.ts      seeded opponent snapshots.
        Rng.ts              seeded PRNG.
      GameItems/            composed widgets used across scenes.
        Slot, Button, FirewallBar, CombatLog, TerminalPanel, Dossier, Avatar, FPSCounter
      Scene/                Loading, Menu, Shop, Battle. each implements IScene.
public/
  assets/fonts/MapleMono-NF-Regular.ttf   loaded by the Loading scene at boot.
  favicon.svg
CalculateDeps.js            scans src/Core, emits src/Dep/ControlContainer.ts.
container.template          template the generator fills in.
```

## Architecture

The codebase is split into four layers. The rule is one-way dependency: each layer can only see things below it. This makes the boundaries real instead of suggested, and keeps the renderer at arm's length.

```
Game           firewalls, breaches, items, theme, scenes, run state
  |
Kernel         engine. loop, components, entities, drag, scale. no game knowledge.
  |
Plugin         abstract interfaces + renderer-agnostic glue.
  |
Plugin/Pixi    only place 'pixi.js' is imported. implements the interfaces.
```

### Why four layers and not two

The Kernel calls into the renderer constantly: create a Text, draw a rect, hit-test a point, swap a scene root, install a pointer listener. If the Kernel imported `pixi.js` directly, you would have PIXI types leaking into every game object, every component, every scene. Replacing PIXI later, or stubbing it for a headless test, becomes a rewrite.

Instead, the Kernel only sees the **Plugin** layer's interfaces:

- `IScreen` for renderer setup, resize, asset loading, scene-root swap.
- `ISceneManager` for scene registration, transitions, and adding objects to the current scene.
- `IAbstractGameObject` for the contract every renderable backend must satisfy: `x`, `y`, `alpha`, `visible`, `scale`, `tint`, `width`, `height`, `on(event, cb)`, `destroy()`, `createNew()`.
- `IGraphics` for shape primitives.
- `IGfxLoader` for asset registration and download.
- `ITweenJs` if and when we need it.

`Screen`, `SceneManager`, and `GfxLoader` are concrete classes that live in the Plugin layer but contain no PIXI code. They orchestrate. The actual pixi.js calls are confined to `Plugin/Pixi/PixiLayer.ts`, `PxText.ts`, `PxGraphics.ts`, `PxPoint.ts`. Those four files are the only place `import { ... } from 'pixi.js'` appears.

### What "swap the renderer" means in practice

To move to a different backend (Three.js, raw canvas, headless for tests), you write a new folder next to `Plugin/Pixi/`, implement the same interfaces, and update the DI registration. Nothing in `Kernel` or `Game` changes. The interfaces are deliberately small for this reason. `IAbstractGameObject` is essentially a flat property bag because that is what every 2D renderer can agree on.

### How DI ties it together

The container does not know any of this is layered. It just builds singletons by following constructor parameter types. The layering shows up as imports inside each file: a Game-layer scene imports `EntityFactory` (Kernel), `IScene` (Kernel), `Theme` (Game), and `ISceneManager` (Plugin). It never imports anything from `Plugin/Pixi`. Lint cannot enforce that yet, but it is small enough to read and keep honest.

### Game objects as components

Inside the Kernel, a game object is a `CoreEntity` composed of components: `Position`, `Display`, `Input`, plus a `foreignObject` that satisfies `IAbstractGameObject`. `Text` adds `Label`. Nothing inherits from a PIXI type. The PIXI side is a leaf, held by the foreign-object reference, swappable from a place the components do not know about.

This is why `Display.pulse_alpha` is on `Display`: it is a Kernel-side helper that returns a number. It does not know whether the alpha goes to a PIXI Text, a PIXI Graphics fill, or a future canvas backend.

### Dependency injection

`CalculateDeps.js` scans `src/Core`, reads each class's constructor parameter types as its deps, and emits `src/Dep/ControlContainer.ts`. At runtime `proton.ts` builds the container, resolves `Proton`, and calls `startGame()`. Everything is a singleton; if you need fresh instances, follow the `createNew()` prototype pattern (see `Slot`, `Button`, `Text`).

Avoid the substring `class` in identifiers, comments, or strings under `src/Core` unless you actually mean a class declaration. The scanner is text-based and gets confused.

### Scene lifecycle

`SceneManager.startScene(name)` runs:

1. `scaleManager.clearEntities()`. The resize watcher drops references to wrappers belonging to the outgoing scene.
2. `currentScene.shutdown()`. The scene nulls its own field references and unregisters drag targets.
3. `pixiLayer.swapSceneRoot(newScene.container)`. PIXI-side cleanup of the outgoing scene's contents.
4. `currentScene = newScene; preload().then(create())`. The new scene preloads, then builds.

Two invariants in `swapSceneRoot`:

- The scene root is reused on every re-entry. Do not destroy it. Destroy its contents and `removeChild` the root.
- `destroy()` mutates the parent's `children` array. Snapshot via `slice()` before iterating, otherwise you skip half the children.

For a new scene: `preload()` resolves immediately if there is nothing to load, `create()` builds the tree, `update(dt)` advances per frame, `shutdown()` nulls every wrapper field on the scene class. PIXI and ScaleManager handle their own teardown. Your job is dropping JS-side references so they can be collected.

### Coordinate space

- Logical canvas is 1080x1920 (portrait).
- `Position` and `Scale` map logical coordinates to the real viewport.
- `ScaleManager` registers anything with `addEntity`. On `window.resize` it walks the list and calls `position.updatePosition()` and `display.updateScale()`. Sprite, Graphic, and Text all register themselves in their `init()`.

### Battle

`BattleSim.simulate_battle(player_board, enemy_board)` is pure. It produces a `BattleResult` containing a `LogEntry[]`. The `Battle` scene plays that log back at user-controlled speed. Items have cooldowns and damage; effects (leak, overflow, entropy, jam, patch, repair) tick on the same clock. The simulator is deterministic: same seed plus same boards equals same log.

## Conventions

- Indentation: 4 spaces (Biome enforces).
- Quotes: single.
- Line width: 140.
- Filenames: PascalCase for classes (`PxGraphics.ts`), camelCase or snake_case for utilities. `useFilenamingConvention` is on.
- Identifiers: classes are PascalCase, methods and properties are snake_case or camelCase, private fields prefixed `_`. Biome enforces.
- Comments: explain *why* a non-obvious thing is the way it is. Do not narrate what the code does. There are several places in `PixiLayer.swapSceneRoot` and `BattleSim` where the comment encodes a constraint that future-you will otherwise reintroduce.
- No emoji in code.

## Adding things

- **A new scene:** create `src/Core/Game/Scene/Foo.ts` implementing `IScene`. Register it in `Core/Proton.ts`'s `_initScenes()`. The DI generator will pick up the class on next save.
- **A new item:** add an entry to `CATALOG` in `src/Core/Game/Logic/ItemDef.ts`. Ensure the glyph codepoint exists in Maple Mono NF (the comments in `Theme.ts` cover the holes we have already worked around).
- **A new game object widget:** create it under `src/Core/Game/GameItems/`. Constructor takes its dependencies (usually `EntityFactory`, sometimes `DragManager` or `RunState`). Add a `createNew()` method if the widget is a prototype that scenes will spawn instances of.
- **A new component on entities:** add it under `src/Core/Kernel/GameObjects/Component/`. Compose it into `CoreEntity` and the relevant subclasses.

## Assets

The only asset is the font. `public/assets/fonts/MapleMono-NF-Regular.ttf`, loaded by the `Loading` scene via `IGfxLoader.addResources` and exposed to PIXI Text as `fontFamily: 'Maple Mono NF'`.

If you add another font or a sound, route it through `IGfxLoader` and load it from `Loading.create()` before transitioning to `Menu`.

## Gotchas

- Scene containers are reused. Do not `destroy()` them.
- `Display.pulse_alpha(t_ms, low, high, period_ms)` is the only place pulse math lives.
- `Loop` clamps `dt` to 100 ms so a tab-switch does not replay seconds of simulation in one frame.
- `stage.hitArea = app.screen` is required for stage `pointermove` to fire over empty areas. `PixiLayer.ensureStageHitArea()` handles this.
- `PxText` and `PxGraphics` default to `eventMode = 'none'` so decorative children do not absorb clicks meant for the button beneath.
