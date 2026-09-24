import re
from collections import Counter

PIG_NAMES=tuple(f'Pig_{index:02}' for index in range(12))
GRID_NAMES=tuple(f'Grid_r{row:02}_c{col:02}' for row in range(26) for col in range(26))
RAIL_NAMES=('Rail_Start','Rail_Main','Rail_End')
SLOT_NAMES=tuple(f'Slot_{index}' for index in range(5))
ANCHOR_NAMES=('RailStart','RailEnd','GridCenter','CameraTarget')
REQUIRED_NAMES=(*PIG_NAMES,'PigRunner',*RAIL_NAMES,*GRID_NAMES,*SLOT_NAMES,*ANCHOR_NAMES)
LEGACY_PIG=re.compile(r'^Pig_(\d+)_(\d+)$')
RENDERABLE_TYPES={'MESH','CURVE'}


def ancestors(obj):
  while obj.parent:
    obj=obj.parent
    yield obj


def export_objects(root):
  profiles={obj.data.bevel_object for obj in root.all_objects if obj.type=='CURVE' and obj.data.bevel_object}
  return [obj for obj in root.all_objects if obj not in profiles and obj.get('export_asset',True)]


def validate_assets(root):
  objects=export_objects(root)
  object_set=set(objects)
  by_name={obj.name:obj for obj in objects}
  counts=Counter(obj.name for obj in objects)
  missing=[name for name in REQUIRED_NAMES if name not in by_name]
  duplicates=[name for name,count in counts.items() if count>1]
  duplicates.extend(obj.name for obj in root.all_objects if re.sub(r'\.\d+$','',obj.name) in REQUIRED_NAMES and obj.name not in REQUIRED_NAMES)
  errors=[]
  for obj in objects:
    if re.fullmatch(r'Pig_\d+|Grid_r\d+_c\d+',obj.name) and obj.name not in REQUIRED_NAMES:
      errors.append(f'Unexpected contract object: {obj.name}')
  legacy=[obj.name for obj in root.all_objects if LEGACY_PIG.fullmatch(re.sub(r'\.\d+$','',obj.name))]
  if legacy: errors.append('Legacy pig roots require prepare_export.py: '+', '.join(legacy))
  renderable_counts={}
  for name in (*PIG_NAMES,'PigRunner',*RAIL_NAMES,*GRID_NAMES,*SLOT_NAMES):
    obj=by_name.get(name)
    if obj is None: continue
    parts=[part for part in (obj,*obj.children_recursive) if part in object_set and part.type in RENDERABLE_TYPES]
    renderable_counts[name]=len(parts)
    if not parts: errors.append(f'{name} has no exportable mesh/curve hierarchy')
    if name in (*PIG_NAMES,'PigRunner') and any(parent.name in (*PIG_NAMES,'PigRunner') for parent in ancestors(obj)):
      errors.append(f'{name} is nested inside another pig root')
  for name in (*PIG_NAMES,'PigRunner'):
    obj=by_name.get(name)
    if obj is not None and ('is_light' not in obj or obj['is_light'] not in (True,False)):
      errors.append(f'{name} requires boolean is_light metadata')
  for row in range(26):
    for col in range(26):
      name=f'Grid_r{row:02}_c{col:02}'
      obj=by_name.get(name)
      if obj is None: continue
      expected={'row':row,'column':col,'checker_row':row//2,'checker_column':col//2}
      for key,value in expected.items():
        if key not in obj or obj[key]!=value: errors.append(f'{name}: expected {key}={value}')
      if 'is_light' not in obj or obj['is_light'] not in (True,False): errors.append(f'{name} requires boolean is_light metadata')
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


def preflight_pigs(objects):
  legacy=[obj.name for obj in objects if LEGACY_PIG.fullmatch(re.sub(r'\.\d+$','',obj.name))]
  if legacy: raise ValueError('Legacy pig roots found; run prepare_export.py before building: '+', '.join(legacy))
