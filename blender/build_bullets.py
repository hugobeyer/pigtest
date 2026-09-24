from config import BULLET_RADIUS, PIG_TEMPLATE_GAP, TRAIL_RADIUS
from mesh_assets import mesh_object, sphere_mesh, trail_mesh
from asset_contract import BULLET_NAMES, TRAIL_NAMES


def build_bullets(collection, materials):
  bullet=sphere_mesh('Bullet_Mesh', BULLET_RADIUS, materials['Light'])
  trail=trail_mesh('Trail_Mesh', TRAIL_RADIUS, materials['Light'])
  for index,material in enumerate(('Light','Dark')):
    mesh_object(BULLET_NAMES[index], bullet, (index*PIG_TEMPLATE_GAP,-PIG_TEMPLATE_GAP,BULLET_RADIUS), materials[material], collection)
    mesh_object(TRAIL_NAMES[index], trail, (index*PIG_TEMPLATE_GAP,-PIG_TEMPLATE_GAP*2,TRAIL_RADIUS), materials[material], collection)
