import re
from collections import Counter

PIG_COLUMN_NAMES=tuple(f'PigColumn_{index}' for index in range(4))
PIG_NAMES=('Pig_Light','Pig_Dark')
BULLET_NAMES=('Bullet_Light','Bullet_Dark')
BLOCK_NAMES=('Grid_Block_Light','Grid_Block_Dark')
RAIL_NAMES=('Rail_Start','Rail_Main','Rail_End')
SLOT_NAMES=tuple(f'Slot_{index}' for index in range(5))
ANCHOR_NAMES=('RailStart','RailEnd','GridCenter','CameraTarget')
REQUIRED_NAMES=(*PIG_COLUMN_NAMES,*PIG_NAMES,*BULLET_NAMES,*RAIL_NAMES,*BLOCK_NAMES,*SLOT_NAMES,*ANCHOR_NAMES)
RENDERABLE_NAMES=(*PIG_NAMES,*BULLET_NAMES,*RAIL_NAMES,*BLOCK_NAMES,*SLOT_NAMES)
OBSOLETE=re.compile(r'^(Pig_\d+|Pig_\d+_\d+|PigRunner|Grid_r\d+_c\d+|Trail_Light|Trail_Dark)$')
RENDERABLE_TYPES={'MESH','CURVE'}


def ancestors(obj):
  while obj.parent:
    obj=obj.parent
    yield obj


def export_objects(root):
  profiles={obj.data.bevel_object for obj in root.all_objects if obj.type=='CURVE' and obj.data.bevel_object}
  return [obj for obj in root.all_objects if obj not in profiles and obj.get('export_asset',True)]


def positive(obj,key,kind):
  return isinstance(obj.get(key),kind) and not isinstance(obj.get(key),bool) and obj[key]>0


def validate_assets(root):
  objects=export_objects(root)
  object_set=set(objects)
  by_name={obj.name:obj for obj in objects}
  counts=Counter(obj.name for obj in objects)
  missing=[name for name in REQUIRED_NAMES if name not in by_name]
  duplicates=[name for name,count in counts.items() if count>1]
  duplicates.extend(obj.name for obj in root.all_objects if re.sub(r'\.\d+$','',obj.name) in REQUIRED_NAMES and obj.name not in REQUIRED_NAMES)
  errors=[]
  obsolete=[obj.name for obj in root.all_objects if OBSOLETE.fullmatch(re.sub(r'\.\d+$','',obj.name))]
  if obsolete: errors.append(f'Obsolete pig/runner/grid objects require Build Missing Assets: {len(obsolete)} found, e.g. '+', '.join(obsolete[:4]))
  renderable_counts={}
  for name in RENDERABLE_NAMES:
    obj=by_name.get(name)
    if obj is None: continue
    parts=[part for part in (obj,*obj.children_recursive) if part in object_set and part.type in RENDERABLE_TYPES]
    renderable_counts[name]=len(parts)
    if not parts: errors.append(f'{name} has no exportable mesh/curve hierarchy')
  for name in PIG_COLUMN_NAMES:
    obj=by_name.get(name)
    if obj is None: continue
    if obj.type!='EMPTY': errors.append(f'{name} must be an Empty')
    if not isinstance(obj.get('queue'),str) or not re.fullmatch(r'[DL]+',obj['queue']): errors.append(f'{name} requires queue text of D/L, front first')
    if not positive(obj,'row_step',(int,float)): errors.append(f'{name} requires a positive row_step')
  center=by_name.get('GridCenter')
  if center is not None:
    for key in ('rows','columns','checker'):
      if not positive(center,key,int): errors.append(f'GridCenter requires a positive integer {key}')
    if not positive(center,'step',(int,float)): errors.append('GridCenter requires a positive step')
  for index,name in enumerate(SLOT_NAMES):
    obj=by_name.get(name)
    if obj is not None and obj.get('slot')!=index: errors.append(f'{name}: expected slot={index}')
  for name in ANCHOR_NAMES:
    if name in by_name and by_name[name].type!='EMPTY': errors.append(f'{name} must be an Empty')
  return {'missing':missing,'duplicates':duplicates,'errors':errors,'renderable_counts':renderable_counts,'object_count':len(objects)}


def require_assets(root):
  report=validate_assets(root)
  problems=[]
  if report['missing']: problems.append('Missing names: '+', '.join(report['missing']))
  if report['duplicates']: problems.append('Duplicate names: '+', '.join(report['duplicates']))
  problems.extend(report['errors'])
  if problems: raise ValueError('Asset contract failed:\n'+'\n'.join(problems))
  return report

