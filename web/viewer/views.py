"""화면 하나, 자료 파일, 명칭 고치기, 상태 점검.

자료는 파이프라인이 만든 파일을 그대로 내준다. 뷰가 자료를 고치거나 합치지 않는다 —
그 일은 파이프라인의 몫이고, 뷰어는 파일이 없을 때 그렇다고 말할 뿐이다. 사람이 고친 명칭은
자료가 아니라 그 위의 덮어쓰기 표라서 따로 둔다(labels.py).
"""
import json
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET, require_http_methods

from . import labels

# 내줄 수 있는 것은 이 꼴뿐이다. 자료 폴더에 무엇이 더 놓여 있어도 밖에 나가지 않는다.
SERVED = {".json": "application/json", ".webp": "image/webp", ".png": "image/png"}
# 목록은 가공할 때마다 바뀌므로 짧게, 시점 파일은 가공 전까지 그대로이므로 길게 둔다.
INDEX_MAX_AGE = 300
FRAME_MAX_AGE = 86400


def load_index():
    path = Path(settings.DATA_DIR) / "index.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


@require_GET
def map_page(request):
    index = load_index()
    return render(request, "viewer/map.html", {
        "version": settings.WEGENER_VERSION,
        "has_data": index is not None,
        "frame_count": len(index["frames"]) if index else 0,
        "built_at": index.get("built_at") if index else None,
    })


@require_GET
def data_file(request, relative):
    root = Path(settings.DATA_DIR).resolve()
    path = (root / relative).resolve()
    if not path.is_relative_to(root) or path.suffix.lower() not in SERVED or not path.is_file():
        raise Http404("그런 자료가 없다")
    response = FileResponse(open(path, "rb"), content_type=SERVED[path.suffix.lower()])
    max_age = INDEX_MAX_AGE if path.name == "index.json" else FRAME_MAX_AGE
    response["Cache-Control"] = f"public, max-age={max_age}"
    return response


@require_http_methods(["GET", "POST"])
def labels_view(request):
    """GET: 덮어쓰기 표와 고칠 수 있는지. POST {kind, id, name, key}: 한 칸을 고친다(빈 이름은 기본으로)."""
    can_edit, needs_key = labels.editing()
    if request.method == "GET":
        response = JsonResponse({**labels.load(), "editable": can_edit, "needs_key": needs_key})
        response["Cache-Control"] = "no-store"
        return response

    if not can_edit:
        return JsonResponse({"error": "이 서버에서는 명칭을 고칠 수 없다(WEGENER_EDITOR_KEY 가 없다)"}, status=403)
    try:
        body = json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, ValueError):
        return JsonResponse({"error": "JSON 이 아니다"}, status=400)
    if not labels.key_ok(body.get("key")):
        return JsonResponse({"error": "열쇠가 맞지 않다"}, status=403)
    kind, key = body.get("kind"), body.get("id")
    name = " ".join(str(body.get("name") or "").split())      # 줄바꿈·겹친 빈칸을 하나로
    if kind not in labels.KINDS or not isinstance(key, str):
        return JsonResponse({"error": "고칠 수 없는 칸이다"}, status=400)
    if key not in labels.env_ids(load_index()):
        return JsonResponse({"error": f"그런 칸이 없다: {key}"}, status=400)
    if len(name) > labels.MAX_LENGTH:
        return JsonResponse({"error": f"이름은 {labels.MAX_LENGTH} 자까지다"}, status=400)
    return JsonResponse({**labels.save(kind, key, name), "editable": True, "needs_key": needs_key})


@require_GET
def healthz(request):
    """판 번호와 자료 상태. 자료가 없으면 화면은 뜨지만 쓸 수 없으므로 503 이다."""
    index = load_index()
    body = {"app": "WegenersDream", "version": settings.WEGENER_VERSION}
    if index is None:
        body.update(status="no-data", detail="index.json 이 없다 — 파이프라인을 돌린다")
        return JsonResponse(body, status=503)
    frames = index.get("frames", [])
    missing = [f["relief"] for f in frames
               if not (Path(settings.DATA_DIR) / f["relief"]).is_file()]
    body.update(
        status="ok" if frames and not missing else "degraded",
        frames=len(frames),
        built_at=index.get("built_at"),
        pbdb_retrieved_at=index.get("pbdb", {}).get("receipt", {}).get("retrieved_at"),
        missing_relief=len(missing),
    )
    return JsonResponse(body)
