"""대기 화면 제목의 펜 획을 만든다(tupandactyl 005).

    python design/make_title.py     # → web/viewer/static/viewer/title.json

"Wegener's Dream" 을 La Belle Aurore 의 글자 윤곽(채울 면)으로 바꾸고, 그 윤곽을 그림으로 굽고 가늘게 깎아(skeletonize)
획의 가운데 선을 얻는다. 가운데 선을 마디(끝점·갈림점) 사이의 토막으로 나눈 뒤, 왼쪽에서 시작해 가장 가까운 다음 토막으로
이어 가며 펜이 지나가는 차례로 늘어놓는다. 대기 화면(splash.js)은 이 선들을 굵은 펜으로 차례로 그어 가림막(mask)으로 쓰고,
그 가림막으로 글자 면을 드러낸다 — 펜이 획을 따라가며 글씨를 쓰는 것처럼 보인다.

필체의 실제 획 순서는 알 수 없어 "왼쪽에서 오른쪽, 가까운 획부터" 로 흉내 낸다. 파이썬 3 + fonttools·brotli·
scikit-image·pillow·numpy.
"""
import json
from pathlib import Path

import numpy as np
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw
from skimage.morphology import skeletonize

HERE = Path(__file__).resolve().parent
STATIC = HERE.parent / "web" / "viewer" / "static" / "viewer"
FONT = STATIC / "vendor" / "fonts" / "la-belle-aurore-latin.woff2"
TEXT = "Wegener's Dream"
SCALE = 0.25          # 글꼴 단위(1024/em) → 그림 단위. 한 em 이 256


def outline():
    """글자들의 윤곽 — SVG path(y 아래로)와 윤곽점 목록(굽기용), 전체 폭·높이."""
    font = TTFont(FONT)
    gs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
    asc, desc = font["hhea"].ascent, font["hhea"].descent
    pen = SVGPathPen(gs)
    x = 0
    for ch in TEXT:
        name = cmap[ord(ch)]
        # 글꼴 좌표(y 위로)를 그림 좌표(y 아래로)로 — 기준선은 ascent 자리
        gs[name].draw(TransformPen(pen, (SCALE, 0, 0, -SCALE, x * SCALE, asc * SCALE)))
        x += hmtx[name][0]
    return pen.getCommands(), x * SCALE, (asc - desc) * SCALE


def raster(d, w, h, k):
    """SVG path 를 k 배로 굽는다 — 곡선은 fontTools 로 잘게 편다."""
    from fontTools.pens.recordingPen import RecordingPen
    from fontTools.svgLib.path import parse_path
    rec = RecordingPen()
    parse_path(d, rec)
    img = Image.new("L", (int(w * k) + 4, int(h * k) + 4), 0)
    dr = ImageDraw.Draw(img)
    polys, cur = [], []

    def lerp_bez(pts, n=12):
        out = []
        for i in range(1, n + 1):
            t = i / n
            q = list(pts)
            while len(q) > 1:
                q = [(q[j][0] + (q[j + 1][0] - q[j][0]) * t, q[j][1] + (q[j + 1][1] - q[j][1]) * t) for j in range(len(q) - 1)]
            out.append(q[0])
        return out
    for op, args in rec.value:
        if op == "moveTo":
            cur = [args[0]]
        elif op == "lineTo":
            cur.append(args[0])
        elif op in ("curveTo", "qCurveTo"):
            cur += lerp_bez([cur[-1]] + list(args))
        elif op in ("closePath", "endPath"):
            if len(cur) > 2:
                polys.append(cur)
            cur = []
    # 윤곽의 짝홀 규칙 — 겹칠 때마다 뒤집는다
    acc = np.zeros((img.height, img.width), bool)
    for p in polys:
        m = Image.new("1", img.size, 0)
        ImageDraw.Draw(m).polygon([(x * k + 2, y * k + 2) for x, y in p], fill=1)
        acc ^= np.asarray(m).astype(bool)
    return acc


def edges(sk):
    """깎은 선을 마디(끝점·갈림점) 사이 토막으로 — 각 토막은 픽셀 좌표 목록."""
    pts = set(zip(*np.nonzero(sk)))
    nb = lambda p: [(p[0] + dy, p[1] + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (p[0] + dy, p[1] + dx) in pts]
    node = {p for p in pts if len(nb(p)) != 2}
    seen, out = set(), []
    for n in node:
        for q in nb(n):
            if (n, q) in seen:
                continue
            path, prev, cur = [n, q], n, q
            seen.add((n, q))
            while cur not in node:
                nxt = [r for r in nb(cur) if r != prev and r not in path[-3:]]
                if not nxt:
                    break
                prev, cur = cur, nxt[0]
                path.append(cur)
            seen.add((cur, prev))
            out.append(path)
    # 마디가 없는 고리(o 처럼 닫힌 획)
    used = {p for e in out for p in e}
    for p in pts - used:
        if p in used:
            continue
        path, prev, cur = [p], None, p
        while True:
            nxt = [r for r in nb(cur) if r != prev and r not in path]
            if not nxt:
                break
            prev, cur = cur, nxt[0]
            path.append(cur)
        used |= set(path)
        if len(path) > 3:
            out.append(path + [path[0]])
    return [e for e in out if len(e) > 6]


def order(segs):
    """펜의 차례 — 이어진 글자 덩어리(한 붓에 쓰는 묶음)를 왼쪽부터, 덩어리 안에서는 왼쪽 끝에서 시작해 가장 가까운
    다음 토막으로. 덩어리를 건너뛰었다 돌아오면(앞 글자를 쓰다 말고 뒤 글자로) 글씨가 띄엄띄엄 나타난다."""
    # 끝점이 2 픽셀 안에서 만나는 토막끼리 한 덩어리
    parent = list(range(len(segs)))

    def root(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    ends = [(e[0], e[-1]) for e in segs]
    for a in range(len(segs)):
        for b in range(a + 1, len(segs)):
            if any(abs(p[0] - q[0]) <= 2 and abs(p[1] - q[1]) <= 2 for p in ends[a] for q in ends[b]):
                parent[root(a)] = root(b)
    groups = {}
    for a in range(len(segs)):
        groups.setdefault(root(a), []).append(a)
    out = []
    for members in sorted(groups.values(), key=lambda m: min(p[1] for a in m for p in segs[a])):
        todo = set(members)
        i = min(todo, key=lambda a: min(p[1] for p in segs[a]))
        e = segs[i] if segs[i][0][1] <= segs[i][-1][1] else segs[i][::-1]
        out.append(e)
        todo.discard(i)
        while todo:
            end = out[-1][-1]
            best = None
            for j in todo:
                for flip in (False, True):
                    s = segs[j][::-1] if flip else segs[j]
                    dist = (s[0][0] - end[0]) ** 2 + (s[0][1] - end[1]) ** 2 + max(0, end[1] - s[0][1]) ** 2 * .5   # 뒤로 가는 것은 덜 좋아한다
                    if best is None or dist < best[0]:
                        best = (dist, j, s)
            out.append(best[2])
            todo.discard(best[1])
    return out

if __name__ == "__main__":
    d, w, h = outline()
    k = 4.0
    ink = raster(d, w, h, k)
    sk = skeletonize(ink)
    strokes = []
    for e in order(edges(sk)):
        pts = e[::8] + ([e[-1]] if (len(e) - 1) % 8 else [])
        strokes.append([[round((x - 2) / k, 1), round((y - 2) / k, 1)] for y, x in pts])
    # 획 두께 — 굽은 면을 가운데 선 길이로 나눈 평균 두께(그림 단위)
    thick = ink.sum() / max(1, sk.sum()) / k
    data = {"w": round(w, 1), "h": round(h, 1), "d": d, "strokes": strokes, "pen": round(thick * 1.9 + 2, 1)}
    (STATIC / "title.json").write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(len(strokes), "strokes, pen", data["pen"], "size", data["w"], data["h"])
