# Adventure mode: game design

The main menu offers two modes. **Classic** is the deliverable, unchanged: a faithful recreation of the reference video. **Adventure** is the extra: the same core loop, with levels, chains, power-ups and a boss.

## Menu
- Wood frame panel with two plank buttons: **CLASSIC** and **ADVENTURE**. The "TAP THE PIGS!" banner stays as the in-game hint.
- Adventure opens a **level map**: a row of 5 plank tiles, each showing 0–3 stars. The next locked level shows a padlock.
- Progress (stars per level) is saved in `localStorage`.

## Core loop (same as Classic)
Tap the front pig of a column. It runs the rail and shoots the **front** block of each lane when the colours match. The rail holds 5 pigs.

## What Adventure adds

### 1. Board size
- Blocks keep their normal size. Smaller levels are **smaller boards** centred in the same spot.
- Runners still use the full rail. Lanes exist only where there are blocks, and the rail beyond the board is a no-shoot gap.

### 2. Out of pigs = fail (stakes)
- Each level has a **finite pig queue** and ammo per pig.
- If the queue and the rail are both empty while blocks remain, the level ends with **OUT OF PIGS!** and a Retry button.
- For reference, Classic already has 36 pigs × 20 ammo = 720 shots for 676 blocks, so it's tight too.

### 3. Chains (Bejeweled feel)
- The board is made of checker squares (`checker` × `checker` blocks). A square **bursts** when its last block dies.
- A burst pops the **nearest block in each of the 4 side-neighbour squares**. In a checkerboard those neighbours are the *other* colour, so clearing white weakens black and the reverse. That makes the two colours interact.
- If a popped block finishes its square, that square bursts too. That's the **chain**.
- Each chain step:
  - is delayed 0.12 s
  - raises the hit pitch +8%
  - makes the sparkles 15% bigger
- Words: chain 2 → NICE, 3 → GREAT, 4+ → AWESOME.
- Bursts ignore front-occlusion, because it's an explosion.

### 4. Rainbow pig (golden blocks)
- A few blocks per level are **golden**: a per-instance tint and a sparkle glint every 2 s.
- A pig that hits one goes **RAINBOW** for 3 s: its shots ignore colour, so it fires at *any* front block, with rainbow trails and faster fire.

### 5. Line wipe
- Clearing a whole row or column sends a **shockwave** into the next line: every other block in it pops, with a sweep animation from one end to the other.
- Word: LINE!

### 6. Boss block (last level)
- The centre 4×4 blocks are one **big crate** with an HP bar (sprite label, like the ammo count).
- It's hit when it's the front block of a lane, and **any colour** can hit it. Each hit: bump, crack sparkles, HP down.
- At 0 HP: explosion, slow-mo 0.6 s, camera push, then the win.

## Stars
| Stars | Rule |
|---|---|
| ★ | cleared |
| ★★ | cleared with ≤ 70% of the pigs |
| ★★★ | cleared with ≤ 50% of the pigs |

The win panel shows stars popping in one by one, then **NEXT** and **RETRY**.

## Levels
| # | Name | Board | Pigs × ammo | New thing |
|---|---|---|---|---|
| 1 | Warm up | 13×13 checker | 12 × 20 | tap, rail, colours |
| 2 | Chain gang | 13×13 | 10 × 20 | chains |
| 3 | Gold rush | 18×18 | 16 × 20 | 4 golden blocks |
| 4 | Stripes | 18×18 horizontal stripes | 16 × 20 | line wipes shine on stripes |
| 5 | Big crate | 26×26 + boss (HP 40) | 30 × 20 | boss |

Patterns: `checker`, `stripes`, `rings`, plus an `ascii` option for hand-drawn shapes later.

## Data (tokens.js)
```js
ADVENTURE:{
  chain:{delay:.12,pitch:.08,grow:.15,words:{2:'nice',3:'great',4:'awesome'}},
  rainbow:{duration:3,fireRate:2,glint:2},
  wipe:{every:2,sweep:.4},
  boss:{size:4,hp:40,slowmo:.6},
  stars:[1,.7,.5],
  levels:[{name:'Warm up',size:13,pattern:'checker',queues:['DLDL','LDLD','DLDL','LDLD'],ammo:20,golden:0,boss:false}, ...]
}
```

## Built so far (branch `adventure`)
- **Menu:** Classic / Adventure, with the title on the hanging sign.
- **In-place restart:** no page reload. Each level lives in its own `stage` group that is torn down and disposed.
- **Adventure levels** in `ADVENTURE.levels` (`tokens.js`). Sizes must divide by `checker`.

  | # | Board | Pigs × ammo |
  |---|---|---|
  | 1 | 12×12 checker | 12 × 20 |
  | 2 | 16×16 stripes | 16 × 20 |
  | 3 | 16×16 big checker (4) | 16 × 20 |
  | 4 | 26×26 (Classic board) | 36 × 20 |

- **Out of pigs → fail screen** (Retry / Menu), Adventure only. **Win → Next level / Play again / Menu.**
- **Not yet:** stars, level map, chains, rainbow, line wipe, boss.

## Build order (easiest first)
1. **Menu + mode switch + in-place restart.** Rebuild the grid, pigs and rail without reloading the page. Everything else needs this.
2. **Level data:** grid size, scale, pattern and queues from tokens instead of Blender custom props (Classic keeps Blender's).
3. **Out-of-pigs fail + stars + level map.**
4. **Chains.**
5. **Rainbow pig.**
6. **Line wipe.**
7. **Boss.**

Classic keeps working at every step. Adventure-only rules are gated by the level data, so Classic has none of them.
