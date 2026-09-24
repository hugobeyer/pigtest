import bpy
from config import KEY_LIGHT_ENERGY, KEY_LIGHT_ROTATION, WORLD_COLOR


def build_lighting(collection):
  light=collection.objects.get('KeyLight')
  if not light:
    data=bpy.data.lights.new('KeyLight', 'SUN')
    data.energy=KEY_LIGHT_ENERGY
    light=bpy.data.objects.new('KeyLight', data)
    light.rotation_euler=KEY_LIGHT_ROTATION
    collection.objects.link(light)
  scene=bpy.context.scene
  if not scene.world:
    scene.world=bpy.data.worlds.new('PrimitiveWorld')
    scene.world.color=WORLD_COLOR
  return light
