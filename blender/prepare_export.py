import bpy
import importlib
import sys
from pathlib import Path

SCRIPT_DIR=Path(__file__).resolve().parent
if SCRIPT_DIR.suffix=='.blend': SCRIPT_DIR=SCRIPT_DIR.parent.parent/'blender'
if str(SCRIPT_DIR) not in sys.path: sys.path.insert(0,str(SCRIPT_DIR))
for name in ('config','asset_contract','mesh_assets','build_pigs'):
  if name in sys.modules: importlib.reload(sys.modules[name])

from asset_contract import LEGACY_PIG, PIG_NAMES, require_assets
from build_pigs import clone_runner


def prepare_export():
  if bpy.context.mode!='OBJECT': raise RuntimeError('Switch to Object Mode before preparing.')
  root=bpy.data.collections.get('PrimitiveScene')
  if not root: raise RuntimeError('PrimitiveScene is missing; open the authored .blend first.')
  renames={}
  for obj in root.all_objects:
    match=LEGACY_PIG.fullmatch(obj.name)
    if not match:
      if LEGACY_PIG.fullmatch(obj.name.rsplit('.',1)[0]): raise ValueError(f'Duplicate legacy root {obj.name}; resolve it explicitly before preparing.')
      continue
    row,col=map(int,match.groups())
    if row>=3 or col>=4: raise ValueError(f'Unknown legacy pig root: {obj.name}')
    name=PIG_NAMES[row*4+col]
    if name in renames.values() or bpy.data.objects.get(name): raise ValueError(f'Cannot migrate {obj.name}: {name} already exists.')
    if obj.library: raise ValueError(f'{obj.name} is library-linked; make the asset local explicitly first.')
    renames[obj]=name
  first=root.all_objects.get('Pig_00') or next((obj for obj,name in renames.items() if name=='Pig_00'),None)
  runner=bpy.data.objects.get('PigRunner')
  if runner and runner not in tuple(root.all_objects): raise ValueError('PigRunner exists outside PrimitiveScene; move it explicitly first.')
  if not runner:
    if first is None: raise ValueError('Pig_00 (or legacy Pig_0_0) is required to create PigRunner.')
    if first.constraints or first.animation_data: raise ValueError('Create a neutral PigRunner manually for an animated/constrained first pig root.')
  for obj,name in renames.items(): obj.name=name
  for index,name in enumerate(PIG_NAMES):
    obj=root.all_objects.get(name)
    if obj is not None and 'is_light' not in obj: obj['is_light']=(index//4+index%4)%2==1
  if not runner:
    collection=root.children.get('Pigs') or root
    runner=clone_runner(first,collection)
  report=require_assets(root)
  print(f"Prepared {report['object_count']} export objects. Save the .blend to retain preparation.")
  return report


if __name__=='__main__': prepare_export()
