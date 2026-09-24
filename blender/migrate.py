import bpy
import re
from config import PIG_QUEUE_LENGTH, PIG_ROW_STEP, PIG_TEMPLATE_GAP
from asset_contract import PIG_COLUMN_NAMES


def remove_tree(obj):
  for child in obj.children_recursive: bpy.data.objects.remove(child,do_unlink=True)
  bpy.data.objects.remove(obj,do_unlink=True)


def migrate_pigs(root):
  pigs=[obj for obj in root.all_objects if re.fullmatch(r'Pig_\d+',obj.name)]
  if not pigs: return
  if any(bpy.data.objects.get(name) for name in PIG_COLUMN_NAMES): raise ValueError('PigColumn objects already exist; delete the old Pig_XX objects explicitly.')
  columns={}
  for pig in pigs: columns.setdefault(round(pig.matrix_world.translation.x,3),[]).append(pig)
  if len(columns)!=len(PIG_COLUMN_NAMES): raise ValueError(f'Expected {len(PIG_COLUMN_NAMES)} pig columns, found {len(columns)}.')
  collection=root.children.get('Pigs') or root
  for name,x in zip(PIG_COLUMN_NAMES,sorted(columns)):
    rows=sorted(columns[x],key=lambda pig:-pig.matrix_world.translation.y)
    queue=[bool(pig.get('is_light')) for pig in rows]
    while len(queue)<PIG_QUEUE_LENGTH: queue.append(not queue[-1])
    column=bpy.data.objects.new(name,None)
    column.empty_display_type='SINGLE_ARROW'
    column.empty_display_size=.8
    column.location=rows[0].matrix_world.translation
    column['queue']=''.join('L' if light else 'D' for light in queue)
    column['row_step']=rows[0].matrix_world.translation.y-rows[1].matrix_world.translation.y if len(rows)>1 else PIG_ROW_STEP
    collection.objects.link(column)
  for pig in pigs: remove_tree(pig)


def migrate_grid(root):
  cells=[obj for obj in root.all_objects if re.fullmatch(r'Grid_r\d+_c\d+',obj.name)]
  if not cells: return
  if any(bpy.data.objects.get(name) for name in ('Grid_Block_Light','Grid_Block_Dark')): raise ValueError('Grid_Block objects already exist; delete the old Grid_rXX_cYY objects explicitly.')
  center=root.all_objects.get('GridCenter')
  if center is None: raise ValueError('GridCenter is required to migrate the grid.')
  by_cell={(obj['row'],obj['column']):obj for obj in cells}
  rows=max(row for row,col in by_cell)+1
  columns=max(col for row,col in by_cell)+1
  first=by_cell[0,0].matrix_world.translation
  last=by_cell[rows-1,columns-1].matrix_world.translation
  center['rows']=rows
  center['columns']=columns
  center['step']=by_cell[0,1].matrix_world.translation.x-first.x
  center['checker']=next(row for row in range(1,rows) if by_cell[row,0]['checker_row']==1)
  center.location.x=(first.x+last.x)*.5
  center.location.y=(first.y+last.y)*.5
  light=next(obj for obj in cells if obj['is_light'])
  dark=next(obj for obj in cells if not obj['is_light'])
  for obj in cells:
    if obj not in (light,dark): remove_tree(obj)
  for obj,name in ((light,'Grid_Block_Light'),(dark,'Grid_Block_Dark')):
    for key in ('row','column','checker_row','checker_column','is_light'): del obj[key]
    obj.name=name


def migrate_runner(root):
  runner=root.all_objects.get('PigRunner')
  if runner is None: return
  if any(bpy.data.objects.get(name) for name in ('Pig_Light','Pig_Dark')): raise ValueError('Pig_Light/Pig_Dark already exist; delete PigRunner explicitly.')
  light=bpy.data.materials.get('Light')
  if light is None: raise ValueError('Material Light is required to create Pig_Light.')
  copies={}
  for obj in (runner,*runner.children_recursive):
    copies[obj]=obj.copy()
    for collection in obj.users_collection: collection.objects.link(copies[obj])
  for obj,copy in copies.items():
    copy.parent=copies.get(obj.parent)
    copy.matrix_parent_inverse=obj.matrix_parent_inverse.copy()
    copy.matrix_basis=obj.matrix_basis.copy()
    copy.name='Pig_Light' if obj==runner else 'Pig_Light_'+obj.name.removeprefix('PigRunner_')
    for slot in copy.material_slots:
      slot.link='OBJECT'
      slot.material=light
  copies[runner].location.x+=PIG_TEMPLATE_GAP
  for obj in runner.children_recursive: obj.name='Pig_Dark_'+obj.name.removeprefix('PigRunner_')
  for pig in (runner,copies[runner]):
    if 'is_light' in pig: del pig['is_light']
  runner.name='Pig_Dark'


def migrate(root):
  for name in ('Trail_Light','Trail_Dark'):
    if root.all_objects.get(name): remove_tree(root.all_objects[name])
  migrate_runner(root)
  migrate_pigs(root)
  migrate_grid(root)
