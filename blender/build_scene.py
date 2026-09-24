import bpy
import importlib
import sys
from pathlib import Path

SCRIPT_DIR=Path(__file__).resolve().parent
if SCRIPT_DIR.suffix=='.blend': SCRIPT_DIR=SCRIPT_DIR.parent
if str(SCRIPT_DIR) not in sys.path: sys.path.insert(0, str(SCRIPT_DIR))
for name in ('config','mesh_assets','materials','build_grid','build_rail','build_pigs','build_anchors','build_camera','build_lighting'):
  if name in sys.modules: importlib.reload(sys.modules[name])

from build_anchors import build_anchors
from build_camera import build_camera
from build_grid import build_grid
from build_lighting import build_lighting
from build_pigs import build_pigs
from build_rail import build_rail
from materials import build_materials


def collection(parent, name):
  result=parent.children.get(name)
  if result: return result
  if bpy.data.collections.get(name): raise ValueError(f'{name} already exists outside {parent.name}; move it under the expected parent first.')
  result=bpy.data.collections.new(name)
  parent.children.link(result)
  return result


def build_scene():
  if bpy.context.mode!='OBJECT': raise RuntimeError('Switch to Object Mode before building.')
  root=collection(bpy.context.scene.collection, 'PrimitiveScene')
  groups={name:collection(root,name) for name in ('Grid','Rail','Pigs','GameplayAnchors','Camera','Lighting')}
  materials=build_materials()
  build_grid(groups['Grid'], materials)
  build_rail(groups['Rail'], materials)
  build_pigs(groups['Pigs'], materials)
  points=build_anchors(groups['GameplayAnchors'])
  build_camera(groups['Camera'], points['CameraTarget'])
  build_lighting(groups['Lighting'])
  if any(obj.name.endswith('_Mouth') for obj in groups['Pigs'].objects):
    print('Legacy split pigs preserved. Run upgrade_assets.py once to combine and link them.')
  return root


if __name__=='__main__': build_scene()
