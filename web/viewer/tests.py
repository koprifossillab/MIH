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


@override_settings(URL_PREFIX="MIH/")
class PrefixTest(SimpleTestCase):
    def test_urls_do_not_hardcode_prefix(self):
        # 접두사는 mihweb/urls.py 가 import 될 때 한 번 붙는다. 앱 urls 는 모른다.
        from viewer import urls
        self.assertTrue(all(not str(p.pattern).startswith("MIH") for p in urls.urlpatterns))
