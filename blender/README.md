# Blender asset workflow

The saved `.blend` is the source of truth. Open `primitive_version/source_files/scene.blend` to continue existing work. `config.py` supplies defaults for missing assets, not live overrides of authored geometry, transforms, materials or layout. Normal editing and export do not require rebuilding.

## Sidebar controls

In Blender's Scripting workspace, open `primitive_version/blender/scene_ui.py` and click **Run Script** once. Then open any **3D Viewport**, press **N** and select the **Primitive** tab. Use **Build Missing Assets** for new scenes, **Prepare Scene** for existing legacy pig names, and **Export GLB** to write `assets/primitive_scene.glb`. The panel loads the current scripts directly, so you do not have to open each one. Asset buttons require Object Mode. Export errors appear in the status area and full tracebacks in Blender's system console. **Run Vite & Play** starts the installed local Vite executable at `http://127.0.0.1:5173/`, waits for it to respond, then opens your browser. **Stop Vite** stops only the process started by this panel; no install or external service is involved. Port 5173 must be free. The GLB is not exported automatically when starting Vite; click **Export GLB** first if you have new Blender changes.

Running the script registers the panel for the current Blender session. To keep it after restart, install `scene_ui.py` as a Blender add-on and enable **Primitive Scene Tools** in Preferences. No external packages are required. After changing the panel script, rerun it to refresh its registration.

Scripts do not save the `.blend` automatically. Save explicitly in Blender after authoring or preparation. Export does not persist preparation on your behalf.

## Prepare existing authored assets

Run **`prepare_export.py` once**, then save the `.blend`. It does not run generators.

- Migrate legacy roots `Pig_0_0` … `Pig_2_3` to `Pig_00` … `Pig_11`, in row-major order.
- Preserve the root objects, transforms, child names, geometry, modifiers and existing metadata.
- Add missing pig `is_light` metadata using the original checker defaults; keep authored values.
- If absent, create `PigRunner` as a linked object-subtree copy of `Pig_00`.
- Keep every copied part's mesh link, local transform, material overrides and modifiers.
- Remap modifier/constraint Object pointers within the copied subtree to their copied targets.
- Detach the runner root from any source parent and place its origin at world `(0, 0, 0)`.
- Retain the source root's world orientation/scale, without its world placement.
- Never replace an existing runner, merge distinct authored meshes, or relink existing objects.

Name collisions and ambiguous legacy duplicates fail explicitly. An animated/constrained first pig root requires an explicitly authored neutral `PigRunner`; preparation will not discard those controls to infer a template. Copied child drivers and external dependencies remain authored references; inspect those for a complex rig. Existing `PigRunner` placement is never reset.

Preparation validates the result and reports missing or invalid assets rather than creating rail/grid/anchor geometry. If validation fails after migration, those explicit preparation edits remain in memory; correct the reported assets before saving/exporting. Rerunning preparation does not duplicate migrated roots or an existing runner.

## Exact asset contract

`asset_contract.py` is shared by preparation, building and export:

| Assets | Required names |
| --- | --- |
| Pigs | `Pig_00` through `Pig_11`, plus `PigRunner` |
| Rail | `Rail_Start`, `Rail_Main`, `Rail_End` |
| Grid | `Grid_r00_c00` through `Grid_r25_c25` (676 objects) |
| Anchors | `RailStart`, `RailEnd`, `GridCenter`, `CameraTarget` (Empties) |

Pigs, runner, rail and grid must have an exportable mesh/curve on the object or in its descendants. Multipart pigs are supported; one mesh per pig is not required. Pig roots cannot be nested inside one another. Required names with Blender suffixes such as `.001`, legacy roots, and out-of-range pig/grid names are reported, not silently accepted.

Grid metadata must include matching `row`, `column`, `checker_row`, `checker_column` and boolean `is_light`; pigs and runner need boolean `is_light`. Existing colors and light/dark choices are not reset. `validate_assets(root)` returns missing names, duplicates, errors, per-asset renderable hierarchy counts and total export-object count. `require_assets(root)` raises on failures.

## Create or complete a scene

Run **`build_scene.py`** only to generate missing assets. It creates the exact names above, with linked pig bodies and a linked runner template. Legacy pig roots cause a preflight error before any building: prepare them first.

Existing pig roots are preserved as whole authored hierarchies; the builder does not add replacement bodies to them. Other existing geometry, transforms, materials, camera settings, anchors and lighting are not reset. Unrelated scene objects remain untouched. Keep required names stable: deleting or renaming assets can cause a later build to create missing names again. Config layout changes affect only newly created assets; the integration contract remains 12 pigs and a 26×26 grid.

## Edit in Blender

- Edit a linked pig body in **Edit Mode** to change its shared shape, including the runner.
- Distinct authored meshes stay distinct; preparation/export do not force sharing.
- Move, rotate or scale objects in **Object Mode** for independent placements.
- Grid boxes remain independently addressable, with checker metadata and material slots.
- Object-linked materials allow differently colored objects to share mesh data.
- `Rail_Main` remains an editable Curve; `Rail_Profile` controls its cross-section.
- Rail terminals, anchors, camera and lighting remain individually editable.
- Save the `.blend` to retain edits; do not rebuild to save them.

## Export

Run **`export_glb.py`** after preparation and any authoring changes. The default destination is **`primitive_version/assets/primitive_scene.glb`**; its parent directory is created if needed. An existing GLB at that destination is replaced. The path is relative to the scripts, not the `.blend` location or working directory.

Export validates the contract, then snapshots evaluated geometry and world transforms at the current frame **before temporarily renaming any source object**. A temporary scene holds the export copies. Curves and meshes with modifiers/shape keys become evaluated meshes, preserving material overrides. Unmodified linked meshes retain shared data where possible; objects remain independent. Modified objects are evaluated separately because their results may differ.

Only `PrimitiveScene` assets are included. Bevel-profile helpers and objects with `export_asset=False` are excluded. Required names cannot be excluded. The exporter snapshots evaluated mesh/curve instances into temporary export geometry without altering the authored instances. Collection/vertex/face instances that cannot be represented by the current snapshot path fail explicitly. Unsupported object types, library-linked objects, excluded view-layer objects and geometry without faces also fail rather than silently disappearing. Enable the asset collection in the active view layer. The object name `PrimitiveScene` is reserved for the exported root.

Source names are restored in cleanup even when the exporter raises; temporary objects, scenes and evaluated meshes are removed. No authored objects are deleted, no source geometry is converted, and no `.blend` is saved. This is a static snapshot, not an animation or rig export. Linked-material/shader export is subject to Blender's glTF material support.

Authoring stays Z-up; GLB export uses Y-up. Root extras record `authored_up_axis='Z'` and `threejs_import_rotation_x=π/2`. `src/main.js` applies `gltf.scene.rotation.x = Math.PI / 2` once at the imported root, not to individual children.

## Positioning contract and current integration

`docs/primitive_playable_xz_bbox_skeleton.svg` is an XZ silhouette guide, not a live constraint. Blender is the source for exported visual transforms, but `src/main.js` currently *only overlays* the GLB and resolves named assets. The original checker, rail, pig, runner and camera are still generated in Three.js; movement, shooting, clicks and destruction use their procedural positions. Therefore Blender positioning does **not** yet drive gameplay, and any changed Blender placements may diverge. Do not hide the old visuals or claim alignment until checked in the browser.

Initial Blender defaults reproduce the prototype's 26×26 grid centers (X −4.025…4.025, Z base 0.012, height 0.84), 2×2 checker colors, open rail centerline (X −5.405…5.405), and 3×4 pig placement. Note the SVG describes grid *center* X bounds, not box outer bounds (−4.175…4.175). Its start-piece X label (−5.005…−3.825) disagrees with the actual prototype's start-piece center −5.005 and width 1.18 (outer X −5.595…−4.415). Its terminal Z top 0.352 matches procedural terminals (height 0.34), but Blender's generated terminal defaults use rail height 0.38 (Z top 0.392). Existing authored `.blend` geometry is never reset to defaults; exported positions and bounds have not been measured here. The SVG's runner floor Z 0.407 matches the current procedural entry (`0.012 + 0.38 + 0.015`), not a Blender anchor in gameplay.

Next integration stage: compare the imported visual placement, then explicitly bind each grid state/pig/rail/runner and gameplay anchors to the authored GLB while preserving gameplay rules. The Blender camera is exported but the runtime camera currently remains procedural.

## Manual checks in Blender (not run by the coding agent)

1. Open a copy of the authored `.blend`; record pig transforms, mesh links and modifiers.
2. Prepare twice; confirm 12 exact pig roots and one runner, without extra legacy roots.
3. Confirm all original pig parts/edits remain and runner parts share their source mesh data.
4. Check runner world origin is zero and each part retains its source-relative placement.
5. On a fresh scene, build twice; confirm 676 grid objects and no duplicate asset names.
6. Edit distinct meshes, materials, camera and rail; prepare/export without losing those edits.
7. Export a driven modifier using a source-object name; confirm evaluation used the original name.
8. Confirm the GLB contains all required nodes, independent pig objects and correct materials.
9. Check a collection instance fails explicitly; check an exporter error restores source names.
10. Confirm no temporary scene/objects remain and the saved `.blend` was not overwritten.
