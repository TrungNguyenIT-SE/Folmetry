# ADR-0002: Snapshot, import và list scaling

- Trạng thái: Accepted
- Ngày: 2026-09-15
- Phạm vi: M0

## Canonical fingerprint

Fingerprint là SHA-256 của UTF-8 canonical payload, không dùng để xác thực:

1. normalize và deduplicate handle theo domain rules;
2. sort followers và following theo thứ tự code-point tăng dần;
3. encode từng trường bằng length-prefix theo số UTF-8 bytes để không có delimiter collision;
4. payload bắt đầu bằng domain tag `relationship-snapshot-fingerprint:v1` và platform;
5. hash bằng Web Crypto SHA-256, xuất lowercase hex.

Canonical sequence:

```text
field(domain-tag)
field(platform)
list(followers: count + field(handle) ...)
list(following: count + field(handle) ...)
```

`field(x)` được encode là `<utf8-byte-length>:<utf8-bytes>`. Không đưa filename, import time, display handle, URL hoặc account label vào fingerprint.

## Snapshot timestamp và duplicate

- `snapshotAt` là epoch milliseconds do người dùng xác nhận; file metadata chỉ là gợi ý.
- Trong cùng local account, không lưu hai snapshot có cùng `snapshotAt`. UI yêu cầu sửa thời điểm để loại bỏ thứ tự mơ hồ.
- Nếu fingerprint trùng trong cùng account, mặc định hủy lưu và dẫn người dùng tới snapshot đã có.
- Baseline tự động là snapshot mới nhất có `snapshotAt < current.snapshotAt`; không dùng `importedAt` để suy ra lịch sử.
- `importedAt` chỉ phục vụ audit/UX local.

## Manual multipart completeness

- ZIP là primary path. Manual JSON chỉ là recovery/debug path.
- Bắt buộc có đúng một `following.json` được nhận diện và ít nhất một `followers_N.json`.
- Follower parts phải bắt đầu từ 1, suffix là số nguyên dương, không duplicate và liên tục tới `max(N)`. Gap/duplicate/missing `following` là blocking error.
- Vì tên file không thể chứng minh part cuối cùng thật sự tồn tại, manual import luôn hiển thị cảnh báo completeness và cần người dùng xác nhận họ đã chọn toàn bộ các part. Cảnh báo được lưu bằng stable warning code.
- Không suy đoán dữ liệu thiếu và không tự động tiếp tục nếu có namespace followers/following mơ hồ.

## Pagination/windowing

- Kết quả ban đầu dùng client pagination 100 dòng/trang; tùy chọn 50/100/200.
- Không render quá 200 relationship rows trong một list cùng lúc ở V1.
- Search/sort áp dụng trên toàn bộ normalized result trước pagination.
- Chỉ thêm virtualization nếu benchmark M9 cho thấy pagination không đạt mục tiêu với 100.000+ rows; không thêm dependency trước khi có dữ liệu đo.

## Hệ quả

- So sánh lịch sử có thứ tự xác định và không phụ thuộc thứ tự import.
- Manual import thận trọng hơn nhưng tránh kết quả sai âm thầm.
- Canonical encoding phải có golden-vector tests trước khi persistence được xem là ổn định.
