import hou

EXPORT_DIR='$HIP/../source_files/export'
TEXTURE_DIR='$HIP/../source_files/textures'

PROPS_CODE='''string names[]  = {"rocks","fence","trees","paths","grass","flowers","clumps"};
string groups[] = {"Rocks","Fences","Trees","Paths","Grass","Flowers","Clumps"};
string items[]  = {"Rock","Fence","Tree","Path","Grass","Flower","Clump"};
int i = find(names, s@name);
if (i < 0 || s@id == "") s@path = "/Misc/Unnamed_" + itoa(@primnum);
else {
    string parts[] = split(s@id, "_");
    s@path = sprintf("/%s/%s_%02d", groups[i], items[i], atoi(parts[-1]));
}
s@shop_materialpath = "/mat/Env_Props";
'''

BLOCK_CODE='''string n = s@name == "grid_block_white" ? "Grid_Block_Light" : "Grid_Block_Dark";
s@path = "/" + n;
s@shop_materialpath = "/mat/" + n;
'''

RAIL_CODE='''string n = inprimgroup(0, "start", @primnum) ? "Rail_Start" : inprimgroup(0, "end", @primnum) ? "Rail_End" : "Rail_Main";
s@path = "/" + n;
s@shop_materialpath = "/mat/Rail";
'''

SLOTS_CODE='''s@path = startswith(s@name, "Slot_") ? "/" + s@name : "/Slot_Unnamed";
s@shop_materialpath = "/mat/Slot";
'''

def fixed(name):
  return f's@path = "/{name}_Body";\ns@shop_materialpath = "/mat/{name}";\n'

JOBS=(
  ('/obj/props','output0',PROPS_CODE,'props',('bake',('basecolor',))),
  ('/obj/pig_white',None,fixed('Pig_Light'),'pig_light',None),
  ('/obj/pig_black',None,fixed('Pig_Dark'),'pig_dark',None),
  ('/obj/pigs',None,None,None,('copnet1',('basecolor','normal'))),
  ('/obj/block','output0',BLOCK_CODE,'blocks',('bake',('null1',))),
  ('/obj/rail','output0',RAIL_CODE,'rail',('copnet1',())),
  ('/obj/slots','output0',SLOTS_CODE,'slots',('copnet1',())),
)
MATERIALS=('Env_Props','Pig_Light','Pig_Dark','Grid_Block_Light','Grid_Block_Dark','Rail','Slot')


def source_of(geo,name):
  node=geo.node(name) if name else None
  return node or geo.displayNode()


def set_first(node,names,value):
  for name in names:
    parm=node.parm(name)
    if parm:
      parm.set(value)
      return name
  return None


def wrangle(geo,source,code):
  node=geo.node('blender_names') or geo.createNode('attribwrangle','blender_names')
  node.setInput(0,source)
  node.parm('class').set(1)
  node.parm('snippet').set(code)
  node.setPosition(source.position()+hou.Vector2(0,-1.5))
  return node


def fbx_rop(geo,source,filename):
  node=geo.node('blender_fbx') or geo.createNode('rop_fbx','blender_fbx')
  node.setInput(0,source)
  node.setPosition(source.position()+hou.Vector2(0,-1.5))
  set_first(node,('sopoutput',),f'{EXPORT_DIR}/{filename}.fbx')
  if not set_first(node,('buildfrompath',),1): print(f'{node.path()}: turn on "Build Hierarchy from Path Attribute" by hand')
  set_first(node,('pathattrib',),'path')
  return node


def image_rop_type():
  for name,kind in hou.copNodeTypeCategory().nodeTypes().items():
    if 'rop' in name and 'image' in name: return name
  return None


def texture_rops(geo,net_name,layers,prefix):
  net=geo.node(net_name)
  if not net: return []
  kind=image_rop_type()
  if not kind:
    print(f'{net.path()}: no image ROP node type found; save {", ".join(layers)} by hand to {TEXTURE_DIR}')
    return []
  rops=[]
  for layer in layers:
    source=net.node(layer)
    if not source:
      print(f'{net.path()}/{layer} not found; skipped')
      continue
    name=f'save_{layer}'
    rop=net.node(name) or net.createNode(kind,name)
    rop.setInput(0,source)
    rop.setPosition(source.position()+hou.Vector2(0,-1.5))
    label='basecolor' if layer=='null1' else layer
    if not set_first(rop,('copoutput','filename','file','picture','output'),f'{TEXTURE_DIR}/{prefix}_{label}.png'): print(f'{rop.path()}: set the output file by hand')
    rops.append(rop)
  return rops


def materials():
  mat=hou.node('/mat')
  for name in MATERIALS:
    if not mat.node(name): mat.createNode('principledshader::2.0',name)


def run():
  materials()
  for path,output,code,filename,textures in JOBS:
    geo=hou.node(path)
    if not geo:
      print(f'{path} not found; skipped')
      continue
    if code:
      fbx_rop(geo,wrangle(geo,source_of(geo,output),code),filename)
    if textures:
      texture_rops(geo,textures[0],textures[1],geo.name())
  print('Nodes added. Nothing exported or saved.')


run()
