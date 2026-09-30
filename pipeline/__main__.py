import sys

from . import build, everything, fetch, terrain

USAGE = """사용법: python -m pipeline <명령>

  fetch            원본 받기·검증 (PaleoDEM, PaleoCoastlines, PBDB)
  fetch --refresh-pbdb   PBDB 를 새로 받는다 (Zenodo 두 개는 고정이라 다시 받지 않는다)
  build            배경·해안선·화석·국경·목록 만들기
  build --no-relief  배경 그림·지형(합해 10 분 남짓)은 지난 것을 두고 나머지만
  all              fetch 뒤 build
  terrain          지구본 지형만 굽고 지금 index.json 에 붙인다 (배경·화석은 그대로, 5 분 남짓)
  everything       첫 화면의 모든 시대 산지(오늘날 자리)만 만들고 지금 index.json 에 붙인다 (1 분 안쪽)
"""


def main(argv):
    command = argv[0] if argv else ""
    if command == "fetch":
        fetch.main(argv[1:])
    elif command == "build":
        build.build(skip_relief="--no-relief" in argv)
    elif command == "terrain":
        terrain.attach()
    elif command == "everything":
        everything.attach()
    elif command == "all":
        fetch.main(argv[1:])
        build.build()
    else:
        print(USAGE)
        return 2
    return 0


sys.exit(main(sys.argv[1:]))
