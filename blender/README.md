# Blender asset workflow

The saved `.blend` is the source of truth. Open `source_files/scene.blend` to continue existing work. `config.py` supplies defaults for missing assets, not live overrides of authored geometry, transforms, materials or layout. Normal editing and export do not require rebuilding.

## Sidebar controls

In Blender's Scripting workspace, open `blender/scene_ui.py` and click **Run Script** once. Then open any **3D Viewport**, press **N** and select the **Primitive** tab. **Pull Latest** runs `git pull --ff-only` in the project folder and reloads the panel; if the pull brings a newer `.blend`, it tells you to use **File > Revert**. Use **Build Missing Assets** to convert an older scene and create anything missing, and **Export GLB** to write `assets/primitive_scene.glb`. The panel loads the current scripts directly, so you do not have to open each one. Asset buttons require Object Mode. Export errors appear in the status area and full tracebacks in Blender's system console. **Run Vite & Play** starts the installed local Vite executable at `http://127.0.0.1:5173/`, waits for it to respond, then opens your browser. **Stop Vite** stops only the process started by this panel; no install or external service is involved. Port 5173 must be free. The GLB is not exported automatically when starting Vite; click **Export GLB** first if you have new Blender changes.

Running the script registers the panel for the current Blender session. To keep it after restart, install `scene_ui.py` as a Blender add-on and enable **Primitive Scene Tools** in Preferences. No external packages are required. After changing the panel script, rerun it to refresh its registration.

Scripts do not save the `.blend` automatically. Save explicitly in Blender after authoring or preparation. Export does not persist preparation on your behalf.

## Converting an older scene

**Build Missing Assets** first runs `migrate.py`, which converts the old layout automatically; save the `.blend` afterwards:

- `Pig_00` … `Pig_11` become `PigColumn_0` … `PigColumn_3`, one Empty per column at its front pig. `queue` keeps the three authored colors and continues alternating to `PIG_QUEUE_LENGTH`. `row_step` is the authored spacing between rows. The old pig objects and their bodies are deleted.
- `Grid_rXX_cYY` become `Grid_Block_Light` and `Grid_Block_Dark` (one light and one dark cell are kept and renamed). `GridCenter` gets `rows`, `columns`, `step` and `checker` from the old cells and is centred on them. The other cells are deleted.
- `PigRunner` becomes `Pig_Dark`, and a linked copy with the `Light` material becomes `Pig_Light`, placed `PIG_TEMPLATE_GAP` to the side.

It fails explicitly if the new names already exist alongside old objects.

## Exact asset contract

`asset_contract.py` is shared by building and export:

| Assets | Required names |
| --- | --- |
| Pigs | `PigColumn_0` through `PigColumn_3` (Empties), plus `Pig_Light` and `Pig_Dark` |
| Rail | `Rail_Start`, `Rail_Main`, `Rail_End` |
| Bullets | `Bullet_Light`, `Bullet_Dark` |
| Grid | `Grid_Block_Light`, `Grid_Block_Dark` |
| Slots | `Slot_0` through `Slot_4` |
| Anchors | `RailStart`, `RailEnd`, `GridCenter`, `CameraTarget` (Empties) |

The pig and bullet models, rail, grid blocks and slots must have an exportable mesh/curve on the object or in its descendants. Required names with Blender suffixes such as `.001` and leftover `Pig_XX`/`PigRunner`/`Grid_rXX_cYY` objects are reported, not silently accepted.

Each `PigColumn` needs `queue` (text of `D`/`L`, front first) and a positive `row_step`. `GridCenter` needs positive integers `rows`, `columns`, `checker` and a positive `step`. Slots need an integer `slot` matching their index. Existing colors and light/dark choices are not reset. `validate_assets(root)` returns missing names, duplicates, errors, per-asset renderable hierarchy counts and total export-object count. `require_assets(root)` raises on failures.

## Create or complete a scene

Run **`build_scene.py`** only to generate missing assets. It creates the exact names above. Old `Pig_XX`/`Grid_rXX_cYY` objects are converted first.

Existing geometry, transforms, materials, camera settings, anchors and lighting are not reset. Unrelated scene objects remain untouched. Keep required names stable: deleting or renaming assets can cause a later build to create missing names again. Config layout changes affect only newly created assets; grid size and pig queues live on `GridCenter` and the `PigColumn` Empties.

## Edit in Blender

- Edit `Pig_Light` or `Pig_Dark` to change that colour's pigs, in the bank and on the rail. They share `Pig_Mesh` until you give one its own mesh. Their placement in Blender is ignored at runtime.
- Edit a `Grid_Block` mesh to change every grid block; the two blocks share one mesh.
- Move a `PigColumn` to move its whole queue; edit `queue` and `row_step` in its custom properties.
- Change the grid layout with `GridCenter`'s location and its `rows`, `columns`, `step` and `checker` properties.
- Distinct authored meshes stay distinct; preparation/export do not force sharing.
- Move, rotate or scale objects in **Object Mode** for independent placements.
- Object-linked materials allow differently colored objects to share mesh data.
- `Rail_Main` remains an editable Curve; `Rail_Profile` controls its cross-section.
- Rail terminals, anchors, camera and lighting remain individually editable.
- Save the `.blend` to retain edits; do not rebuild to save them.

## Export

Run **`export_glb.py`** after preparation and any authoring changes. The default destination is **`assets/primitive_scene.glb`**; its parent directory is created if needed. An existing GLB at that destination is replaced. The path is relative to the scripts, not the `.blend` location or working directory.

Export validates the contract, then snapshots evaluated geometry and world transforms at the current frame **before temporarily renaming any source object**. A temporary scene holds the export copies. Curves and meshes with modifiers/shape keys become evaluated meshes, preserving material overrides. Unmodified linked meshes retain shared data where possible; objects remain independent. Modified objects are evaluated separately because their results may differ.

Only `PrimitiveScene` assets are included. Bevel-profile helpers and objects with `export_asset=False` are excluded. Required names cannot be excluded. The exporter snapshots evaluated mesh/curve instances into temporary export geometry without altering the authored instances. Collection/vertex/face instances that cannot be represented by the current snapshot path fail explicitly. Unsupported object types, library-linked objects, excluded view-layer objects and geometry without faces also fail rather than silently disappearing. Enable the asset collection in the active view layer. The object name `PrimitiveScene` is reserved for the exported root.

Source names are restored in cleanup even when the exporter raises; temporary objects, scenes and evaluated meshes are removed. No authored objects are deleted, no source geometry is converted, and no `.blend` is saved. This is a static snapshot, not an animation or rig export. Linked-material/shader export is subject to Blender's glTF material support.

Authoring stays Z-up; GLB export uses Y-up. Root extras record `authored_up_axis='Z'` and `threejs_import_rotation_x=π/2`. `src/assets.js` applies `gltf.scene.rotation.x = Math.PI / 2` once at the imported root, not to individual children.

## Runtime integration

Blender and the exported GLB own the runtime visuals: the grid, pigs, runner, rail pieces, ground and materials. Three.js generates no replacement geometry for them. `src/assets.js` loads the GLB, rotates its root once, and resolves the exact contract names. A missing name stops initialization with an error, and no interaction starts.

The runtime builds its state from the imported nodes (`src/grid.js`, `src/pigs.js`, `src/runners.js`):

- The grid is laid out from `GridCenter`'s `rows`, `columns`, `step` and `checker`, drawn as two instanced meshes of `Grid_Block_Light` and `Grid_Block_Dark`. Destroying a cell hides its instance.
- Each `PigColumn` shows `PIGS.visibleRows` pigs, cloned from `Pig_Light` or `Pig_Dark` by queue colour, spaced by `row_step` behind the Empty. Only the front pig can be tapped. The column slides forward and the next `queue` entry appears at the back.
- Runners are clones of the tapped pig's model; their shots are clones of `Bullet_Light` or `Bullet_Dark`.
- When every cell is destroyed, a flat win panel appears after `WIN.delay`; tapping it restarts.
- Effects live in `src/fx/` and are tuned by `FX` in `src/tokens.js`: pooled particles (instanced copies of the grid block meshes) for hits, bullet trails, pig taps, runner deaths and win confetti; block pop; shot-count and rail-counter punches; front-pig idle bob; screen shake when a row or column clears; combo words every `FX.combo.every` hits.
- Each pig starts with `PIGS.ammo` shots. The runner shows its remaining shots and leaves the rail when it runs out. At most `PIGS.railCapacity` runners share the rail, and the label under `Rail_Start` shows the free slots. These labels are runtime canvas sprites.

The gameplay path keeps its current node layout:

- Lane positions come from the imported grid.
- The start point and the bottom rail line come from `RailStart`.
- The left rail line and the end point come from `RailEnd`.
- Rail offsets, the corner radius and the speeds stay in `src/tokens.js`. The path is not derived from `Rail_Main` triangles, so moving the rail mesh in Blender without moving its anchors can make visuals and the path diverge.

The runtime uses the exported Blender scene camera: its transform, orthographic scale and clip range. Its render resolution sets the portrait canvas ratio, and export copies that resolution into the temporary export scene. Building switches a landscape render resolution to `CAMERA_RESOLUTION`. Lights are still defined in `src/main.js`; exported Blender lights are removed on import.

`docs/primitive_playable_xz_bbox_skeleton.svg` is an XZ silhouette guide, not a live constraint.

## Manual checks in Blender (not run by the coding agent)

1. Run **Build Missing Assets** on the authored `.blend`; confirm 4 `PigColumn` Empties, two `Grid_Block` objects and no `Pig_XX`/`Grid_rXX_cYY` left.
2. Check each column's `queue` and `row_step`, and `GridCenter`'s grid properties.
3. Build twice; confirm nothing is duplicated.
4. Export and confirm the game shows the full grid and three pigs per column.
