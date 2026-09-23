# Analyzer domain contracts — M2

Public exports của analyzer nằm tại `src/features/analyzer/index.ts`. Các module này là TypeScript thuần và không được import React, Next.js, Dexie hay network client.

## Boundary

```text
unknown archive metadata / parsed JSON
  -> path and manifest detection
  -> Instagram-only tolerant extractors
  -> normalized platform-neutral records
  -> deterministic set analysis / historical diff / fingerprint
```

Instagram wrapper keys và `string_list_data` dừng ở adapter. UI, persistence và diff chỉ nhận `RelationshipRecord`.

## Handle contract

- Input phải là string, được trim Unicode/ASCII whitespace và bỏ đúng một `@` đầu chuỗi.
- Comparison key lowercase, 1–30 ký tự, chỉ gồm ASCII letter, digit, period và underscore.
- Không dùng `href`, không fuzzy matching và không diễn giải input như HTML.
- Display handle được giữ riêng; duplicate resolution ưu tiên lowercase display form rồi code-point order để không phụ thuộc source order.

## Timestamp contract

- Export timestamp là Unix seconds nguyên, hữu hạn, trong khoảng 2000-01-01 tới 2100-01-01.
- Domain lưu Unix milliseconds.
- Timestamp thiếu/không hợp lệ không chặn record hợp lệ và tạo warning tổng hợp.
- Khi duplicate có nhiều timestamp hợp lệ, chọn thời điểm sớm nhất (`connectedAt` biểu diễn lúc quan hệ bắt đầu) và tạo warning nếu chúng khác nhau.
- Relationship timestamp không bao giờ được dùng làm `snapshotAt`.

## Manifest contract

- Mọi path đổi `\\` thành `/` trước khi match và bị reject nếu absolute, drive/UNC, có control character hoặc component `.`/`..`.
- Chỉ match basename `followers_N.json` và `following.json` nằm trực tiếp dưới một thư mục `followers_and_following`, không phân biệt case.
- Follower part bắt đầu từ 1, liên tục, không trùng và sort theo số.
- File media/message/nested archive/near-match không trở thành relationship input.
- Manual input dùng cùng detector/extractor nhưng luôn mang warning completeness.

## Diff contract

- Tất cả phép giao/hiệu dùng `Map`/`Set`, thời gian kỳ vọng O(n + m), không dùng nested `find/includes` trên relationship lists.
- Output luôn sort tường minh; supported sorts: handle A–Z/Z–A và connected date mới/cũ với missing timestamp ở cuối.
- Không có baseline thì không tạo historical result.
- Một cặp handle biến mất/xuất hiện chỉ được phân loại là `possible rename` khi có cùng `connectedAt` và timestamp đó xuất hiện đúng một lần trong toàn bộ tập cũ lẫn tập mới. Thiếu timestamp hoặc timestamp trùng giữ nguyên trong lost/new; đây là suy luận có điều kiện, không phải bằng chứng danh tính.
- `possible rename` bị loại khỏi lost/new (và stopped/started following) để không đếm hai lần, nhưng UI luôn phải hiển thị caveat về độ bất định.
- `netFollowerChange = newFollowers.length - lostFollowers.length` phải bằng current unique follower count trừ previous unique follower count.

## Fingerprint contract

- SHA-256 trên canonical UTF-8 length-prefixed encoding version `relationship-snapshot-fingerprint:v1`.
- Platform, namespace `followers`, namespace `following`, list count và từng normalized handle đều là field riêng.
- Mỗi set được deduplicate và code-point sort; source order, display case và timestamp không ảnh hưởng hash.
- Fingerprint chỉ để phát hiện duplicate, không phải MAC hay bằng chứng xác thực.

## Safe diagnostics

Warnings chỉ chứa stable code, localization key, count và optional relationship kind. Serialized errors chỉ chứa stable code/localization keys cùng context định lượng hoặc reason enum; không chứa handle, raw JSON, source path, stack hoặc exception message.
