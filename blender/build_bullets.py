from config import BULLET_RADIUS, PIG_TEMPLATE_GAP
from mesh_assets import mesh_object, sphere_mesh
from asset_contract import BULLET_NAMES


def build_bullets(collection, materials):
  mesh=sphere_mesh('Bullet_Mesh', BULLET_RADIUS, materials['Light'])
  for index,(name,material) in enumerate(zip(BULLET_NAMES,('Light','Dark'))):
    mesh_object(name, mesh, (index*PIG_TEMPLATE_GAP,-PIG_TEMPLATE_GAP,BULLET_RADIUS), materials[material], collection)
