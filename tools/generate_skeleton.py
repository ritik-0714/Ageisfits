"""Generates frontend/public/models/skeleton.glb

A low-poly anatomical skeleton. Every clickable body region is a mesh whose node name equals the
region key used by the backend (head, chest, knee_l ...). Raycasting in the 3D mapper reads that name.
Everything named bone_* is decorative.   pip install trimesh numpy ; python tools/generate_skeleton.py
"""
import numpy as np, trimesh as tm

REG = {  # key: (x, y, z, radius, scale xyz)
 "head":(0,3.6,0,.5,(.9,1.15,1)), "chest":(0,2.3,0,.7,(1.15,1.35,.75)), "lumbar":(0,.95,0,.5,(1.1,1,.8)),
 "sh_l":(.95,2.95,0,.3,(1,1,1)), "sh_r":(-.95,2.95,0,.3,(1,1,1)),
 "el_l":(1.3,1.55,0,.22,(1,1,1)), "el_r":(-1.3,1.55,0,.22,(1,1,1)),
 "wr_l":(1.5,.4,0,.18,(1,1,1)), "wr_r":(-1.5,.4,0,.18,(1,1,1)),
 "hip_l":(.45,0,0,.32,(1,1,1)), "hip_r":(-.45,0,0,.32,(1,1,1)),
 "knee_l":(.5,-1.8,0,.28,(1,1,1)), "knee_r":(-.5,-1.8,0,.28,(1,1,1)),
 "ank_l":(.5,-3.6,0,.22,(1,1,1)), "ank_r":(-.5,-3.6,0,.22,(1,1,1))}
LINKS = [("head","chest",.09),("chest","lumbar",.1),("lumbar","hip_l",.08),("lumbar","hip_r",.08),("sh_l","sh_r",.09),
 ("sh_l","el_l",.1),("el_l","wr_l",.08),("sh_r","el_r",.1),("el_r","wr_r",.08),("hip_l","knee_l",.13),
 ("knee_l","ank_l",.1),("hip_r","knee_r",.13),("knee_r","ank_r",.1)]
P = lambda k: np.array(REG[k][:3], float)
sc = tm.Scene()
rot = tm.transformations.rotation_matrix

def sphere(r, s):
    m = tm.creation.icosphere(subdivisions=2, radius=r); m.apply_transform(np.diag([*s,1])); return m

def bone(a, b, r):
    A, B = P(a), P(b); d = B - A; L = np.linalg.norm(d)
    c = tm.creation.cylinder(radius=r, height=L, sections=12)
    c.apply_transform(tm.geometry.align_vectors([0,0,1], d/L)); c.apply_translation((A+B)/2); return c

def ring(major, minor):
    return tm.creation.torus(major, minor) if hasattr(tm.creation, "torus") else tm.creation.annulus(major-minor, major+minor, .1)

for k,(x,y,z,r,s) in REG.items():
    m = sphere(r, s); m.apply_translation((x,y,z)); sc.add_geometry(m, node_name=k, geom_name=k)
BONE_NAME = {("hip_l","knee_l"):"femur_l",("hip_r","knee_r"):"femur_r",("knee_l","ank_l"):"tibia_l",("knee_r","ank_r"):"tibia_r",
             ("sh_l","el_l"):"humerus_l",("sh_r","el_r"):"humerus_r"}      # clickable long bones
for a,b,r in LINKS:
    nm = BONE_NAME.get((a,b), f"bone_{a}_{b}")
    sc.add_geometry(bone(a,b,r*1.15 if nm in BONE_NAME.values() else r), node_name=nm, geom_name=nm)

def blob(centre, radius_xyz, name):          # translucent muscle volumes (layer "muscles")
    m = tm.creation.icosphere(subdivisions=2, radius=1.0); m.apply_transform(np.diag([*radius_xyz,1])); m.apply_translation(centre)
    sc.add_geometry(m, node_name=name, geom_name=name)
for side,sx in (("l",1),("r",-1)):
    blob((.48*sx,-.9,.05),(.34,.95,.3),f"muscle_quad_{side}"); blob((.5*sx,-2.7,-.05),(.24,.85,.25),f"muscle_calf_{side}")
    blob((1.12*sx,2.2,.05),(.2,.7,.2),f"muscle_biceps_{side}"); blob((1.42*sx,1.0,.0),(.17,.6,.17),f"muscle_forearm_{side}")
    blob((.8*sx,3.0,.0),(.32,.3,.3),f"muscle_delt_{side}"); blob((.3*sx,2.5,.3),(.4,.35,.2),f"muscle_pec_{side}")
    blob((.4*sx,.15,-.25),(.4,.35,.25),f"muscle_glute_{side}")
blob((0,1.45,.3),(.45,.8,.18),"muscle_abs")
for n in range(6):
    t = ring(.62,.05); t.apply_transform(np.diag([1.05,.75,1,1])); t.apply_transform(rot(np.pi/2,[1,0,0]))
    t.apply_translation((0,3.0-n*.28,0)); sc.add_geometry(t, node_name=f"bone_rib_{n}", geom_name=f"bone_rib_{n}")
for n in range(9):
    v = tm.creation.cylinder(radius=.16, height=.2, sections=10); v.apply_transform(rot(np.pi/2,[1,0,0]))
    v.apply_translation((0,.95+n*.28-.3,-.05)); sc.add_geometry(v, node_name=f"bone_vert_{n}", geom_name=f"bone_vert_{n}")
p = ring(.5,.14); p.apply_transform(rot(np.pi/2,[1,0,0])); p.apply_translation((0,-.05,0))
sc.add_geometry(p, node_name="bone_pelvis", geom_name="bone_pelvis")
sc.export("frontend/public/models/skeleton.glb")
print("ok", len(sc.geometry), "meshes")
