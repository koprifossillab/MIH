import sys

from . import build, fetch

USAGE = """사용법: python -m pipeline <명령>

  fetch            원본 받기·검증 (PaleoDEM, PaleoCoastlines, PBDB)
  fetch --refresh-pbdb   PBDB 를 새로 받는다 (Zenodo 두 개는 고정이라 다시 받지 않는다)
  build            배경·해안선·화석·목록 만들기
  all              fetch 뒤 build
"""


def main(argv):
    command = argv[0] if argv else ""
    if command == "fetch":
        fetch.main(argv[1:])
    elif command == "build":
        build.build()
    elif command == "all":
        fetch.main(argv[1:])
        build.build()
    else:
        print(USAGE)
        return 2
    return 0


sys.exit(main(sys.argv[1:]))
