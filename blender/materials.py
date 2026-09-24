import bpy
from config import MATERIAL_COLORS


def build_materials():
  result={}
  for name,color in MATERIAL_COLORS.items():
    material=bpy.data.materials.get(name)
    if not material:
      material=bpy.data.materials.new(name)
      material.diffuse_color=color
      material.use_nodes=True
      shader=material.node_tree.nodes['Principled BSDF']
      shader.inputs['Base Color'].default_value=color
      shader.inputs['Roughness'].default_value=.55
    result[name]=material
  return result
