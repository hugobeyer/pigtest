from config import CELL, CHECKER, COLS, GRID_HEIGHT, GROUND_EPS, ROWS, STEP
from mesh_assets import box_mesh, mesh_object


def build_grid(collection, materials, center):
  for key,value in (('rows',ROWS),('columns',COLS),('step',STEP),('checker',CHECKER)):
    if key not in center: center[key]=value
  mesh=box_mesh('Grid_Box', (CELL,CELL,GRID_HEIGHT), materials['Light'], floor_pivot=True)
  for index,(name,material) in enumerate((('Grid_Block_Light','Light'),('Grid_Block_Dark','Dark'))):
    mesh_object(name, mesh, (center.location.x+index*STEP, center.location.y, GROUND_EPS), materials[material], collection)
