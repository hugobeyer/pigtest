# Environment generators (Houdini VEX)

Each file in `generators/` is one self-contained **Attribute Wrangle** set to **Run Over: Detail (only once)**. Paste it in, then click **Create spare parameters**. Floats are `chf()` and counts are `chi()`. Parameters start at 0, and 0 is a real value, so set them yourself using the starting values below.

The output is real polygons built with `addpoint`/`addprim`, in primitive groups. Pieces overlap on purpose: follow with VDB from Polygons → smooth/union → remesh → PolyReduce → bake. Houdini is Y-up, in metres.

## rockgen.vex: zero-gap joining with chamfer grooves

`rockgen.vex` remains a Detail Wrangle on empty input. It now generates the
fractured, chamfered pieces even when `join_at_zero_gap` is enabled. Joining is
performed afterwards by native SOPs, not by disabling the fractures. Set
`size` and `facets` explicitly: the wrangle has no zero-value fallbacks.
`size` components are clamped to a 0.001 minimum; `facets` is clamped to
3–128 for basalt/crystal modes and 8–128 for other modes.

Before output, the wrangle welds each piece once and corrects seam vertices
against the original fracture planes and adjoining chamfer/exterior planes.
Corrections are bounded by the existing geometric tolerance and applied before
rubble transforms. A piece is left at its welded positions if its correction
fails the plane, displacement, orientation, or volume checks. The detail attribute
`seam_planarize_rejected` counts seam vertices in those skipped pieces.
This improves consistency but does not guarantee exact coplanarity or Boolean union
at floating-point precision.

### Install the downstream stage

1. Load the updated `rockgen.vex` into your existing rock wrangle.
2. Select that wrangle in Houdini.
3. Run `rockgen_join.py` in Houdini's Python environment. For this checkout,
   paste the following into Houdini's Python Shell:

   ```python
   import runpy
   runpy.run_path(r"C:/Users/hugob/Documents/Sett_Test/Example/threejs_primitive_playable_example/primitive_version/vex/rockgen_join.py", run_name="__main__")
   ```

The installer adds a Boolean solid union, a joined-status attribute, and a
Switch. The Switch uses the union only when `join_at_zero_gap` is enabled and
`seam_gap` is exactly zero. Otherwise it passes the original pieces through.
Use the Switch output for downstream processing; existing downstream connections
are not rewired by the installer.

The Boolean uses Custom mode, A depth 1–1000, and Merge Adjacent Pieces to remove
shared interior walls while keeping exterior chamfer grooves. It does not bridge
actual gaps or guarantee one connected component when chamfers separate pieces.
The generator's `piece_count`, `piece_id`, and `name` remain source-piece metadata,
not a connectivity count for the union. `joined_at_zero_gap` marks the union branch,
not a watertightness test. Inspect Boolean warnings before exporting.

## tree.vex

Groups: `trunk`, `canopy`.

The trunk is swept rings, one per segment, with a flared base, a bend and a capped top. The canopy is a core blob plus low-sided blobs spread over a dome, all overlapping.

Starting values:

| Parameter | Start | Effect |
| --- | --- | --- |
| `seed` | 1 | variation |
| `trunk_height` | 1.5 | trunk length |
| `trunk_radius` | 0.3 | base radius |
| `trunk_top_radius` | 0.2 | top radius |
| `flare` | 0.4 | extra width at the base |
| `lean` | 0.15 | bend |
| `trunk_sides` | 6 | ring sides |
| `trunk_segments` | 4 | ring count |
| `canopy_radius` | 1.3 | canopy size |
| `blobs` | 14 | blob count |
| `blob_min`, `blob_max` | 0.35, 0.5 | blob size range, as a fraction of `canopy_radius` |
| `blob_squash` | 0.85 | blob height relative to width |
| `canopy_sides` | 6 | blob sides (5–7) |
| `canopy_rings` | 4 | blob rings |

## fence.vex

Groups: `post`, `rail`.

Posts and rails are chunky boxes. Rails span neighbouring posts and sit in front of them.

| Parameter | Start | Effect |
| --- | --- | --- |
| `seed` | 1 | variation |
| `posts` | 3 | post count |
| `spacing` | 1.4 | distance between posts |
| `post_height` | 0.9 | post height |
| `post_width` | 0.24 | post width |
| `rails` | 2 | rails per span |
| `rail_thickness` | 0.16 | rail height |
| `rail_depth` | 0.08 | rail depth |
| `rail_low`, `rail_high` | 0.35, 0.75 | rail heights, as a fraction of the post height |
| `jitter` | 0.05 | random height, spacing and offset |
| `lean` | 3 | maximum post tilt in degrees |
| `skew` | 0.06 | random height difference between rail ends |

## grass_tuft.vex

Group: `blade`.

Each blade is one broad, flat outline polygon. Blades fan out radially and tilt outwards; the first blade is the tall upright one. Add PolyExtrude afterwards if you want thickness.

| Parameter | Start | Effect |
| --- | --- | --- |
| `seed` | 1 | variation |
| `blades` | 5 | blade count |
| `segments` | 5 | points per edge |
| `height` | 0.45 | tallest blade |
| `width` | 0.14 | blade width at the base |
| `spread` | 45 | maximum outward tilt in degrees |
| `jitter` | 0.3 | random angle, height and width |
| `taper` | 0.5 | tip shape: lower is rounder, 1 is pointed |

## flower.vex

Groups: `center`, `petal`.

The centre is a circular polygon. Each petal is a chunky, rounded teardrop outline around it, cupped upward.

| Parameter | Start | Effect |
| --- | --- | --- |
| `seed` | 1 | variation |
| `petals` | 5 | petal count |
| `sides` | 8 | centre sides; also sets petal edge resolution |
| `center_radius` | 0.07 | centre radius |
| `petal_length` | 0.16 | petal length |
| `petal_width` | 0.14 | petal width |
| `cup` | 15 | upward tilt of the petals, in degrees |
| `jitter` | 0.2 | random angle and size per petal |
| `head_height` | 0.22 | height of the head |

## rock.vex

Group: `rock`, plus a primitive attribute `piece`, one number per piece.

One boulder form is recursively fractured by oblique planes:

- **Form:** a faceted dome hull (`hull_facets` jittered planes around a `width`×`height`×`depth` ellipsoid) sitting on a flat ground at y = 0.
- **Splits:** each iteration may split a cell, with probability `split_chance`, if it is still bigger than `min_piece` of the whole volume.
  - The cut goes through the cell's centre, offset by `split_randomness`, across its longest extent.
  - `diagonal` blends the cut normal from axis-snapped (0) to fully oblique (1).
  - `vertical_bias` > 0 favours horizontal, layered cuts.
- **Gap:** each cut leaves a `gap`.
- **Pieces:** every piece is its convex plane set, meshed as a soft minimum around its centre. Fracture faces stay flat, and edges round off according to `sharpness`.

Process each `piece` on its own (For-Each Named Primitive on `piece`), then merge. Don't union pieces in a smoothed VDB, which carves pinched creases.

| Parameter | Start | Effect |
| --- | --- | --- |
| `seed` | 1 | variation |
| `width`, `height`, `depth` | 1.4, 1.2, 1.0 | form size |
| `hull_facets` | 12 | outer facets; fewer gives bigger faces |
| `facet_jitter` | 0.3 | random tilt and distance of the outer facets |
| `iterations` | 3 | split rounds (up to 2^n pieces) |
| `split_chance` | 0.8 | chance a cell splits each round |
| `min_piece` | 0.08 | smallest piece, as a fraction of the volume |
| `split_randomness` | 0.5 | how far off-centre cuts land |
| `diagonal` | 0.7 | 0 axis-aligned cuts, 1 fully oblique |
| `vertical_bias` | 0 | > 0 favours flatter, layered pieces |
| `gap` | 0.03 | seam width |
| `sharpness` | 18 | edge hardness: higher is crisper, lower is rounder |
| `samples` | 600 | interior sample points, used for centres and extents |
| `resolution` | 24 | mesh rings per piece; sides are twice this |
