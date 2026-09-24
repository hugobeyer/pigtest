import bpy
from math import cos, radians, sin
from config import CAMERA_RESOLUTION, CAMERA_DISTANCE, CAMERA_ELEVATION_DEGREES, CAMERA_OFFSET_Y, CAMERA_OFFSET_Z, CAMERA_ORTHO_SCALE

def build_camera(collection, target):
  render=bpy.context.scene.render
  if render.resolution_x>render.resolution_y: render.resolution_x,render.resolution_y=CAMERA_RESOLUTION
  camera=next((obj for obj in collection.objects if obj.type=='CAMERA'),None)
  if camera: return camera
  data=bpy.data.cameras.new('Camera')
  data.type='ORTHO'
  data.ortho_scale=CAMERA_ORTHO_SCALE
  camera=bpy.data.objects.new('Camera', data)
  elevation=radians(CAMERA_ELEVATION_DEGREES)
  camera.location=(0, -cos(elevation)*CAMERA_DISTANCE+CAMERA_OFFSET_Y, sin(elevation)*CAMERA_DISTANCE+CAMERA_OFFSET_Z)
  camera.rotation_euler=(target.location-camera.location).to_track_quat('-Z', 'Y').to_euler()
  collection.objects.link(camera)
  if not bpy.context.scene.camera: bpy.context.scene.camera=camera
  return camera
