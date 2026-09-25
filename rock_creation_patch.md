function void rock_clip(
    export vector positions[];
    export int counts[];
    export int tags[];
    vector N; float D; int cut_tag; float eps)
{
    vector result[];
    int result_counts[], result_tags[];
    vector cap[];
    int start = 0;
    int removed = 0;

    for (int f = 0; f < len(counts); f++)
    {
        vector polygon[];
        int count = counts[f];
        for (int j = 0; j < count; j++)
        {
            vector A = positions[start + j];
            vector B = positions[start + (j + 1) % count];
            float da = dot(N, A) - D;
            float db = dot(N, B) - D;
            int inside_a = da <= 0.0;
            int inside_b = db <= 0.0;
            if (!inside_a) removed = 1;
            if (inside_a) append(polygon, A);
            if (inside_a != inside_b)
            {
                vector hit = lerp(A, B, clamp(da / (da - db), 0.0, 1.0));
                append(polygon, hit);
                int found = 0;
                foreach (vector previous; cap)
                {
                    if (distance(previous, hit) <= eps) found = 1;
                }
                if (!found) append(cap, hit);
            }
        }
        start += count;

        vector clean[];
        foreach (vector p; polygon)
        {
            int n = len(clean);
            if (n == 0) append(clean, p);
            else if (distance(clean[n - 1], p) > eps) append(clean, p);
        }
        if (len(clean) > 1)
        {
            if (distance(clean[0], clean[len(clean) - 1]) <= eps)
                resize(clean, len(clean) - 1);
        }
        if (len(clean) >= 3)
        {
            foreach (vector p; clean) append(result, p);
            append(result_counts, len(clean));
            append(result_tags, tags[f]);
        }
    }

    if (removed && len(cap) >= 3 && len(result_counts) > 0)
    {
        vector center = 0;
        foreach (vector p; cap) center += p;
        center /= float(len(cap));
        vector reference = abs(N.y) < 0.9 ? set(0, 1, 0) : set(1, 0, 0);
        vector U = normalize(cross(reference, N));
        vector V = cross(N, U);
        float angles[];
        foreach (vector p; cap)
        {
            vector offset = p - center;
            append(angles, atan2(dot(offset, V), dot(offset, U)));
        }
        int order[] = argsort(angles);
        foreach (int index; order) append(result, cap[index]);
        append(result_counts, len(cap));
        append(result_tags, cut_tag);
    }

    positions = result;
    counts = result_counts;
    tags = result_tags;
}

function int[] rock_emit(
    vector bmin; vector bmax; vector bounds_min; vector bounds_max;
    int piece; int seed; int shaped;
    float recess; float chance; float angle; float chamfer;
    float follow; float padding; int follow_steps;
    int surface_available; float surface_sign; float diagonal;
    export int face_tags[];
    export int face_outside[];
    export int fit_failures)
{
    vector center = (bmin + bmax) * 0.5;
    vector halfsize = (bmax - bmin) * 0.5;
    float smallest = min(halfsize.x, min(halfsize.y, halfsize.z));
    float eps = max(smallest * 1e-6, 1e-8);
    int emitted[];
    resize(face_tags, 0);
    resize(face_outside, 0);
    fit_failures = 0;
    if (smallest <= eps) return emitted;

    vector corners[] = array(
        set(-halfsize.x, -halfsize.y, -halfsize.z),
        set( halfsize.x, -halfsize.y, -halfsize.z),
        set( halfsize.x,  halfsize.y, -halfsize.z),
        set(-halfsize.x,  halfsize.y, -halfsize.z),
        set(-halfsize.x, -halfsize.y,  halfsize.z),
        set( halfsize.x, -halfsize.y,  halfsize.z),
        set( halfsize.x,  halfsize.y,  halfsize.z),
        set(-halfsize.x,  halfsize.y,  halfsize.z));
    int indices[] = array(
        3, 2, 1, 0,
        5, 6, 7, 4,
        1, 5, 4, 0,
        7, 6, 2, 3,
        4, 7, 3, 0,
        2, 6, 5, 1);
    vector positions[];
    foreach (int index; indices) append(positions, corners[index]);
    int counts[] = array(4, 4, 4, 4, 4, 4);
    int tags[] = array(0, 1, 2, 3, 4, 5);
    vector normals[] = array(
        set(0, 0, -1), set(0, 0, 1),
        set(0, -1, 0), set(0, 1, 0),
        set(-1, 0, 0), set(1, 0, 0));
    float extents[] = array(
        halfsize.z, halfsize.z, halfsize.y,
        halfsize.y, halfsize.x, halfsize.x);

    if (shaped)
    {
        float slope = tan(radians(clamp(angle, 0.0, 35.0)));
        for (int f = 0; f < 6; f++)
        {
            vector key = set(float(seed), float(piece), float(f));
            vector N = normals[f];
            vector reference = abs(N.y) < 0.9 ? set(0, 1, 0) : set(1, 0, 0);
            vector U = normalize(cross(reference, N));
            vector V = cross(N, U);
            float a = (rand(key + set(13, 29, 7)) * 2.0 - 1.0) * slope;
            float b = (rand(key + set(41, 17, 3)) * 2.0 - 1.0) * slope;
            vector tilted = normalize(N + U * a + V * b);
            float depth = 0.0;
            if (rand(key + set(5, 71, 19)) < clamp(chance, 0.0, 1.0))
            {
                depth = 2.0 * extents[f] * clamp(recess, 0.0, 0.35)
                      * rand(key + set(37, 11, 53));
            }
            vector anchor = N * (extents[f] - depth);
            if (slope > 0.0 || depth > 0.0)
                rock_clip(positions, counts, tags, tilted, dot(tilted, anchor), f, eps);
        }

        if (chamfer > 0.0)
        {
            for (int axis_a = 0; axis_a < 3; axis_a++)
            for (int axis_b = axis_a + 1; axis_b < 3; axis_b++)
            for (int sign_a = -1; sign_a <= 1; sign_a += 2)
            for (int sign_b = -1; sign_b <= 1; sign_b += 2)
            {
                vector N = 0;
                N[axis_a] = float(sign_a);
                N[axis_b] = float(sign_b);
                N = normalize(N);
                vector key = set(
                    float(seed + axis_a * 31 + axis_b * 97),
                    float(piece), float(sign_a * 7 + sign_b * 13));
                float width = 2.0 * smallest * clamp(chamfer, 0.0, 0.4)
                            * fit01(rand(key), 0.65, 1.0);
                float support = dot(abs(N), halfsize);
                rock_clip(positions, counts, tags, N, support - width, 6, eps);
            }
        }
    }

    if (diagonal > 0.01)
    {
        float r1 = random(seed + piece * 6661);
        float r2 = random(seed + piece * 6662);
        float r3 = random(seed + piece * 6663);
        vector axis = set(r1 - 0.5, r2 - 0.5, r3 - 0.5);
        if (length(axis) < 0.001) axis = set(0, 1, 0);
        else axis = normalize(axis);
        float r4 = random(seed + piece * 6664);
        float rotation_angle = radians((r4 - 0.5) * 2.0 * diagonal);
        vector4 rotation = quaternion(rotation_angle, axis);
        for (int p = 0; p < len(positions); p++)
            positions[p] = qrotate(rotation, positions[p]);
        for (int p = 0; p < len(corners); p++)
            corners[p] = qrotate(rotation, corners[p]);
    }

    if (shaped && follow > 0.0 && surface_available)
    {
        foreach (vector corner; corners)
        {
            vector origin = center + corner;
            float initial = volumesample(1, 0, origin) * surface_sign + padding;
            if (initial <= eps) continue;
            vector sample_pos = origin;
            vector N = 0;
            int converged = 0;
            int max_steps = clamp(follow_steps, 1, 32);
            for (int step = 0; step <= max_steps; step++)
            {
                float value = volumesample(1, 0, sample_pos) * surface_sign + padding;
                vector gradient = volumegradient(1, 0, sample_pos) * surface_sign;
                float g2 = dot(gradient, gradient);
                if (g2 < 1e-10) break;
                N = normalize(gradient);
                if (abs(value) < max(eps * 10.0, smallest * 0.001))
                {
                    converged = 1;
                    break;
                }
                if (step == max_steps) break;
                vector movement = gradient * (value / g2);
                if (length(movement) > smallest)
                    movement = normalize(movement) * smallest;
                sample_pos -= movement;
            }
            if (!converged)
            {
                fit_failures++;
                continue;
            }
            vector anchor = lerp(origin, sample_pos, clamp(follow, 0.0, 1.0));
            rock_clip(positions, counts, tags, N, dot(N, anchor - center), 7, eps);
            if (len(counts) == 0) break;
        }
    }

    if (len(counts) < 4) return emitted;
    float volume6 = 0.0;
    int offset = 0;
    foreach (int count; counts)
    {
        for (int j = 1; j < count - 1; j++)
        {
            volume6 += dot(positions[offset],
                cross(positions[offset + j], positions[offset + j + 1]));
        }
        offset += count;
    }
    if (abs(volume6) <= eps * eps * eps * 6.0) return emitted;

    vector unique_positions[];
    int unique_points[];
    offset = 0;
    for (int f = 0; f < len(counts); f++)
    {
        int face_points[];
        int on_bounds[] = array(1, 1, 1, 1, 1, 1);
        for (int j = 0; j < counts[f]; j++)
        {
            vector p = positions[offset + j];
            vector world_p = center + p;
            if (abs(world_p.z - bounds_min.z) >= 0.001) on_bounds[0] = 0;
            if (abs(world_p.z - bounds_max.z) >= 0.001) on_bounds[1] = 0;
            if (abs(world_p.y - bounds_min.y) >= 0.001) on_bounds[2] = 0;
            if (abs(world_p.y - bounds_max.y) >= 0.001) on_bounds[3] = 0;
            if (abs(world_p.x - bounds_min.x) >= 0.001) on_bounds[4] = 0;
            if (abs(world_p.x - bounds_max.x) >= 0.001) on_bounds[5] = 0;

            int found = -1;
            for (int k = 0; k < len(unique_positions); k++)
            {
                if (distance(unique_positions[k], p) <= eps)
                {
                    found = k;
                    break;
                }
            }
            if (found < 0)
            {
                found = len(unique_positions);
                append(unique_positions, p);
                append(unique_points, addpoint(0, world_p));
            }
            append(face_points, unique_points[found]);
        }
        offset += counts[f];
        int prim = addprim(0, "poly", face_points);
        append(emitted, prim);
        append(face_tags, tags[f]);
        int outside = tags[f] == 7;
        foreach (int boundary; on_bounds)
        {
            if (boundary) outside = 1;
        }
        append(face_outside, outside);
    }
    return emitted;
}

int iterations = chi("iterations");
if (iterations == 0) iterations = 4;
float split_randomness = chf("split_randomness");
if (split_randomness == 0) split_randomness = 0.4;
float vertical_alignment = chf("vertical_alignment");
float horizontal_line = chf("horizontal_line");
float alignment_grad_x = chf("alignment_grad_x");
float alignment_grad_y = chf("alignment_grad_y");
float alignment_grad_z = chf("alignment_grad_z");
float line_grad_x = chf("line_grad_x");
float line_grad_y = chf("line_grad_y");
float line_grad_z = chf("line_grad_z");
float gradient_strength = chf("gradient_strength");
float max_aspect_ratio = chf("max_aspect_ratio");
if (max_aspect_ratio == 0) max_aspect_ratio = 3.0;
float min_world_size = chf("min_world_size");
if (min_world_size == 0) min_world_size = 0.5;
float size_threshold = chf("size_threshold");
int seed_val = chi("seed");
if (seed_val == 0) seed_val = 1234;

int strata_mode = chi("strata_mode");
float strata_blend = chf("strata_blend");
if (strata_blend == 0) strata_blend = 0.5;
float strata_bottom_scale = chf("strata_bottom_scale");
if (strata_bottom_scale == 0) strata_bottom_scale = 0.5;
float strata_top_flatness = chf("strata_top_flatness");
if (strata_top_flatness == 0) strata_top_flatness = 1.0;

int fill_interior = chi("fill_interior");
if (fill_interior == 0) fill_interior = 1;
int erosion_enable = chi("erosion_enable");
float erosion_depth = chf("erosion_depth");
if (erosion_depth == 0) erosion_depth = 1.0;
float erosion_height_bias = chf("erosion_height_bias");
float erosion_noise_amp = chf("erosion_noise_amp");
float erosion_noise_freq = chf("erosion_noise_freq");
if (erosion_noise_freq == 0) erosion_noise_freq = 1.5;
float erosion_noise_offset = chf("erosion_noise_offset");
float edge_detail_dist = chf("edge_detail_dist");
if (edge_detail_dist == 0) edge_detail_dist = 1.0;
float edge_detail_scale = chf("edge_detail_scale");
if (edge_detail_scale == 0) edge_detail_scale = 0.5;
int edge_extra_iters = chi("edge_extra_iters");

int core_enable = chi("core_enable");
float core_threshold = chf("core_threshold");
if (core_threshold == 0) core_threshold = 2.0;
int core_max_level = chi("core_max_level");
if (core_max_level == 0) core_max_level = 1;
float size_variation = chf("size_variation");
float diagonal_amount = chf("diagonal_amount");
int surface_invert = chi("surface_invert");
int influence_invert = chi("influence_invert");
float sdf1_sign = surface_invert == 1 ? -1.0 : 1.0;
float sdf2_sign = influence_invert == 1 ? -1.0 : 1.0;
int debug_mode = chi("debug_mode");

int rock_enable = chi("rock_enable");
float rock_face_recess = clamp(chf("rock_face_recess"), 0.0, 0.35);
float rock_recess_chance = clamp(chf("rock_recess_chance"), 0.0, 1.0);
float rock_cut_angle = clamp(chf("rock_cut_angle"), 0.0, 35.0);
float rock_chamfer = clamp(chf("rock_chamfer"), 0.0, 0.4);
float rock_form_follow = clamp(chf("rock_form_follow"), 0.0, 1.0);
float rock_form_padding = max(chf("rock_form_padding"), 0.0);
int rock_form_steps = clamp(chi("rock_form_steps"), 1, 32);
int rock_protect_core = chi("rock_protect_core");
int bounds_from_surface = chi("bounds_from_surface");

int has_sdf1 = nprimitives(1) > 0;
int has_sdf2 = nprimitives(2) > 0;
vector bbox_min, bbox_max;
if (bounds_from_surface == 1 && has_sdf1)
{
    getbbox(1, bbox_min, bbox_max);
}
else if (npoints(0) > 0)
{
    getbbox(0, bbox_min, bbox_max);
}
else
{
    bbox_min = set(-5, -5, -5);
    bbox_max = set(5, 5, 5);
}
vector bbox_size = bbox_max - bbox_min;
float inv_bbox_x = 1.0 / (bbox_size.x + 0.0001);
float inv_bbox_y = 1.0 / (bbox_size.y + 0.0001);
float inv_bbox_z = 1.0 / (bbox_size.z + 0.0001);

int existing_pts[] = expandpointgroup(0, "*");
foreach (int pt; existing_pts) removepoint(0, pt);

if (debug_mode == 1)
{
    printf("[DEBUG] Input 1 primitives: %d, Input 2 primitives: %d\n",
        nprimitives(1), nprimitives(2));
    printf("[DEBUG] surface_invert: %d, influence_invert: %d\n",
        surface_invert, influence_invert);
}

vector box_mins[] = array(bbox_min);
vector box_maxs[] = array(bbox_max);
int box_levels[] = array(0);
int total_iters = iterations + edge_extra_iters;

for (int iter = 0; iter < total_iters; iter++)
{
    int cur_count = len(box_mins);
    vector new_box_mins[];
    vector new_box_maxs[];
    int new_box_levels[];
    resize(new_box_mins, cur_count * 2);
    resize(new_box_maxs, cur_count * 2);
    resize(new_box_levels, cur_count * 2);
    int new_count = 0;

    for (int b = 0; b < cur_count; b++)
    {
        vector box_min_cur = box_mins[b];
        vector box_max_cur = box_maxs[b];
        int box_level = box_levels[b];
        vector box_size = box_max_cur - box_min_cur;
        vector box_center = (box_min_cur + box_max_cur) * 0.5;
        float sdf_val = 1e6;
        float dist_to_surface = 1e6;
        int is_near_edge = 0;

        if (has_sdf1)
        {
            sdf_val = volumesample(1, 0, box_center) * sdf1_sign;
            dist_to_surface = abs(sdf_val);
            if (erosion_enable == 1 && dist_to_surface < edge_detail_dist)
                is_near_edge = 1;
        }

        int is_core = 0;
        float core_strength = 0.0;
        if (core_enable == 1)
        {
            if (has_sdf1)
            {
                float depth = -sdf_val;
                if (depth > 0.0)
                    core_strength = clamp(depth / max(core_threshold, 0.01), 0.0, 1.0);
            }
            if (has_sdf2)
            {
                float inf_sdf = volumesample(2, 0, box_center) * sdf2_sign;
                if (inf_sdf < 0.0) core_strength = max(core_strength, 1.0);
            }
            if (core_strength > 0.5 && box_level >= core_max_level)
                is_core = 1;
        }

        if (is_core == 1)
        {
            new_box_mins[new_count] = box_min_cur;
            new_box_maxs[new_count] = box_max_cur;
            new_box_levels[new_count] = box_level;
            new_count++;
            continue;
        }

        int too_small = 0;
        if (min_world_size > 0.01)
        {
            float min_box_dim = min(box_size.x, min(box_size.y, box_size.z));
            if (min_box_dim < min_world_size) too_small = 1;
        }
        if (too_small == 0 && size_threshold > 0.01)
        {
            float max_box_dim = max(box_size.x, max(box_size.y, box_size.z));
            float max_bbox_dim = max(bbox_size.x, max(bbox_size.y, bbox_size.z));
            float rel = max_box_dim / max(max_bbox_dim, 0.0001);
            float eff_thresh = size_threshold;
            if (is_near_edge == 1)
                eff_thresh *= clamp(edge_detail_scale, 0.01, 1.0);
            if (rel < eff_thresh) too_small = 1;
        }

        if ((iter >= iterations && is_near_edge == 0) || too_small == 1)
        {
            new_box_mins[new_count] = box_min_cur;
            new_box_maxs[new_count] = box_max_cur;
            new_box_levels[new_count] = box_level;
            new_count++;
            continue;
        }

        float norm_x = (box_center.x - bbox_min.x) * inv_bbox_x;
        float norm_y = (box_center.y - bbox_min.y) * inv_bbox_y;
        float norm_z = (box_center.z - bbox_min.z) * inv_bbox_z;
        float align_xi = 1.0 + alignment_grad_x * (norm_x - 0.5) * 2.0;
        float align_yi = 1.0 + alignment_grad_y * (norm_y - 0.5) * 2.0;
        float align_zi = 1.0 + alignment_grad_z * (norm_z - 0.5) * 2.0;
        float combined_align = (align_xi + align_yi + align_zi) / 3.0;
        float line_xi = 1.0 + line_grad_x * (norm_x - 0.5) * 2.0;
        float line_yi = 1.0 + line_grad_y * (norm_y - 0.5) * 2.0;
        float line_zi = 1.0 + line_grad_z * (norm_z - 0.5) * 2.0;
        float combined_line = (line_xi + line_yi + line_zi) / 3.0;
        float fv = vertical_alignment * (1.0 + (combined_align - 1.0) * gradient_strength);
        float fh = horizontal_line * (1.0 + (combined_line - 1.0) * gradient_strength);
        float pos_vert_bias = clamp(fv, 0.0, 5.0);
        float pos_horiz_bias = clamp(fh, 0.0, 5.0);

        float s_vert_bonus = 0.0;
        float s_horiz_penalty = 0.0;
        float s_size_scale = 1.0;
        float s_split_boost = 0.0;
        if (strata_mode == 1)
        {
            float t = clamp(norm_y / max(strata_blend, 0.001), 0.0, 1.0);
            t = t * t * (3.0 - 2.0 * t);
            s_vert_bonus = t * strata_top_flatness;
            s_horiz_penalty = t * 1.5;
            float bottom_t = 1.0 - t;
            s_size_scale = 1.0 - bottom_t * (1.0 - clamp(strata_bottom_scale, 0.05, 1.0));
            s_split_boost = bottom_t * 0.3;
        }
        float final_vert_bias = pos_vert_bias + s_vert_bonus;
        float final_horiz_bias = max(0.0, pos_horiz_bias - s_horiz_penalty);
        float total_alignment = final_vert_bias + final_horiz_bias;
        float split_probability = 0.5 + total_alignment * 0.1 + s_split_boost;
        if (is_near_edge == 1) split_probability += 0.3;
        if (core_strength > 0.0) split_probability -= core_strength * 0.5;
        if (size_variation > 0.001)
        {
            float var_rand = random(seed_val + b * 7777 + iter * 77770);
            float var_offset = (var_rand - 0.5) * 2.0 * size_variation;
            split_probability += var_offset * 0.4;
        }
        float split_chance = random(seed_val + b * 1000 + iter * 10000);
        if (split_chance > split_probability)
        {
            new_box_mins[new_count] = box_min_cur;
            new_box_maxs[new_count] = box_max_cur;
            new_box_levels[new_count] = box_level;
            new_count++;
            continue;
        }

        int split_axis = 0;
        float min_dim = min(box_size.x, min(box_size.y, box_size.z));
        float max_dim = max(box_size.x, max(box_size.y, box_size.z));
        int force_aspect = 0;
        if (min_dim > 0 && max_dim / min_dim > max_aspect_ratio)
        {
            force_aspect = 1;
            if (box_size.x >= box_size.y && box_size.x >= box_size.z) split_axis = 0;
            else if (box_size.y >= box_size.z) split_axis = 1;
            else split_axis = 2;
        }
        if (force_aspect == 0)
        {
            float y_prob = 1.0 + final_vert_bias;
            float x_prob = 1.0 + final_horiz_bias;
            float z_prob = 1.0 + final_horiz_bias;
            x_prob += box_size.x * 0.3;
            y_prob += box_size.y * 0.3;
            z_prob += box_size.z * 0.3;
            float total_prob = x_prob + y_prob + z_prob;
            x_prob /= total_prob;
            y_prob /= total_prob;
            float rand_val = random(seed_val + b * 2000 + iter * 20000);
            if (rand_val < x_prob) split_axis = 0;
            else if (rand_val < x_prob + y_prob) split_axis = 1;
            else split_axis = 2;
        }

        float eff_randomness = split_randomness * s_size_scale;
        if (size_variation > 0.001) eff_randomness += size_variation * 0.3;
        eff_randomness = clamp(eff_randomness, 0.0, 0.8);
        float rand_offset = (random(seed_val + b * 3000 + iter * 30000) - 0.5) * eff_randomness;
        float split_ratio = clamp(0.5 + rand_offset, 0.1, 0.9);
        vector box1_min = box_min_cur;
        vector box1_max = box_max_cur;
        vector box2_min = box_min_cur;
        vector box2_max = box_max_cur;
        float sc = box_min_cur[split_axis] + box_size[split_axis] * split_ratio;
        box1_max[split_axis] = sc;
        box2_min[split_axis] = sc;

        new_box_mins[new_count] = box1_min;
        new_box_maxs[new_count] = box1_max;
        new_box_levels[new_count] = box_level + 1;
        new_count++;
        new_box_mins[new_count] = box2_min;
        new_box_maxs[new_count] = box2_max;
        new_box_levels[new_count] = box_level + 1;
        new_count++;
    }
    resize(new_box_mins, new_count);
    resize(new_box_maxs, new_count);
    resize(new_box_levels, new_count);
    box_mins = new_box_mins;
    box_maxs = new_box_maxs;
    box_levels = new_box_levels;
}

int num_boxes = len(box_mins);
float box_sdf_val[], box_surf_dist[], box_inf_depth[];
float box_norm_x[], box_norm_y[], box_norm_z[];
float box_vis_vert[], box_vis_horiz[], box_core_strength[];
int box_is_core[], box_near_edge[];
resize(box_sdf_val, num_boxes);
resize(box_surf_dist, num_boxes);
resize(box_inf_depth, num_boxes);
resize(box_norm_x, num_boxes);
resize(box_norm_y, num_boxes);
resize(box_norm_z, num_boxes);
resize(box_vis_vert, num_boxes);
resize(box_vis_horiz, num_boxes);
resize(box_core_strength, num_boxes);
resize(box_is_core, num_boxes);
resize(box_near_edge, num_boxes);

for (int b = 0; b < num_boxes; b++)
{
    vector bc = (box_mins[b] + box_maxs[b]) * 0.5;
    float nx = (bc.x - bbox_min.x) * inv_bbox_x;
    float ny = (bc.y - bbox_min.y) * inv_bbox_y;
    float nz = (bc.z - bbox_min.z) * inv_bbox_z;
    box_norm_x[b] = nx;
    box_norm_y[b] = ny;
    box_norm_z[b] = nz;
    float sv = 1e6;
    if (has_sdf1) sv = volumesample(1, 0, bc) * sdf1_sign;
    box_sdf_val[b] = sv;
    box_surf_dist[b] = abs(sv);
    box_near_edge[b] = erosion_enable == 1 && abs(sv) < edge_detail_dist;

    float inf_d = 0.0;
    if (core_enable == 1 && has_sdf2)
    {
        float inf_sdf = volumesample(2, 0, bc) * sdf2_sign;
        inf_d = max(-inf_sdf, 0.0);
    }
    box_inf_depth[b] = inf_d;
    box_is_core[b] = 0;
    box_core_strength[b] = 0.0;
    if (core_enable == 1)
    {
        float c_str = 0.0;
        if (has_sdf1)
        {
            float depth = -sv;
            if (depth > 0.0)
                c_str = clamp(depth / max(core_threshold, 0.01), 0.0, 1.0);
        }
        if (inf_d > 0.0) c_str = max(c_str, 1.0);
        box_core_strength[b] = c_str;
        if (c_str > 0.5) box_is_core[b] = 1;
    }

    float v_align_xi = 1.0 + alignment_grad_x * (nx - 0.5) * 2.0;
    float v_align_yi = 1.0 + alignment_grad_y * (ny - 0.5) * 2.0;
    float v_align_zi = 1.0 + alignment_grad_z * (nz - 0.5) * 2.0;
    float v_combined_align = (v_align_xi + v_align_yi + v_align_zi) / 3.0;
    float v_line_xi = 1.0 + line_grad_x * (nx - 0.5) * 2.0;
    float v_line_yi = 1.0 + line_grad_y * (ny - 0.5) * 2.0;
    float v_line_zi = 1.0 + line_grad_z * (nz - 0.5) * 2.0;
    float v_combined_line = (v_line_xi + v_line_yi + v_line_zi) / 3.0;
    box_vis_vert[b] = clamp(vertical_alignment *
        (1.0 + (v_combined_align - 1.0) * gradient_strength), 0.0, 5.0);
    box_vis_horiz[b] = clamp(horizontal_line *
        (1.0 + (v_combined_line - 1.0) * gradient_strength), 0.0, 5.0);
}

float max_edge_dist = 0.0001;
for (int b = 0; b < num_boxes; b++)
{
    if (box_surf_dist[b] < 1e5 && box_surf_dist[b] > max_edge_dist)
        max_edge_dist = box_surf_dist[b];
}
float inv_num_boxes = 1.0 / float(max(num_boxes - 1, 1));
float inv_total_iters = 1.0 / float(max(total_iters, 1));
float inv_max_edge = 1.0 / max_edge_dist;

int box_keep[];
resize(box_keep, num_boxes);
for (int b = 0; b < num_boxes; b++) box_keep[b] = 1;

if ((fill_interior == 1 || erosion_enable == 1) && has_sdf1)
{
    for (int b = 0; b < num_boxes; b++)
    {
        vector bc = (box_mins[b] + box_maxs[b]) * 0.5;
        float dist = box_surf_dist[b];
        if (core_enable == 1 && box_is_core[b] == 1)
        {
            box_keep[b] = 1;
            continue;
        }
        float center_sdf = box_sdf_val[b];
        int center_outside = center_sdf > 0.0;
        float outside_ratio;
        float box_diag = length(box_maxs[b] - box_mins[b]);
        if (dist > box_diag * 0.75)
        {
            outside_ratio = float(center_outside);
        }
        else
        {
            vector bmin = box_mins[b];
            vector bmax = box_maxs[b];
            vector corners[] = array(
                set(bmin.x, bmin.y, bmin.z),
                set(bmax.x, bmin.y, bmin.z),
                set(bmax.x, bmax.y, bmin.z),
                set(bmin.x, bmax.y, bmin.z),
                set(bmin.x, bmin.y, bmax.z),
                set(bmax.x, bmin.y, bmax.z),
                set(bmax.x, bmax.y, bmax.z),
                set(bmin.x, bmax.y, bmax.z));
            int outside_count = center_outside;
            foreach (vector corner; corners)
            {
                float corner_sdf = volumesample(1, 0, corner) * sdf1_sign;
                if (corner_sdf > 0.0) outside_count++;
            }
            outside_ratio = float(outside_count) / 9.0;
        }
        if (fill_interior == 1 && outside_ratio > 0.6)
        {
            box_keep[b] = 0;
            continue;
        }
        if (erosion_enable == 1)
        {
            float ny = box_norm_y[b];
            float height_erosion = erosion_depth + ny * erosion_height_bias;
            vector noise_pos = bc * erosion_noise_freq
                + set(erosion_noise_offset, 0, erosion_noise_offset);
            float noise_val = noise(noise_pos);
            noise_val = (noise_val - 0.5) * 2.0 * erosion_noise_amp;
            float final_erosion = height_erosion + noise_val;
            if (outside_ratio > 0.3 && dist < final_erosion * 0.5)
            {
                box_keep[b] = 0;
                continue;
            }
            if (dist < final_erosion) box_keep[b] = 0;
        }
    }
}

int total_emitted = 0;
int total_culled = 0;
int total_emitted_faces = 0;
int total_form_failures = 0;
float tolerance = 0.001;
string face_names[] = array("back", "front", "bottom", "top", "left", "right");

for (int b = 0; b < num_boxes; b++)
{
    if (box_keep[b] == 0)
    {
        total_culled++;
        continue;
    }
    vector bx_min = box_mins[b];
    vector bx_max = box_maxs[b];
    int shape_this_box = rock_enable == 1;
    if (rock_protect_core == 1 && box_is_core[b] == 1) shape_this_box = 0;
    int emitted_face_tags[];
    int emitted_face_outside[];
    int fit_failures = 0;
    int box_prims[] = rock_emit(
        bx_min, bx_max, bbox_min, bbox_max,
        b, seed_val, shape_this_box,
        rock_face_recess, rock_recess_chance, rock_cut_angle, rock_chamfer,
        rock_form_follow, rock_form_padding, rock_form_steps,
        has_sdf1, sdf1_sign, diagonal_amount,
        emitted_face_tags, emitted_face_outside, fit_failures);
    total_form_failures += fit_failures;
    if (len(box_prims) == 0)
    {
        total_culled++;
        continue;
    }
    total_emitted++;
    total_emitted_faces += len(box_prims);

    float vis_vert_bias = box_vis_vert[b];
    float vis_horiz_bias = box_vis_horiz[b];
    float norm_y_vis = box_norm_y[b];
    float edge_dist = box_surf_dist[b];
    int near_edge = box_near_edge[b];
    int is_core_box = box_is_core[b];
    float core_prox = box_core_strength[b];
    vector color;
    if (is_core_box == 1)
    {
        color = set(0.12 + core_prox * 0.15,
                    0.22 + core_prox * 0.1,
                    0.25 + core_prox * 0.15);
    }
    else if (near_edge == 1)
    {
        float edge_t = 1.0 - clamp(edge_dist / max(edge_detail_dist, 0.01), 0.0, 1.0);
        color = set(0.7 + edge_t * 0.3,
                    0.3 + edge_t * 0.2,
                    0.1 + edge_t * 0.1);
    }
    else
    {
        float vn = clamp(vis_vert_bias / 2.0, 0.0, 1.0);
        float hn = clamp(vis_horiz_bias / 2.0, 0.0, 1.0);
        float strata_tint = strata_mode == 1 ? norm_y_vis : 0.5;
        color = set(0.4 + vn * 0.5 + (1.0 - strata_tint) * 0.2,
                    0.4 + (vn + hn) * 0.2,
                    0.4 + hn * 0.5 + strata_tint * 0.2);
    }
    int box_level = box_levels[b];

    for (int face_index = 0; face_index < len(box_prims); face_index++)
    {
        int prim = box_prims[face_index];
        int i = emitted_face_tags[face_index];
        string face_type = "chamfer";
        if (i < 6) face_type = face_names[i];
        else if (i == 7) face_type = "sdf_cut";

        setprimattrib(0, "box_id", prim, float(b) * inv_num_boxes, "set");
        setprimattrib(0, "rock_piece_id", prim, b, "set");
        setprimattrib(0, "subdivision_level", prim, float(box_level) * inv_total_iters, "set");
        setprimattrib(0, "face_type", prim, face_type, "set");
        setprimattrib(0, "vertical_bias", prim, vis_vert_bias / 5.0, "set");
        setprimattrib(0, "horizontal_bias", prim, vis_horiz_bias / 5.0, "set");
        setprimattrib(0, "strata_norm_y", prim, norm_y_vis, "set");
        setprimattrib(0, "edge_distance", prim, clamp(edge_dist * inv_max_edge, 0.0, 1.0), "set");
        setprimattrib(0, "near_edge", prim, near_edge, "set");
        setprimattrib(0, "is_core", prim, is_core_box, "set");
        setprimattrib(0, "core_strength", prim, core_prox, "set");

        int is_outside = 0;
        if (shape_this_box)
        {
            is_outside = emitted_face_outside[face_index];
        }
        else
        {
            if (i == 0 && abs(bx_min.z - bbox_min.z) < tolerance) is_outside = 1;
            if (i == 1 && abs(bx_max.z - bbox_max.z) < tolerance) is_outside = 1;
            if (i == 2 && abs(bx_min.y - bbox_min.y) < tolerance) is_outside = 1;
            if (i == 3 && abs(bx_max.y - bbox_max.y) < tolerance) is_outside = 1;
            if (i == 4 && abs(bx_min.x - bbox_min.x) < tolerance) is_outside = 1;
            if (i == 5 && abs(bx_max.x - bbox_max.x) < tolerance) is_outside = 1;
        }
        string surface_type = is_outside ? "outside" : "inside";
        setprimattrib(0, "is_outside", prim, is_outside, "set");
        setprimattrib(0, "surface_type", prim, surface_type, "set");

        if (is_outside == 1 && is_core_box == 0 && near_edge == 0)
        {
            float vn = vis_vert_bias / 2.0;
            float hn = vis_horiz_bias / 2.0;
            vector outside_color = set(0.2 + vn * 0.3,
                0.2 + (vn + hn) * 0.1, 0.2 + hn * 0.3);
            setprimattrib(0, "Cd", prim, outside_color, "set");
        }
        else
        {
            setprimattrib(0, "Cd", prim, color, "set");
        }

        setprimgroup(0, "core_boxes", prim, is_core_box);
        setprimgroup(0, "edge_faces", prim, near_edge);
        setprimgroup(0, "outside_faces", prim, is_outside);
        setprimgroup(0, "inside_faces", prim, !is_outside);
        setprimgroup(0, "rock_faces", prim, shape_this_box);
        setprimgroup(0, "chamfer_faces", prim, i == 6);
        setprimgroup(0, "sdf_surface_faces", prim, i == 7);
    }
}

setdetailattrib(0, "total_boxes", num_boxes, "set");
setdetailattrib(0, "total_emitted", total_emitted, "set");
setdetailattrib(0, "total_culled", total_culled, "set");
setdetailattrib(0, "total_faces", total_emitted_faces, "set");
setdetailattrib(0, "vertical_alignment", vertical_alignment, "set");
setdetailattrib(0, "horizontal_line", horizontal_line, "set");
setdetailattrib(0, "gradient_strength", gradient_strength, "set");
setdetailattrib(0, "strata_mode", strata_mode, "set");
setdetailattrib(0, "fill_interior", fill_interior, "set");
setdetailattrib(0, "erosion_enable", erosion_enable, "set");
setdetailattrib(0, "core_enable", core_enable, "set");
setdetailattrib(0, "size_variation", size_variation, "set");
setdetailattrib(0, "rock_enable", rock_enable, "set");
setdetailattrib(0, "rock_form_failed_samples", total_form_failures, "set");
setdetailattrib(0, "fracture_type", "rectangular_alignment_bias", "set");

if (debug_mode == 1)
{
    printf("[DEBUG] Boxes: %d, emitted: %d, culled: %d, faces: %d\n",
        num_boxes, total_emitted, total_culled, total_emitted_faces);
    printf("[DEBUG] Rock shaping: %d, failed SDF projection samples: %d\n",
        rock_enable, total_form_failures);
}
