# Synthetic Instagram fixtures

Mọi handle và timestamp trong thư mục này đều được tạo nhân tạo cho automated tests. Không file nào đến từ tài khoản hoặc export thật.

| Fixture | Mục đích | Kỳ vọng chính |
|---|---|---|
| `fixture-a/` | Snapshot chuẩn A | followers: `alpha.test`, `bravo_test`, `charlie.test`; following: `alpha.test`, `delta_test` |
| `fixture-b/` | Snapshot chuẩn B | mất `bravo_test`, thêm `echo.test`, dừng follow `delta_test`, bắt đầu follow `foxtrot_test` |
| `multipart/` | Multipart, duplicate, missing timestamp | merge part 1–2; loại duplicate `alpha.test`; cảnh báo timestamp thiếu |
| `mixed/followers_1.json` | Valid và malformed trộn lẫn | giữ 2 valid records, skip 4 malformed items |
| `unsupported-schema.json` | Top-level không được nhận diện | `UNSUPPORTED_INSTAGRAM_SCHEMA` |
| `html-only/` | HTML export | `UNSUPPORTED_HTML_EXPORT` |
| `manifests/*.json` | Missing files, unsafe paths, suspicious/boundary metadata | typed detection/resource errors |
| `corrupted-zip.base64` | ZIP header bị cắt ngắn | M3 giải mã rồi kỳ vọng `ARCHIVE_CORRUPTED` |

`scripts/generate-synthetic-fixtures.mjs` tạo lại các fixture metadata/base64 có tính cơ học. JSON relationship được giữ dạng đọc được để review semantic expectations.
