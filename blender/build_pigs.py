import bpy
from config import GROUND_EPS, PIG_COLUMNS, PIG_DEPTH, PIG_HEIGHT, PIG_QUEUE_LENGTH, PIG_ROW_STEP, PIG_START_X, PIG_START_Y, PIG_TEMPLATE_GAP, PIG_WIDTH, PIG_X_STEP
from mesh_assets import box_mesh, mesh_object
from asset_contract import PIG_COLUMN_NAMES, PIG_NAMES


def build_pigs(collection, materials):
  if PIG_COLUMNS!=len(PIG_COLUMN_NAMES): raise ValueError('The asset contract requires exactly 4 pig columns.')
  for name in (*PIG_COLUMN_NAMES,*PIG_NAMES):
    if bpy.data.objects.get(name) and not collection.objects.get(name): raise ValueError(f'{name} exists outside Pigs; move it explicitly before building.')
  for index,name in enumerate(PIG_COLUMN_NAMES):
    if collection.objects.get(name): continue
    column=bpy.data.objects.new(name, None)
    column.empty_display_type='SINGLE_ARROW'
    column.empty_display_size=.8
    column.location=(PIG_START_X+index*PIG_X_STEP,PIG_START_Y,GROUND_EPS)
    column['queue']=(('DL' if index%2==0 else 'LD')*PIG_QUEUE_LENGTH)[:PIG_QUEUE_LENGTH]
    column['row_step']=PIG_ROW_STEP
    collection.objects.link(column)
  mesh=box_mesh('Pig_Mesh', (PIG_WIDTH,PIG_DEPTH,PIG_HEIGHT), materials['Dark'], floor_pivot=True)
  for index,(name,material) in enumerate(zip(PIG_NAMES,('Light','Dark'))):
    if collection.objects.get(name): continue
    pig=bpy.data.objects.new(name, None)
    pig.empty_display_type='PLAIN_AXES'
    pig.empty_display_size=.35
    pig.location=(index*PIG_TEMPLATE_GAP,0,0)
    collection.objects.link(pig)
    mesh_object(name+'_Body', mesh, (0,0,0), materials[material], collection, pig)
