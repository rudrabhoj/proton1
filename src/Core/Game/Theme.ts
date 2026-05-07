// Single source of truth for visual theme. Colors, glyphs, dimensions, ASCII chrome.
// All game UI imports from here. Edit one place to retheme.

export const Theme = {
  font: 'Maple Mono NF',

  // -- Palettes -----------------------------------------------------------

  // player (you / your tower)
  player: {
    bright: 0x00ff66,
    dim: 0x004422,
    line: 0x00aa44,
    text: 0xc0ffc0,
  },

  // opponent / enemy / red threats
  enemy: {
    bright: 0xff3344,
    dim: 0x442211,
    line: 0xaa2244,
    text: 0xffc0c0,
  },

  // shop / market / drop-zone / orange CTA
  market: {
    bright: 0xffaa00,
    dim: 0x442200,
    line: 0xaa6600,
    text: 0xffe0a0,
  },

  // utility
  bg: 0x000000,
  muted: 0x556655,
  textDim: 0x88aa88,
  textNormal: 0xc0ffc0,

  // -- Dimensions (logical 1080x1920) ------------------------------------

  slot: {
    size: 130,
    gap: 18,
    borderWidth: 4,
    radius: 8,
  },

  panel: {
    padding: 24,
    borderWidth: 3,
    radius: 12,
    titleFontSize: 30,
  },

  button: {
    height: 90,
    paddingX: 24,
    borderWidth: 3,
    radius: 8,
    fontSize: 36,
  },

  text: {
    body: 30,
    label: 26,
    title: 44,
    mono: 28,
    small: 22,
  },

  // -- Glyphs -------------------------------------------------------------

  // Glyph codepoints. All verified present in Maple Mono NF v7.9 via fontTools.
  // If you add a new one, run scripts/verify_glyph.py (or the font cmap probe)
  // before shipping — Maple Mono NF doesn't carry the entire Nerd Font set.
  glyph: {
    weapon: {
      packet:   '\u{f487}',  // nf-md-package_variant
      strike:   '\u{f0e7}',  // nf-md-flash / fa-bolt
      chain:    '\u{f0c1}',  // nf-fa-link
      breach:   '\u{f05b}',  // nf-fa-crosshairs (replaces missing shield_off_outline)
      zeroDay:  '\u{f188}',  // nf-fa-bug
    },
    defense: {
      ack:        '\u{f132}',  // nf-fa-shield
      fail2ban:   '\u{f05e}',  // nf-fa-ban
      honeypot:   '\u{f1e2}',  // nf-fa-bomb
    },
    effect: {
      leak:     '\u{f043}',  // nf-fa-tint (replaces missing md-water)
      overflow: '\u{f06d}',  // nf-fa-fire
      entropy:  '\u{e214}',  // nf-cod-virus (replaces missing md-radioactive)
    },
    support: {
      patch:    '\u{f0fa}',  // nf-fa-medkit
      deflect:  '\u{f01e}',  // nf-fa-undo
      sniffer:  '\u{f002}',  // nf-fa-search
    },

    // UI glyphs
    ui: {
      snowflake: '\u{f2dc}',  // nf-fa-snowflake-o
      refresh:   '\u{f021}',  // nf-fa-refresh
      menu:      '\u{f0c9}',  // nf-fa-bars
      arrowL:    '\u{2190}',  // ←
      arrowR:    '\u{2192}',  // →
      money:     '$',
      cont:      '\u{00bb}',  // »
      dot:       '\u{00b7}',  // ·
      check:     '\u{2713}',  // ✓
      cross:     '\u{2717}',  // ✗
    },

    // Generic shapes (Unicode geometric — present in any reasonable font).
    shape: {
      triangle: '\u{25b2}',
      diamond:  '\u{25c6}',
      circle:   '\u{25cf}',
      play:     '\u{25b6}',
    },
  },

  // -- ASCII chrome (box-drawing) ----------------------------------------

  chrome: {
    tl: '\u{256d}',  // ╭
    tr: '\u{256e}',  // ╮
    bl: '\u{2570}',  // ╰
    br: '\u{256f}',  // ╯
    h:  '\u{2500}',  // ─
    v:  '\u{2502}',  // │
  },
};
