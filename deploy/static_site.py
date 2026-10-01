"""연구소 밖에서 보는 고정 사이트(GitHub Pages)를 굽는다(tupandactyl 029).

    python deploy/static_site.py <내보낼 폴더> <자료 폴더>
    # 예: python deploy/static_site.py _site /srv/WegenersDream/data

뷰어는 서버에서 하는 일이 거의 없다 — 첫 화면(map.html)을 그리고, 미리 구운 자료 파일(/data/…)을 내주고, 명칭 덮어쓰기 표(/labels)를
돌려줄 뿐이다. PBDB 는 브라우저가 곧장 부른다. 그래서 Django 로 첫 화면을 **한 번 그려** index.html 로 적고, 정적 파일과 자료 파일을
옆에 두면 그대로 돈다. URL 앞머리를 `WegenersDream` 으로 그리면 주소 꼴(/WegenersDream/static/…, /WegenersDream/data/…)이 GitHub Pages 의
프로젝트 주소(koprifossillab.github.io/WegenersDream/)와 맞는다.

내보내는 것: index.html, static/(collectstatic), data/(자료 폴더를 그대로), labels(빈 덮어쓰기 표 — 운영의 표가 있으면 그것),
healthz(판·시점 수), .nojekyll. 연구소 서버는 열지 않는다 — 이 폴더만 밖으로 나간다.
"""
import json
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PREFIX = "WegenersDream"


def main(out, data, labels=None):
    out, data = Path(out).resolve(), Path(data).resolve()
    if not (data / "index.json").is_file():
        raise SystemExit(f"{data} 에 index.json 이 없다")
    os.environ.update({
        "DJANGO_SETTINGS_MODULE": "wegenerweb.settings", "WEGENER_URL_PREFIX": PREFIX, "WEGENER_DATA_DIR": str(data),
        "WEGENER_SECRET_KEY": "static-site-build-only", "WEGENER_ALLOWED_HOSTS": "testserver", "WEGENER_DEBUG": "0",
    })
    sys.path.insert(0, str(ROOT / "web"))
    import django
    django.setup()
    from django.conf import settings
    from django.core.management import call_command
    from django.test import Client

    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    page = Client().get(f"/{PREFIX}/")
    if page.status_code != 200:
        raise SystemExit(f"첫 화면을 그리지 못했다({page.status_code})")
    (out / "index.html").write_bytes(page.content)

    call_command("collectstatic", "--noinput", verbosity=0)
    shutil.copytree(settings.STATIC_ROOT, out / "static")
    # 자료 — 뷰어가 내주는 확장자만(views.SERVED). 심볼릭 링크는 따라가지 않는다(뷰어도 거부한다)
    served = {".json", ".webp", ".png"}
    for path in data.rglob("*"):
        if path.is_file() and not path.is_symlink() and path.suffix.lower() in served:
            target = out / "data" / path.relative_to(data)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
    table = json.loads(Path(labels).read_text(encoding="utf-8")) if labels and Path(labels).is_file() else {"env": {}}
    (out / "labels").write_text(json.dumps({**table, "editable": False, "needs_key": False}, ensure_ascii=False), encoding="utf-8")
    index = json.loads((data / "index.json").read_text(encoding="utf-8"))
    (out / "healthz").write_text(json.dumps({"app": "WegenersDream", "version": settings.WEGENER_VERSION, "status": "ok",
                                             "static": True, "frames": len(index["frames"]), "built_at": index.get("built_at")}),
                                 encoding="utf-8")
    (out / ".nojekyll").write_text("", encoding="utf-8")
    size = sum(p.stat().st_size for p in out.rglob("*") if p.is_file())
    print(f"고정 사이트: {out} ({size / 1e6:.0f} MB, 시점 {len(index['frames'])})")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
