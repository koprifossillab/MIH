"""MIH 뷰어 설정. 값은 전부 `MIH_*` 환경변수로 들어온다.

DB 가 없다. 뷰어는 파이프라인이 만든 파일을 읽어 내줄 뿐이고, 사람이 올리거나 고치는
것이 아직 없다. 필요해지면 GSM 처럼 SQLite 하나를 `/srv/MIH/db/` 에 둔다.
"""
import os
from pathlib import Path

from .version import VERSION

BASE_DIR = Path(__file__).resolve().parent.parent       # web/
REPO_DIR = BASE_DIR.parent


def env(name, default=""):
    return os.environ.get(name, default)


def env_bool(name, default=False):
    value = os.environ.get(name)
    return default if value is None else value.strip().lower() in ("1", "true", "yes", "on")


DEBUG = env_bool("MIH_DEBUG", False)

SECRET_KEY = env("MIH_SECRET_KEY")
if not SECRET_KEY:
    if not DEBUG:
        from django.core.exceptions import ImproperlyConfigured
        raise ImproperlyConfigured("MIH_SECRET_KEY 가 비었다 — 운영에서는 entrypoint 가 만들어 둔다")
    SECRET_KEY = "dev-only-not-a-secret"

ALLOWED_HOSTS = [h.strip() for h in env("MIH_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",") if h.strip()]
CSRF_TRUSTED_ORIGINS = [o.strip() for o in env("MIH_CSRF_TRUSTED_ORIGINS").split(",") if o.strip()]

# nginx 가 /MIH/ 아래에 얹는다. 접두사는 mihweb/urls.py 한 곳에서만 붙인다.
# 개발에서는 비워 두어 http://127.0.0.1:8000/ 에서 바로 본다.
URL_PREFIX = env("MIH_URL_PREFIX", "")
if URL_PREFIX and not URL_PREFIX.endswith("/"):
    URL_PREFIX += "/"

# 파이프라인이 만든 자료(index.json·relief·coastlines·fossils). 운영은 /srv/MIH/data (읽기 전용).
DATA_DIR = Path(env("MIH_DATA_DIR", str(REPO_DIR / "data" / "derived")))
# 뷰어가 쓰는 자리 — 화면에서 고친 명칭(labels.json)과 비밀키. 운영은 /srv/MIH/state (쓰기).
STATE_DIR = Path(env("MIH_STATE_DIR", str(REPO_DIR / "data" / "state")))

# 명칭 고치기를 여는 낱말(쉼표로 여럿). phyloserver 의 UPDATES_EDITOR_KEY 와 같은 갈래다 —
# 계정 없이 이 한 마디로 연다. 비워 두면 개발(DEBUG)에서만 열쇠 없이 열리고 운영에서는 닫힌다.
EDITOR_KEYS = {k.strip() for k in env("MIH_EDITOR_KEY").split(",") if k.strip()}

INSTALLED_APPS = [
    "django.contrib.staticfiles",
    "viewer",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",      # 명칭 고치기(POST)
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "mihweb.urls"
WSGI_APPLICATION = "mihweb.wsgi.application"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": ["django.template.context_processors.request"]},
}]

DATABASES = {}

LANGUAGE_CODE = "ko-kr"
TIME_ZONE = "Asia/Seoul"
USE_I18N = False
USE_TZ = True

STATIC_URL = f"/{URL_PREFIX}static/" if URL_PREFIX else "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MIH_VERSION = VERSION

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
