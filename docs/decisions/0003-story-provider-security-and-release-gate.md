# ADR-0003: Story provider, media security và release gate

- Trạng thái: Accepted
- Ngày: 2026-09-15
- Phạm vi: M0

## Quyết định provider

Story/Highlights dùng provider adapter và mocked provider trong development/test. Production mặc định **disabled**; không có scraping fallback và không tự động failover sang vendor khác.

Shortlist đã đánh giá:

| Candidate | Khả năng tài liệu hóa | Kết quả M0 |
|---|---|---|
| InstaGapi | Active public Stories; Highlight trays và item media; API key server-side; không cần Instagram login/token | Preferred technical candidate, **chưa được phê duyệt production** |
| instagramapi.dev | Active Stories và Highlights endpoints; bearer key server-side | Secondary candidate, không chọn vì privacy policy công khai mô tả log request/query parameters gồm handle |

InstaGapi công bố log endpoint, timestamp và IP trong 90 ngày nhưng chưa nói rõ query parameter/username có nằm trong log hay không. Terms đặt trách nhiệm tuân thủ platform terms và pháp luật lên khách hàng; uptime 99.9% chỉ là mục tiêu, không phải SLA bảo đảm. Vì vậy production enablement bị chặn cho tới khi có câu trả lời bằng văn bản về:

- query/username logging, subprocessors, retention và deletion;
- quyền cho intended lookup/preview/individual-download use case;
- pricing, quota, rate-limit và billing-failure behavior;
- versioning/deprecation và support escalation;
- media CDN/redirect hostnames thực tế để tạo allowlist;
- legal/privacy/copyright copy được owner dự án phê duyệt.

## Disable và failover

- `STORY_FEATURE_ENABLED=false` là mặc định production cho tới khi release gate trên hoàn tất.
- Provider được chọn bằng server-only config; browser/domain code không biết vendor name.
- Misconfiguration, auth failure, quota hoặc provider outage trả typed unavailable error và fail closed.
- Không automatic vendor failover trong V1 vì có thể thay đổi privacy/cost/response semantics âm thầm.
- Kill switch Story độc lập; analyzer và marketing vẫn hoạt động.

## Media token

- Dùng AES-256-GCM với random 96-bit nonce mới cho mỗi token.
- Wire format URL-safe, versioned: `v1.<kid>.<base64url(nonce|ciphertext|tag)>`.
- AAD cố định gồm product namespace, token version và `kid`.
- Plaintext schema versioned chỉ chứa URL/ref provider đã validate, expected media kind, safe filename hint, issued-at và expiry; giới hạn kích thước trước decrypt/parse.
- TTL mặc định 300 giây. Route từ chối token hết hạn, malformed hoặc auth-tag sai trước mọi upstream fetch.
- Keys là 32-byte random secrets trong protected server environment. Encrypt bằng active `kid`; decrypt có thể chấp nhận previous key tối đa TTL + clock-skew 60 giây rồi loại bỏ.
- Sau decrypt vẫn revalidate HTTPS, exact hostname allowlist, DNS/IP public range, redirect count, content type và byte limits. Route không bao giờ nhận raw URL trực tiếp.

## Rate/cost baseline

Các số sau là conservative initial policy, phải load-test và khớp quota thật trước production:

- lookup profile/stories: 10 request / 10 phút / client-network signal;
- highlight item lookup: 20 request / 10 phút / signal;
- media preview/download: 30 request / 10 phút / signal;
- tối đa 4 provider requests đồng thời mỗi instance và 8 upstream media streams;
- request body 4 KiB, provider timeout 15 giây, token TTL 5 phút;
- không bulk lookup, polling, download-all hoặc automatic retry cho 404/private/empty;
- tối đa một bounded retry có jitter cho lỗi transient trước khi response body bắt đầu, nếu vendor contract xác nhận retry không tính phí ngoài dự kiến;
- trả `Retry-After` cho local 429 khi khả thi và không công khai số credit còn lại.

Rate-limit key phải là HMAC/one-way derivative ngắn hạn của platform-provided client/network signal; application không ghi raw IP/handle vào log. Production ưu tiên edge/platform limiter có TTL 10 phút và phải disclosure chính xác retention của host.

## Release gate

Production Story chỉ được bật khi provider due diligence hoàn tất, secret/rotation hoạt động, allowlist được chứng minh bằng controlled smoke test, error/schema contract tests pass, quota alert có owner và legal/privacy copy đã duyệt.

## Tài liệu đã xem ngày 2026-09-15

- https://www.instagapi.com/instagram-stories-api
- https://www.instagapi.com/instagram-highlights-api
- https://www.instagapi.com/terms
- https://www.instagapi.com/privacy
- https://api.instagramapi.dev/docs/profile/stories
- https://api.instagramapi.dev/privacy
