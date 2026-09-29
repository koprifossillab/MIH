"""뷰어 시험. 자료 폴더를 임시로 만들어 쓴다 — 파이프라인도 네트워크도 타지 않는다.

    cd web && python manage.py test viewer
"""
import json
import shutil
import tempfile
from pathlib import Path

from django.test import SimpleTestCase, override_settings

INDEX = {
    "schema": 1,
    "built_at": "2026-09-29T00:00:00+00:00",
    "frames": [{
        "age": 250.0, "label": "Permo-Triassic boundary", "period": {"ko": "페름기", "en": "Permian"},
        "relief": "relief/2500.webp", "land_fraction": 0.4,
        "coastline": {"age": 250.0, "file": "coastlines/2500.json"},
        "fossils": {"file": "fossils/2500.json", "count": 0, "by_env": {}},
    }],
    "pbdb": {"receipt": {"retrieved_at": "2026-09-29T00:00:00+00:00"}},
    "sources": [],
    "environments": [
        {"id": "m", "ko": "바다 환경", "en": "Marine", "groups": [
            {"id": "m-reef", "ko": "초(礁)·생물초", "en": "Reefs", "terms": [
                {"term": "basin reef", "ko": "분지 초", "total": 1}]}]},
    ],
}


class DataDirMixin:
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.dir, True)
        (self.dir / "relief").mkdir()
        (self.dir / "relief" / "2500.webp").write_bytes(b"RIFF....WEBP")
        (self.dir / "index.json").write_text(json.dumps(INDEX), encoding="utf-8")
        (self.dir / "secret.txt").write_text("nope")
        override = override_settings(DATA_DIR=self.dir)
        override.enable()
        self.addCleanup(override.disable)


class MapPageTest(DataDirMixin, SimpleTestCase):
    def test_page_renders_with_data(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="map"')
        self.assertNotContains(response, "자료가 아직 없다")

    def test_page_says_so_without_data(self):
        (self.dir / "index.json").unlink()
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "자료가 아직 없다")


class DataFileTest(DataDirMixin, SimpleTestCase):
    def test_serves_index_and_frames(self):
        response = self.client.get("/data/index.json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertIn("max-age=300", response["Cache-Control"])
        response = self.client.get("/data/relief/2500.webp")
        self.assertEqual(response.status_code, 200)
        self.assertIn("max-age=86400", response["Cache-Control"])

    def test_refuses_other_suffixes_and_escape(self):
        self.assertEqual(self.client.get("/data/secret.txt").status_code, 404)
        self.assertEqual(self.client.get("/data/../mihweb/settings.py").status_code, 404)
        self.assertEqual(self.client.get("/data/%2e%2e/%2e%2e/web/manage.py").status_code, 404)
        self.assertEqual(self.client.get("/data/relief/none.webp").status_code, 404)


class HealthTest(DataDirMixin, SimpleTestCase):
    def test_ok(self):
        body = self.client.get("/healthz").json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(body["frames"], 1)

    def test_missing_relief_is_degraded(self):
        (self.dir / "relief" / "2500.webp").unlink()
        self.assertEqual(self.client.get("/healthz").json()["status"], "degraded")

    def test_no_data_is_503(self):
        (self.dir / "index.json").unlink()
        self.assertEqual(self.client.get("/healthz").status_code, 503)


class LabelsTest(DataDirMixin, SimpleTestCase):
    def setUp(self):
        super().setUp()
        override = override_settings(STATE_DIR=self.dir / "state", EDITOR_KEYS={"화석"}, DEBUG=False)
        override.enable()
        self.addCleanup(override.disable)

    def post(self, **body):
        return self.client.post("/labels", data=json.dumps(body), content_type="application/json")

    def test_get_says_key_is_needed(self):
        body = self.client.get("/labels").json()
        self.assertEqual(body["env"], {})
        self.assertTrue(body["editable"])
        self.assertTrue(body["needs_key"])

    def test_rename_and_reset(self):
        response = self.post(kind="env", id="m-reef", name="  초   환경 ", key="화석")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["env"], {"m-reef": "초 환경"})       # 빈칸을 하나로
        self.assertEqual(self.client.get("/labels").json()["env"], {"m-reef": "초 환경"})
        self.post(kind="env", id="term:basin reef", name="분지 안 초", key="화석")
        self.assertEqual(self.post(kind="env", id="m-reef", name="", key="화석").json()["env"],
                         {"term:basin reef": "분지 안 초"})                      # 비우면 기본으로

    def test_refusals(self):
        self.assertEqual(self.post(kind="env", id="m-reef", name="x", key="틀림").status_code, 403)
        self.assertEqual(self.post(kind="env", id="no-such", name="x", key="화석").status_code, 400)
        self.assertEqual(self.post(kind="time", id="m-reef", name="x", key="화석").status_code, 400)
        self.assertEqual(self.post(kind="env", id="m-reef", name="가" * 61, key="화석").status_code, 400)
        self.assertFalse((self.dir / "state" / "labels.json").exists())

    @override_settings(EDITOR_KEYS=set())
    def test_closed_in_production_without_key(self):
        self.assertFalse(self.client.get("/labels").json()["editable"])
        self.assertEqual(self.post(kind="env", id="m-reef", name="x").status_code, 403)

    @override_settings(EDITOR_KEYS=set(), DEBUG=True)
    def test_open_in_development_without_key(self):
        self.assertEqual(self.post(kind="env", id="m", name="바다").status_code, 200)


@override_settings(URL_PREFIX="MIH/")
class PrefixTest(SimpleTestCase):
    def test_urls_do_not_hardcode_prefix(self):
        # 접두사는 mihweb/urls.py 가 import 될 때 한 번 붙는다. 앱 urls 는 모른다.
        from viewer import urls
        self.assertTrue(all(not str(p.pattern).startswith("MIH") for p in urls.urlpatterns))
