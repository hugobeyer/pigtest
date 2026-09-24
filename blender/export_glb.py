import bpy
import importlib
import sys
from pathlib import Path

SCRIPT_DIR=Path(__file__).resolve().parent
if SCRIPT_DIR.suffix=='.blend': SCRIPT_DIR=SCRIPT_DIR.parent
if str(SCRIPT_DIR) not in sys.path: sys.path.insert(0, str(SCRIPT_DIR))
if 'config' in sys.modules: importlib.reload(sys.modules['config'])

from config import EXPORT_PATH, IMPORT_ROOT_ROTATION_X


def export_glb(path=EXPORT_PATH):
  if bpy.context.mode!='OBJECT': raise RuntimeError('Switch to Object Mode before exporting.')
  root=bpy.data.collections.get('PrimitiveScene')
  if not root: raise RuntimeError('Build PrimitiveScene before exporting.')
  source_scene=bpy.context.scene
  graph=bpy.context.evaluated_depsgraph_get()
  profiles={obj.data.bevel_object for obj in root.all_objects if obj.type=='CURVE' and obj.data.bevel_object}
  sources=[obj for obj in root.all_objects if obj not in profiles and obj.get('export_asset',True)]
  sources.sort(key=lambda obj:len(obj.parent_recursive))
  names={obj:obj.name for obj in sources}
  temporary=bpy.data.scenes.new('PrimitiveExport')
  copies={}
  meshes=[]
  export_root=bpy.data.objects.new('PrimitiveScene',None)
  temporary.collection.objects.link(export_root)
  export_root['authored_up_axis']='Z'
  export_root['threejs_import_rotation_x']=IMPORT_ROOT_ROTATION_X
  try:
    for obj in sources: obj.name='ExportSource_'+names[obj]
    for obj in sources:
      copy=obj.copy()
      copies[obj]=copy
      if obj.type=='CURVE' or (obj.type=='MESH' and (obj.modifiers or obj.data.shape_keys)):
        mesh=bpy.data.meshes.new_from_object(obj.evaluated_get(graph), depsgraph=graph)
        meshes.append(mesh)
        copy=bpy.data.objects.new(obj.name,mesh)
        bpy.data.objects.remove(copies[obj],do_unlink=True)
        copies[obj]=copy
        for key,value in obj.items(): copy[key]=value
        for index,slot in enumerate(obj.material_slots):
          if index<len(copy.material_slots):
            copy.material_slots[index].link='OBJECT'
            copy.material_slots[index].material=slot.material
      copy.name=names[obj]
      temporary.collection.objects.link(copy)
      copy.hide_viewport=False
      copy.hide_render=False
      copy.modifiers.clear()
      copy.constraints.clear()
      copy.animation_data_clear()
    for source,copy in copies.items():
      copy.parent=copies.get(source.parent,export_root)
      copy.matrix_parent_inverse.identity()
      copy.matrix_world=source.evaluated_get(graph).matrix_world.copy()
    if source_scene.camera in copies: temporary.camera=copies[source_scene.camera]
    layer=temporary.view_layers[0]
    layer.update()
    with bpy.context.temp_override(scene=temporary,view_layer=layer):
      result=bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=False,use_active_scene=True,export_yup=True,export_extras=True,export_cameras=True,export_lights=True,export_animations=False)
      if result!={'FINISHED'}: raise RuntimeError(f'GLB export did not finish: {result}')
  finally:
    for obj in copies.values(): bpy.data.objects.remove(obj,do_unlink=True)
    bpy.data.objects.remove(export_root,do_unlink=True)
    for obj,name in names.items(): obj.name=name
    bpy.data.scenes.remove(temporary)
    for mesh in meshes:
      if mesh.users==0: bpy.data.meshes.remove(mesh)
  return path


if __name__=='__main__': export_glb()
