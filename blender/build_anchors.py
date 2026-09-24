import bpy
from config import ANCHOR_SIZE, BOTTOM, CAMERA_TARGET, END_Y, GROUND_EPS, LEFT, START_X, GRID_LEFT, GRID_RIGHT, GRID_TOP, GRID_BOTTOM

def anchor(collection, name, location):
  obj=collection.objects.get(name)
  if obj: return obj
  obj=bpy.data.objects.new(name, None)
  obj.empty_display_type='PLAIN_AXES'
  obj.empty_display_size=ANCHOR_SIZE
  obj.location=location
  collection.objects.link(obj)
  return obj

def build_anchors(collection):
  return {'RailStart':anchor(collection, 'RailStart', (START_X, BOTTOM, GROUND_EPS)), 'RailEnd':anchor(collection, 'RailEnd', (LEFT, END_Y, GROUND_EPS)), 'GridCenter':anchor(collection, 'GridCenter', ((GRID_LEFT+GRID_RIGHT)*.5, (GRID_TOP+GRID_BOTTOM)*.5, GROUND_EPS)), 'CameraTarget':anchor(collection, 'CameraTarget', CAMERA_TARGET)}
