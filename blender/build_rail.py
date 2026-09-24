import bpy
from math import cos, pi, sin
from mesh_assets import cube
from config import BOTTOM, BR_X, CORNER_RADIUS, END_Y, GROUND_EPS, LEFT, RAIL_ARC_STEPS, RAIL_END_OFFSET_Y, RAIL_END_SIZE, RAIL_HEIGHT, RAIL_START_OFFSET_X, RAIL_START_SIZE, RAIL_WIDTH, RIGHT, START_X, TL_X, TOP, TR_Y

def arc(points, start, cx, cy):
  for index in range(1,RAIL_ARC_STEPS+1):
    angle=start+pi*.5*index/RAIL_ARC_STEPS
    points.append((cx+cos(angle)*CORNER_RADIUS, cy+sin(angle)*CORNER_RADIUS, GROUND_EPS))

def rail_points():
  points=[(START_X, BOTTOM, GROUND_EPS), (BR_X, BOTTOM, GROUND_EPS)]
  arc(points, -pi*.5, BR_X, BOTTOM+CORNER_RADIUS)
  points.append((RIGHT, TR_Y, GROUND_EPS))
  arc(points, 0, RIGHT-CORNER_RADIUS, TR_Y)
  points.append((TL_X, TOP, GROUND_EPS))
  arc(points, pi*.5, TL_X, TOP-CORNER_RADIUS)
  points.append((LEFT, END_Y, GROUND_EPS))
  return points

def rectangular_profile(collection):
  profile=collection.objects.get('Rail_Profile')
  if profile: return profile
  data=bpy.data.curves.new('Rail_Profile', 'CURVE')
  data.dimensions='2D'
  spline=data.splines.new('POLY')
  spline.points.add(3)
  for point,co in zip(spline.points, [(-RAIL_WIDTH*.5, 0, 0, 1), (RAIL_WIDTH*.5, 0, 0, 1), (RAIL_WIDTH*.5, RAIL_HEIGHT, 0, 1), (-RAIL_WIDTH*.5, RAIL_HEIGHT, 0, 1)]): point.co=co
  spline.use_cyclic_u=True
  profile=bpy.data.objects.new('Rail_Profile', data)
  collection.objects.link(profile)
  profile['export_asset']=False
  profile.hide_render=True
  profile.hide_set(True)
  return profile

def build_rail(collection, materials):
  main=collection.objects.get('Rail_Main')
  if not main:
    curve=bpy.data.curves.new('Rail_Main', 'CURVE')
    curve.dimensions='3D'
    curve.twist_mode='Z_UP'
    curve.bevel_mode='OBJECT'
    curve.bevel_object=rectangular_profile(collection)
    curve.use_fill_caps=True
    spline=curve.splines.new('POLY')
    spline.use_cyclic_u=False
    points=rail_points()
    spline.points.add(len(points)-1)
    for point,co in zip(spline.points, points): point.co=(*co, 1)
    main=bpy.data.objects.new('Rail_Main', curve)
    main.data.materials.append(materials['Rail'])
    collection.objects.link(main)
  start=cube('Rail_Start', (START_X+RAIL_START_OFFSET_X,BOTTOM,GROUND_EPS), RAIL_START_SIZE, materials['RailWhite'], collection, floor_pivot=True)
  end=cube('Rail_End', (LEFT,END_Y+RAIL_END_OFFSET_Y,GROUND_EPS), RAIL_END_SIZE, materials['RailWhite'], collection, floor_pivot=True)
  return main, start, end
