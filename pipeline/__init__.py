"""MIH 자료 가공 파이프라인.

원본(PaleoDEM·PaleoCoastlines·PBDB)을 받아 뷰어가 읽는 시점별 파일로 만든다.
뷰어는 여기서 만든 파일만 읽고, 이 패키지를 import 하지 않는다.

    python -m pipeline fetch        원본 받기·검증
    python -m pipeline build        배경·해안선·화석·목록 모두 만들기
    python -m pipeline all          둘 다
"""
