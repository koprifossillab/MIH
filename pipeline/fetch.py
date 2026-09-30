"""원본 받기와 검증.

Zenodo 의 두 압축본은 매니페스트(sources/*.json)의 크기·SHA-256 과 맞아야만 쓴다.
PBDB 는 계속 자라는 데이터베이스라 미리 고정할 값이 없다 — 받은 것의 크기·SHA-256·
행 수·받은 시각을 receipt.json 에 적어, 어느 날의 PBDB 로 만든 지도인지 남긴다.

받는 중에 끊겨도 반쪽 파일이 제자리에 앉지 않게, 임시 파일에 받고 검증한 뒤 옮긴다.
"""
import csv
import fnmatch
import hashlib
import json
import shutil
import sys
import tempfile
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from .common import ROOT, manifest, source_path

USER_AGENT = "WegenersDream/1 (koprifossillab; paleogeography viewer)"
CHUNK = 1 << 20


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(CHUNK), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(url, target, timeout=600):
    """url 을 target 옆 임시 파일에 받고 그 경로를 돌려준다. 옮기는 것은 부르는 쪽이다."""
    target.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    handle, temp = tempfile.mkstemp(dir=target.parent, suffix=".download")
    received = 0
    with urllib.request.urlopen(request, timeout=timeout) as response, open(handle, "wb") as out:
        while chunk := response.read(CHUNK):
            out.write(chunk)
            received += len(chunk)
            print(f"\r  {target.name}: {received / 1e6:7.1f} MB", end="", flush=True)
    print()
    return Path(temp)


def check_pinned(path, archive):
    size = path.stat().st_size
    if size != archive["bytes"]:
        raise SystemExit(f"{path.name}: 크기 {size} — 매니페스트는 {archive['bytes']}")
    digest = sha256(path)
    if digest != archive["sha256"]:
        raise SystemExit(f"{path.name}: SHA-256 이 매니페스트와 다르다 ({digest})")


def unzip(path, out, patterns=None):
    """patterns(글롭)에 맞는 것만 푼다. 압축본 밖으로 나가는 경로는 거절한다."""
    out.mkdir(parents=True, exist_ok=True)
    root = out.resolve()
    count = 0
    with zipfile.ZipFile(path) as bundle:
        for info in bundle.infolist():
            name = info.filename
            if name.endswith("/") or name.startswith("__MACOSX") or "/._" in name:
                continue
            if patterns and not any(fnmatch.fnmatch(name, p) for p in patterns):
                continue
            dest = (out / name).resolve()
            if not dest.is_relative_to(root):
                raise SystemExit(f"압축본 밖을 가리키는 경로: {name}")
            dest.parent.mkdir(parents=True, exist_ok=True)
            with bundle.open(info) as src, open(dest, "wb") as dst:
                shutil.copyfileobj(src, dst)
            count += 1
    return count


def archives(spec):
    """매니페스트의 압축본들. 하나면 `archive`, 여럿이면 `archives` 에 적는다."""
    return spec.get("archives") or [spec["archive"]]


def fetch_pinned(name):
    spec = manifest(name)
    for archive in archives(spec):
        target = source_path(archive["path"])
        if target.exists():
            check_pinned(target, archive)
            print(f"있음  {archive['path']}")
        else:
            print(f"받기  {spec['title']} ({archive.get('id', '')}, {archive['bytes'] / 1e6:.0f} MB)")
            temp = download(archive["url"], target, timeout=1800)
            try:
                check_pinned(temp, archive)
            except SystemExit:
                temp.unlink(missing_ok=True)
                raise
            temp.replace(target)
        if "unzip" not in archive:
            continue
        out = source_path(archive["unzip"])
        if not out.exists():
            count = unzip(target, out, archive.get("members"))
            print(f"  풀었다: {count} 파일 -> {out.relative_to(ROOT)}")


def fetch_pbdb_intervals(refresh=False):
    """PBDB 시대 이름표 — 산지를 새로 받을 때 함께 새로 받는다(새 이름이 들어올 수 있다)."""
    spec = manifest("pbdb")["intervals"]
    target = source_path(spec["path"])
    if target.exists() and not refresh:
        print(f"있음  {spec['path']}")
        return
    temp = download(spec["url"], target, timeout=300)
    records = json.loads(temp.read_text(encoding="utf-8")).get("records") or []
    if not records or "type" not in records[0]:
        temp.unlink(missing_ok=True)
        raise SystemExit("PBDB 시대 이름표에 type 칸이 없다 — 질의를 확인한다")
    temp.replace(target)
    print(f"  시대 이름 {len(records)} 개")


def fetch_pbdb(refresh=False):
    spec = manifest("pbdb")
    query = spec["query"]
    target = source_path(query["path"])
    receipt = target.parent / "receipt.json"
    fetch_pbdb_intervals(refresh)
    if target.exists() and receipt.exists() and not refresh:
        print(f"있음  {query['path']} ({json.loads(receipt.read_text())['retrieved_at']} 에 받음)")
        return
    print("받기  PBDB 산지 전체 — 서버가 표를 만드는 데 몇 분 걸린다")
    temp = download(query["url"], target, timeout=1800)
    # 줄이 아니라 행을 센다 — geology_comments 같은 칸에 줄바꿈이 들어 있다.
    with open(temp, newline="", encoding="utf-8", errors="replace") as handle:
        reader = csv.reader(handle)
        header = next(reader, [])
        rows = sum(1 for _ in reader)
    if "paleolat" not in header or rows == 0:
        temp.unlink(missing_ok=True)
        raise SystemExit("PBDB 가 돌려준 표에 paleolat 칸이 없거나 비었다 — 질의를 확인한다")
    temp.replace(target)
    receipt.write_text(json.dumps({
        "url": query["url"],
        "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "bytes": target.stat().st_size,
        "sha256": sha256(target),
        "records": rows,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  {rows} 산지")


def fetch_receipted(name, refresh=False):
    """고정할 값이 없는 파일(판이 오르는 것) — 받고, 받은 날의 크기·SHA-256 을 receipt 에 적는다."""
    spec = manifest(name)["download"]
    target = source_path(spec["path"])
    receipt = target.parent / "receipt.json"
    if target.exists() and receipt.exists() and not refresh:
        print(f"있음  {spec['path']}")
    else:
        print(f"받기  {manifest(name)['title']}")
        download(spec["url"], target).replace(target)
        receipt.write_text(json.dumps({
            "url": spec["url"],
            "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "bytes": target.stat().st_size, "sha256": sha256(target),
        }, indent=2) + "\n", encoding="utf-8")
    out = source_path(spec["unzip"])
    if not out.exists() or refresh:
        print(f"  풀었다: {unzip(target, out)} 파일")


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    fetch_pinned("paleodem")
    fetch_pinned("paleocoastlines")
    fetch_pinned("paleotemp")
    fetch_pinned("paleoclim")        # 최근의 절 기온(tupandactyl 010) — SHA-256 으로 고정된 원본이라 다른 Zenodo 것과 같이 받는다
    fetch_receipted("countries")
    fetch_pbdb(refresh="--refresh-pbdb" in argv)


if __name__ == "__main__":
    main()
