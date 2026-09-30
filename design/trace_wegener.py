"""베게너 사진을 따라 선을 따 단색 초상으로 단순화한다(tupandactyl 005).

    python design/trace_wegener.py      # → design/wegener_trace.json (윤곽·짙은 면의 SVG path)

그다음 `node design/make_icons.js` 가 이것으로 `web/viewer/static/viewer/` 의 초상·엠블럼·파비콘 SVG 를 만든다.
사진은 연구자가 준 공공 영역 사진(`sources/wegener_pipe.webp`, 1000×1421, 출처는 design/README.md).

문턱값만으로는 뒤의 나무·배 난간이 사람에 붙고 얼굴 옆선이 밝은 물에 묻힌다. 그래서 사람의 윤곽은 사진 위에
격자를 대고 손으로 짚은 점(FIG)으로 정하고, 그 안의 짙은 면(모자·외투·그늘)만 문턱값으로 가른다. 모자·파이프·눈은
문턱값이 뭉개서 손으로 채웠다. 파이썬 3 + numpy·scipy·pillow·potracer(`pip install potracer`).
"""
import json
from pathlib import Path

import numpy as np
import potrace
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from scipy import ndimage as ndi

HERE = Path(__file__).resolve().parent

im = Image.open(HERE / 'sources' / 'wegener_pipe.webp').convert('L').crop((0, 80, 960, 1040))
g = np.asarray(ImageOps.autocontrast(im, cutoff=1).filter(ImageFilter.GaussianBlur(2.2))).astype(float) / 255
# 사람의 윤곽 — 사진 위에 격자를 대고 손으로 짚은 점(자른 틀 960×960)
FIG = [(100,300),(110,230),(150,140),(220,70),(330,25),(440,20),(530,50),(600,110),(640,190),(655,270),(650,320),(622,350),
       (602,362),(598,400),(592,440),(602,482),(612,515),(602,532),(578,546),(580,570),(576,596),
       (620,586),(680,589),(715,614),(736,650),(760,680),(800,690),(850,668),(900,672),(950,700),(960,730),(960,960),(0,960),
       (0,700),(60,680),(130,640),(192,612),(205,598),(232,578),(214,542),(176,484),(166,444),(140,452),(104,382)]
GAP = [(574,604),(610,600),(660,600),(700,622),(716,652),(722,690),(690,722),(630,738),(566,728),(552,690),(560,640)]
def poly(pts):
    m = Image.new('1', (960, 960), 0); ImageDraw.Draw(m).polygon(pts, fill=1); return np.asarray(m).astype(bool)
fig = poly(FIG) & ~(poly(GAP) & (g > 0.72))
fig = ndi.binary_opening(fig, iterations=2)
HAT = [(100,300),(110,230),(150,140),(220,70),(330,25),(440,20),(530,50),(600,110),(640,190),(655,270),(650,320),(622,350),
       (560,352),(480,362),(400,382),(300,410),(210,438),(150,456),(104,382)]
FACE = poly([(150,350),(630,350),(630,760),(150,760)])
# 머리·목과 옷을 가른다(연구자: "머리와 목, 겉옷의 구분이 명확하지 않다"). 확대한 격자에서 짚었다.
# 옷 자리(COATZONE) 안은 문턱값을 쓰지 않고 — 외투는 잉크, 셔츠 깃은 종이, 넥타이는 잉크, 손은 옅은 면으로 칠한다
COATZONE = poly([(0,700),(60,680),(130,640),(192,612),(200,598),(205,640),(235,690),(280,745),(330,790),(380,830),(400,860),
                 (420,840),(433,800),(455,790),(478,760),(473,738),(545,738),(600,745),(660,772),(720,806),(760,840),(770,960),(0,960)])
SHIRT = poly([(200,598),(240,640),(290,695),(340,740),(387,733),(430,733),(473,738),(478,760),(455,790),(433,800),
              (420,840),(400,860),(380,830),(330,790),(280,745),(235,690),(205,640)])
TIE = poly([(388,790),(433,790),(450,840),(480,960),(360,960),(378,860)])
HAND = poly([(760,690),(800,688),(850,668),(900,672),(950,700),(960,730),(960,960),(770,960),(765,880),(760,800)])
# 턱선 — 귀 밑에서 턱 끝까지. 목과 얼굴을 가르는 한 줄(SVG path 로 그대로 쓴다)
JAW = "M232 580C258 616 296 660 340 690C380 714 430 730 480 731C512 731 536 716 548 690"
BOWL = [(716,652),(746,660),(778,676),(800,700),(806,752),(794,796),(756,806),(730,786),(716,740),(708,690)]
dark = (((g < 0.34) & ~FACE) | ((g < 0.27) & FACE)) & fig & ~COATZONE & ~HAND
dark |= (COATZONE & fig & ~SHIRT) | TIE
dark = ndi.binary_opening(dark, iterations=1)
dark |= poly(HAT) | poly(BOWL)
# 파이프 대 — 입에서 대통까지 굵은 선
st = Image.new('1', (960, 960), 0)
ImageDraw.Draw(st).line([(576,602),(620,594),(664,597),(698,611),(722,634),(736,662)], fill=1, width=24, joint="curve")
dark |= np.asarray(st).astype(bool)
# 눈 — 문턱값으로는 눈썹 그늘과 붙어 사라진다. 사진의 눈 자리에 가는 아몬드를 둔다
eye = Image.new('1', (960, 960), 0); ImageDraw.Draw(eye).polygon([(556,404),(572,397),(590,399),(598,405),(586,410),(568,410)], fill=1)
dark |= np.asarray(eye).astype(bool)
# 모자 윗면의 접힌 금(사진의 밝은 줄) — 모자를 한 덩어리로 칠한 뒤 다시 판다
fold = Image.new('1', (960, 960), 0); ImageDraw.Draw(fold).line([(392,112),(430,104),(470,102),(500,110)], fill=1, width=7)
dark &= ~np.asarray(fold).astype(bool)
fig |= dark
shirt = SHIRT & ~TIE


def trace(m, turd):
    bm = potrace.Bitmap(m)
    pl = bm.trace(turdsize=turd, alphamax=1.1, opticurve=True, opttolerance=0.4)
    parts = []
    for c in pl:
        st = c.start_point; d = [f"M{st.x:.1f} {st.y:.1f}"]
        for seg in c.segments:
            if seg.is_corner: d.append(f"L{seg.c.x:.1f} {seg.c.y:.1f}L{seg.end_point.x:.1f} {seg.end_point.y:.1f}")
            else: d.append(f"C{seg.c1.x:.1f} {seg.c1.y:.1f} {seg.c2.x:.1f} {seg.c2.y:.1f} {seg.end_point.x:.1f} {seg.end_point.y:.1f}")
        d.append("Z"); parts.append("".join(d))
    return "".join(parts)


if __name__ == "__main__":
    # potracer 는 거짓(0)인 칸을 채운다 — 뒤집어 넘긴다
    data = {"size": 960, "figure": trace(~fig, 400), "dark": trace(~dark, 60), "shirt": trace(~shirt, 60), "jaw": JAW}
    (HERE / "wegener_trace.json").write_text(json.dumps(data), encoding="utf-8")
    print("figure", len(data["figure"]), "dark", len(data["dark"]))
