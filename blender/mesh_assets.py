import bpy


def box_mesh(name, size, material, floor_pivot=False):
  mesh=bpy.data.meshes.get(name)
  if mesh: return mesh
  x,y,z=(value*.5 for value in size)
  bottom,top=(0,size[2]) if floor_pivot else (-z,z)
  vertices=[(-x,-y,bottom),(x,-y,bottom),(x,y,bottom),(-x,y,bottom),(-x,-y,top),(x,-y,top),(x,y,top),(-x,y,top)]
  mesh=bpy.data.meshes.new(name)
  mesh.from_pydata(vertices, [], [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
  mesh.materials.append(material)
  mesh.update()
  return mesh


def mesh_object(name, mesh, location, material, collection, parent=None):
  obj=collection.objects.get(name)
  if obj: return obj
  obj=bpy.data.objects.new(name, mesh)
  obj.parent=parent
  obj.location=location
  collection.objects.link(obj)
  obj.material_slots[0].link='OBJECT'
  obj.material_slots[0].material=material
  return obj


def cube(name, location, size, material, collection, parent=None, floor_pivot=False):
  obj=collection.objects.get(name)
  if obj: return obj
  mesh=box_mesh(name+'_Mesh', size, material, floor_pivot)
  return mesh_object(name, mesh, location, material, collection, parent)


def sphere_mesh(name, radius, material):
  mesh=bpy.data.meshes.get(name)
  if mesh: return mesh
  import bmesh
  bm=bmesh.new()
  bmesh.ops.create_icosphere(bm, subdivisions=2, radius=radius)
  for face in bm.faces: face.smooth=True
  mesh=bpy.data.meshes.new(name)
  bm.to_mesh(mesh)
  bm.free()
  mesh.materials.append(material)
  return mesh
