import bpy
import importlib
import sys
from pathlib import Path

SCRIPT_DIR=Path(__file__).resolve().parent
if not (SCRIPT_DIR/'asset_contract.py').is_file(): raise RuntimeError('Open the external blender/build_scene.py in the Text Editor; do not paste into an internal text block.')
if str(SCRIPT_DIR) not in sys.path: sys.path.insert(0, str(SCRIPT_DIR))
for name in ('config','asset_contract','migrate','mesh_assets','materials','build_grid','build_rail','build_pigs','build_bullets','build_slots','build_anchors','build_camera','build_lighting'):
  if name in sys.modules: importlib.reload(sys.modules[name])

from build_anchors import build_anchors
from build_camera import build_camera
from build_grid import build_grid
from build_lighting import build_lighting
from build_pigs import build_pigs
from build_bullets import build_bullets
from build_rail import build_rail
from build_slots import build_slots
from materials import build_materials
from asset_contract import gameplay_collection, require_assets
from migrate import migrate


def collection(parent, name):
  result=parent.children.get(name)
  if result: return result
  if bpy.data.collections.get(name): raise ValueError(f'{name} already exists outside {parent.name}; move it under the expected parent first.')
  result=bpy.data.collections.new(name)
  parent.children.link(result)
  return result


def build_scene():
  if bpy.context.mode!='OBJECT': raise RuntimeError('Switch to Object Mode before building.')
  gameplay_collection()
  root=collection(bpy.context.scene.collection, 'Gameplay')
  migrate(root)
  groups={name:collection(root,name) for name in ('Grid','Rail','Pigs','Slots','GameplayAnchors','Camera','Lighting')}
  materials=build_materials()
  points=build_anchors(groups['GameplayAnchors'])
  build_grid(groups['Grid'], materials, points['GridCenter'])
  build_rail(groups['Rail'], materials)
  build_pigs(groups['Pigs'], materials)
  build_bullets(groups['Pigs'], materials)
  build_slots(groups['Slots'], materials)
  build_camera(groups['Camera'], points['CameraTarget'])
  build_lighting(groups['Lighting'])
  require_assets(root)
  return root


if __name__=='__main__': build_scene()
