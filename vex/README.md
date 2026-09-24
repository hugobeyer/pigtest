# Environment generators (Houdini VEX)

Seeded generators for the Fish of Fortune scenery: tree, grass tuft, flower, fence and rock. Each one writes **blob points** (position, per-axis radii, rotation, colour, part). Your network turns those into one soft, merged lowpoly mesh, ready to bake.

The shapes are built from a few large ellipsoids and boxes with seeded jitter. There is no fractal noise, no fine detail and no exact repetition.

## Network (per asset)

1. **Attribute Wrangle**: set **Run Over** to **Detail (only once)**, paste a whole file from `vex/generators/` (each is self-contained), then click **Create spare parameters** to bind the `chf`/`chi` parameters.
2. **Copy to Points**:
   - Source: a **Merge** of a **Sphere** (Polygon, radius 1, frequency ~6) with prim string `variant = "sphere"`, and a **Box** (size 2) with `variant = "box"`.
   - Target: the wrangle.
   - Turn on **Piece Attribute** = `variant`.
   - Keep attribute transfer on, so `Cd` and `part` reach the copies.
3. **VDB from Polygons**: build a distance field.
   - Voxel size: tree 0.03, rock 0.02, fence 0.012, grass 0.008, flower 0.005.
4. **VDB Smooth SDF**: Gaussian, 2–4 iterations. This makes the gooshy merge.
   - For rocks use 1 iteration, so the box facets stay readable.
5. Optional: **VDB Clip** or **VDB Combine**, subtracting a ground box at `y < 0` to flatten the base.
6. **Convert VDB** to Polygons, adaptivity 0.1–0.3.
7. **PolyReduce**: aim for roughly 300–1500 triangles per asset.
8. **Point Wrangle** with `vex/post/transfer_color.vex`:
   - Input 0: the lowpoly mesh.
   - Input 1: the Copy to Points output.
   - It writes `Cd`, `part` and `grad` (0 at the base, 1 at the top) for your albedo, AO and gradient bakes.
9. UV, bake (albedo with AO and gradients, plus a tangent-space normal map), then export to Blender. Put the assets in the `Environment` collection.

Houdini is Y-up in metres. The exporter to Blender handles the axis change. Game scale: a pig is about 1.2 wide.

## Point attributes

| Attribute | Meaning |
| --- | --- |
| `P` | blob centre |
| `scale` | radii (sphere) or half-extents (box) on local X/Y/Z |
| `orient` | rotation quaternion |
| `pscale` | always 1 |
| `Cd` | base colour for the part |
| `variant` | `sphere` or `box`: which template to copy |
| `part` | `trunk`, `root`, `canopy`, `blade`, `petal`, `centre`, `stem`, `leaf`, `post`, `rail`, `nail`, `moss`, `rock` |

## Parameters

Spare parameters left at 0 use the default shown, except where marked *direct*, which read 0 as off.

**tree.vex**

| Parameter | Default | Effect |
| --- | --- | --- |
| `seed` | 0 | variation |
| `trunk_height` | 1.5 | trunk length |
| `trunk_radius` | 0.3 | trunk thickness; the base flares and 3–5 root lobes are added |
| `canopy_radius` | 1.3 | canopy size |
| `blobs` | 16 | canopy lobes spread over the dome |
| `skirt` | 7 | drooping lobes around the canopy underside |
| `lean` | 0.15 | trunk bend |

**grass_tuft.vex**

| Parameter | Default | Effect |
| --- | --- | --- |
| `seed` | 0 | variation |
| `blades` | 5 | the first blade is the tall centre one |
| `height` | 0.45 | tallest blade |
| `blade_width` | 0.08 | blade width |

**flower.vex**

| Parameter | Default | Effect |
| --- | --- | --- |
| `seed` | 0 | variation |
| `petals` | 5 | petal count |
| `petal_length` | 0.16 | head size |
| `stem_height` | 0.22 | head height |
| `leaves` | 3 | base leaves |
| `colour` | *direct* | 0 random, 1 white, 2 yellow, 3 pink, 4 purple |
| `buddy` | *direct* | 1 adds a smaller side flower |

**fence.vex**

| Parameter | Default | Effect |
| --- | --- | --- |
| `seed` | 0 | variation |
| `segments` | 1 | spans between posts |
| `turn` | *direct* | degrees added per segment (90 gives a corner piece) |
| `length` | 1.4 | span length |
| `post_height` | 0.9 | post height |
| `post_width` | 0.24 | post width |
| `rails` | 2 | rails per span |
| `rail_height`, `rail_depth` | 0.16, 0.08 | rail size |
| `sag` | 0.05 | rail bow and wobble |
| `top` | *direct* | 0 flat, 1 pointed, 2 rounded |
| `moss` | *direct* | chance (0–1) of a moss cap, drips and base tufts per post |
| `no_nails` | *direct* | 1 removes the nails |

**rock.vex**

| Parameter | Default | Effect |
| --- | --- | --- |
| `seed` | 0 | variation |
| `size` | 1.0 | main rock size |
| `rocks` | 3 | rocks in the cluster, including the main one |
| `pebbles` | 4 | small stones around the base |
| `flatness` | 0.7 | lower is flatter |
| `moss` | *direct* | chance (0–1) of a moss cap with drips on the main rock |

Grass tufts on rocks or at tree bases: run `grass_tuft.vex` separately and merge it before **VDB from Polygons**. It then melts into the same mesh.
