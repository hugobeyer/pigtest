import bpy
from config import GROUND_EPS, PIG_COLUMNS, PIG_DEPTH, PIG_HEIGHT, PIG_ROWS, PIG_START_X, PIG_START_Y, PIG_WIDTH, PIG_X_STEP, PIG_Y_STEP
from mesh_assets import box_mesh, mesh_object
from asset_contract import PIG_NAMES, preflight_pigs


def clone_runner(source, collection):
  if bpy.data.objects.get('PigRunner'): raise ValueError('PigRunner already exists; preserve or move it into PrimitiveScene.')
  if source.constraints or source.animation_data:
    raise ValueError('Create PigRunner manually for an animated/constrained pig root; neutral placement cannot be inferred safely.')
  sources=[source,*source.children_recursive]
  copies={}
  try:
    for obj in sources:
      copy=obj.copy()
      copies[obj]=copy
      copy.name='PigRunner' if obj==source else 'PigRunner_'+obj.name
      collection.objects.link(copy)
    for obj,copy in copies.items():
      copy.parent=copies.get(obj.parent)
      copy.matrix_parent_inverse=obj.matrix_parent_inverse.copy()
      copy.matrix_basis=obj.matrix_basis.copy()
      for block in (*copy.modifiers,*copy.constraints):
        for prop in block.bl_rna.properties:
          if prop.type=='POINTER' and not prop.is_readonly:
            target=getattr(block,prop.identifier)
            if isinstance(target,bpy.types.Object) and target in copies: setattr(block,prop.identifier,copies[target])
    runner=copies[source]
    runner.matrix_parent_inverse.identity()
    runner.delta_location=(0,0,0)
    runner.delta_rotation_euler=(0,0,0)
    runner.delta_rotation_quaternion=(1,0,0,0)
    runner.delta_scale=(1,1,1)
    neutral=source.matrix_world.copy()
    neutral.translation=(0,0,0)
    runner.matrix_world=neutral
    return runner
  except Exception:
    for copy in copies.values(): bpy.data.objects.remove(copy,do_unlink=True)
    raise


def build_pigs(collection, materials):
  preflight_pigs(bpy.data.objects)
  if PIG_ROWS*PIG_COLUMNS!=len(PIG_NAMES): raise ValueError('The asset contract requires exactly 12 pigs.')
  for name in (*PIG_NAMES,'PigRunner'):
    if bpy.data.objects.get(name) and not collection.objects.get(name): raise ValueError(f'{name} exists outside Pigs; move it explicitly before building.')
  existing=next((obj for obj in collection.objects if obj.type=='MESH' and obj.name.startswith('Pig_') and obj.name.endswith('_Body')), None)
  mesh=existing.data if existing else box_mesh('Pig_Mesh', (PIG_WIDTH,PIG_DEPTH,PIG_HEIGHT), materials['Light'], floor_pivot=True)
  location=tuple(existing.location) if existing else (0,0,0)
  pigs=[]
  for row in range(PIG_ROWS):
    for col in range(PIG_COLUMNS):
      name=PIG_NAMES[row*PIG_COLUMNS+col]
      pig=collection.objects.get(name)
      if pig:
        pigs.append(pig)
        continue
      if not pig:
        pig=bpy.data.objects.new(name, None)
        pig.empty_display_type='PLAIN_AXES'
        pig.empty_display_size=.35
        pig.location=(PIG_START_X+col*PIG_X_STEP,PIG_START_Y-row*PIG_Y_STEP,GROUND_EPS)
        pig['is_light']=(row+col)%2==1
        collection.objects.link(pig)
      material=materials['Light' if pig.get('is_light',(row+col)%2==1) else 'Dark']
      mesh_object(name+'_Body', mesh, location, material, collection, pig)
      pigs.append(pig)
  if not collection.objects.get('PigRunner'): clone_runner(pigs[0],collection)
  return pigs
