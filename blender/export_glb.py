import bpy
import importlib
import sys
from pathlib import Path
from uuid import uuid4

SCRIPT_DIR=Path(__file__).resolve().parent
if SCRIPT_DIR.suffix=='.blend': SCRIPT_DIR=SCRIPT_DIR.parent.parent/'blender'
if str(SCRIPT_DIR) not in sys.path: sys.path.insert(0,str(SCRIPT_DIR))
for name in ('config','asset_contract'):
  if name in sys.modules: importlib.reload(sys.modules[name])

from config import EXPORT_PATH, IMPORT_ROOT_ROTATION_X
from asset_contract import ancestors, export_objects, gameplay_collection, require_assets


def export_glb(path=EXPORT_PATH):
  if bpy.context.mode!='OBJECT': raise RuntimeError('Switch to Object Mode before exporting.')
  root=gameplay_collection()
  if not root: raise RuntimeError('Open the authored Gameplay collection before exporting.')
  require_assets(root)
  source_scene=bpy.context.scene
  sources=export_objects(root)
  environment=bpy.data.collections.get('Environment')
  scenery=[obj for obj in export_objects(environment) if obj not in sources] if environment else []
  sources+=scenery
  sources.sort(key=lambda obj:sum(1 for _ in ancestors(obj)))
  for obj in sources:
    if obj.library: raise ValueError(f'{obj.name}: library-linked objects require explicit localization before export.')
    if obj.name not in bpy.context.view_layer.objects: raise ValueError(f'{obj.name} is excluded from the active view layer; enable it before export.')
    if obj.type not in {'EMPTY','MESH','CURVE','CAMERA','LIGHT'}: raise ValueError(f'{obj.name}: unsupported export type {obj.type}; convert explicitly first.')
    if obj.instance_type!='NONE': raise ValueError(f'{obj.name}: collection/vertex/face instances are not supported; realize them explicitly before export.')
  if bpy.data.objects.get('SceneRoot'): raise ValueError('Object name SceneRoot is reserved for the GLB root; rename that object explicitly.')
  graph=bpy.context.evaluated_depsgraph_get()
  source_set=set(sources)

  path=Path(path).expanduser().resolve()
  path.parent.mkdir(parents=True,exist_ok=True)
  names={obj:obj.name for obj in sources}
  temporary=None
  export_root=None
  copies={}
  meshes=[]
  snapshots={}
  instance_snapshots=[]
  instance_copies=[]
  renamed=[]
  try:
    for instance in graph.object_instances:
      if not instance.is_instance or not instance.parent or instance.parent.original not in source_set: continue
      obj=instance.object
      if obj.type=='EMPTY': continue
      if obj.type not in {'MESH','CURVE'}: raise ValueError(f'{obj.name}: evaluated instance type {obj.type} is not supported.')
      mesh=bpy.data.meshes.new_from_object(obj,preserve_all_data_layers=True,depsgraph=graph)
      if mesh is None: raise ValueError(f'{obj.name}: instance mesh evaluation failed')
      meshes.append(mesh)
      if not mesh.polygons: continue
      materials=[(slot.link,slot.material) for slot in obj.material_slots]
      instance_snapshots.append((instance.parent.original,instance.matrix_world.copy(),mesh,materials))
    instancers={parent for parent,matrix,mesh,materials in instance_snapshots}
    for obj in sources:
      evaluated=obj.evaluated_get(graph)
      matrix=evaluated.matrix_world.copy()
      mesh=None
      materials=[(slot.link,slot.material) for slot in evaluated.material_slots]
      if obj.type=='CURVE' or (obj.type=='MESH' and (obj.modifiers or obj.data.shape_keys or any(slot.link=='OBJECT' for slot in obj.material_slots))):
        mesh=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=graph)
        if mesh is None: raise ValueError(f'{obj.name}: mesh evaluation failed')
        if any(slot.link=='OBJECT' for slot in obj.material_slots):
          mesh.materials.clear()
          for link,material in materials:
            if material: mesh.materials.append(material)
        meshes.append(mesh)
      if obj.type in {'MESH','CURVE'} and obj not in instancers and not (mesh if mesh is not None else obj.data).polygons:
        raise ValueError(f'{obj.name}: evaluated geometry has no faces; nothing renderable would be exported')
      snapshots[obj]=(matrix,mesh,materials)
    temporary=bpy.data.scenes.new('PrimitiveExport')
    for key in ('resolution_x','resolution_y','pixel_aspect_x','pixel_aspect_y'): setattr(temporary.render,key,getattr(source_scene.render,key))
    export_root=bpy.data.objects.new('SceneRoot',None)
    temporary.collection.objects.link(export_root)
    export_root['authored_up_axis']='Z'
    export_root['threejs_import_rotation_x']=IMPORT_ROOT_ROTATION_X
    for obj in sources:
      matrix,mesh,materials=snapshots[obj]
      copy=bpy.data.objects.new('ExportCopy',mesh) if obj.type=='CURVE' else obj.copy()
      copies[obj]=copy
      if mesh is not None: copy.data=mesh
      for key,value in obj.items(): copy[key]=value
      if obj in scenery: copy['environment']=True
      temporary.collection.objects.link(copy)
      copy.hide_viewport=False
      copy.hide_render=False
      copy.modifiers.clear()
      copy.constraints.clear()
      copy.animation_data_clear()
      if mesh is not None:
        for index,(link,material) in enumerate(materials):
          if index<len(copy.material_slots) and link=='OBJECT':
            copy.material_slots[index].link='OBJECT'
            copy.material_slots[index].material=material
    for source,copy in copies.items():
      copy.parent=copies.get(source.parent,export_root)
      copy.parent_type='OBJECT'
      copy.matrix_parent_inverse.identity()
      copy.delta_location=(0,0,0)
      copy.delta_rotation_euler=(0,0,0)
      copy.delta_rotation_quaternion=(1,0,0,0)
      copy.delta_scale=(1,1,1)
      parent_matrix=snapshots[source.parent][0] if source.parent in copies else export_root.matrix_world
      copy.matrix_basis=parent_matrix.inverted_safe() @ snapshots[source][0]
    for index,(parent,matrix,mesh,materials) in enumerate(instance_snapshots):
      copy=bpy.data.objects.new(f'{names[parent]}_Instance_{index:04}',mesh)
      instance_copies.append(copy)
      temporary.collection.objects.link(copy)
      copy.parent=copies[parent]
      copy.matrix_basis=snapshots[parent][0].inverted() @ matrix
      for slot_index,(link,material) in enumerate(materials):
        if slot_index<len(copy.material_slots) and link=='OBJECT':
          copy.material_slots[slot_index].link='OBJECT'
          copy.material_slots[slot_index].material=material
    token=uuid4().hex
    for index,obj in enumerate(sources):
      renamed.append(obj)
      obj.name=f'ExportSource_{token}_{index}'
    for obj,copy in copies.items():
      copy.name=names[obj]
      if copy.name!=names[obj]: raise RuntimeError(f'Could not reserve exact export name {names[obj]}')
    if source_scene.camera in copies: temporary.camera=copies[source_scene.camera]
    layer=temporary.view_layers[0]
    layer.update()
    with bpy.context.temp_override(scene=temporary,view_layer=layer):
      result=bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=False,use_active_scene=True,export_yup=True,export_extras=True,export_cameras=True,export_lights=True,export_animations=False)
      if result!={'FINISHED'}: raise RuntimeError(f'GLB export did not finish: {result}')
    if not path.is_file(): raise RuntimeError(f'GLB exporter returned FINISHED but wrote no file: {path}')
    print(f'Exported GLB: {path}')
  finally:
    try:
      for index,obj in enumerate(copies.values()): obj.name=f'ExportCleanup_{uuid4().hex}_{index}'
    finally:
      try:
        for obj in renamed: obj.name=names[obj]
      finally:
        for obj in instance_copies: bpy.data.objects.remove(obj,do_unlink=True)
        for obj in copies.values(): bpy.data.objects.remove(obj,do_unlink=True)
        if export_root is not None: bpy.data.objects.remove(export_root,do_unlink=True)
        if temporary is not None: bpy.data.scenes.remove(temporary)
        for mesh in meshes:
          if mesh.users==0: bpy.data.meshes.remove(mesh)
  return path


if __name__=='__main__': export_glb()
