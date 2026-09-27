# Pig playable: handoff

Where the three.js playable, the Houdini → Blender → GLB pipeline, and the job-test deliverable stand, as of 2026-09-27.

- **Repo:** `hugobeyer/pigtest`.
- **Working branch:** `adventure`. It is ahead of `main`; see §11.
- **The job brief** is `C:\Users\hugob\Documents\Sett_Test\Home Assignment – Generalist Technical Artist.pdf`.

## 1. How the project fits together

```
Houdini (props.hiplc / export.hiplc)
  └─ named geometry + textures ─► source_files/export/*.glb, source_files/textures/
       └─ Blender (source_files/props.blend ─ linked into ─► scene.blend)
            └─ Primitive panel → Export GLB ─► assets/primitive_scene.glb
                 └─ three.js game (src/), npm install / npm run dev
```

- **Houdini:** `houdini/setup_export.py` adds a `blender_names` wrangle and export nodes. `path` becomes the object name and `shop_materialpath` the material name.
- **Blender:** run `blender/scene_ui.py` once, then use the **Primitive** tab (N panel):
  - Pull Latest
  - Build Missing Assets
  - **Update Props from GLB** (new)
  - Export GLB
  - Run Vite & Play / Stop Vite

## 2. Blender rules

The asset contract is checked by `blender/asset_contract.py`:

| Required object | Type | Notes |
|---|---|---|
| `Pig_Light`, `Pig_Dark` | Empty or mesh | Pig body is a child. Parent with **Ctrl+P → Object (Without Inverse)**. |
| `Bullet_Light`, `Bullet_Dark` | Mesh | |
| `Grid_Block_Light`, `Grid_Block_Dark` | Mesh | Instanced for every cell. |
| `PigColumn_0..3` | Empty | Custom props `queue` (D/L) and `row_step`. Its position is the front pig. |
| `RailStart`, `RailEnd`, `GridCenter`, `CameraTarget` | Empty | `GridCenter` has `rows`, `columns`, `step`, `checker`. RailStart/RailEnd drive the runner path. |
| Camera | Perspective | Used directly by the game. |

- **Custom props:** `export_asset` off (skip export), `cast_shadow` / `receive_shadow` off (these inherit to children).
- **Lights:** the sun (`KeyLight`) and World drive the game's sun and ambient light. Other lights are ignored.
- **Normal maps:** OpenGL convention (green up), image node set to Non-Color. The props map was checked and is fine.

### Props: updating from Houdini (important)

- `props.blend` holds one flat collection, `Props_Library`: 27 meshes (`Clump_00` … `Tree_01`) at the origin, all using the material `/mat/Env_Props`.
- `scene.blend` links it with a **library override** (Selected & Content). Copies made with Alt+D live in `Environment`.
- **Never delete and re-import props.** It changes the override hierarchy, and Blender 5.2 crashes on load in `lib_override_library_resync`. That happened this session. The recovery was a forced resync (Outliner → Library Overrides → Troubleshoot → Resync Enforce).
- **Correct way:** open `props.blend` → **Update Props from GLB** → save → open `scene.blend`.
  - The button (`blender/update_props.py`) reads `source_files/export/props.glb`.
  - For matching names it swaps each object's mesh in place, so the object, name and material stay.
  - It adds new props, keeps (and lists in the console) props missing from the GLB, and removes duplicate materials and images.
  - Tested on copies: 27/27 updated, no `.001` duplicates, and a linked scene opened fine.

## 3. The game (src/)

| File | What it does |
|---|---|
| `main.js` | Renderer, lights, tone mapping, input raycast, frame loop, pause when the tab is hidden |
| `gameplay.js` | Menu → start/teardown of a level (`stage` group), tap rules, win/fail, restart |
| `menu.js` | Main menu (Classic / Adventure) on the wood panels |
| `adventure.js` | Adventure rules: chains, golden blocks (rainbow pig), line wipes, via `hooks.destroyed` in `grid.js` |
| `grid.js` | Instanced blocks, front-block targeting, hit pop + per-block emissive flash, glowing flare "ghosts" |
| `path.js` | Rail nodes. Adventure boards are smaller, but the path always follows the full rail. |
| `runners.js` | Pig on the rail: move → aim → fire → vanish (balloon pop), idle bob, rainbow state |
| `pigs.js` | Queue columns, tap (bump + shrink + rim glow), refuse shake for unavailable pigs, idle sway, "huh!" + `!`/`?` hint, wide invisible hit boxes |
| `shots.js` | Bullets + ribbon trails; on impact, block sparkle + sound + destroy |
| `tweens.js` | Tweens, bumps, balloon `vanish` |
| `fx/` | `sparkles` (atlas billboards), `particles` (block debris), `trail` (camera-facing ribbon), `ramp` (viridis per-hit colour), `glow` (rim flash), `ring`, `popups` (combo words), `shake` |
| `sfx.js` | Web Audio: random take + pitch per event, optional rate, music loop with fade-in |
| `win.js`, `intro.js`, `labels.js` | End/start screens; text from the baked font sheet, optionally tinted brown |
| `shading.js`, `ground.js`, `fog.js`, `environment.js` | Look (§4) |
| `debug.js`, `tune.js` | Dev-only G panel (§9) |
| `tokens.js` | All defaults; merges `look.json` and `feel.json` over them |

## 4. Look

- **Characters:** toon terminator, SSS band, back rim and sine outline. Grid blocks use a variant (`BLOCK_FLASH`) with per-instance emissive.
- **Scenery:** its own terminator and a soft sheen, plus a **normal map detail** control that brings back bump shading lost to the toon ramp. All GLB textures get 8× anisotropic filtering (`RENDER.anisotropy`).
- **Ground:** unlit vignette ramp, plus a **world-space tiling texture** (`assets/ground/ground_tile.webp`, from `source_files/textures/ground_base_color.png`). It uses only the texture's variation, not its colour, with its strength going from the centre value to the edge value. The "center offset across" control was removed and set to 0.
- **Tone mapping** (none/neutral/agx/aces/reinhard/cineon) and exposure are in the panel. The default is none. UI sprites opt out.
- **Fog:** distance fog with blend modes.

## 5. UI art

- **Panels** (`assets/ui/`, cut from `source_files/ui/panels.webp`):
  - `banner.webp`: start banner and menu buttons
  - `hanging.webp`: win title
  - `frame.webp`: stats card
  - Text insets are in `style.css`; strings and sizes in `WIN`, `INTRO`, `MENU` (`tokens.js`). The "Pig pop!" title is a placeholder.
- **Font sheet** (`assets/fonts/digits.*`): 0–9, `/`, A–Z, `!`, `?` (`?` added this session). Letter spacing now scales with text size. Re-bake with `tools/bake_digits.py`.
- **FX atlas** (`assets/fx/sparkles.webp`, 6×4, built by `tools/build_fx_atlas.py`):
  - cells 0–8: original sparkles
  - cells 12–17: white rock shards
  - cells 18–23: dark rock shards
  - `frames` in a preset lists cells, comma separated.
- **Word art:** `assets/words/*.webp`. `level_clear.webp` is unused but still bundled by the glob.

## 6. Feel and FX added this session

- **Pig exit:** inflate → poof (splash ring + debris) → balloon flight with wobble, spin and squash. 30% of pigs fly at the camera.
- **Runner idle bob; queue sway** (rows 2–3 sway less, `rows:[1,.45,.25]`). **Row gap** in columns is ×1.35 (`PIGS.rowGap`).
- **Tap:** a 0.03 s bump, then shrink to 0 over 0.08 s, plus a warm rim glow. Tapping an unavailable pig plays a head-shake and an error boop.
- **Idle hint:** after 4 s without a tap, a front pig does "huh!" (jump, freeze, slow recover) with a `!` or `?`.
- **Shots:** bullet speed 12 (was 22). A 10-segment camera-facing ribbon trail that collapses into the target on impact.
- **Viridis ramp:** each pig's streak walks purple → yellow and back. It colours the trail, the block flash and the flare.
- **Block hit:** a 0.06 s bump with a flash, then a **tall glowing fresnel flare**. It is 3.5× tall at the first hit and grows to 10× by the pig's 20th hit (`FX.ghost`).
- **Combo words:** now every 30 hits across all pigs; they were per pig, which never fired because a pig has 20 ammo. They whoosh in from a random side, bounce, and whoosh out.
- **Sparkle presets** (`SPARKLES`): one sprite per effect by default, optional min/max count, and global `sizeScale`/`countScale`.

## 7. Audio

- **SFX** (`assets/sfx/`): 37 ElevenLabs takes trimmed and normalised from `source_files/sfx`. Events are tap, shot, hit, pop, fly, huh, combo, clear and full. Settings are in `SFX` in `tokens.js`.
- **Music:** `assets/music/farm_fun_groove.mp3` (mono 64 kbps, 704 KB) loops after the first tap.
- **Unlock:** audio unlocks on the first pointerdown in the capture phase.

## 8. Modes

- **Classic:** the deliverable, a faithful recreation of the reference video. It uses Blender's grid and queues. It has no fail screen; it stops silently if pigs run out, and that is still undecided.
- **Adventure:** 5 levels in `ADVENTURE.levels`. The rules are in `adventure.js`, switched on by level flags. The design doc is `docs/ADVENTURE.md`.

  | # | Board | Flags |
  |---|---|---|
  | 1 | 12×12 checker | none |
  | 2 | 12×12 checker | `chains` |
  | 3 | 16×16 checker | `chains`, `golden:4` |
  | 4 | 16×16 stripes | `chains`, `golden:3`, `wipe` |
  | 5 | 20×20 checker | `chains`, `golden:3`, `wipe` |

  - **Chains:** a finished 2×2 square pops the nearest block in each neighbouring square. Each step rises in pitch and colour, and each new depth shows one word.
  - **Golden:** the pig that hits a golden block goes rainbow for 3 s and can shoot any colour. For now only its trails show it.
  - **Wipe:** a cleared line pops every other block in the neighbouring lines.
  - **Out of pigs → fail screen** (Retry / Menu).
- **The boss was built and removed at the user's request.** Don't bring it back.

## 9. Tuning panel (G, dev only, hidden by default)

- **Look:** everything visual. It saves to `src/look.json`, which overrides `tokens.js`.
- **Feel** (`tune.js`): gameplay sliders grouped as Pace, Tap & queue, Runner, Idle, Hits, Pig exit, Combo & chains.
  - It saves to `src/feel.json`, which `tokens.js` deep-merges into MOTION/SHOT/PIGS/ANIM/FX/ADVENTURE.
  - Also has **↻ restart level** and Copy JSON.
  - Row gap, hit width and Classic ammo apply on restart.
- **Test:** clear level, preview win screen, show intro.
- The vite dev server's save endpoint handles `/__look` and `/__feel` (`vite.config.js`).

## 10. Job-test deliverable status

- **The brief asks for:**
  - two versions: primitive, and a Fish of Fortune reskin
  - a README with v1/v2/v3 documented: what changed, why, and the exact values tuned
  - `/ai_logs/*.txt`
  - one zip: `/primitive_version`, `/styled_fof_version`, `/assets`, `/ai_logs`, `/README.md`
- **Primitive version:** on the `primitive-version` branch.
- **AI logs:** `../ai_logs/v1_primitive.txt`, `v2_feel.txt` and `v3_polish_claude_code.txt` are written. They are compacted prompts; the user decides what to send.
- **Still to do:** the root README with v1/v2/v3 values (use `tokens.js` + `feel.json`), copying `main` into `/styled_fof_version`, filling `/assets`, and a fresh `npm install && npm run dev` test of both.
- **Not in the brief:** ad-network needs (single-file build, size under 5 MB, CTA/MRAID). Optional polish only.

## 11. Git state

- `adventure` has all the code from this session (latest `b8d06ec`). `main` is behind; merge `adventure` → `main` when ready.
- **Uncommitted on `adventure`:**
  - `blender/update_props.py` (new) and `blender/scene_ui.py` (the Update Props button)
  - `src/look.json`
  - `assets/primitive_scene.glb`
  - `source_files/props.blend`, `scene.blend`, `export/props.glb`
  - `source_files/textures/props_basecolor.png`, `props_normal.png` (the new ones, restored)
  - `houdini/export.hiplc`

## 12. Next steps

1. Commit the files above, then merge `adventure` into `main`.
2. Update props through the new button, save `props.blend`, re-export the GLB.
3. Adventure: stars and the level map. Balance level 5. Add a visual cue on the rainbow pig.
4. Tuning pass in **G → Feel**, save `feel.json`, and use the values for the README's v2/v3.
5. Decide whether Classic gets the out-of-pigs screen.
6. Deliverable packaging (§10).
7. Older open items:
   - fog blend modes visual check
   - screen-space vignette
   - a third (pink) pig colour
   - Houdini `$HIP`-relative paths

## 13. Working conventions

- Code style follows `Agents.md`: compact, no comments, match existing style, tokens in `tokens.js`.
- The user tests in the browser. Don't run or screenshot the game unless asked. The build (`npm run build`) must pass after every change.
- Runtime-only bugs slip past the build (shader typos, TDZ/name clashes like the G-panel one). Re-read new GLSL and new variable names carefully.
- Commit only when asked.
- Keep answers short and in steps; the user has ADHD.
