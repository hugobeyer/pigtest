# Pig playable — handoff

Status of the three.js playable ad, the Houdini → Blender → GLB art pipeline, and what's next. All work is on `main` in `hugobeyer/pigtest`.

## 1. How the project fits together

```
Houdini (props.hiplc / export.hiplc)
  └─ named geometry + textures  ─►  Blender (source_files/scene.blend, props.blend)
                                        └─ Primitive panel → Export GLB  ─►  assets/primitive_scene.glb
                                                                                 └─ three.js game (src/)
```

- **Houdini** makes the art. `houdini/setup_export.py` (paste into the Python Source Editor) adds a `blender_names` wrangle and an export node to `props`, `pig_white`, `pig_black`, `block`, `rail` and `slots`. It sets `path` (becomes the Blender object name) and `shop_materialpath` (material name). It does not save or export anything on its own.
- **Blender** composes the scene. Run `blender/scene_ui.py` once, then use the **Primitive** tab (N panel): *Build Missing Assets* and *Export GLB*.
- **The game** loads `assets/primitive_scene.glb`. Run with `npm install` then `npm run dev`.

## 2. Blender scene rules (the "asset contract")

Checked by `blender/asset_contract.py` on export. Objects must live in the **`Gameplay`** collection, except scenery, which goes in a top-level **`Environment`** collection.

| Required object | Type | Notes |
|---|---|---|
| `Pig_Light`, `Pig_Dark` | Empty or mesh, with the pig mesh inside | Pig body is a child (e.g. `Pig_Light_Body`). Parent with **Ctrl+P → Object (Without Inverse)** or the offset breaks in game. |
| `Bullet_Light`, `Bullet_Dark` | Mesh | |
| `Grid_Block_Light`, `Grid_Block_Dark` | Mesh | Instanced 26×26 times. Keep low poly, ~0.3×0.3 footprint. |
| `PigColumn_0..3` | Empty | Custom props `queue` (D/L text) and `row_step`. |
| `RailStart`, `RailEnd`, `GridCenter`, `CameraTarget` | Empty | In `GameplayAnchors`. **RailStart/RailEnd drive the runner path.** |
| Camera | Perspective | Game uses it directly. |

**No longer required** (removed this session): `Slot_0..4`, `Rail_Start`, `Rail_Main`, `Rail_End`. The rail and slots are optional art with any name.

Useful custom properties on any object:

| Property | Effect |
|---|---|
| `export_asset` = off | Object is not exported (used for `Rail_Guide`, the old curve kept as a visual guide) |
| `cast_shadow` = off | Doesn't cast shadows (inherits to children) |
| `receive_shadow` = off | Doesn't receive shadows (inherits to children) |

Other Blender facts:
- **Sun (`KeyLight`)**: its rotation, strength and colour drive the game's sun (strength 1:1).
- **World**: colour and strength drive the game's ambient sky light.
- Other Blender lights are ignored.
- **Props** live in `props.blend`, linked into `scene.blend` with a library override (**Selected & Content**). Copies made with Alt+D go in `Environment`.
- **Normal maps** use the OpenGL convention (green up), and the image node must be set to **Non-Color**.

## 3. The game (src/)

| File | What it does |
|---|---|
| `assets.js` | Loads the GLB; reads sun/World from it; applies shaders; marks `Ground_Plane` as ground |
| `shading.js` | Custom lit shader built on the Blender PBR material (see §4) |
| `environment.js` | Scenery helpers, green shadow catcher |
| `ground.js` | Unlit ground with vignette colour ramp |
| `fog.js` | Distance fog with blend modes |
| `labels.js` | Numbers/text drawn from the baked font sheet |
| `fx/popups.js` | Combo word images with pop/wobble/shine/float animation |
| `fx/sparkles.js` | Sparkle-sheet particles (level clear, tap, block hit, combo, runner done) |
| `sfx.js` | Sound effects: random take per event from `assets/sfx/<event>_<n>.mp3` (ElevenLabs, trimmed/normalized from `source_files/sfx`), pitch jitter, volumes in `SFX` (`tokens.js`). Also loops `assets/music/farm_fun_groove.mp3` (mono 64 kbps from `source_files/tune`), starting with a fade-in on the first tap |
| `win.js` | Win screen (LEVEL CLEAR image + stats from font sheet) |
| `debug.js` | Live **Look panel** (dev only) |
| `tokens.js` | Gameplay tuning (speeds, ammo, animations, combo words…) |
| `look.json` | All look values; written by the Look panel's Save button |

## 4. Look / shading

- **Characters** are `Pig_*`, `Bullet_*` and `Grid_Block_*`. They get:
  - terminator position + softness + dark-side colour
  - a fake SSS band tinted by the sky light
  - a back rim light facing away from the sun
  - a sine-band fake outline
  - PBR specular from Blender roughness
- **Scenery** (rail, slots, props) is lit, with its own terminator, softness and dark colour, plus a very soft, albedo-saturated **sheen** (hue, saturation, object-colour amount). No SSS, rim or outline.
- **Ground** is unlit and gets its colour from the vignette ramp (centre colour → edge colour) with offset and radii. Your Blender texture is multiplied on top. Scenery and characters can follow the vignette by an amount.
- **Fog** is distance fog. Blend mode (normal, overlay, soft light, screen, multiply) applies to scenery and ground; characters always use normal fog.
- **Shadows**:
  - every material casts from both sides (`shadowSide`), so open-bottom props work
  - shadow map size is switchable in the panel (try 1024 for mobile)
  - blur and bias are in the panel too
- **Look panel** (`npm run dev`):
  - **G** toggles it.
  - **Save** writes `src/look.json`, and the page reloads with the new values.
  - The *From Blender* folder is live preview only; set those values in Blender.
  - ⚠️ Run `git pull` **before** pressing Save, and commit `look.json` right after. Merge conflicts in `look.json` have broken the game twice.

## 5. UI art

- **Word art** (`assets/words/*.webp`, ~56 KB each): nice, sweet, cool, wow, yes, combo, great, awesome, level_clear. Wood-sign style made with ChatGPT; transparent, trimmed, 1024 wide.
  - Combo words pop up every 30 hits at 34% screen width (`FX.combo` in `tokens.js`).
  - Animation curves are in `style.css` (`word-life`, `word-sweep`).
- **Font sheet** (`assets/fonts/digits.webp` + `.json`, 87 KB): 0–9, `/`, A–Z, `!`.
  - Baked from Lilita One (OFL license in `tools/fonts/`) with rounded corners, white fill, a 3D grey-blue edge and a drop shadow.
  - Used by all in-game numbers and the win screen.
  - Re-bake: edit the settings at the top of `tools/bake_digits.py`, then run `python3 tools/bake_digits.py` (needs `pip install pillow`).
  - `LABEL.tracking` in `tokens.js` sets letter spacing.
- **Sparkle sheet** (`assets/fx/sparkles.webp`, 3×3, 43 KB), wood style:

  | | | |
  |---|---|---|
  | star | small star | sparkle |
  | small sparkle | plus | small plus |
  | 3-drop burst | 2-drop burst | swoosh |

  Used by `fx/sparkles.js`: one instanced billboard draw call. All values live in `tokens.js` only: presets in `SPARKLES` (levelClear, tap, block, combo, pop; one sheet cell each), shared settings (max, jitter, fade, per-cell `frameScale`) in `FX.sparkles`. Defaults are there; the Look panel's **Sparkles** folder (with test buttons) saves overrides to `look.json`, which win over `tokens.js`. `frames` is a string of sheet cells, 0–8, left to right and top to bottom.

## 6. Next steps

1. ~~**Particle emitter using `sparkles.webp`**~~: done. Tune the presets by eye. The sheet has no dot or puff frame, so "dots" and "puff" use small sparkles and pluses.
2. **Restyle the win card**: still the dark box. It should match the wood/cream look.
3. **Swap remaining Houdini art in Blender**:
   - rail mesh as `Rail_Main` or any name
   - grid blocks: Ctrl+L mesh swap onto `Grid_Block_*`
   - pig textures and normal maps, then fix Link → Data on materials
4. **Props normal map**: its green channel is flipped. Fix in Houdini `props/bake` after `convertnormal1`. Cosmetic; the pig bakes may need the same check.
5. **Fog blend modes**: the user reported they don't look right. The code checks out; needs a visual test with fog near = 0, far = 60 to confirm.
6. **Vignette**: consider screen-space (view-based) instead of world-space radii, so it's always a clean oval on screen.
7. **Performance / size for ad networks**:
   - Budget: JS ~650 KB (three.js), GLB ~2 MB, images ~0.7 MB.
   - Consider shadow map 1024, pixel ratio 1.5, 1K JPG/WebP textures.
   - Check the target network's size limit.
8. **Three pig colours**: the concept has pink, white and black; the game only has light and dark. That's a gameplay change.
9. **Houdini paths**: `.hiplc` files still reference `$HOME/Sett_Test/...`. Switch them to `$HIP`-relative paths.

## 7. Working conventions

- Everything goes on **`main`**, with no feature branches. Ask before pushing if the user is mid-edit.
- Code style follows `Agents.md`: compact, no comments, match existing style.
- The user tests in the browser; don't run or screenshot the game unless asked.
- Keep answers short and in steps; the user has ADHD.
