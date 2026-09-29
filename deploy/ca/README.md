# 사내 CA 인증서 자리

연구소 망 안에서 이미지를 구우면 TLS 검사 장비 때문에 `pip` 이
`CERTIFICATE_VERIFY_FAILED` 로 멈춘다. GSM 의 `deploy/ca/` 에 있는 `.crt` 파일을
여기로 복사하면 Dockerfile 이 이미지에 넣는다. 망 밖(GitHub Actions 등)에서
구울 때는 비어 있어도 된다.

뷰어 자체는 밖으로 나가는 요청이 없다(PBDB 는 브라우저가 부른다). 인증서가
필요한 것은 굽는 동안의 `pip` 뿐이다.
