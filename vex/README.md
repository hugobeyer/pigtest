# Environment generators (Houdini VEX)

Each file in `generators/` is one self-contained **Attribute Wrangle** set to **Run Over: Detail (only once)**. Paste it in, then click **Create spare parameters**. Floats are `chf()` and counts are `chi()`. Parameters start at 0, and 0 is a real value, so set them yourself using the starting values below.

The output is real polygons built with `addpoint`/`addprim`, in primitive groups. Pieces overlap on purpose: follow with VDB from Polygons → smooth/union → remesh → PolyReduce → bake. Houdini is Y-up, in metres.

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

Group: `rock`.

Each rock is a closed, low-poly lathe with jittered vertices. `asymmetry` pushes it off-centre and leans the top. Optional smaller rocks overlap around the main one.

| Parameter | Start | Effect |
| --- | --- | --- |
| `seed` | 1 | variation |
| `size` | 1 | radius |
| `height` | 0.8 | height, as a fraction of `size` |
| `flatten` | 0.6 | how wide and flat the lower half stays |
| `sides` | 7 | sides around |
| `rings` | 4 | rings from top to bottom |
| `asymmetry` | 0.3 | off-centre lean and bulge |
| `bumpiness` | 0.12 | vertex jitter |
| `small_rocks` | 2 | extra rocks |
| `small_size` | 0.45 | extra rock size, as a fraction of `size` |
