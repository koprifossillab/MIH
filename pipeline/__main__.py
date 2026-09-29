import sys

from . import build, fetch

USAGE = """사용법: python -m pipeline <명령>

  fetch            원본 받기·검증 (PaleoDEM, PaleoCoastlines, PBDB)
  fetch --refresh-pbdb   PBDB 를 새로 받는다 (Zenodo 두 개는 고정이라 다시 받지 않는다)
  build            배경·해안선·화석·국경·목록 만들기
  build --no-relief  배경 그림(6 분쯤 걸린다)은 지난 것을 두고 나머지만
  all              fetch 뒤 build
"""


def main(argv):
    command = argv[0] if argv else ""
    if command == "fetch":
        fetch.main(argv[1:])
    elif command == "build":
        build.build(skip_relief="--no-relief" in argv)
    elif command == "all":
        fetch.main(argv[1:])
        build.build()
    else:
        print(USAGE)
        return 2
    return 0


sys.exit(main(sys.argv[1:]))
