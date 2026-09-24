from config import COLS, ROWS, CELL, GRID_HEIGHT, GROUND_EPS, STEP, X0, Y0
from mesh_assets import box_mesh, mesh_object


def build_grid(collection, materials):
  existing=next((obj for obj in collection.objects if obj.type=='MESH' and obj.name.startswith('Grid_r')), None)
  mesh=existing.data if existing else box_mesh('Grid_Box', (CELL,CELL,GRID_HEIGHT), materials['Light'], floor_pivot=True)
  for row in range(ROWS):
    for col in range(COLS):
      name=f'Grid_r{row:02}_c{col:02}'
      if collection.objects.get(name): continue
      light=((row//2+col//2)&1)==0
      obj=mesh_object(name, mesh, (X0+col*STEP,Y0-row*STEP,GROUND_EPS), materials['Light' if light else 'Dark'], collection)
      obj['row']=row
      obj['column']=col
      obj['checker_row']=row//2
      obj['checker_column']=col//2
      obj['is_light']=light
