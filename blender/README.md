# Blender asset workflow

The saved `.blend` is the source of truth. `config.py` supplies initial defaults, not a live override of Blender. No copying Blender edits back to config is required. Arbitrary mesh edits, curve edits, constraints and individual placements cannot be faithfully represented by the original layout constants.


## Create or complete a scene

Open `build_scene.py` from disk and run it in Object Mode. The entry script resolves sibling modules and reloads generator code on each run. With an internal text block, save the `.blend` alongside these scripts.

The builder creates missing named objects only. Existing geometry, transforms, materials, camera settings, anchors and lighting are not reset. Unrelated scene objects are untouched.

Keep generated names stable. Renaming or deleting an expected object causes the builder to create the missing name again. Changing config defaults does not reposition existing objects or replace their meshes. Normal editing and export do not require running the builder.

## Edit in Blender

- Edit any pig body in **Edit Mode** to change the shared pig shape, including a mouth you model yourself.
- Edit any grid box in **Edit Mode** to change the shared block mesh.
- Move, rotate or scale an object in **Object Mode** for an individual placement change.
- Grid boxes remain separate, addressable objects with their own checker metadata and material slots.
- White/black materials are object-linked, so differently colored instances can share a mesh.
- `Rail_Main` remains an editable open Curve; `Rail_Profile` controls its cross-section.
- Rail start/end, anchors, camera and lighting are individually editable assets, not linked copies.
- Save the `.blend` to retain changes. Do not rebuild to save your edits.

## Export

Run the updated `export_glb.py` in Object Mode. It exports the current `PrimitiveScene` to `primitive_scene.glb` at the project root without running any builders or saving over the `.blend`.

Only the asset collection is exported. Unrelated objects and the bevel-profile helper are excluded. A temporary scene holds export copies. Curves and modified meshes are evaluated to meshes there; source geometry remains editable. Stable object names and custom properties are exported. This is a static snapshot at the current frame, not an animation export.

Blender authoring stays Z-up. GLB export explicitly uses Y-up. Future Three.js integration must apply `gltf.scene.rotation.x = Math.PI / 2` once at the imported root to restore the prototype's Z-up world, not rotate individual children. No Three.js code is changed here.

## Modules

- `config.py`: defaults for missing assets and the export destination.
- `mesh_assets.py`: shared mesh creation and object-linked material slots.
- `build_grid.py`, `build_pigs.py`, `build_rail.py`: asset generation.
- `build_anchors.py`, `build_camera.py`, `build_lighting.py`: scene setup.
- `materials.py`: create missing materials without resetting existing ones.
- `build_scene.py`: non-destructive orchestration.

- `export_glb.py`: static export from live Blender assets.

## Smoke check in Blender

1. On a new scene, build twice; the second run must not add duplicate assets.
2. Confirm 676 named grid meshes and 12 pig roots with one mesh child each.
3. Move the camera, edit a pig vertex and modify a rail point; build again and confirm all edits remain.
4. Change a pig in Edit Mode; all pigs should update while retaining their colors.
5. Move one grid object; other objects must not move.
6. Export and inspect the GLB names, checker metadata, colors and rail surface.
7. Confirm export did not change the original scene or include unrelated objects.
