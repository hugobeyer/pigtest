import bpy
from config import GROUND_EPS, PIG_COLUMNS, PIG_DEPTH, PIG_HEIGHT, PIG_ROWS, PIG_START_X, PIG_START_Y, PIG_WIDTH, PIG_X_STEP, PIG_Y_STEP
from mesh_assets import box_mesh, mesh_object


def build_pigs(collection, materials):
  existing=next((obj for obj in collection.objects if obj.type=='MESH' and obj.name.startswith('Pig_') and obj.name.endswith('_Body')), None)
  mesh=existing.data if existing else box_mesh('Pig_Mesh', (PIG_WIDTH,PIG_DEPTH,PIG_HEIGHT), materials['Light'], floor_pivot=True)
  location=tuple(existing.location) if existing else (0,0,0)
  pigs=[]
  for row in range(PIG_ROWS):
    for col in range(PIG_COLUMNS):
      name=f'Pig_{row}_{col}'
      pig=collection.objects.get(name)
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
  return pigs
