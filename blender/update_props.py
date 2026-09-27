import re
import bpy
from pathlib import Path

LIBRARY='Props_Library'
SOURCE=Path(__file__).resolve().parent.parent/'source_files'/'export'/'props.glb'
TEMP='_props_import'


def base(name): return re.sub(r'\.\d{3}$','',name)


def update_props(path=SOURCE):
  library=bpy.data.collections.get(LIBRARY)
  if library is None: raise ValueError(f'Open props.blend: collection "{LIBRARY}" not found')
  if not Path(path).exists(): raise FileNotFoundError(path)
  materials=set(bpy.data.materials)
  images=set(bpy.data.images)
  temp=bpy.data.collections.new(TEMP)
  bpy.context.scene.collection.children.link(temp)
  layer=bpy.context.view_layer
  layer.active_layer_collection=layer.layer_collection.children[TEMP]
  try:
    bpy.ops.import_scene.gltf(filepath=str(path))
    existing={obj.name:obj for obj in library.objects}
    updated,added=[],[]
    for obj in list(temp.all_objects):
      if obj.type!='MESH':
        bpy.data.objects.remove(obj,do_unlink=True)
        continue
      name=base(obj.name)
      for slot_index,material in enumerate(obj.data.materials):
        original=bpy.data.materials.get(base(material.name)) if material else None
        if original and original in materials: obj.data.materials[slot_index]=original
      target=existing.get(name)
      if target:
        old=target.data
        target.data=obj.data
        bpy.data.objects.remove(obj,do_unlink=True)
        if old.users==0:
          mesh_name=old.name
          bpy.data.meshes.remove(old)
          target.data.name=mesh_name
        updated.append(name)
      else:
        temp.objects.unlink(obj)
        library.objects.link(obj)
        obj.name=name
        added.append(name)
    for material in set(bpy.data.materials)-materials:
      if material.users==0: bpy.data.materials.remove(material)
    for image in set(bpy.data.images)-images:
      if image.users==0: bpy.data.images.remove(image)
  finally:
    bpy.data.collections.remove(temp)
  missing=sorted(set(existing)-set(updated))
  return updated,added,missing

