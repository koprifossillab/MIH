"""본문 글씨체(본명조 Noto Serif KR + Spectral)를 저장소에 담는다(tupandactyl 006).

    python design/fetch_fonts.py      # → web/viewer/static/viewer/vendor/fonts/{noto-serif-kr,spectral}/ 와 fonts.css

Google Fonts 가 내주는 CSS 를 받아, 글자 묶음별로 잘게 나눈 woff2 를 그대로 받아 두고 CSS 의 주소만 저장소 안으로 바꾼다.
브라우저는 화면에 쓰인 글자가 든 묶음만 받으므로 첫 화면이 무겁지 않다. 사내망에서 Google 에 닿지 않아도 된다.

- 본명조: 400·600, 한글·한자 묶음만(라틴은 Spectral 이 맡는다)
- Spectral: 400·600·400 기울임, latin·latin-ext
둘 다 SIL Open Font License 1.1. 표준 라이브러리만 쓴다.
"""
import re
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "web" / "viewer" / "static" / "viewer" / "vendor" / "fonts"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
URL = ("https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600"
       "&family=Spectral:ital,wght@0,400;0,600;1,400&display=swap")
KEEP = {"Noto Serif KR": {None}, "Spectral": {"latin", "latin-ext"}}   # None: 이름표 없는 묶음(한글·한자)
DIRS = {"Noto Serif KR": "noto-serif-kr", "Spectral": "spectral"}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read()


def main():
    css = get(URL).decode()
    out, n = [], 0
    for m in re.finditer(r"(?:/\* ([\w-]+) \*/\s*)?@font-face \{(.*?)\}", css, re.S):
        label, body = m.group(1), m.group(2)
        fam = re.search(r"font-family: '([^']+)'", body).group(1)
        if label not in KEEP[fam]:
            continue
        src = re.search(r"url\((https://[^)]+)\)", body).group(1)
        style = re.search(r"font-style: (\w+)", body).group(1)
        weight = re.search(r"font-weight: (\d+)", body).group(1)
        name = f"{weight}{'i' if style == 'italic' else ''}-{label or 'k'}-{src.rsplit('/', 1)[1].split('.')[-2]}.woff2"
        path = OUT / DIRS[fam] / name
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            path.write_bytes(get(src))
        out.append("@font-face {" + body.replace(src, f"{DIRS[fam]}/{name}") + "}")
        n += 1
    (OUT / "fonts.css").write_text(
        "/* 본문 글씨체 — design/fetch_fonts.py 가 만든다. 손으로 고치지 않는다 (tupandactyl 006) */\n" + "\n".join(out) + "\n",
        encoding="utf-8")
    print(n, "faces")


def dark_alias():
    """다크 모드 Casual 의 한글 — 본명조 600 을 400·600 자리에 다시 걸어 둔 별칭 가족 'Noto Serif KR Dark'(tupandactyl 023).

        python design/fetch_fonts.py --dark     # fonts.css 에서 만든다(받지 않는다) → fonts-dark.css

    어두운 바탕에서 400 의 가는 획이 번진다. 글씨체를 굵게(font-weight) 하면 라틴(Spectral)까지 굵어져 화면이 무거워서, 한글
    글꼴만 굵은 파일로 바꿔 끼운다. 새 파일을 받지 않는다 — 이미 있는 600 묶음을 가리킨다.
    """
    css = (OUT / "fonts.css").read_text(encoding="utf-8")
    faces = [f for f in re.findall(r"@font-face \{.*?\}", css, re.S) if "'Noto Serif KR'" in f and "font-weight: 600" in f]
    out = []
    for weight in ("400", "600"):
        for face in faces:
            out.append(face.replace("'Noto Serif KR'", "'Noto Serif KR Dark'").replace("font-weight: 600", f"font-weight: {weight}"))
    (OUT / "fonts-dark.css").write_text(
        "/* 다크 모드 Casual 의 한글(본명조 600) — design/fetch_fonts.py --dark 가 만든다. 손으로 고치지 않는다 (tupandactyl 023) */\n"
        + "\n".join(out) + "\n", encoding="utf-8")
    print(len(out), "faces (dark)")


if __name__ == "__main__":
    if "--dark" in sys.argv:
        dark_alias()
    else:
        main()
