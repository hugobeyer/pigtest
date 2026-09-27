# Adventure mode: game design

The main menu offers two modes. **Classic** is the deliverable, unchanged: a faithful recreation of the reference video. **Adventure** is the extra: the same core loop, with levels, chains and power-ups.

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

## Stars
| Stars | Rule |
|---|---|
| ★ | cleared |
| ★★ | cleared with ≤ 70% of the pigs |
| ★★★ | cleared with ≤ 50% of the pigs |

The win panel shows stars popping in one by one, then **NEXT** and **RETRY**.

## Built so far (branch `adventure`)
- **Menu** (Classic / Adventure) and **in-place restart**. Each level lives in its own `stage` group that is torn down and disposed.
- **5 levels** in `ADVENTURE.levels` (`tokens.js`). Mechanics are switched on per level with flags.

  | # | Board | Flags |
  |---|---|---|
  | 1 | 12×12 checker | none |
  | 2 | 12×12 checker | `chains` |
  | 3 | 16×16 checker | `chains`, `golden:4` |
  | 4 | 16×16 stripes | `chains`, `golden:3`, `wipe` |
  | 5 | 20×20 checker | `chains`, `golden:3`, `wipe` |

- **Code:** rules live in `src/adventure.js`, hooked into `grid.js` (`hooks.destroyed`).
- **Out of pigs → fail screen** (Adventure only). **Win → Next / Play again / Menu.**
- **Not yet:** stars and the level map.

## Next
1. Stars and the level map.
2. Tuning pass using the Feel panel (G → Feel), saved to `src/feel.json`.
