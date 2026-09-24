bl_info={'name':'Primitive Scene Tools','author':'Primitive Scene','version':(1,0,0),'blender':(3,6,0),'location':'3D View > Sidebar > Primitive','category':'3D View'}

import bpy
import importlib
import os
import shutil
import subprocess
import sys
import time
import traceback
import webbrowser
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

SCRIPT_DIR=Path(__file__).resolve().parent
if SCRIPT_DIR.suffix=='.blend': SCRIPT_DIR=SCRIPT_DIR.parent.parent/'blender'
if str(SCRIPT_DIR) not in sys.path: sys.path.insert(0,str(SCRIPT_DIR))
PROJECT_DIR=SCRIPT_DIR.parent
PLAY_URL='http://127.0.0.1:5173/'


def run_module(name, method):
  module=importlib.reload(sys.modules[name]) if name in sys.modules else importlib.import_module(name)
  return getattr(module,method)()


def reload_ui():
  path=SCRIPT_DIR/'scene_ui.py'
  exec(compile(path.read_text(),str(path),'exec'),{'__name__':'__main__','__file__':str(path)})


class PRIMITIVE_OT_pull(bpy.types.Operator):
  bl_idname='primitive.pull'
  bl_label='Pull Latest'
  bl_description='Run git pull in the project folder and reload these tools'

  @classmethod
  def poll(cls, context): return shutil.which('git') is not None

  def execute(self, context):
    def git(*args): return subprocess.run([shutil.which('git'),*args],cwd=str(PROJECT_DIR),capture_output=True,text=True,timeout=60,env={**os.environ,'GIT_TERMINAL_PROMPT':'0'})
    before=git('rev-parse','HEAD').stdout.strip()
    try:
      result=git('pull','--ff-only')
    except subprocess.TimeoutExpired:
      self.report({'ERROR'},'git pull timed out')
      return {'CANCELLED'}
    if result.returncode:
      print(result.stdout,result.stderr)
      self.report({'ERROR'},(result.stderr or result.stdout).strip().splitlines()[-1])
      return {'CANCELLED'}
    changed=git('diff','--name-only',before,'HEAD').stdout.split()
    bpy.app.timers.register(reload_ui,first_interval=.1)
    blend=Path(bpy.data.filepath).resolve() if bpy.data.filepath else None
    if blend and any((PROJECT_DIR/name).resolve()==blend for name in changed): self.report({'WARNING'},'Pulled a newer .blend; use File > Revert to load it')
    else: self.report({'INFO'},f'Pulled {len(changed)} changed files' if changed else 'Already up to date')
    return {'FINISHED'}


class PRIMITIVE_OT_build(bpy.types.Operator):
  bl_idname='primitive.build_scene'
  bl_label='Build Missing Assets'
  bl_description='Create missing scene assets; keep existing Blender edits'

  @classmethod
  def poll(cls, context): return context.mode=='OBJECT'

  def execute(self, context):
    try:
      run_module('build_scene','build_scene')
    except Exception as error:
      traceback.print_exc()
      self.report({'ERROR'},str(error))
      return {'CANCELLED'}
    self.report({'INFO'},'Missing assets built; existing objects preserved')
    return {'FINISHED'}


class PRIMITIVE_OT_prepare(bpy.types.Operator):
  bl_idname='primitive.prepare_export'
  bl_label='Prepare Scene'
  bl_description='Convert old Pig_XX and Grid_rXX_cYY objects into pig columns and grid blocks; save the blend afterwards'
  bl_options={'REGISTER','UNDO'}

  @classmethod
  def poll(cls, context): return context.mode=='OBJECT'

  def execute(self, context):
    try:
      run_module('prepare_export','prepare_export')
    except Exception as error:
      traceback.print_exc()
      self.report({'ERROR'},str(error))
      return {'CANCELLED'}
    self.report({'INFO'},'Prepared for export; save the .blend to retain changes')
    return {'FINISHED'}


class PRIMITIVE_OT_export(bpy.types.Operator):
  bl_idname='primitive.export_glb'
  bl_label='Export GLB'
  bl_description='Export the live PrimitiveScene to assets/primitive_scene.glb without changing the blend'

  @classmethod
  def poll(cls, context): return context.mode=='OBJECT' and bpy.data.collections.get('PrimitiveScene') is not None

  def execute(self, context):
    try:
      path=run_module('export_glb','export_glb')
    except Exception as error:
      traceback.print_exc()
      self.report({'ERROR'},str(error))
      return {'CANCELLED'}
    self.report({'INFO'},f'GLB exported: {path}')
    return {'FINISHED'}


class PRIMITIVE_OT_play(bpy.types.Operator):
  bl_idname='primitive.run_and_play'
  bl_label='Run Vite & Play'
  bl_description='Start the local Vite dev server and open the game in your browser'

  @classmethod
  def poll(cls, context): return (PROJECT_DIR/'node_modules/vite/bin/vite.js').is_file() and shutil.which('node') is not None

  def execute(self, context):
    process=bpy.app.driver_namespace.get('primitive_vite_process')
    if process is None or process.poll() is not None:
      command=[shutil.which('node'),str(PROJECT_DIR/'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5173','--strictPort']
      try:
        process=subprocess.Popen(command,cwd=str(PROJECT_DIR))
      except OSError as error:
        self.report({'ERROR'},str(error))
        return {'CANCELLED'}
      bpy.app.driver_namespace['primitive_vite_process']=process
    started=time.monotonic()
    def open_when_ready():
      if process.poll() is not None:
        print('Vite stopped before the page was ready; check Blender System Console.')
        return None
      try:
        with urlopen(PLAY_URL,timeout=.2) as response:
          if response.status==200:
            webbrowser.open(PLAY_URL,new=2)
            return None
      except (OSError,URLError): pass
      if time.monotonic()-started>=20:
        print(f'Vite has not responded at {PLAY_URL}; check Blender System Console.')
        return None
      return .4
    bpy.app.timers.register(open_when_ready,first_interval=.4)
    self.report({'INFO'},f'Opening {PLAY_URL} when Vite is ready')
    return {'FINISHED'}


class PRIMITIVE_OT_stop(bpy.types.Operator):
  bl_idname='primitive.stop_vite'
  bl_label='Stop Vite'
  bl_description='Stop the Vite process started by this Blender panel'

  @classmethod
  def poll(cls, context):
    process=bpy.app.driver_namespace.get('primitive_vite_process')
    return process is not None and process.poll() is None

  def execute(self, context):
    bpy.app.driver_namespace['primitive_vite_process'].terminate()
    self.report({'INFO'},'Stopped Vite')
    return {'FINISHED'}


class PRIMITIVE_PT_assets(bpy.types.Panel):
  bl_idname='PRIMITIVE_PT_assets'
  bl_label='Primitive Scene'
  bl_space_type='VIEW_3D'
  bl_region_type='UI'
  bl_category='Primitive'

  def draw(self, context):
    layout=self.layout
    layout.operator('primitive.pull',icon='FILE_REFRESH')
    layout.separator()
    layout.operator('primitive.build_scene',icon='MESH_CUBE')
    layout.operator('primitive.prepare_export',icon='OUTLINER_OB_EMPTY')
    layout.separator()
    layout.operator('primitive.export_glb',icon='EXPORT')
    layout.separator()
    layout.operator('primitive.run_and_play',icon='PLAY')
    layout.operator('primitive.stop_vite',icon='CANCEL')
    layout.label(text='Save the .blend after editing or preparing')


classes=(PRIMITIVE_OT_pull,PRIMITIVE_OT_build,PRIMITIVE_OT_prepare,PRIMITIVE_OT_export,PRIMITIVE_OT_play,PRIMITIVE_OT_stop,PRIMITIVE_PT_assets)


def register():
  for cls in reversed(bpy.app.driver_namespace.get('primitive_scene_ui_classes',())): bpy.utils.unregister_class(cls)
  for cls in classes: bpy.utils.register_class(cls)
  bpy.app.driver_namespace['primitive_scene_ui_classes']=classes


def unregister():
  for cls in reversed(bpy.app.driver_namespace.pop('primitive_scene_ui_classes',())): bpy.utils.unregister_class(cls)


if __name__=='__main__': register()
