"""
CrazyTV – prozedurale Low-Poly-Assets.

Aufruf:
    blender -b -P blender/build_assets.py -- <layout.json> <out.glb>

Koordinaten: Alle Helfer nehmen three.js-Koordinaten (x rechts, y oben, z nach vorn)
und rechnen sie in Blender-Koordinaten um (x, -z, y). Der glTF-Exporter dreht
anschließend wieder auf Y-up, sodass im Spiel exakt diese Werte ankommen.
"""
import bpy
import bmesh
import json
import math
import random
import sys

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
LAYOUT_PATH = argv[0] if len(argv) > 0 else "web/src/data/layout.json"
OUT_PATH = argv[1] if len(argv) > 1 else "web/assets/crazytv.glb"

with open(LAYOUT_PATH) as f:
    L = json.load(f)

random.seed(7)

# ---------------------------------------------------------------- Szene leeren
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------------------------------------------------------------- Materialien
MATS = {}


def hex_rgb(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    # sRGB -> linear
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), 1.0)


def mat(name, color, emissive=0.0, rough=0.85, metal=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = hex_rgb(color)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emissive > 0:
        bsdf.inputs["Emission Color"].default_value = hex_rgb(color)
        bsdf.inputs["Emission Strength"].default_value = emissive
    MATS[name] = m
    return m


P = {
    "slab": "#b9b1a8", "concrete": "#ddd6cd", "facade": "#e9e3da", "trim": "#6c6f7d",
    "glass": "#9fd8ea", "wood": "#d29a62", "darkwood": "#8b5a3c", "metal": "#a3adb8",
    "dark": "#2d3140", "white": "#f6f4ef", "screen": "#1f2a38", "glow": "#7ff0ff",
    "leaf": "#4fb06d", "leaf2": "#3d9157", "pot": "#d0704f", "red": "#e2574c",
    "yellow": "#f4c34f", "blue": "#4f8fe2", "purple": "#8f6cf0", "orange": "#f28c38",
    "green": "#5cc98a", "pink": "#ff6fa8", "gold": "#f0b429", "teal": "#19c3b1",
    "earth": "#7a5c45", "grass": "#86c86a", "street": "#5d6272", "sky1": "#c9e7f5",
    "cityA": "#a9b8d6", "cityB": "#c4b5dd", "cityC": "#9fcfcf", "window": "#fff3b0",
    "skin": "#f1c7a3", "hair": "#4a3428", "shirt": "#ffffff", "pants": "#3b4256",
    "shoe": "#2a2a30", "eye": "#1d1d24", "carpet": "#c8463d", "rubber": "#22252e",
    "popcorn": "#fff1c1", "cone": "#ff8a3d", "tarp": "#5b8fd6", "cardboard": "#c9a26b",
}
for k, v in P.items():
    mat(k, v)
mat("glow", P["glow"], emissive=1.5)
mat("window_lit", P["window"], emissive=0.8)
mat("lamp", "#fff2c4", emissive=2.0)


def M(name):
    return MATS[name]


# ---------------------------------------------------------------- Primitive
def _link(obj, parent=None):
    scene.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def to_b(x, y, z):
    return (x, -z, y)


def box(name, x, y, z, w, h, d, material, parent=None, rot_y=0.0):
    """Box mit Mittelpunkt (x,y,z) in three-Koordinaten, Größe w×h×d."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(w, d, h), verts=bm.verts)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(M(material))
    ob = bpy.data.objects.new(name, me)
    ob.location = to_b(x, y, z)
    ob.rotation_euler = (0, 0, rot_y)
    return _link(ob, parent)


def cyl(name, x, y, z, r, h, material, verts=8, parent=None, r2=None, axis="Y"):
    """Zylinder/Kegelstumpf. axis: 'Y' (hoch), 'X' oder 'Z' (three-Achsen)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts,
                          radius1=r, radius2=r if r2 is None else r2, depth=h)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(M(material))
    ob = bpy.data.objects.new(name, me)
    ob.location = to_b(x, y, z)
    if axis == "X":
        ob.rotation_euler = (0, math.pi / 2, 0)
    elif axis == "Z":
        ob.rotation_euler = (math.pi / 2, 0, 0)
    return _link(ob, parent)


def ico(name, x, y, z, r, material, parent=None, sub=1, sy=1.0):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    bmesh.ops.scale(bm, vec=(1, 1, sy), verts=bm.verts)
    for v in bm.verts:  # leichte Unregelmäßigkeit -> "handgemacht"
        v.co *= 1 + random.uniform(-0.06, 0.06)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(M(material))
    ob = bpy.data.objects.new(name, me)
    ob.location = to_b(x, y, z)
    return _link(ob, parent)


def empty(name, x=0, y=0, z=0, parent=None):
    ob = bpy.data.objects.new(name, None)
    ob.location = to_b(x, y, z)
    return _link(ob, parent)


def join(objs, name):
    """Mehrere Meshes zu einem Objekt zusammenfassen (weniger Draw-Calls)."""
    objs = [o for o in objs if o.type == "MESH"]
    if not objs:
        return None
    parent = objs[0].parent
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.parent = None
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    if parent is not None:
        mw = ob.matrix_world.copy()
        ob.parent = parent
        ob.matrix_world = mw
    return ob


# ---------------------------------------------------------------- Möbel
def plant(x, y, z, s=1.0):
    o = [cyl("pot", x, y + 0.25 * s, z, 0.25 * s, 0.5 * s, "pot", verts=7, r2=0.3 * s)]
    o.append(ico("leaf", x, y + 0.85 * s, z, 0.45 * s, "leaf", sy=1.2))
    o.append(ico("leaf", x + 0.2 * s, y + 1.25 * s, z - 0.1, 0.3 * s, "leaf2"))
    return o


def desk(x, y, z, w=2.2, top="wood"):
    o = [box("desk", x, y + 0.75, z, w, 0.1, 1.0, top)]
    for dx in (-w / 2 + 0.1, w / 2 - 0.1):
        o.append(box("leg", x + dx, y + 0.37, z, 0.1, 0.74, 0.9, "darkwood"))
    return o


def chair(x, y, z, c="dark"):
    return [
        box("seat", x, y + 0.45, z, 0.55, 0.1, 0.55, c),
        box("back", x, y + 0.8, z - 0.25, 0.55, 0.6, 0.08, c),
        cyl("stem", x, y + 0.22, z, 0.05, 0.44, "metal", verts=6),
    ]


def monitor(x, y, z, glow=True, w=0.8):
    return [
        box("mon", x, y + 0.45, z, w, 0.5, 0.06, "dark"),
        box("scr", x, y + 0.46, z + 0.035, w - 0.1, 0.4, 0.01, "glow" if glow else "screen"),
        box("stand", x, y + 0.1, z, 0.1, 0.2, 0.1, "metal"),
    ]


def shelf(x, y, z, w=2.0, h=2.4, items=("red", "blue", "yellow", "purple", "green")):
    o = [box("shelf_side", x - w / 2, y + h / 2, z, 0.08, h, 0.6, "darkwood"),
         box("shelf_side", x + w / 2, y + h / 2, z, 0.08, h, 0.6, "darkwood")]
    rows = 4
    for i in range(rows):
        yy = y + 0.1 + i * (h / rows)
        o.append(box("board", x, yy, z, w, 0.06, 0.6, "darkwood"))
        cx = x - w / 2 + 0.2
        while cx < x + w / 2 - 0.2:
            c = random.choice(items)
            bw = random.uniform(0.12, 0.22)
            bh = random.uniform(0.3, 0.45)
            o.append(box("item", cx, yy + bh / 2 + 0.03, z, bw, bh, 0.4, c))
            cx += bw + 0.03
    return o


def reel_rack(x, y, z, w=2.2):
    """Regal mit Filmrollen (Zylinder) – für Content-Markt und Archiv."""
    o = [box("rack", x, y + 1.1, z - 0.1, w, 2.2, 0.15, "darkwood")]
    for row in range(3):
        for i in range(4):
            cx = x - w / 2 + 0.35 + i * (w - 0.7) / 3
            cy = y + 0.45 + row * 0.7
            o.append(cyl("reel", cx, cy, z + 0.05, 0.27, 0.12, random.choice(["metal", "red", "blue", "gold"]), verts=10, axis="Z"))
            o.append(cyl("hub", cx, cy, z + 0.12, 0.07, 0.04, "dark", verts=6, axis="Z"))
    return o


def sofa(x, y, z, w=2.0, c="blue", flip=False):
    return [
        box("sofa_base", x, y + 0.25, z, w, 0.5, 0.9, c),
        box("sofa_back", x, y + 0.75, z + (0.38 if flip else -0.38), w, 0.6, 0.18, c),
        box("sofa_arm", x - w / 2 + 0.1, y + 0.55, z, 0.2, 0.45, 0.9, c),
        box("sofa_arm", x + w / 2 - 0.1, y + 0.55, z, 0.2, 0.45, 0.9, c),
    ]


def tv(x, y, z, w=1.6, screen="glow"):
    return [
        box("tv", x, y + 1.5, z, w, w * 0.6, 0.08, "dark"),
        box("tv_scr", x, y + 1.5, z + 0.045, w - 0.12, w * 0.6 - 0.12, 0.01, screen),
    ]


def whiteboard(x, y, z, w=1.8):
    o = [box("wb", x, y + 1.6, z, w, 1.0, 0.05, "white"),
         box("wb_frame", x, y + 1.08, z + 0.05, w, 0.05, 0.12, "metal")]
    # Balkendiagramm
    for i, h in enumerate([0.25, 0.4, 0.3, 0.6, 0.75]):
        o.append(box("bar", x - w / 2 + 0.35 + i * 0.3, y + 1.2 + h / 2, z + 0.03, 0.18, h, 0.02,
                     ["blue", "green", "orange", "red", "teal"][i]))
    return o


def lamp(x, y, z):
    return [cyl("lamp_foot", x, y + 0.03, z, 0.2, 0.06, "dark", verts=8),
            cyl("lamp_pole", x, y + 0.8, z, 0.03, 1.6, "metal", verts=6),
            cyl("lamp_shade", x, y + 1.65, z, 0.3, 0.35, "lamp", verts=8, r2=0.18)]


def boxes(x, y, z, n=3):
    o = []
    for i in range(n):
        s = random.uniform(0.45, 0.7)
        o.append(box("crate", x + random.uniform(-0.6, 0.6), y + s / 2 + (0.6 if i == n - 1 and n > 2 else 0),
                     z + random.uniform(-0.3, 0.3), s, s, s, "cardboard", rot_y=random.uniform(-0.3, 0.3)))
    return o


def poster(x, y, z, c, w=0.9, h=1.2):
    return [box("poster", x, y, z, w, h, 0.02, c),
            box("poster_in", x, y + 0.1, z + 0.012, w * 0.7, h * 0.5, 0.01, "white")]


# ---------------------------------------------------------------- Rauminhalte
def room_props(rid, cx, y, owner_color):
    """Gibt Liste von Objekten für Raum mit Mitte cx, Bodenhöhe y zurück."""
    back = -L["depth"] / 2 + 0.45
    o = []
    if rid.startswith("office_"):
        o += desk(cx - 1.2, y, back + 1.0, 2.4)
        o += monitor(cx - 1.7, y + 0.8, back + 0.8)
        o += monitor(cx - 0.8, y + 0.8, back + 0.8)
        o += chair(cx - 1.2, y, back + 1.8, owner_color)
        o += reel_rack(cx + 2.4, y, back + 0.1, 2.2)
        o += tv(cx - 1.2, y + 0.6, back - 0.05, 1.8)
        o += plant(cx + 3.4, y, back + 1.4, 0.9)
        o.append(box("rug", cx, y + 0.01, back + 2.0, 4.0, 0.02, 2.0, owner_color))
    elif rid == "market":
        o += reel_rack(cx - 2.4, y, back + 0.1)
        o += reel_rack(cx + 0.1, y, back + 0.1)
        o += desk(cx + 2.6, y, back + 1.6, 1.8, "purple")
        o.append(box("register", cx + 2.9, y + 0.95, back + 1.6, 0.5, 0.3, 0.4, "dark"))
        o += poster(cx + 2.6, y + 2.3, back - 0.05, "red")
        o.append(box("rug", cx, y + 0.01, back + 2.2, 5.5, 0.02, 1.6, "yellow"))
    elif rid == "ads":
        o += whiteboard(cx - 2.2, y, back)
        o += desk(cx + 1.6, y, back + 1.0, 2.0, "white")
        o += monitor(cx + 1.6, y + 0.8, back + 0.8, w=1.0)
        o += chair(cx + 1.6, y, back + 1.8, "orange")
        o.append(ico("beanbag", cx - 2.3, y + 0.35, back + 1.8, 0.5, "pink", sy=0.7))
        o.append(ico("beanbag", cx - 1.2, y + 0.35, back + 2.0, 0.5, "teal", sy=0.7))
        o += plant(cx + 3.3, y, back + 0.6)
        o += poster(cx + 0.2, y + 2.2, back - 0.05, "orange")
    elif rid == "newsroom":
        o.append(box("newsdesk", cx - 0.8, y + 0.5, back + 1.2, 3.2, 1.0, 0.9, "blue"))
        o.append(box("newsdesk_top", cx - 0.8, y + 1.03, back + 1.2, 3.4, 0.08, 1.0, "white"))
        o += tv(cx - 0.8, y + 0.9, back - 0.05, 2.6)
        # Kamera auf Stativ
        cz = back + 3.2
        o.append(box("cam", cx + 2.2, y + 1.5, cz, 0.5, 0.4, 0.8, "dark"))
        o.append(cyl("lens", cx + 2.2, y + 1.5, cz - 0.5, 0.14, 0.3, "metal", verts=8, axis="Z"))
        for a in range(3):
            ang = a * 2 * math.pi / 3
            o.append(cyl("tripod", cx + 2.2 + math.cos(ang) * 0.3, y + 0.65, cz + math.sin(ang) * 0.3, 0.03, 1.3, "metal", verts=4))
        o += lamp(cx + 3.3, y, back + 0.6)
        o += monitor(cx - 3.0, y + 0.8, back + 1.6, w=0.6)
    elif rid == "boss":
        o += desk(cx, y, back + 1.4, 3.0, "darkwood")
        o.append(box("boss_chair", cx, y + 0.8, back + 0.6, 0.9, 1.6, 0.25, "red"))
        o.append(box("boss_seat", cx, y + 0.5, back + 0.85, 0.9, 0.15, 0.7, "red"))
        o.append(ico("globe", cx + 2.6, y + 1.2, back + 0.8, 0.35, "blue"))
        o.append(cyl("globe_stand", cx + 2.6, y + 0.45, back + 0.8, 0.06, 0.9, "gold", verts=6))
        o += poster(cx - 2.6, y + 2.0, back - 0.05, "gold", 1.4, 1.0)
        o += plant(cx - 3.3, y, back + 1.0, 1.1)
        o.append(box("rug", cx, y + 0.01, back + 2.2, 4.5, 0.02, 2.2, "green"))
    elif rid == "jury":
        o.append(box("carpet", cx, y + 0.01, back + 2.0, 6.0, 0.02, 1.4, "carpet"))
        o.append(cyl("pedestal", cx + 2.0, y + 0.5, back + 0.9, 0.4, 1.0, "white", verts=8))
        o += trophy_parts(cx + 2.0, y + 1.0, back + 0.9)
        o.append(box("armchair", cx - 1.6, y + 0.35, back + 1.2, 1.1, 0.7, 1.0, "purple"))
        o.append(box("armchair_b", cx - 1.6, y + 0.95, back + 0.8, 1.1, 0.8, 0.2, "purple"))
        o += shelf(cx - 3.2, y, back + 0.3, 1.2)
        o += lamp(cx - 0.4, y, back + 0.6)
    elif rid == "kiosk":
        o.append(box("counter", cx + 0.5, y + 0.55, back + 1.8, 4.0, 1.1, 0.8, "red"))
        o.append(box("counter_top", cx + 0.5, y + 1.12, back + 1.8, 4.2, 0.06, 0.9, "white"))
        for i in range(6):  # Süßigkeiten & Blumen
            o.append(ico("goodie", cx - 1.0 + i * 0.6, y + 1.3, back + 1.8, 0.16,
                         random.choice(["pink", "yellow", "green", "orange", "purple"])))
        o += shelf(cx + 1.0, y, back + 0.3, 3.0, 2.2, ("pink", "yellow", "red", "white", "green"))
        # Markise
        for i in range(8):
            o.append(box("awning", cx - 3.5 + i * 0.5 + 0.25, y + 3.2, back + 2.6, 0.5, 0.12, 1.2, "red" if i % 2 else "white"))
        o += plant(cx - 3.2, y, back + 2.6, 0.8)
    elif rid == "lobby":
        o.append(box("reception", cx - 1.0, y + 0.55, back + 1.6, 3.0, 1.1, 0.8, "teal"))
        o.append(box("reception_top", cx - 1.0, y + 1.12, back + 1.6, 3.2, 0.06, 0.9, "white"))
        o += sofa(cx + 2.3, y, back + 1.0, 2.0, "orange")
        o += plant(cx + 3.5, y, back + 2.6)
        o += plant(cx - 3.2, y, back + 0.6)
    elif rid == "hausmeister":
        o += shelf(cx - 2.6, y, back + 0.3, 2.0, 2.2, ("metal", "red", "yellow", "dark"))
        o.append(cyl("bucket", cx + 0.6, y + 0.3, back + 1.8, 0.3, 0.6, "blue", verts=8, r2=0.35))
        o.append(cyl("mop", cx + 0.9, y + 1.0, back + 1.8, 0.04, 2.0, "darkwood", verts=5))
        o += desk(cx + 2.4, y, back + 1.0, 1.8, "metal")
        o.append(box("toolbox", cx + 2.4, y + 0.95, back + 1.0, 0.7, 0.3, 0.35, "red"))
        o.append(cyl("pipe", cx, y + 3.2, back + 0.2, 0.12, L["roomW"] - 0.4, "metal", verts=6, axis="X"))
        o += lamp(cx - 0.8, y, back + 0.5)
    elif rid == "lager":
        o += boxes(cx - 2.0, y, back + 1.0, 3)
        o += boxes(cx + 1.0, y, back + 0.8, 4)
        o += boxes(cx + 2.8, y, back + 2.0, 2)
    elif rid == "studio":
        o.append(box("tarp", cx - 1.0, y + 0.8, back + 1.2, 2.6, 1.6, 1.6, "tarp"))
        for i in range(3):
            o.append(cyl("cone", cx + 1.0 + i * 0.8, y + 0.35, back + 2.8, 0.25, 0.7, "cone", verts=6, r2=0.03))
        o.append(box("tape", cx, y + 0.9, back + 2.9, 6.5, 0.12, 0.03, "yellow"))
        o += boxes(cx + 2.8, y, back + 0.8, 2)
    elif rid == "terrace":
        o.append(box("deck", cx, y + 0.02, back + 1.8, L["roomW"] - 0.4, 0.04, 3.0, "wood"))
        o.append(cyl("umbrella_pole", cx - 1.5, y + 1.2, back + 1.5, 0.04, 2.4, "metal", verts=5))
        o.append(cyl("umbrella", cx - 1.5, y + 2.3, back + 1.5, 1.3, 0.4, "orange", verts=8, r2=0.05))
        o.append(box("lounger", cx + 1.5, y + 0.3, back + 1.5, 0.8, 0.15, 1.8, "white"))
        o += plant(cx + 3.2, y, back + 0.6, 1.2)
    return o


def trophy_parts(x, y, z):
    """Die Goldene Fernbedienung."""
    return [
        box("trophy_base", x, y + 0.08, z, 0.4, 0.16, 0.4, "darkwood"),
        box("trophy_remote", x, y + 0.6, z, 0.22, 0.85, 0.1, "gold"),
        cyl("trophy_btn", x, y + 0.85, z + 0.06, 0.05, 0.03, "red", verts=6, axis="Z"),
        box("trophy_btns", x, y + 0.55, z + 0.055, 0.12, 0.25, 0.02, "white"),
    ]


# ---------------------------------------------------------------- Tower
def build_tower():
    root = empty("Tower")
    RW, SW, FH, SL, D = L["roomW"], L["shaftW"], L["floorH"], L["slab"], L["depth"]
    half = SW / 2 + RW
    W = 2 * half
    minL, maxL = L["minLevel"], L["maxLevel"]
    shell = []

    for lv in range(minL, maxL + 2):
        y = lv * FH
        shell.append(box("slab", 0, y - SL / 2, 0, W + 0.6, SL, D + 0.2, "slab"))
        # Kante vorne (Zierleiste)
        shell.append(box("slab_trim", 0, y - SL / 2, D / 2 + 0.12, W + 0.6, SL + 0.04, 0.1, "trim"))
    for lv in range(minL, maxL + 1):
        y = lv * FH
        h = FH - SL
        # Außenwände
        for sx in (-1, 1):
            shell.append(box("outer", sx * (half + 0.15), y + h / 2, 0, 0.3, h, D, "facade"))
            # Fenster in Außenwand (Glas-Streifen)
            shell.append(box("outer_glass", sx * (half + 0.31), y + h * 0.55, 0, 0.04, h * 0.45, D * 0.7, "glass"))
        # Schacht-Rückwand + Schachtwände
        shell.append(box("shaft_back", 0, y + h / 2, -D / 2 + 0.1, SW, h, 0.2, "dark"))
        for sx in (-1, 1):
            shell.append(box("shaft_wall", sx * (SW / 2), y + h / 2, -0.9, 0.2, h, D - 1.8, "concrete"))
            shell.append(box("door_frame", sx * (SW / 2 - 0.12), y + 1.6, 1.2, 0.12, 3.2, 0.16, "trim"))
        shell.append(box("door_top", 0, y + 3.25, 1.2, SW, 0.15, 0.16, "trim"))
        # Stockwerksanzeige über dem Aufzug
        shell.append(box("floor_ind", 0, y + 3.5, 1.25, 0.8, 0.28, 0.06, "dark"))

    # Dach
    top = (maxL + 1) * FH
    shell.append(box("roof_edge", 0, top + 0.35, D / 2 - 0.1, W + 0.6, 0.5, 0.2, "trim"))
    shell.append(box("roof_box", -4.0, top + 0.9, -1.0, 4.0, 1.8, 3.0, "concrete"))
    shell.append(cyl("antenna", 4.5, top + 3.5, -1.0, 0.12, 7.0, "metal", verts=6))
    for i in range(4):
        shell.append(cyl("antenna_ring", 4.5, top + 1.5 + i * 1.4, -1.0, 0.45 - i * 0.08, 0.08, "red" if i % 2 else "white", verts=8))
    shell.append(ico("antenna_tip", 4.5, top + 7.1, -1.0, 0.22, "red"))
    # Satellitenschüsseln
    for i, sx in enumerate((-7.0, 1.0)):
        d = cyl("dish", sx, top + 1.0, 0.5, 0.8, 0.25, "white", verts=10, r2=0.2)
        d.rotation_euler = (math.radians(35), 0, math.radians(20 if i else -20))
        shell.append(d)
        shell.append(cyl("dish_post", sx, top + 0.4, 0.5, 0.06, 0.8, "metal", verts=5))
    # Leuchtschild
    shell.append(box("sign_frame", -4.0, top + 2.4, 0.6, 6.5, 1.2, 0.2, "dark"))

    # Boden / Straße / Erdreich
    groundY = 0 - SL
    shell.append(box("earth", 0, minL * FH - SL - 2.0, 0, 90, 4.0 + 0.0, 30, "earth"))
    shell.append(box("earth_fill_l", -half - 23.0, (minL * FH - SL) / 2 + groundY / 2 - 0.0, 0, 45, abs(minL * FH) , 30, "earth"))
    shell.append(box("earth_fill_r", half + 23.0, (minL * FH - SL) / 2 + groundY / 2 - 0.0, 0, 45, abs(minL * FH), 30, "earth"))
    shell.append(box("grass", 0, -SL - 0.05, -8.0, 120, 0.2, 10, "grass"))
    shell.append(box("street", 0, -SL - 0.03, 6.0, 120, 0.2, 6, "street"))
    for i in range(-10, 11):
        shell.append(box("street_mark", i * 6.0, -SL + 0.08, 6.0, 2.5, 0.02, 0.25, "white"))
    shell.append(box("sidewalk", 0, -SL + 0.02, 3.6, 120, 0.25, 1.4, "concrete"))

    tower_shell = join(shell, "tower_shell")
    tower_shell.parent = root

    # Räume
    for r in L["rooms"]:
        y = r["level"] * FH
        cx = -(SW / 2 + RW / 2) if r["side"] == "L" else (SW / 2 + RW / 2)
        h = FH - SL
        mat(f"wall_{r['id']}", r["wall"])
        wall = box(f"wall_{r['id']}", cx, y + h / 2, -D / 2 + 0.1, RW, h, 0.2, f"wall_{r['id']}")
        wall.parent = root
        floor_mat = "wood" if r["id"] not in ("hausmeister", "lager", "studio") else "concrete"
        props = [box("floor", cx, y + 0.02, 0, RW - 0.05, 0.04, D - 0.1, floor_mat)]
        owner_color = {"office_k7": "teal", "office_trash": "pink", "office_prestige": "gold"}.get(r["id"], "dark")
        props += room_props(r["id"], cx, y, owner_color)
        # Deckenlampe
        props.append(cyl("ceil_lamp", cx, y + h - 0.15, -0.5, 0.35, 0.12, "lamp", verts=8))
        j = join(props, f"room_{r['id']}")
        j.parent = root
    return root


def build_city():
    root = empty("City")
    objs = []
    for i in range(26):
        x = -60 + i * 4.8 + random.uniform(-0.8, 0.8)
        if abs(x) < 12:
            continue
        w = random.uniform(3.0, 4.6)
        h = random.uniform(6, 26)
        z = random.uniform(-16, -12)
        c = random.choice(["cityA", "cityB", "cityC"])
        objs.append(box("bld", x, h / 2 - 0.3, z, w, h, 3.5, c))
        # Fensterreihen
        for fy in range(2, int(h) - 1, 3):
            if random.random() < 0.7:
                objs.append(box("win", x, fy, z + 1.76, w * 0.7, 0.6, 0.02, "window_lit" if random.random() < 0.4 else "glass"))
    for i in range(18):  # Bäume
        x = random.choice([-1, 1]) * random.uniform(13, 50)
        z = random.uniform(-9, -5)
        objs.append(cyl("trunk", x, 0.6, z, 0.15, 1.2, "darkwood", verts=5))
        objs.append(ico("crown", x, 1.8, z, random.uniform(0.8, 1.2), random.choice(["leaf", "leaf2"]), sy=1.2))
    j = join(objs, "city_mesh")
    j.parent = root
    return root


# ---------------------------------------------------------------- Figur
def build_character():
    """Chibi-Figur. Teile mit Pivot an Gelenken, damit das Spiel sie animieren kann."""
    root = empty("Character")
    # Beine: Pivot an Hüfte (y=0.75)
    for side, sx in (("L", -0.16), ("R", 0.16)):
        piv = empty(f"Leg{side}", sx, 0.75, 0, root)
        leg = box(f"leg{side}_m", 0, -0.33, 0, 0.22, 0.66, 0.24, "pants", parent=piv)
        leg.location = to_b(0, -0.33, 0)
        shoe = box(f"shoe{side}", 0, -0.68, 0.05, 0.24, 0.12, 0.34, "shoe", parent=piv)
        shoe.location = to_b(0, -0.69, 0.05)
    body = box("Body", 0, 1.12, 0, 0.62, 0.78, 0.4, "shirt", parent=root)
    body.data.materials[0] = mat("shirt", P["shirt"])
    for side, sx in (("L", -0.4), ("R", 0.4)):
        piv = empty(f"Arm{side}", sx, 1.42, 0, root)
        arm = box(f"arm{side}_m", 0, -0.3, 0, 0.17, 0.62, 0.2, "shirt", parent=piv)
        arm.location = to_b(0, -0.3, 0)
        hand = ico(f"hand{side}", 0, -0.66, 0, 0.11, "skin", parent=piv)
        hand.location = to_b(0, -0.66, 0)
    head = empty("Head", 0, 1.55, 0, root)
    hm = ico("head_m", 0, 0.35, 0, 0.38, "skin", parent=head, sub=1)
    hm.location = to_b(0, 0.35, 0)
    hair = ico("Hair", 0, 0.5, -0.05, 0.4, "hair", parent=head, sub=1, sy=0.75)
    hair.location = to_b(0, 0.5, -0.05)
    for sx in (-0.13, 0.13):
        e = box("eye", sx, 0.36, 0.34, 0.07, 0.11, 0.04, "eye", parent=head)
        e.location = to_b(sx, 0.36, 0.34)
    return root


def build_accessories():
    g = empty("acc_glasses")
    for sx in (-0.13, 0.13):
        f = box("lens_f", sx, 0, 0, 0.16, 0.13, 0.03, "dark", parent=g)
        f.location = to_b(sx, 0, 0)
    br = box("bridge", 0, 0.02, 0, 0.1, 0.03, 0.03, "dark", parent=g)
    br.location = to_b(0, 0.02, 0)
    c = empty("acc_cap")
    cp = cyl("cap_top", 0, 0, 0, 0.36, 0.22, "blue", verts=8, parent=c, r2=0.3)
    cp.location = to_b(0, 0, 0)
    vz = box("cap_visor", 0, -0.08, 0.32, 0.4, 0.04, 0.3, "blue", parent=c)
    vz.location = to_b(0, -0.08, 0.32)
    b = empty("acc_bun")
    bu = ico("bun", 0, 0, 0, 0.18, "hair", parent=b)
    bu.location = to_b(0, 0, 0)
    t = empty("acc_tie")
    tt = box("tie", 0, 0, 0, 0.1, 0.42, 0.02, "red", parent=t)
    tt.location = to_b(0, 0, 0)


def build_cab():
    root = empty("Cab")
    parts = [
        box("cab_floor", 0, 0.05, 0, 2.4, 0.1, 2.0, "metal"),
        box("cab_roof", 0, 3.1, 0, 2.4, 0.12, 2.0, "metal"),
        box("cab_back", 0, 1.55, -0.95, 2.4, 3.0, 0.1, "white"),
        box("cab_side", -1.15, 1.55, 0, 0.1, 3.0, 2.0, "metal"),
        box("cab_side", 1.15, 1.55, 0, 0.1, 3.0, 2.0, "metal"),
        box("cab_rail", 0, 1.0, -0.85, 2.0, 0.06, 0.1, "gold"),
        cyl("cab_light", 0, 3.0, 0, 0.3, 0.06, "lamp", verts=8),
    ]
    j = join(parts, "cab_mesh")
    j.parent = root


def build_living_room():
    root = empty("LivingRoom")
    o = [
        box("lr_floor", 0, -0.05, 0, 9, 0.1, 7, "wood"),
        box("lr_rug", 0, 0.01, 0.5, 4.5, 0.02, 3, "teal"),
        box("lr_back", 0, 2.0, -3.5, 9, 4.0, 0.2, "cityB"),
        box("lr_left", -4.5, 2.0, 0, 0.2, 4.0, 7, "sky1"),
        box("lr_window", -4.38, 2.2, -0.5, 0.05, 1.6, 2.4, "glass"),
        box("lr_window_bar", -4.35, 2.2, -0.5, 0.05, 0.08, 2.4, "white"),
        box("lr_tvstand", 0, 0.35, -2.9, 3.0, 0.7, 0.8, "darkwood"),
        box("lr_tv", 0, 1.55, -3.0, 2.8, 1.65, 0.12, "dark"),
        box("lr_table", 0, 0.3, 0.6, 1.8, 0.1, 0.9, "wood"),
        cyl("lr_bowl", 0, 0.45, 0.6, 0.3, 0.2, "red", verts=8, r2=0.22),
    ]
    for i in range(7):
        o.append(ico("popcorn", random.uniform(-0.15, 0.15), 0.6, 0.6 + random.uniform(-0.12, 0.12), 0.08, "popcorn"))
    o += sofa(0, 0, 2.4, 3.4, "orange", flip=True)
    o += lamp(3.6, 0, -2.6)
    o += plant(-3.6, 0, -2.6)
    o += poster(2.6, 2.6, -3.38, "purple", 1.0, 1.3)
    j = join(o, "livingroom_mesh")
    j.parent = root
    scr = box("tv_screen", 0, 1.55, -2.93, 2.6, 1.45, 0.02, "screen", parent=root)
    mat("tv_screen_mat", "#3a4a5c", emissive=0.0)
    scr.data.materials[0] = M("tv_screen_mat")


def build_trophy():
    root = empty("Trophy")
    j = join(trophy_parts(0, 0, 0), "trophy_mesh")
    j.parent = root


# ---------------------------------------------------------------- Bauen
build_tower()
build_city()
build_character()
build_accessories()
build_cab()
build_living_room()
build_trophy()

# Flat Shading überall
for ob in bpy.data.objects:
    if ob.type == "MESH":
        for p in ob.data.polygons:
            p.use_smooth = False

tri = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH")
print(f"[crazytv] objects={len(bpy.data.objects)} faces={tri}")

bpy.ops.export_scene.gltf(
    filepath=OUT_PATH,
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_normals=True,
    export_texcoords=False,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
)
print(f"[crazytv] exported {OUT_PATH}")
