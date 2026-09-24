from config import GROUND_EPS, SLOT_COUNT, SLOT_SIZE, SLOT_X_STEP, SLOT_Y
from mesh_assets import box_mesh, mesh_object
from asset_contract import SLOT_NAMES


def build_slots(collection, materials):
  existing=next((obj for obj in collection.objects if obj.type=='MESH' and obj.name in SLOT_NAMES), None)
  mesh=existing.data if existing else box_mesh('Slot_Mesh', SLOT_SIZE, materials['Slot'], floor_pivot=True)
  for index,name in enumerate(SLOT_NAMES):
    if collection.objects.get(name): continue
    obj=mesh_object(name, mesh, ((index-(SLOT_COUNT-1)*.5)*SLOT_X_STEP, SLOT_Y, GROUND_EPS), materials['Slot'], collection)
    obj['slot']=index
