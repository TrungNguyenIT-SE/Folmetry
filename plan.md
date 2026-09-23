# Kế hoạch triển khai website Privacy-first Social Relationship Analyzer

> **Nguồn yêu cầu:** `website.md` phiên bản 1.1  
> **Phạm vi:** V1.2 — local relationship analyzer + public Story/Highlights + Folmetry account/RBAC
> **Nền tảng tương lai:** Facebook qua adapter, chưa triển khai trong V1  
> **Mục đích tài liệu:** Kế hoạch thực thi, kiểm thử, nghiệm thu và phát hành từ A–Z  
> **Trạng thái ban đầu:** Chưa triển khai  
> **Nguyên tắc ưu tiên:** Privacy transparency → Correctness → Security → Reliability → Accessibility → Performance → Visual polish

---

## Cập nhật phạm vi 1.1

Kế hoạch đã được mở rộng với milestone `M6S` cho Story/Highlights. Từ phiên bản này, “local-only/no-network” chỉ áp dụng tuyệt đối cho relationship analyzer. Story/Highlights là một flow networked riêng, chỉ nhận public handle, dùng reviewed provider qua server-only adapter và không được đọc/lưu dữ liệu relationship.

---

## 0. Cách sử dụng kế hoạch này

Tài liệu này là checklist triển khai đi kèm với `website.md`, không thay thế đặc tả sản phẩm.

- `website.md` quyết định **phải xây dựng cái gì** và các giới hạn không được vi phạm.
- `plan.md` quyết định **xây dựng theo thứ tự nào**, đầu ra của từng bước, cách kiểm thử và cách nghiệm thu.
- Nếu hai tài liệu có điểm khác nhau, `website.md` là nguồn chân lý cao hơn.
- Không đánh dấu một hạng mục hoàn thành chỉ vì đã viết mã; phải chạy đúng kiểm tra được ghi trong hạng mục đó.
- Mỗi milestone phải kết thúc bằng một commit/review point độc lập, có thể chạy được và không làm hỏng milestone trước.
- Không đưa dữ liệu export thật, username thật hoặc thông tin người dùng thật vào repository, fixture, log, screenshot hay tài liệu.
- Không để `TODO`, mock hoặc placeholder trong đường chạy acceptance-critical khi phát hành V1.

### Quy ước trạng thái

- `[ ]` Chưa thực hiện.
- `[x]` Đã thực hiện và đã xác minh.
- `[!]` Có vấn đề cần xử lý trước khi tiếp tục.
- `[~]` Đang thực hiện; chỉ dùng tạm thời trong quá trình thi công.

### Điều kiện để cập nhật một mục thành `[x]`

Một mục chỉ được coi là hoàn thành khi:

1. Mã nguồn hoặc tài liệu tương ứng đã có.
2. Test liên quan đã được thêm/cập nhật.
3. Test liên quan đã chạy thành công.
4. Không làm phát sinh lỗi typecheck/lint/build.
5. Hành vi thực tế khớp với `website.md`.
6. Không làm suy yếu privacy invariant.

---

# 1. Tóm tắt mục tiêu và định nghĩa thành công

## 1.1 Mục tiêu sản phẩm

Xây dựng website cho phép người dùng nhập file dữ liệu Instagram chính thức và phân tích quan hệ followers/following hoàn toàn trong trình duyệt mà không cần:

- đăng nhập Instagram;
- cung cấp password, cookie, token hoặc mã 2FA;
- gửi ZIP/JSON/username lên server;
- dùng API không chính thức hoặc scraping.

Đồng thời bổ sung một utility tách biệt để tra cứu, xem và tải từng Story/Highlight đang công khai bằng username/profile URL. Utility này được phép dùng minimal backend và reviewed external provider, nhưng phải công khai rõ ranh giới mạng và không được chạm vào dữ liệu relationship.

## 1.2 Luồng giá trị chính

```text
Official Instagram JSON export (.zip)
             │
             ▼
Browser File API
             │
             ▼
Dedicated module Web Worker
  ├─ validate file/archive
  ├─ inspect ZIP metadata
  ├─ select relationship JSON only
  ├─ enforce security limits
  ├─ parse tolerant Instagram shapes
  ├─ normalize/deduplicate
  └─ compute canonical fingerprint
             │
             ▼
Normalized snapshot
  ├─ current relationship analysis
  ├─ historical diff
  └─ warnings/diagnostics
             │
             ▼
Dexie / IndexedDB on the same browser profile
             │
             ▼
Dashboard / history / local CSV export
```

Luồng Story/Highlights riêng biệt:

```text
Public Instagram username/profile URL
             │
             ▼
Same-origin server route
  ├─ normalize/validate
  ├─ rate/cost/timeout controls
  ├─ server-only provider adapter
  └─ untrusted response validation
             │
             ▼
Ephemeral browser gallery
             │
             ▼
Authenticated-encrypted short-lived media preview/download route
```

## 1.3 Kết quả V1 bắt buộc

Người dùng phải làm được tất cả các việc sau:

- Tạo/chọn nhiều hồ sơ Instagram cục bộ.
- Import ZIP JSON chính thức của Instagram.
- Import bộ JSON riêng lẻ trong recovery mode.
- Xem Followers, Following, Mutuals, Not following you back và You do not follow back.
- Import snapshot thứ hai và xem Lost followers, New followers, Net follower change.
- Chọn thủ công hai snapshot cùng account để so sánh.
- Tìm kiếm, lọc/sắp xếp và xuất CSV.
- Reload trang mà lịch sử vẫn còn.
- Xóa một snapshot, một account hoặc toàn bộ dữ liệu cục bộ.
- Dùng sản phẩm bằng keyboard, mobile, light/dark/system theme, English/Vietnamese.
- Nhập một username/profile URL public và xem active Stories hiện có.
- Xem public Highlight collections/items khi provider cung cấp được.
- Preview và tải từng image/video bằng same-origin media route an toàn.
- Nhìn thấy disclosure trước khi lookup rằng handle sẽ được gửi tới server/provider.

## 1.4 Privacy invariant — điều kiện bất biến

Trong quá trình import và phân tích, đường dữ liệu duy nhất được phép là:

```text
File → browser memory/worker → IndexedDB → UI/local CSV
```

Không được tồn tại đường dữ liệu:

```text
File/relationship data → fetch/XHR/beacon/form/API route → server/third party
```

Bất kỳ thay đổi nào phá vỡ invariant này là regression kiến trúc và chặn phát hành.

Story/Highlights có invariant riêng:

```text
validated public handle
  → same-origin Story gateway
  → reviewed provider
  → validated public media metadata/content
  → ephemeral UI / user-initiated individual download
```

Không được đưa ZIP, JSON relationship, local account label, snapshot hoặc IndexedDB content vào flow này. Không được mô tả Story lookup là local-only.

## 1.5 Ngoài phạm vi V1

Không lên kế hoạch triển khai các nội dung sau trong V1:

- Facebook parser hoặc UI tuyên bố Facebook đã được hỗ trợ.
- Instagram/Facebook OAuth hoặc login.
- Backend/API route xử lý relationship file hoặc cloud database chứa snapshot quan hệ.
- Đồng bộ dữ liệu quan hệ đa thiết bị.
- Email ngoài xác minh/khôi phục tài khoản, billing, payment, push notification.
- Scraping, private API, browser extension.
- Follow/unfollow/friend/unfriend tự động.
- HTML export, RAR, 7z, TAR hoặc nested archive extraction.
- AI suy đoán quan hệ xã hội.
- Profile viewer detection.
- Fetch ảnh đại diện hoặc resolve username từ Instagram.
- Analytics/tracking/session replay trong V1.
- Direct Instagram scraping/private endpoint trong application code.
- Private/Close Friends/deleted/expired Story access.
- Background polling, bulk monitoring hoặc permanent Story archive.
- Bulk username lookup hoặc “download all” ZIP.
- Generic media proxy nhận arbitrary URL.
- PWA/service worker nếu chưa có thay đổi đặc tả.

---

# 2. Quyết định kiến trúc và quy tắc triển khai

## 2.1 Kiến trúc tổng thể

- Next.js App Router dùng cho routing, metadata và static marketing pages.
- Analyzer chỉ dùng Client Component tại nơi cần browser API.
- Không đặt `"use client"` ở root layout hoặc toàn bộ app tree.
- Parser, normalization, diff và persistence tách khỏi presentation components.
- Instagram-specific format chỉ tồn tại sau adapter boundary.
- Web Worker là chủ sở hữu vòng đời parsing của một import job.
- Dexie repository là ranh giới duy nhất cho persistent domain state.
- React reducer/state machine quản lý import lifecycle.
- Không thêm Redux/Zustand nếu chưa chứng minh nhu cầu.
- Hybrid Next.js deployment: static-generated public content plus minimal Story/Highlights server routes; relationship analysis itself remains browser-only.
- Relationship analyzer không có server dependency; Story/Highlights dùng narrowly scoped Next.js route handlers.
- Marketing/help pages vẫn static-generated, nhưng toàn dự án không còn dùng full `output: "export"`.
- Provider code/credentials chỉ tồn tại trong server-only modules.
- Story results/searches/media không persist trong app database mặc định.

## 2.2 Baseline công nghệ

Trước khi cài dependency phải xác minh compatibility và security advisory của:

- Node.js 24 LTS.
- Next.js 16.3.x bản patched phù hợp.
- React 19.3 stable và peer compatibility với Next.js.
- TypeScript 6 strict mode.
- Tailwind CSS 4.3.
- pnpm stable.
- `@zip.js/zip.js` stable tương thích browser mục tiêu.
- Dexie stable.
- Zod stable major phù hợp.
- Vitest 5.x.
- Testing Library.
- Playwright 1.63+.
- `axe-core` / `@axe-core/playwright`.
- `lucide-react`.
- Radix/shadcn chỉ cho primitive thực sự cần thiết.
- Next.js server route runtime phù hợp streaming/timeout behavior.
- Một reviewed Story data provider với API key server-side.
- Web Crypto/Node crypto cho authenticated-encrypted short-lived media references.
- Deployment edge/platform rate limiting cho Story endpoints.

Quy tắc dependency:

- Không dùng `latest` trong manifest đã commit.
- Commit `pnpm-lock.yaml`.
- Không thêm dependency chỉ để thay vài dòng dùng browser/platform API.
- Không downgrade framework xuống release không còn an toàn.
- Ghi nhận lý do cho dependency mới có ảnh hưởng runtime.
- Chạy production dependency audit trong CI và trước release.
- Không expose provider key qua `NEXT_PUBLIC_*` hoặc client bundle.
- Không hard-code provider response shape ngoài adapter.

## 2.3 Các quyết định triển khai cần cố định bằng test

### Canonical handle

- Trim Unicode/ASCII surrounding whitespace.
- Bỏ đúng một ký tự `@` ở đầu nếu có.
- Dùng lowercase làm comparison key.
- Giữ display form riêng.
- Reject chuỗi rỗng sau chuẩn hóa.
- Áp dụng giới hạn độ dài bảo thủ tại một module policy chung.
- Không fuzzy matching, không tự sửa username.

### Duplicate handle

- Deduplicate theo `normalizedHandle` trong từng relation set.
- Kết quả không phụ thuộc thứ tự record nguồn.
- Nếu chỉ một record có timestamp hợp lệ, dùng timestamp đó.
- Nếu nhiều timestamp hợp lệ bất đồng, chọn một quy tắc xác định và ghi rõ trong code/test; đề xuất ban đầu là timestamp hợp lệ sớm nhất vì `connectedAt` biểu diễn thời điểm bắt đầu quan hệ, đồng thời phát warning khi chênh lệch có ý nghĩa.
- Quyết định cuối cùng phải được ghi vào decision log trước khi hoàn thành parser.

### File matching

- Chuẩn hóa `\` thành `/` trước khi match.
- Kiểm tra unsafe path trước khi dùng entry.
- Match path case-insensitively để chịu được biến thể case hợp lý.
- Chỉ nhận basename/pattern thuộc thư mục `followers_and_following`; không nhận mọi file có chữ `followers` ở bất kỳ nơi nào.
- Sort `followers_N.json` theo N dạng số, không sort từ điển.
- Phát hiện part number trùng hoặc có khoảng trống và đưa ra lỗi/cảnh báo phù hợp.

### Manual JSON recovery mode

- ZIP là luồng được khuyến nghị và đáng tin cậy nhất.
- Thiếu `following.json` hoặc không có follower file là blocking error.
- Nếu có nhiều numbered parts, yêu cầu part sequence đầy đủ.
- Nếu chỉ có `followers_1.json`, không thể chứng minh chắc chắn không còn part khác; hiển thị cảnh báo mạnh trước khi lưu.
- Không âm thầm coi một file manual là export đầy đủ.

### Snapshot time

- Không dùng relationship timestamp làm `snapshotAt`.
- Archive metadata chỉ được ưu tiên nếu adapter chứng minh được độ tin cậy.
- `File.lastModified` chỉ là gợi ý có thể sửa.
- Nếu không có nguồn tốt hơn, dùng thời gian local hiện tại làm gợi ý.
- Người dùng phải review/confirm trước khi save.
- Automatic baseline chỉ dùng snapshot có `snapshotAt` nhỏ hơn snapshot hiện tại.
- Cần xử lý rõ hai snapshot có cùng `snapshotAt`; đề xuất cảnh báo và yêu cầu người dùng điều chỉnh thời gian thay vì âm thầm chọn baseline không xác định.

### Fingerprint

- SHA-256 từ canonical normalized content.
- Hai input cùng semantic sets nhưng khác thứ tự phải có fingerprint giống nhau.
- Followers và following phải có namespace/phân cách không gây nhập nhằng.
- Dùng canonical JSON hoặc length-prefixed encoding, không nối chuỗi bằng delimiter dễ va chạm.
- Duplicate lookup theo cùng `accountId`; snapshot giống nhau ở account khác không phải duplicate của account hiện tại.
- Fingerprint chỉ dùng phát hiện trùng, không dùng như chứng cứ bảo mật.

### Locale và theme

- English là mặc định ban đầu.
- Vietnamese phải là lựa chọn hoạt động thực tế, không chỉ có dictionary chưa dùng.
- Locale và theme là setting nhỏ lưu cục bộ.
- Number/date dùng `Intl.NumberFormat` và `Intl.DateTimeFormat`.
- Theme hỗ trợ `system`, `light`, `dark` bằng semantic CSS tokens.

### Story provider boundary

- Browser chỉ gọi same-origin Story/media routes.
- Server chuẩn hóa input thành một public handle; không chuyển tiếp arbitrary URL.
- Provider API key là server-only secret.
- Provider response bắt đầu là `unknown` và phải qua Zod/schema validation.
- Browser-facing model không chứa raw provider response hoặc arbitrary upstream URL.
- Preview/download dùng URL-safe authenticated-encrypted opaque token hết hạn ngắn.
- Media delivery revalidate HTTPS host, redirects, destination IP, content type và size.
- Không direct scraping/private API fallback khi provider lỗi.
- Không persist Story searches/results/media trong app database mặc định.
- Provider-side logging/retention phải được review và disclosure đúng sự thật.

### Story product limits

- Chỉ public accounts.
- Chỉ active Stories đang tồn tại và saved Highlights provider có thể resolve.
- Không private, Close Friends, deleted hoặc expired recovery.
- Không anonymous-viewing guarantee.
- Không polling, alerts, bulk lookup, mass archive hoặc download-all ZIP ở V1.
- Mỗi download cần reminder về ownership/permission/copyright.

---

# 3. Sơ đồ milestone và dependency

| Milestone | Nội dung | Phụ thuộc | Đầu ra chính |
|---|---|---|---|
| M0 | Preflight và quyết định dự án | Không | Version matrix, decision log, môi trường sẵn sàng |
| M1 | Foundation | M0 | Next app, strict TS, styling, test/CI/build chạy được |
| M2 | Domain và parser core | M1 | Types, normalization, diff, adapter, fixtures, unit tests |
| M3 | Worker import pipeline | M2 | Secure ZIP processing, progress, cancel, fingerprint |
| M4 | Local persistence | M2 | Dexie schema/repositories, history, deletion, duplicate detection |
| M5 | App shell, i18n, theme | M1 | Layout, locale/theme, accessible primitives |
| M6 | Analyzer UX | M3 + M4 + M5 | Account/import/review/results/history/CSV |
| M6S | Public Story/Highlights subsystem | M0 + M1 + M5 | Provider adapter, secure routes, gallery, individual download |
| M7 | Marketing, legal, SEO | M5 | Public routes, copy, metadata, sitemap/robots |
| M8A | Website accounts, email và RBAC | M7 | Better Auth, PostgreSQL, verify/reset email, user/admin, protected tools |
| M8SYNC | Đồng bộ đa thiết bị và phân vùng platform | M6 + M8A | PostgreSQL snapshots theo owner, Instagram/Facebook hubs và isolation |
| M8UX | Folmetry Signature Experience | M6 + M6S + M7 + M8A | Big visual update toàn site, design system riêng, motion có chủ đích, visual regression |
| M8UX2 | Kinetic Signal Atlas | M8UX + M8SYNC | Đại nâng cấp thị giác/motion V3, chuyển cảnh có ngữ nghĩa, trải nghiệm riêng cho marketing và workspace |
| M8 | Security/privacy hardening | M3 + M6 + M6S + M7 | CSP, headers, network-boundary assertions, security review |
| M9 | Performance/accessibility hardening | M6 + M6S + M7 + M8UX | Mobile, WCAG, large-data/media behavior, Lighthouse |
| M10 | CI/CD và release | M8 + M9 | Full gates, deploy, post-deploy verification |

Có thể triển khai M4 và M5 song song sau khi contract domain của M2 ổn định, nhưng không nối UI thật vào repository/worker trước khi interface và tests cốt lõi đã chốt.

M6S có thể phát triển song song với M2–M4 sau M1, nhưng production enablement bị chặn cho đến khi provider due diligence, terms/privacy review, host allowlist, quota/rate limits và secret configuration hoàn tất.

---

# 4. M0 — Preflight, kiểm tra môi trường và decision log

**Trạng thái:** Hoàn thành ngày 2026-09-15. Các thông tin sản phẩm tại 4.3 và media-host allowlist cần live provider smoke là release prerequisites, không chặn M1/mocked Story development.

## 4.1 Kiểm kê repository

- [x] Xác nhận các file hiện có và trạng thái Git.
- [x] Kiểm tra có `AGENTS.md` hoặc quy tắc repository bổ sung hay không.
- [x] Giữ nguyên `website.md` và `plan.md` làm tài liệu gốc.
- [x] Nếu chưa là Git repository, khởi tạo Git theo yêu cầu dự án.
- [x] Thiết lập `.gitignore` phù hợp Node/Next/Playwright.
- [x] Tuyệt đối không ignore nhầm fixtures synthetic cần commit.

## 4.2 Kiểm tra toolchain

- [x] Kiểm tra Node đang dùng đúng major LTS.
- [x] Bật Corepack hoặc xác nhận pnpm version.
- [x] Xác minh package versions/peer dependencies từ nguồn chính thức.
- [x] Xác minh Next hybrid deployment: static generation cho public pages, worker bundling cho analyzer và server runtime cho Story routes.
- [x] Xác minh `@zip.js/zip.js` hoạt động trong module worker trên browser targets.
- [x] Xác minh Dexie test strategy bằng fake IndexedDB hoặc browser tests.
- [x] Xác minh Playwright browsers và CI image.
- [x] Ghi exact versions đã chọn vào decision log.
- [x] Lập shortlist Story providers có documented Stories + Highlights endpoints.
- [x] Review provider terms, acceptable use, privacy, query logging, retention, deletion contact, pricing, rate limit, SLA và versioning.
- [x] Xác minh provider không yêu cầu Instagram credential/session cookie từ dự án hoặc end user.
- [x] Xác minh candidate công bố public-only behavior.
- [ ] Chốt media CDN/redirect hostnames bằng controlled live-provider smoke trước production enablement (release prerequisite, không chặn M0/M1).
- [x] Chọn provider production hoặc quyết định giữ Story route disabled; không dùng scraping fallback.

## 4.3 Các thông tin sản phẩm cần chốt trước release

Các mục dưới đây không chặn domain/parser development nhưng phải được chốt trước M7/M10:

- [ ] Tên sản phẩm chính thức.
- [ ] Production domain/canonical base URL.
- [ ] Tên pháp nhân/chủ thể hiển thị trong Terms nếu cần.
- [ ] Security/reporting contact.
- [ ] Nội dung Terms/Privacy được review.
- [ ] Default locale và cách chọn locale.
- [ ] Chính sách hiển thị app version/parser version.
- [ ] Story provider được phê duyệt và ngân sách/quota production.
- [ ] Story lookup privacy disclosure, copyright notice và provider subprocess disclosure.

## 4.4 Decision log ban đầu

Tạo `docs/decisions/` hoặc một mục decision log trong repository cho những quyết định có ảnh hưởng lâu dài:

- [x] Version matrix.
- [x] Hybrid static-generation/server-route deployment strategy.
- [x] Canonical fingerprint encoding.
- [x] Duplicate timestamp resolution.
- [x] Manual multipart completeness policy.
- [x] Same-`snapshotAt` behavior.
- [x] Pagination/windowing threshold.
- [x] CSP strategy cho static output.
- [x] Browser support matrix thực tế.
- [x] Story provider decision record và disable/failover policy.
- [x] Authenticated-encrypted media-token format/TTL/key rotation.
- [x] Story edge rate-limit policy.

## 4.5 Exit criteria M0

- [x] Toolchain chạy được tại local.
- [x] Không còn xung đột peer dependency chưa giải quyết.
- [x] Các quyết định ảnh hưởng core parser đã có hướng rõ ràng.
- [x] Relationship analyzer không cần secret/Meta credential; Story mocked development chưa cần production provider key.
- [x] Story provider candidate được đánh giá; production key chưa cần cho mocked development nhưng là release prerequisite.

---

# 5. M1 — Foundation và project scaffolding

**Trạng thái:** Hoàn thành ngày 2026-09-15. `pnpm check`, frozen install, 36 E2E tests đa trình duyệt và production audit đều pass.

## 5.1 Khởi tạo Next.js project

- [x] Khởi tạo Next.js App Router trực tiếp trong repository mà không ghi đè tài liệu hiện có.
- [x] Dùng `src/` layout.
- [x] Cấu hình TypeScript.
- [x] Cấu hình Tailwind CSS.
- [x] Chưa thêm database/server/auth template.
- [x] Chưa thêm analytics hoặc remote font.
- [x] Thiết lập package scripts chuẩn.

Scripts tối thiểu:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings=0",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "pnpm typecheck && pnpm lint && pnpm test && pnpm build"
  }
}
```

Dùng `start`/preview command tương thích hybrid Next.js deployment và Story route handlers.

## 5.2 TypeScript strictness

- [x] Bật `strict: true`.
- [x] Không cho implicit `any`.
- [x] Bật kiểm tra nhất quán phù hợp cho indexed access/override/case sensitivity nếu ecosystem cho phép.
- [x] Thiết lập path aliases rõ ràng, tránh alias quá rộng.
- [x] Không dùng `skipLibCheck` như cách che lỗi nội bộ nếu không có lý do tương thích được ghi nhận.
- [x] Thêm exhaustive `never` helper cho discriminated unions.

## 5.3 Cấu trúc thư mục nền tảng

Tạo cấu trúc theo feature, tránh `utils/` hỗn tạp:

```text
public/
  icons/
  og/
src/
  app/
  components/
    ui/
    layout/
    marketing/
    analyzer/
  features/
    analyzer/
      adapters/
      components/
      diff/
      export/
      hooks/
      model/
      persistence/
      services/
      workers/
  i18n/
  lib/
  types/
tests/
  e2e/
  fixtures/
    instagram/
  helpers/
scripts/
.github/workflows/
```

- [x] Mỗi thư mục chỉ được tạo khi có nội dung thực sự.
- [x] Domain logic nằm trong feature, không nằm trong page component.
- [x] Instagram JSON types không được import vào UI/persistence.

## 5.4 App Router skeleton

- [x] `src/app/layout.tsx` với semantic document shell.
- [x] `src/app/page.tsx` cho landing placeholder có cấu trúc hợp lệ.
- [x] `src/app/app/page.tsx` cho analyzer route shell.
- [x] `src/app/story-downloader/page.tsx` cho public Story/Highlights route shell.
- [x] `src/app/how-it-works/page.tsx`.
- [x] `src/app/privacy/page.tsx`.
- [x] `src/app/terms/page.tsx`.
- [x] `src/app/faq/page.tsx`.
- [x] `src/app/not-found.tsx`.
- [x] `src/app/error.tsx` ở client boundary thích hợp.
- [x] Không đặt dữ liệu cục bộ vào URL hoặc server-rendered metadata.
- [x] Chưa gọi provider thật ở route skeleton; server routes được triển khai/test tại M6S.

Các route skeleton chỉ cần đủ để build/test navigation; nội dung hoàn thiện ở M7.

## 5.5 Design tokens và global styles

- [x] Dùng CSS custom properties semantic: background, foreground, muted, border, card, accent, destructive, focus ring.
- [x] Khai báo token cho light/dark.
- [x] Hỗ trợ `color-scheme` đúng theme.
- [x] Dùng system/local fonts.
- [x] Thiết lập constrained content widths.
- [x] Thiết lập visible focus style.
- [x] Thiết lập reduced-motion base behavior.
- [x] Không dùng Instagram trade dress hoặc gradient mô phỏng thương hiệu.

## 5.6 Test infrastructure

- [x] Vitest config cho TypeScript/path aliases.
- [x] Testing Library và DOM matchers.
- [x] Test setup cleanup ổn định.
- [x] Playwright config cho dev/static preview phù hợp.
- [x] Desktop Chromium project.
- [x] Mobile viewport project.
- [x] Firefox/WebKit smoke projects nếu thời gian CI cho phép; WebKit là bắt buộc trước release vì Safari nằm trong browser target.
- [x] Axe helper.
- [x] Fixture path helper không phụ thuộc cwd ngẫu nhiên.

## 5.7 Lint và format policy

- [x] ESLint flat config tương thích Next/TypeScript.
- [x] Zero warnings trong CI.
- [x] Cấm `any` trong production code.
- [x] Cảnh báo/cấm `dangerouslySetInnerHTML` trong vùng xử lý dữ liệu import nếu rule khả thi.
- [x] Cấm unused disable directives.
- [x] Không dùng deprecated `next lint`.
- [x] Chỉ thêm formatter nếu không tạo xung đột với ESLint và có ích thực tế.

## 5.8 CI nền tảng

- [x] Workflow chạy trên pull request và main branch.
- [x] Dùng Node/pnpm versions đã pin.
- [x] `pnpm install --frozen-lockfile`.
- [x] Cache pnpm store an toàn.
- [x] Chạy typecheck.
- [x] Chạy lint.
- [x] Chạy unit/component tests.
- [x] Chạy production build.
- [x] Chuẩn bị E2E job.
- [x] Chạy production dependency audit.
- [x] Không đưa secret Meta/Instagram vào CI.
- [x] Story integration tests dùng mocked provider; production provider secret chỉ dùng trong protected deployment environment/live smoke riêng.

## 5.9 Exit criteria M1

- [x] `pnpm typecheck` pass.
- [x] `pnpm lint` pass với zero warnings.
- [x] `pnpm test` pass.
- [x] `pnpm build` pass.
- [x] Tất cả route skeleton mở được.
- [x] Không có backend/API route ngoài phạm vi.
- [x] Story route shell không làm suy yếu analyzer privacy boundary.
- [x] Không có third-party network asset không cần thiết.

---

# 6. M2 — Domain model, normalization, diff và Instagram adapter core

**Trạng thái:** Hoàn thành ngày 2026-09-16. 90 unit/integration tests, strict typecheck, zero-warning lint và production build đều pass.

Mục tiêu M2 là hoàn thành logic thuần và tests trước khi xây UI phức tạp.

## 6.1 Domain types

Tạo các kiểu rõ ràng cho:

- [x] `SocialPlatform`.
- [x] `RelationshipKind`.
- [x] `RelationshipRecord`.
- [x] `NormalizedSnapshotPayload`.
- [x] `Snapshot`/`LocalSnapshot`.
- [x] `LocalAccount`.
- [x] `LocalSetting`.
- [x] `ImportWarningCode` và `ImportWarning`.
- [x] `ImportErrorCode` và serialized error.
- [x] `ArchiveManifest`/entry metadata an toàn.
- [x] `AdapterMatch`, `AdapterInput`, `ParseContext`.
- [x] `SocialExportAdapter`.
- [x] Current analysis result.
- [x] Historical diff result.

Quy tắc:

- Không dùng `any`.
- Unknown archive/JSON data bắt đầu là `unknown`, sau đó narrow/validate.
- Không dùng `as unknown as X` để bỏ qua validation.
- Không để Instagram wrapper shape lọt qua adapter output.

## 6.2 Typed warning taxonomy

Tối thiểu hỗ trợ:

- [x] `MULTIPART_FOLLOWERS_MERGED`.
- [x] `DUPLICATE_HANDLES_REMOVED`.
- [x] `INVALID_ENTRY_SKIPPED`.
- [x] `MISSING_OPTIONAL_TIMESTAMP`.
- [x] `UNKNOWN_NON_CRITICAL_FILE_IGNORED`.
- [x] `LARGE_EXPORT_PERFORMANCE_WARNING`.
- [x] Warning bổ sung cho manual completeness nếu cần, với code ổn định.

Warnings chứa dữ liệu thống kê an toàn, không chứa username/raw JSON.

## 6.3 Typed error taxonomy

Tối thiểu hỗ trợ đầy đủ:

- [x] `UNSUPPORTED_FILE_TYPE`.
- [x] `ARCHIVE_TOO_LARGE`.
- [x] `ARCHIVE_CORRUPTED`.
- [x] `ARCHIVE_ENCRYPTED`.
- [x] `ARCHIVE_TOO_MANY_ENTRIES`.
- [x] `ARCHIVE_UNSAFE_PATH`.
- [x] `ARCHIVE_SUSPICIOUS_COMPRESSION`.
- [x] `RELEVANT_DATA_TOO_LARGE`.
- [x] `FOLLOWERS_FILE_NOT_FOUND`.
- [x] `FOLLOWING_FILE_NOT_FOUND`.
- [x] `UNSUPPORTED_HTML_EXPORT`.
- [x] `INVALID_JSON`.
- [x] `UNSUPPORTED_INSTAGRAM_SCHEMA`.
- [x] `NO_VALID_RELATIONSHIPS`.
- [x] `RELATIONSHIP_LIMIT_EXCEEDED`.
- [x] `IMPORT_CANCELLED`.
- [x] `INDEXEDDB_UNAVAILABLE`.
- [x] `INDEXEDDB_QUOTA_EXCEEDED`.
- [x] `SNAPSHOT_DUPLICATE`.
- [x] `UNKNOWN_IMPORT_ERROR`.

Mỗi lỗi có:

- stable code;
- safe technical context tùy chọn;
- localized user-facing title/message/action;
- không có stack trace trong UI;
- không có relationship data trong log.

## 6.4 Security policy constants

Tạo một module policy duy nhất:

```ts
MAX_ARCHIVE_BYTES = 100 * 1024 * 1024
MAX_ENTRIES = 10_000
MAX_RELEVANT_JSON_BYTES = 150 * 1024 * 1024
MAX_TOTAL_RELEVANT_BYTES = 250 * 1024 * 1024
MAX_COMPRESSION_RATIO = 200
MAX_RELATIONSHIPS = 2_000_000
```

- [x] Không lặp magic numbers ở parser/UI.
- [x] Có test tại đúng boundary: bằng, dưới và trên giới hạn.
- [x] Có policy cho maximum handle length và timestamp range.

## 6.5 Handle normalization

Triển khai pure functions:

- [x] Trim surrounding whitespace.
- [x] Bỏ một leading `@`.
- [x] Lowercase comparison key.
- [x] Giữ display form đã trim/bỏ `@`.
- [x] Reject empty.
- [x] Reject quá dài.
- [x] Không tin URL/href nguồn.
- [x] Kết quả deterministic.

Unit tests:

- [x] ASCII whitespace.
- [x] Unicode whitespace.
- [x] Leading `@`.
- [x] Nhiều `@` không bị xóa quá mức.
- [x] Upper/lowercase tương đương.
- [x] Empty/whitespace only.
- [x] Boundary length.
- [x] Malicious HTML/script-like string chỉ là text/invalid theo policy, không được diễn giải như HTML.

## 6.6 Deduplication

- [x] Deduplicate theo normalized handle.
- [x] Không double-count.
- [x] Chọn display form deterministic.
- [x] Chọn timestamp deterministic.
- [x] Đếm số duplicate bị loại để tạo warning.
- [x] Không đưa handles cụ thể vào warning/log.

Unit tests:

- [x] Exact duplicate.
- [x] Duplicate khác case.
- [x] Duplicate khác leading `@`/whitespace.
- [x] Một timestamp valid, một missing.
- [x] Hai timestamp valid khác nhau.
- [x] Input order khác nhau vẫn cho output canonical giống nhau.

## 6.7 Current relationship analysis

Triển khai bằng `Set`/`Map`:

- [x] Mutuals = F ∩ G.
- [x] Not following back = G - F.
- [x] You do not follow back = F - G.
- [x] Explicit deterministic sort.
- [x] Preserve safe display metadata.

Unit/property tests:

- [x] Hai tập rỗng.
- [x] Một tập rỗng.
- [x] Hai tập giống nhau.
- [x] Không giao nhau.
- [x] Fixture A chuẩn.
- [x] Duplicate input không ảnh hưởng count.
- [x] `mutuals ⊆ followers`.
- [x] `mutuals ⊆ following`.
- [x] `notFollowingBack ∩ followers = ∅`.
- [x] Input permutation không đổi output.

## 6.8 Historical diff

- [x] Lost followers = previous F - current F.
- [x] New followers = current F - previous F.
- [x] Stopped following = previous G - current G.
- [x] Started following = current G - previous G.
- [x] Net follower change = new count - lost count.
- [x] Cross-check net với follower count delta.
- [x] Nếu cross-check không nhất quán, phát diagnostic warning.
- [x] Không tạo historical result khi không có baseline.
- [x] Ghép cặp handle cũ/mới thành `possible rename` khi và chỉ khi `connectedAt` giống nhau và duy nhất trong toàn bộ hai snapshot.
- [x] Loại `possible rename` khỏi lost/new và stopped/started để không đếm hai lần; UI luôn ghi rõ đây là suy luận, không phải bằng chứng danh tính.
- [x] Timestamp thiếu hoặc trùng giữ nguyên kết quả lost/new bảo thủ, không fuzzy-match hoặc tự nhận diện người dùng.

Unit/property tests:

- [x] Fixture A → B.
- [x] Empty sets.
- [x] Complete replacement.
- [x] No change.
- [x] `lost ∩ currentFollowers = ∅`.
- [x] `new ∩ previousFollowers = ∅`.
- [x] Same semantic inputs, different order.
- [x] Deterministic A-Z/Z-A/date sort.
- [x] Unique timestamp rename, missing timestamp và ambiguous duplicate timestamp.

## 6.9 Archive path normalization và manifest detection

- [x] Chuẩn hóa slash.
- [x] Reject `../` và `..\` components.
- [x] Reject absolute POSIX path.
- [x] Reject Windows drive/UNC-like path.
- [x] Reject NUL/invalid name.
- [x] Không resolve/extract path ra filesystem.
- [x] Detect `followers_N.json` linh hoạt theo allowed directory.
- [x] Detect `following.json`.
- [x] Detect HTML-only export.
- [x] Sort follower parts numerically.
- [x] Ignore nested archive.
- [x] Không match file media/message có tên gần giống.

## 6.10 Instagram JSON extractors

Thiết kế extractor nhỏ, schema-tolerant:

- [x] Nhận common `string_list_data` record.
- [x] Nhận following wrapper như `relationships_following`.
- [x] Cho phép `href` thiếu.
- [x] Cho phép timestamp thiếu.
- [x] Yêu cầu `value`/handle hợp lệ.
- [x] Skip malformed entry khi vẫn còn valid data và tạo warning.
- [x] Blocking error khi top-level shape không được nhận diện.
- [x] Blocking error khi không có valid relationships.
- [x] Không dùng brittle schema bắt buộc toàn bộ file giống một shape duy nhất.
- [x] Không render hoặc điều hướng theo export-provided `href`.

## 6.11 Timestamp validation

- [x] Chỉ nhận finite numeric timestamp.
- [x] Phân biệt seconds từ export và milliseconds trong domain.
- [x] Validate khoảng thời gian hợp lý trước khi nhân/chuyển đổi.
- [x] Không cho overflow/invalid date.
- [x] Missing timestamp không chặn import.
- [x] Relationship timestamp không ảnh hưởng snapshot date.

## 6.12 Synthetic fixtures

Tạo hoàn toàn synthetic/anonymized:

- [x] Single follower file.
- [x] Multipart followers.
- [x] Following wrapper.
- [x] Missing timestamps.
- [x] Duplicate handles.
- [x] Mixed malformed/valid entries.
- [x] Missing followers.
- [x] Missing following.
- [x] Unsupported schema.
- [x] HTML-only archive.
- [x] Corrupted ZIP.
- [x] Unsafe paths.
- [x] Suspicious compression metadata.
- [x] Entry-count/size boundaries.
- [x] Fixture A và B theo semantic spec.
- [x] Fixture generator script để tránh commit binary không giải thích được.

Mỗi fixture cần README/manifest mô tả dữ liệu kỳ vọng và tuyệt đối không chứa export thật.

## 6.13 Exit criteria M2

- [x] Domain public contracts ổn định và documented.
- [x] Parser core không import React/Next/Dexie/network client.
- [x] Normalization tests pass.
- [x] Diff/property tests pass.
- [x] Detection/extractor tests pass.
- [x] Fixtures đều synthetic.
- [x] Complexity review xác nhận không có O(n²) trong relationship diff.
- [x] Typecheck/lint/full unit suite/build pass.

---

# 7. M3 — Secure Web Worker import pipeline

## 7.1 Typed worker protocol

Tạo discriminated unions:

- [x] `PARSE_ARCHIVE` request.
- [x] `PARSE_FILES` request.
- [x] Mỗi request có `jobId`.
- [x] `PROGRESS` response.
- [x] `SUCCESS` response.
- [x] `ERROR` response.
- [x] Không post raw exception qua boundary.
- [x] Exhaustive switch ở cả worker và client.

Progress stages:

- [x] `validating`.
- [x] `scanning_archive`.
- [x] `reading_relationship_files`.
- [x] `parsing_json`.
- [x] `normalizing`.
- [x] `fingerprinting`.
- [x] `complete`.

Progress phải phản ánh stage thật; không dùng fake timer.

## 7.2 Worker lifecycle service

- [x] Tạo worker bằng `new Worker(new URL(...), { type: "module" })`.
- [x] Chỉ có một active import job cho một analyzer instance.
- [x] Ignore response có `jobId` cũ.
- [x] Terminate worker khi cancel.
- [x] Recreate worker sạch cho job tiếp theo.
- [x] Dọn event listeners khi component unmount.
- [x] Reject/resolve pending promise đúng một lần.
- [x] Không để stale progress ghi đè state mới.

## 7.3 ZIP validation trước extraction

Thứ tự bắt buộc:

1. Kiểm tra extension/input mode.
2. Kiểm tra compressed file size.
3. Mở ZIP reader với error mapping an toàn.
4. Liệt kê entries/metadata.
5. Kiểm tra entry count.
6. Chuẩn hóa và kiểm tra toàn bộ entry paths.
7. Detect relevant entries và unsupported HTML.
8. Kiểm tra encrypted/password-protected state.
9. Kiểm tra compressed/uncompressed size.
10. Kiểm tra compression ratio.
11. Kiểm tra total relevant bytes.
12. Chỉ extract relevant JSON.
13. Parse/normalize từng phần với chiến lược giảm peak memory.
14. Đóng reader và giải phóng references trong `finally`.

- [x] MIME type chỉ là hint, không phải nguồn tin cậy.
- [x] Không extract toàn bộ archive.
- [x] Không recursively inspect nested archive.
- [x] Không tạo filesystem path từ entry name.

## 7.4 Resource limit behavior

- [x] Archive đúng 100 MiB được xử lý theo boundary policy.
- [x] Lớn hơn giới hạn trả `ARCHIVE_TOO_LARGE` trước extraction.
- [x] Entry count vượt ngưỡng trả lỗi.
- [x] Relevant entry vượt per-entry size trả lỗi.
- [x] Tổng relevant bytes vượt ngưỡng trả lỗi.
- [x] Ratio vượt ngưỡng trả lỗi trước decompression nếu metadata đủ.
- [x] Metadata thiếu/không hợp lý được xử lý bảo thủ.
- [x] Relationship count vượt ngưỡng dừng sớm.
- [x] Large legitimate export gần ngưỡng có performance warning.

## 7.5 Multipart merge

- [x] Merge mọi matched `followers_N.json`.
- [x] Numeric ordering.
- [x] Deduplicate xuyên các part.
- [x] Warning khi merge nhiều part.
- [x] Block/warn khi sequence có bằng chứng không đầy đủ.
- [x] Không chỉ đọc `followers_1.json`.

## 7.6 Manual JSON pipeline

- [x] File picker cho phép chọn nhiều JSON.
- [x] Reject non-JSON trong recovery mode.
- [x] Match basename/path an toàn.
- [x] Yêu cầu follower set và following file.
- [x] Kiểm tra part numbering.
- [x] Hiển thị warning về khả năng thiếu follower parts.
- [x] Dùng cùng extractor/normalizer với ZIP mode.
- [x] Không tạo hai code path cho cùng business logic.

## 7.7 Fingerprint trong worker

- [x] Sort unique normalized follower handles.
- [x] Sort unique normalized following handles.
- [x] Canonical encode platform + two named sets.
- [x] Dùng `crypto.subtle.digest("SHA-256", ...)`.
- [x] Encode hash ổn định.
- [x] Không giữ canonical plaintext buffer lâu hơn cần thiết.
- [x] Same semantic data/order-independent test.
- [x] Changed follower/following test.

## 7.8 Safe diagnostics

Khi schema không hỗ trợ, tạo copyable report chỉ gồm:

- [x] App version.
- [x] Parser version.
- [x] Browser family/version.
- [x] Archive file count.
- [x] Matched relevant filenames.
- [x] Recognized top-level key names.
- [x] Error code.

Không chứa:

- username/relationship values;
- raw JSON snippets;
- archive bytes;
- export-provided URLs;
- full stack traces.

## 7.9 Cancellation và cleanup tests

- [x] Cancel trước khi scan.
- [x] Cancel trong extraction.
- [x] Cancel trong parse/normalize.
- [x] UI trở về trạng thái có thể import lại.
- [x] Không nhận success từ job đã cancel.
- [x] ZIP reader được đóng khi có thể.
- [x] Object URLs/references được release.
- [x] Không persist partial snapshot.

## 7.10 Worker integration tests

- [x] Valid single ZIP.
- [x] Valid multipart ZIP.
- [x] Corrupt ZIP.
- [x] Encrypted ZIP.
- [x] HTML export.
- [x] Unsafe path.
- [x] Suspicious compression.
- [x] Missing required file.
- [x] Invalid JSON.
- [x] Unsupported schema.
- [x] Mixed invalid records.
- [x] Duplicate handles.
- [x] Manual valid files.
- [x] Manual incomplete parts.
- [x] Progress order hợp lệ.
- [x] Serialized errors an toàn.

## 7.11 Exit criteria M3

- [x] Large synthetic import không chạy parser trên main thread.
- [x] Progress và cancel vẫn responsive.
- [x] Chỉ relevant JSON được extract.
- [x] Worker không import HTTP/fetch client.
- [x] Raw ZIP/JSON không được persist/log.
- [x] Tất cả security limit tests pass.
- [x] Worker integration suite pass.
- [x] Typecheck/lint/test/build pass.

---

# 8. M4 — Dexie/IndexedDB persistence

## 8.1 Database schema v1

Database name:

```text
social-relationship-analyzer
```

Tables/indexes dự kiến:

```text
accounts:  id, platform, username, createdAt, updatedAt
snapshots: id, accountId, [accountId+snapshotAt], fingerprint, importedAt
settings:  key
```

- [x] Không index nested relationship arrays.
- [x] Không lưu ZIP Blob.
- [x] Không lưu raw JSON.
- [x] Lưu normalized relationship records, counts, warnings và metadata an toàn.
- [x] Schema version được khai báo rõ.

## 8.2 Account repository

- [x] Create account với UUID an toàn.
- [x] `label` bắt buộc, trim và validate length.
- [x] `username` tùy chọn, normalize/validate phù hợp.
- [x] List accounts stable ordering.
- [x] Update label/username.
- [x] Update `updatedAt`.
- [x] Delete account + snapshots trong transaction.
- [x] Không tự suy ra owner account từ relationship export.

## 8.3 Snapshot repository

- [x] Add snapshot.
- [x] Get snapshot by ID.
- [x] List snapshots by account, newest first.
- [x] Find same fingerprint trong cùng account.
- [x] Find nearest prior snapshot với `snapshotAt < current.snapshotAt`.
- [x] Delete one snapshot.
- [x] Delete all snapshots của account.
- [x] Không query/compare chéo account.
- [x] Không query/compare chéo platform.
- [x] Add snapshot và relevant metadata trong transaction phù hợp.

## 8.4 Duplicate behavior

- [x] Check duplicate sau review date và trước save.
- [x] Mặc định không save duplicate.
- [x] Hiển thị snapshot trùng hiện có.
- [x] User có thể cancel quay lại an toàn.
- [x] Không coi cùng fingerprint ở account khác là duplicate.
- [x] Repository bảo vệ race condition double-save trong cùng phiên ở mức hợp lý.

## 8.5 Settings repository

- [x] Locale.
- [x] Theme.
- [x] Cờ đã xem thông báo local retention nếu cần.
- [x] Không lưu relationship data trong generic setting.
- [x] Có default an toàn khi setting bị corrupt.

## 8.6 Storage failures

Map lỗi rõ ràng:

- [x] IndexedDB unavailable.
- [x] Quota exceeded.
- [x] Transaction aborted/failed.
- [x] Migration failed.
- [x] Unknown persistence error.

Behavior:

- [x] Giữ current analysis trong memory nếu có thể.
- [x] Hiển thị rõ history chưa được lưu.
- [x] Cho phép export CSV từ in-memory result.
- [x] Không giả vờ save thành công.
- [x] Không retry vô hạn.

## 8.7 Deletion semantics

- [x] Delete snapshot yêu cầu confirmation.
- [x] Delete account yêu cầu confirmation và mô tả cascade.
- [x] Delete all local data yêu cầu confirmation mạnh hơn.
- [x] Sau delete, UI không giữ stale result/history.
- [x] Delete all bao gồm accounts, snapshots và app settings phù hợp.
- [x] Xác minh dữ liệu thực sự biến mất sau reload.

## 8.8 Persistence tests

- [x] Add/list/update account.
- [x] Add/list snapshot.
- [x] Account isolation.
- [x] Fingerprint duplicate detection.
- [x] Nearest previous snapshot query.
- [x] Same timestamp behavior.
- [x] Delete snapshot.
- [x] Delete account cascade.
- [x] Delete all.
- [x] Quota/unavailable failure mapping.
- [x] Migration from empty/v1 database.
- [x] Reload persistence qua E2E browser context.

## 8.9 Exit criteria M4

- [x] Repository API không phụ thuộc React components.
- [x] Không có raw ZIP/JSON trong IndexedDB schema.
- [x] Account isolation tests pass.
- [x] Cascade/delete-all tests pass.
- [x] Duplicate/baseline queries deterministic.
- [x] Error fallback giữ in-memory analysis hoạt động.
- [x] Typecheck/lint/test/build pass.

---

# 9. M5 — App shell, localization, theme và accessible primitives

**Trạng thái:** Hoàn thành ngày 2026-09-16. `pnpm check`, 128 unit/component tests và 56 E2E tests đa trình duyệt đều pass.

## 9.1 Typed i18n architecture

- [x] `src/i18n/en.ts` là dictionary canonical.
- [x] `src/i18n/vi.ts` phải cùng exact key shape.
- [x] Typed accessor/hook không nhận arbitrary string key.
- [x] Không rải literal UI copy trong analyzer components.
- [x] Error/warning codes map sang localized copy ở presentation layer.
- [x] Không đưa React element tùy ý vào dictionary nếu làm mất type safety.

Nhóm strings:

- [x] Navigation/footer.
- [x] Marketing pages.
- [x] Account management.
- [x] Import instructions/stages.
- [x] Review/save/duplicate flow.
- [x] Result categories.
- [x] History/compare.
- [x] Errors/warnings/diagnostics.
- [x] Delete confirmations.
- [x] Privacy/accuracy caveats.
- [x] CSV labels/file naming nếu cần.
- [x] Story public-only/network/provider/copyright disclosures.
- [x] Story lookup/loading/empty/private/rate-limit/provider/download states.

## 9.2 Copy semantics

- [x] English không khẳng định intentional unfollow.
- [x] Vietnamese dùng “Người theo dõi đã mất” hoặc “Không còn trong danh sách người theo dõi”.
- [x] Chi tiết giải thích username change/deactivation/deletion/suspension/export differences.
- [x] Không dùng fear-based hoặc accusatory copy.
- [x] Không tuyên bố liên kết chính thức với Meta/Instagram.
- [x] Không tuyên bố “không thu thập gì” tuyệt đối.
- [x] Không mô tả Story lookup là local-only hoặc anonymous.
- [x] Nói rõ submitted public handle được gửi tới server/provider và có thể xuất hiện trong operational logs theo provider policy.

## 9.3 Locale behavior

- [x] Default English theo quyết định sản phẩm.
- [x] Language switcher keyboard accessible.
- [x] Persist preference locally.
- [x] Apply correct document `lang` ở khả năng phù hợp với App Router/static output.
- [x] Dùng `Intl` cho number/date.
- [x] Không hard-code thousands separator.
- [x] Test tiếng Việt có dấu và layout dài.

## 9.4 Theme behavior

- [x] System/light/dark.
- [x] Persist preference.
- [x] Theo dõi thay đổi OS khi chọn system.
- [x] Tránh flash theme gây khó chịu ở mức static architecture cho phép.
- [x] Không thêm remote theme service.
- [x] Contrast đạt WCAG AA.
- [x] Chart/badge không truyền thông tin chỉ bằng màu.

## 9.5 Accessible primitives

Chuẩn bị component nền tảng source-owned:

- [x] Button/link variants.
- [x] Input/search field.
- [x] Select/menu.
- [x] Tabs.
- [x] Dialog/alert dialog.
- [x] Toast/status region nếu thực sự cần.
- [x] Badge.
- [x] Card.
- [x] Progress/status display.
- [x] Empty state.
- [x] Skeleton chỉ khi không gây fake progress.

Yêu cầu:

- visible focus;
- keyboard operation;
- proper labels/descriptions;
- focus trap và return focus cho dialog;
- touch targets đủ lớn;
- reduced motion;
- không overbuild component library.

## 9.6 Responsive site shell

- [x] Header mobile/desktop.
- [x] Skip-to-content link.
- [x] Main landmark.
- [x] Footer.
- [x] Story/Highlights utility preview/CTA tách biệt rõ với private analyzer.
- [x] Constrained content containers.
- [x] Navigation active state không chỉ dựa vào màu.
- [x] Test 360, 390/430, 768, 1024, 1440px.

## 9.7 Exit criteria M5

- [x] English/Vietnamese switch hoạt động.
- [x] Theme system/light/dark hoạt động.
- [x] Base navigation dùng keyboard được.
- [x] Axe không có serious/critical issue trên shell routes.
- [x] Không có remote font/tracker.
- [x] Typecheck/lint/component tests/build pass.

---

# 10. M6 — Analyzer UX hoàn chỉnh

**Trạng thái:** Hoàn thành ngày 2026-09-16. `pnpm check`, 143 unit/component tests và 64 E2E tests đa trình duyệt đều pass.

## 10.1 Import lifecycle reducer/state machine

Các state bắt buộc:

```text
NO_ACCOUNT
READY_TO_IMPORT
VALIDATING
PARSING
REVIEW_IMPORT
SAVING
RESULTS
ERROR
```

- [x] State và event dùng discriminated unions.
- [x] Illegal transition bị chặn/test.
- [x] Cancel/error/reset có đường quay về rõ.
- [x] Không dùng nhiều boolean mâu thuẫn.
- [x] Account switch reset/rehydrate đúng state.
- [x] Stale worker event không thay đổi state mới.

## 10.2 First-use account flow

- [x] Giải thích không cần Instagram login.
- [x] Giải thích label/username chỉ lưu local.
- [x] Account label bắt buộc.
- [x] Username tùy chọn.
- [x] Create account.
- [x] Select existing account.
- [x] Edit account label.
- [x] Multiple accounts hiển thị rõ để tránh import nhầm.
- [x] Không tự động tạo account dựa trên follower data.

## 10.3 Empty/import state

- [x] Concise export instructions.
- [x] Drop zone.
- [x] Equivalent accessible file input button.
- [x] ZIP/JSON support text rõ ràng.
- [x] Privacy statement ngay cạnh input.
- [x] Link tới How it works/export guide.
- [x] Recovery JSON mode ít nổi bật hơn ZIP nhưng vẫn truy cập được.
- [x] Drag enter/leave/drop không phá keyboard flow.
- [x] File validation error liên kết đúng control.

## 10.4 Export guide

Hướng dẫn người dùng:

- [x] Mở Meta Accounts Center.
- [x] Chọn đúng Instagram account.
- [x] Chọn followers/following hoặc connections khi có thể.
- [x] Chọn JSON.
- [x] Chọn all-time range khi có.
- [x] Download ZIP.
- [x] Không cần unzip trừ recovery mode.
- [x] Nói rõ menu Meta có thể thay đổi.
- [x] Không yêu cầu credentials trên website.

## 10.5 Progress UI

- [x] Hiển thị stage thật từ worker.
- [x] Hiển thị processed relationship count khi có.
- [x] Live region thông báo thay đổi có kiểm soát.
- [x] Cancel button luôn truy cập được.
- [x] Không dùng fake percentage nếu không có dữ liệu thật.
- [x] Không khóa toàn bộ UI thread.
- [x] Không animate làm chậm việc đọc số liệu.

## 10.6 Review import

Trước khi save hiển thị:

- [x] Account đích.
- [x] Source filename và size chỉ trong memory/UI local, không log/analytics.
- [x] Detected follower/following counts.
- [x] Parser warnings.
- [x] Suggested snapshot date/time.
- [x] Editable/confirmable snapshot date.
- [x] Local retention explanation.
- [x] Accuracy limitation ngắn gọn.
- [x] Save/Cancel actions.
- [x] Duplicate check sau khi date được confirm.

## 10.7 Saving state

- [x] Chặn double submit.
- [x] Hiển thị saving status.
- [x] Persistence error giữ payload/results trong memory.
- [x] Duplicate message có đường quay lại.
- [x] Thành công chuyển sang result đúng snapshot.
- [x] Không giữ raw file/reference sau save.

## 10.8 Results overview

Summary cards:

- [x] Followers.
- [x] Following.
- [x] Mutuals.
- [x] Not following you back.
- [x] You do not follow back.
- [x] Lost followers khi có baseline.
- [x] New followers khi có baseline.
- [x] Net follower change khi có baseline.

Behavior:

- [x] Không hiển thị historical zero trên first snapshot.
- [x] First snapshot giải thích cần import snapshot sau.
- [x] Count format theo locale.
- [x] Delta có cả ký hiệu/text, không chỉ màu.
- [x] Warning badge khi parser có warning.

## 10.9 Result tabs/lists

Tabs:

- [x] Overview.
- [x] Lost followers.
- [x] New followers.
- [x] Not following back.
- [x] You do not follow back.
- [x] Mutuals.
- [x] History.

Mỗi list:

- [x] Search case-insensitive theo normalized handle.
- [x] Clear search.
- [x] A–Z.
- [x] Z–A.
- [x] Connected date newest/oldest khi metadata tồn tại.
- [x] Row/result count.
- [x] Empty filtered state.
- [x] Copy handle với accessible feedback.
- [x] Safe Instagram profile link từ validated normalized handle.
- [x] `target="_blank"` + `rel="noopener noreferrer"`.
- [x] Pagination ban đầu hoặc windowing nếu benchmark yêu cầu.
- [x] Mobile card/compact row layout.
- [x] Không render hàng chục nghìn DOM rows cùng lúc.

## 10.10 History

- [x] Snapshot list newest first.
- [x] Date/time.
- [x] Followers/following counts.
- [x] Delta từ prior snapshot.
- [x] Parser warning badge/details.
- [x] Compare action.
- [x] Delete action.
- [x] Current/selected snapshot indicator.
- [x] Empty/one-snapshot history explanation.

## 10.11 Manual comparison

- [x] Chọn hai distinct snapshots.
- [x] Chỉ cùng account/platform.
- [x] Không cho chọn cùng snapshot hai lần.
- [x] Normalize older/newer orientation hoặc label rõ ràng.
- [x] Hiển thị date range.
- [x] Compute diff bằng pure domain engine.
- [x] Lost-follower caveat luôn dễ truy cập.

## 10.12 CSV export

- [x] Generate hoàn toàn local.
- [x] UTF-8.
- [x] Correct CSV quoting cho comma, quote, newline.
- [x] Neutralize formula injection nếu cell bắt đầu bằng `=`, `+`, `-`, `@`.
- [x] Các cột phù hợp: handle, category, connected_at, current_snapshot, previous_snapshot.
- [x] File name an toàn, không chứa username nếu privacy policy không cho phép.
- [x] Revoke download object URL.
- [x] Không upload CSV.
- [x] Unit tests cho escaping/injection/Unicode.

## 10.13 Delete flows

- [x] Delete snapshot dialog nêu hậu quả.
- [x] Delete account dialog nêu toàn bộ history bị xóa.
- [x] Delete all local data trong settings/privacy area.
- [x] Focus trap/return focus.
- [x] Không accidental delete bằng một click không xác nhận.
- [x] Sau delete cập nhật current account/result/history đúng.
- [x] Reload xác nhận dữ liệu đã biến mất.

## 10.14 Error and recovery UX

Mỗi error code phải có:

- [x] Tiêu đề ngắn.
- [x] Nguyên nhân có thể hiểu được.
- [x] Hành động khắc phục cụ thể.
- [x] Retry/reset action.
- [x] Safe diagnostic report khi phù hợp.
- [x] Không lộ stack/raw data.
- [x] Không đổ lỗi cho người dùng.

Đặc biệt:

- [x] HTML export hướng dẫn chọn JSON.
- [x] Missing multipart hướng dẫn dùng original ZIP.
- [x] Mobile memory failure khuyến nghị desktop.
- [x] IndexedDB failure nói rõ result chưa được lưu.
- [x] Encrypted ZIP hướng dẫn tải export không mã hóa nếu Meta cho phép.

## 10.15 Analyzer component tests

- [x] Account create/select/edit.
- [x] Drop zone bằng mouse và keyboard.
- [x] Invalid file error.
- [x] Progress presentation.
- [x] Cancel flow.
- [x] Review date edit.
- [x] Duplicate flow.
- [x] First snapshot UX.
- [x] Result counts.
- [x] Search/sort/pagination.
- [x] Copy handle.
- [x] Safe external link.
- [x] History compare selector.
- [x] Delete confirmations.
- [x] Storage failure fallback.
- [x] English/Vietnamese copy.

## 10.16 Exit criteria M6

- [x] End-to-end happy path chạy từ account creation tới results.
- [x] Snapshot thứ hai tạo historical diff đúng.
- [x] Account isolation hoạt động.
- [x] CSV an toàn và local.
- [x] Import cancellation hoạt động.
- [x] Mọi core state có empty/loading/success/error UX.
- [x] Mobile layout usable.
- [x] Keyboard flow usable.
- [x] Typecheck/lint/unit/component/build pass.

---

# 10A. M6S - Public Story/Highlights subsystem

M6S là subsystem networked độc lập. Nó không được import repository của relationship analyzer, không nhận ZIP/JSON/snapshot và không được dùng như fallback để lấy follower lists.

> Trạng thái triển khai 2026-09-16: engineering implementation và mock verification đã hoàn tất cho domain model, same-origin routes, adapter server-only, activation gate kép, AES-256-GCM token/key rotation, SSRF/media guards, rate/concurrency limits, UI EN/VI và privacy-boundary tests. `pnpm check` đạt 211/211 test và Playwright đạt 68/68 trên Chromium desktop/mobile, Firefox, WebKit. Production vẫn **disabled** cho đến khi hoàn tất các mục external bên dưới: xác nhận logging/retention bằng văn bản, owner/legal approval, allowlist CDN chính thức, edge rate-limit/budget alert theo hosting và production smoke test có kiểm soát. Không dùng scraping/private API làm fallback.

## 10A.1 Provider due diligence và activation gate

- [x] Lập shortlist provider có documented active Stories và Highlights endpoints.
- [x] Kiểm tra provider identity/contact/support/status page.
- [x] Review Terms/acceptable-use cho lookup, preview và user-initiated download.
- [x] Review Privacy Policy, đặc biệt việc log username/query parameter.
- [ ] Nhận xác nhận bằng văn bản về việc có/không log username/query parameters và retention áp dụng.
- [x] Ghi retention, deletion request process và subprocessor/region nếu có.
- [x] Xác minh provider không yêu cầu Instagram password/session cookie/access token của end user.
- [x] Xác minh private accounts không được trả dữ liệu.
- [x] Xác minh pricing per request, billed error behavior, quota và rate limit.
- [x] Xác minh API versioning/deprecation policy.
- [x] Thu thập response schemas và typed error examples.
- [ ] Thu thập media/CDN hostname và redirect behavior để xây allowlist.
- [x] Chọn provider qua configuration, không hard-code vào UI/domain.
- [x] Có kill switch/feature flag server-side để disable Story utility độc lập.
- [x] Nếu review không đạt, giữ feature disabled; không chuyển sang scraping/private API.

Preferred technical evaluation candidate hiện tại là InstaGapi vì tài liệu của họ mô tả cả active Story items và full Highlight tray items. Đây chưa phải phê duyệt production: Terms đặt trách nhiệm tuân thủ platform terms lên khách hàng, còn Privacy Policy nêu lưu API usage/IP logs 90 ngày nhưng chưa làm rõ query parameters/username có nằm trong log hay không. Phải yêu cầu làm rõ bằng văn bản. `instagramapi.dev` là candidate phụ nhưng tài liệu hiện thấy chỉ xác nhận Highlight summaries và chính sách của họ ghi rõ có log lookup parameters, nên không dùng mặc định nếu chưa giải quyết privacy/functional gaps.

## 10A.2 Story domain model

Tạo provider-neutral types:

- [x] `PublicStoryMediaType = "image" | "video"`.
- [x] `PublicStoryItem`.
- [x] `PublicHighlightCollection`.
- [x] `PublicHighlightItem` hoặc reuse media item contract hợp lý.
- [x] `PublicStoryLookupResult`.
- [x] `StoryProviderError`.
- [x] Browser-facing safe media reference/token type.
- [x] Story lookup request/response discriminated types.

Browser-facing model chỉ chứa:

- normalized public handle;
- safe ID;
- image/video type;
- safe optional timestamps/duration/count/title;
- same-origin opaque preview/download references;
- fetched-at time;
- sanitized request ID nếu cần support.

Không chứa:

- provider API key;
- raw upstream response;
- arbitrary provider media URL;
- provider internal hostname;
- cookies/session tokens;
- relationship/local-account data.

## 10A.3 Stable Story error taxonomy

Thêm codes:

- [x] `STORY_INVALID_HANDLE`.
- [x] `STORY_PRIVATE_ACCOUNT` khi provider chứng minh được.
- [x] `STORY_ACCOUNT_NOT_FOUND` khi provider chứng minh được.
- [x] `STORY_NO_ACTIVE_ITEMS`.
- [x] `STORY_HIGHLIGHTS_UNAVAILABLE`.
- [x] `STORY_PROVIDER_NOT_CONFIGURED`.
- [x] `STORY_PROVIDER_AUTH_FAILED`.
- [x] `STORY_PROVIDER_RATE_LIMITED`.
- [x] `STORY_PROVIDER_QUOTA_EXCEEDED`.
- [x] `STORY_PROVIDER_TIMEOUT`.
- [x] `STORY_PROVIDER_UNAVAILABLE`.
- [x] `STORY_PROVIDER_SCHEMA_CHANGED`.
- [x] `STORY_RESPONSE_TOO_LARGE`.
- [x] `STORY_MEDIA_TOKEN_INVALID`.
- [x] `STORY_MEDIA_TOKEN_EXPIRED`.
- [x] `STORY_MEDIA_HOST_NOT_ALLOWED`.
- [x] `STORY_MEDIA_TYPE_UNSUPPORTED`.
- [x] `STORY_MEDIA_TOO_LARGE`.
- [x] `STORY_DOWNLOAD_FAILED`.
- [x] `STORY_RATE_LIMITED`.

Nếu provider không phân biệt private/not-found/no-data đáng tin cậy, UI dùng thông báo gộp trung thực thay vì đoán.

## 10A.4 Username/profile URL normalization

Accept:

- [x] `username`.
- [x] `@username`.
- [x] `https://instagram.com/username`.
- [x] `https://www.instagram.com/username/`.

Reject:

- [x] Empty/overlong handle.
- [x] Multiple handles/batch text.
- [x] Non-Instagram host.
- [x] HTTP/non-HTTPS URL.
- [x] URL credentials.
- [x] Custom port.
- [x] Query/fragment không cần thiết.
- [x] `/stories/...`, `/p/...`, `/reel/...` hoặc arbitrary nested path làm profile lookup.
- [x] localhost/IP literal/private-network destination.
- [x] Control/path-traversal characters.
- [x] Input giống file/archive payload.

Normalization output chỉ là conservative username; provider không bao giờ nhận raw arbitrary URL.

## 10A.5 Server-only environment và provider client

- [x] `STORY_PROVIDER` validated server-side.
- [x] `STORY_PROVIDER_API_KEY` validated server-side.
- [x] `STORY_MEDIA_TOKEN_SECRET` đủ entropy cho AEAD, validated server-side.
- [x] Không dùng `NEXT_PUBLIC_*` cho secrets.
- [x] Env module có `server-only` guard.
- [x] Secrets redacted khỏi errors/logs.
- [x] Key rotation không cần sửa browser client.
- [x] Provider request có timeout/abort signal.
- [x] Provider response body size bị giới hạn.
- [x] Provider JSON parse/schema errors map an toàn.
- [x] Chỉ gửi normalized handle hoặc opaque provider ID tối thiểu.
- [x] Không forward client headers/cookies/IP sang provider trừ khi contract và privacy review yêu cầu rõ.

## 10A.6 Provider adapter implementation

Interface tối thiểu:

```ts
interface PublicStoryProvider {
  readonly providerId: string;
  getActiveStories(handle: string, signal: AbortSignal): Promise<ProviderStoryResult>;
  getHighlights(handle: string, signal: AbortSignal): Promise<ProviderHighlightResult>;
  getHighlightItems(highlightId: string, signal: AbortSignal): Promise<ProviderHighlightItemsResult>;
}
```

- [x] Provider implementation nằm trong server-only module.
- [x] `unknown` → Zod/schema validation → normalized domain result.
- [x] Stable mapping cho 400/401/402/404/429/5xx/timeout.
- [x] Không auto-retry billable not-found/private/no-story.
- [ ] Bounded retry với jitter chỉ cho transient safe failure.
- [x] Provider request ID được sanitize trước khi giữ/log.
- [x] Provider credit balance không trả ra public client.
- [x] Unit tests dùng mock transport, không tiêu credit thật.

## 10A.7 Same-origin lookup routes

Route responsibilities có thể gộp hợp lý nhưng phải tách khỏi generic proxy:

- [x] Active Stories lookup.
- [x] Highlight summaries lookup.
- [x] Items lookup cho một selected Highlight.
- [x] Same-origin media preview/download.

Mọi JSON route:

- [x] Chỉ cho intended methods.
- [x] Enforce `Content-Type: application/json` cho POST nếu dùng POST.
- [x] Body ≤ 4 KiB hoặc policy tương đương.
- [x] Validate same-origin/Origin expectations.
- [x] Không dùng GET crawlable URL chứa username nếu muốn tránh query logs/crawling; ưu tiên POST body cho lookup.
- [x] `Cache-Control: no-store` mặc định.
- [x] Sanitize request ID/error.
- [x] Request timeout.
- [x] Max item/collection/result size.
- [x] Không reflect raw username trong error.
- [x] Không set permissive CORS.
- [x] Không nhận File/Blob/FormData/archive input.

## 10A.8 Authenticated-encrypted media-token design

Token chứa tối thiểu:

- [x] Version.
- [x] Provider ID/reference tối thiểu.
- [x] Validated HTTPS media URL hoặc opaque upstream reference.
- [x] Expected media class.
- [x] Safe suggested filename metadata.
- [x] Expiry.
- [x] AEAD ciphertext/authentication tag; raw upstream URL không đọc được từ browser token.

Token rules:

- [x] Standard AEAD such as AES-256-GCM; không custom crypto.
- [x] Fresh cryptographically random nonce cho mỗi token; không nonce reuse cùng key.
- [x] URL-safe base64url envelope với explicit token/key version.
- [x] Bounded decrypted payload size trước khi parse.
- [x] TTL mặc định khoảng 5 phút.
- [x] Tampered/decryption-failed token reject trước upstream call.
- [x] Expired token trả actionable refresh-lookup error.
- [x] Secret có key-rotation/version strategy.
- [x] Không chứa provider API key/cookie.
- [x] Không log full token.
- [x] Không chấp nhận raw URL thay thế token.

## 10A.9 Media delivery/SSRF protection

Trước và sau redirect:

- [x] HTTPS only.
- [x] Explicit provider/CDN hostname allowlist.
- [x] Reject username/password/port bất thường trong URL.
- [x] Resolve/block localhost, loopback, link-local, private, reserved và metadata-service IP ranges.
- [x] Giới hạn redirect count.
- [x] Revalidate mỗi redirect destination.
- [x] Timeout connect/headers/body.
- [x] Content-Type allowlist: supported images/videos only.
- [x] `Content-Length` limit khi có.
- [x] Enforce streamed byte limit khi header thiếu/sai.
- [x] Stream thay vì buffer video lớn khi runtime cho phép.
- [x] Abort upstream khi downstream disconnect nếu thực tế hỗ trợ.
- [x] Safe `Content-Disposition` filename.
- [x] `X-Content-Type-Options: nosniff`.
- [x] Restrictive/no-store caching theo provider/privacy contract.
- [x] Không forward upstream `Set-Cookie` hoặc sensitive headers.
- [x] Không trở thành open redirect/open proxy.

## 10A.10 Security/resource policy

Khởi đầu với constants tập trung và test boundary:

```ts
MAX_STORY_REQUEST_BODY_BYTES = 4 * 1024
MAX_STORY_ITEMS = 100
MAX_HIGHLIGHT_COLLECTIONS = 100
MAX_HIGHLIGHT_ITEMS = 250
MAX_IMAGE_BYTES = 25 * 1024 * 1024
MAX_VIDEO_BYTES = 250 * 1024 * 1024
PROVIDER_TIMEOUT_MS = 15_000
MEDIA_TOKEN_TTL_SECONDS = 5 * 60
```

- [x] Không magic number rải rác.
- [ ] Test dưới/bằng/trên mỗi limit.
- [ ] Điều chỉnh sau profiling/provider review, không âm thầm bỏ guard.

## 10A.11 Abuse, quota và cost controls

- [ ] Production edge/platform rate limit.
- [x] Secondary per-instance concurrency cap.
- [x] Một username mỗi lookup.
- [x] Không background polling.
- [x] Không bulk/download-all fan-out.
- [ ] Provider quota/budget alert.
- [x] Kill switch khi credit thấp/provider incident.
- [x] `Retry-After` cho local 429 khi phù hợp.
- [x] Không retry request có thể bị bill nhiều lần ngoài bounded transient policy.
- [x] Provider outage không tác động analyzer routes.
- [ ] Hosting IP/rate-limit metadata retention được disclose chính xác.

## 10A.12 Story/Highlights UI

Route `/story-downloader`:

- [x] Heading/value proposition rõ public-only.
- [x] Username/profile URL input có label/hint/error.
- [x] Disclosure trước submit rằng handle gửi tới server/provider.
- [x] Lookup button và keyboard submit.
- [x] Real loading state, cancel/abort nếu có ích.
- [x] Không lưu recent searches mặc định.
- [x] Active Stories tab/section.
- [x] Highlights tab/section.
- [x] Empty state khi không có active Stories.
- [x] Honest unavailable state nếu private/not-found không phân biệt được.
- [x] Rate limit/quota/provider timeout/outage guidance.
- [x] Highlight cards: title, cover, count khi có.
- [x] Lazy load selected Highlight items.
- [x] Preview image/video.
- [x] Video không autoplay có sound; native accessible controls.
- [x] Không preload toàn bộ videos.
- [x] Individual download button.
- [x] Expired token yêu cầu refresh lookup.
- [x] Copyright/permission reminder trước download.
- [x] Không claim anonymous viewing.
- [x] Không hiển thị provider name như official Meta affiliation.
- [x] Mobile gallery usable ở 360px.
- [x] EN/VI copy đầy đủ.

## 10A.13 Privacy behavior

- [x] Không IndexedDB/localStorage cho handle, results, media, token hoặc download history.
- [x] Browser state clear khi reload/navigation.
- [x] `Cache-Control: no-store` cho lookup JSON mặc định.
- [x] App logs không ghi raw handle/token/media URL.
- [x] Disclosure phản ánh provider logging/retention thật.
- [x] Analyzer data không import vào Story module.
- [x] Story request không đọc analyzer database.
- [x] Test synthetic markers để chứng minh boundary.

## 10A.14 Story tests

### Unit

- [x] Handle/URL normalization và reject matrix.
- [x] Provider schema normalization.
- [x] Provider error mapping.
- [ ] Item/collection/response limits.
- [x] Token sign/verify/tamper/expiry/version.
- [x] Host/URL/IP/redirect validation.
- [x] Content-Type/filename/content-disposition.

### Route integration

- [x] Valid mocked public active Stories.
- [x] Valid mocked Highlights/items.
- [ ] Empty active Stories.
- [ ] Private/not-found ambiguity.
- [ ] 401/402/404/429/5xx/timeout/schema drift.
- [x] Body/method/content-type/origin/rate limits.
- [x] Provider secret absent from response/log.
- [x] Media redirect/size/type failures.
- [ ] Streamed image/video success.

### Component/E2E

- [x] Disclosure visible before lookup.
- [ ] Keyboard input/submit/results.
- [x] Story and Highlight gallery.
- [x] Lazy Highlight items.
- [x] Image/video preview.
- [x] Individual download.
- [ ] Expired media refresh path.
- [x] EN/VI/dark/mobile/axe.
- [x] No Story state persisted after reload.
- [x] Browser calls only same-origin Story/media routes.
- [x] Relationship synthetic marker never appears in Story traffic.
- [x] Relationship import succeeds with all Story/provider routes blocked.

## 10A.15 Production provider smoke test

- [ ] Dùng approved public, non-sensitive, stable test account được truyền tại test time; không commit username thật vào source/fixture.
- [ ] Không dùng real user search history.
- [ ] Chạy có kiểm soát để tránh credit burn.
- [ ] Verify active-story empty/success behavior tùy fixture.
- [ ] Verify Highlight summary/items.
- [ ] Verify media hosts khớp allowlist.
- [ ] Verify one image and one video delivery khi available.
- [ ] Verify provider request ID/error telemetry đã sanitize.
- [ ] Delete any temporary application-side data; mặc định không có persistence.

## 10A.16 Exit criteria M6S

- [ ] Provider due diligence được ghi nhận và approved.
- [x] Provider key/media-token secret không có trong client bundle hoặc responses.
- [x] Arbitrary URL/private-network requests bị chặn.
- [x] Authenticated-encrypted media token opacity/tamper/expiry tests pass.
- [ ] Public Story/Highlight lookup và individual download pass.
- [x] Private/empty/error/rate-limit/provider outage UX đúng.
- [x] Không app persistence của Story handle/media/history.
- [x] Relationship analyzer privacy/network tests vẫn pass.
- [x] Provider outage/kill switch không làm hỏng các routes còn lại.
- [x] Typecheck/lint/unit/integration/E2E/build pass.

---

# 11. M7 — Marketing, hướng dẫn, privacy, terms và SEO

## 11.1 Landing page

Các section bắt buộc:

- [x] Header.
- [x] Hero.
- [x] Trust/privacy proof row.
- [x] What you can learn.
- [x] How it works — 3 steps.
- [x] Privacy architecture.
- [x] Accuracy/limitations.
- [x] FAQ preview.
- [x] Final CTA.
- [x] Footer.

Copy direction:

- “See what changed in your Instagram followers.”
- “No password. No account login. Your data stays on your device.”
- Không fear-based copy.
- Không sử dụng official Instagram logo/trade dress khi chưa có review.
- Không dùng chung câu “your data stays on your device” cho Story lookup; claim này chỉ áp dụng relationship export.

## 11.2 How it works

- [x] Giải thích cách lấy official export.
- [x] JSON/all-time/followers-following recommendations.
- [x] Giải thích parsing trong browser.
- [x] Giải thích snapshot comparison.
- [x] Giải thích first snapshot limitation.
- [x] Nhắc menu Meta có thể thay đổi.
- [x] CTA tới analyzer.

## 11.3 Privacy page

Phải nêu rõ:

- [x] Phân tích diễn ra trong browser.
- [x] Dữ liệu normalized nào được lưu IndexedDB.
- [x] ZIP/raw JSON không được lưu.
- [x] Cách xóa dữ liệu.
- [x] Không cần password/token/cookie/2FA.
- [x] Không liên kết với Meta/Instagram.
- [x] Hạn chế của lost follower inference.
- [x] Người dùng cùng browser profile có thể truy cập local history.
- [x] Hosting có thể nhận request metadata thông thường như IP khi tải site.
- [x] Không nói “we collect absolutely nothing”.
- [x] Story tool gửi public handle tới server/configured provider.
- [x] Provider có thể log lookup parameters theo policy đã review.
- [x] Story results/media/search history không được app persist mặc định.
- [x] Relationship data không đi qua Story subsystem.

## 11.4 Terms/disclaimer

- [x] Mục đích informational.
- [x] User chịu trách nhiệm với file họ cung cấp.
- [x] Không bảo đảm username là stable identity.
- [x] Không hứa xác định ý định unfollow.
- [x] Không affiliation/endorsement/sponsorship với Meta.
- [x] Trademark disclaimer đúng đặc tả.
- [x] Không đưa điều khoản vượt quá khả năng thực tế của sản phẩm.
- [x] Public availability không đồng nghĩa chuyển giao copyright.
- [x] User chỉ download content họ sở hữu hoặc có quyền lưu.
- [x] Không anonymous-viewing/private-access guarantee.
- [x] Provider/network availability và media expiry limitations.

## 11.5 FAQ

Tối thiểu trả lời:

- [x] Có cần Instagram password không?
- [x] File có bị upload không?
- [x] Dữ liệu được lưu ở đâu?
- [x] Làm sao xóa dữ liệu?
- [x] Vì sao cần hai snapshot?
- [x] “Lost follower” có chắc là unfollow không?
- [x] Hỗ trợ HTML/Facebook không?
- [x] Vì sao manual follower file có thể thiếu?
- [x] Có hoạt động trên mobile không?
- [x] Vì sao import lớn có thể cần desktop?
- [x] Story downloader có hoạt động với private account không?
- [x] Story lookup có được xử lý local không?
- [x] Username được gửi cho ai và có được lưu không?
- [x] Có tải được Story đã hết hạn/Close Friends không?
- [x] Tôi có được phép tải và sử dụng lại nội dung không?

## 11.6 Footer/legal positioning

Hiển thị disclaimer:

> This product is not affiliated with, endorsed by, or sponsored by Instagram, Facebook, or Meta Platforms, Inc. Instagram and Facebook are trademarks of their respective owners.

- [x] Có bản dịch phù hợp nhưng không làm sai ý nghĩa pháp lý.
- [x] Link Privacy, Terms, FAQ, How it works.
- [x] Không dùng tên/domain gây hiểu nhầm là sản phẩm chính thức.

## 11.7 Metadata và SEO

- [x] Unique title cho từng public route.
- [x] Unique meta description.
- [x] Canonical URLs từ configured site URL.
- [x] Open Graph metadata/assets local.
- [x] Favicon/app icons.
- [x] `robots.txt`.
- [x] `sitemap.xml`.
- [x] Organization/WebSite structured data khi thông tin chính xác.
- [x] FAQ structured data chỉ khi nội dung và policy phù hợp.
- [x] Không serialize local analyzer state vào metadata/URL.
- [x] Không index URL có dữ liệu người dùng.
- [x] `/story-downloader` có metadata riêng nhưng username/result/token không nằm trong crawlable URL/metadata.
- [x] Story media endpoints non-indexable và token hết hạn ngắn.

## 11.8 Marketing quality checks

- [x] Tất cả copy có cả EN/VI.
- [x] Heading hierarchy semantic.
- [x] CTA keyboard accessible.
- [x] Không layout shift do media/font.
- [x] Images có kích thước/alt phù hợp.
- [x] Không remote tracker/asset.
- [x] Story page nói rõ functional provider network dependency, không gọi nó là tracker.
- [x] Axe pass.
- [x] Metadata snapshot tests hoặc route assertions phù hợp.

## 11.9 Exit criteria M7

- [x] Đủ 6 routes V1.
- [x] Privacy/terms/limitations copy đầy đủ.
- [x] SEO assets/routes build được ở static output.
- [x] Không có claim sai về privacy hoặc unfollow intent.
- [x] Không có trademark presentation gây hiểu nhầm.
- [x] Typecheck/lint/tests/build pass.

---

# 12. M8 — Security và privacy hardening

## 12.1 Threat-model review

Review từng threat:

- [ ] Corrupted/malicious ZIP.
- [ ] Decompression bomb.
- [ ] Memory exhaustion.
- [ ] Huge JSON.
- [ ] Unsafe archive path.
- [ ] XSS từ handle/value/key name.
- [ ] Malicious export-provided URL.
- [ ] CSV formula injection.
- [ ] Dependency supply chain.
- [ ] Accidental network exfiltration.
- [ ] Sensitive production logs.
- [ ] Shared-device local history.
- [ ] Story provider key/media-token-secret leakage.
- [ ] Story endpoint abuse, quota exhaustion và cost amplification.
- [ ] SSRF/open proxy qua media route.
- [ ] Malicious hoặc schema-drift provider response.
- [ ] Redirect tới private/reserved network host.
- [ ] Oversized/incorrect media content.
- [ ] Story handle/token/media URL logging hoặc persistence.
- [ ] Copyright misuse hoặc anonymous-viewing claim.

Mỗi threat phải có:

- preventive control;
- test hoặc manual verification;
- residual risk được ghi nhận.

## 12.2 Rendering review

- [ ] Handles chỉ render bằng React text nodes.
- [ ] Không `dangerouslySetInnerHTML` với archive-derived data.
- [ ] Không đưa archive values vào CSS selector/style/HTML attributes nguy hiểm.
- [ ] Không dùng export `href` trực tiếp.
- [ ] Profile URL chỉ dựng từ validated normalized handle.
- [ ] New-tab links có `noopener noreferrer`.
- [ ] Highlight titles/provider metadata render as text.
- [ ] Story media chỉ qua validated same-origin token route.

## 12.3 Network dependency review

- [ ] Parser/domain modules không import HTTP client.
- [ ] Analyzer services không có fetch wrapper.
- [ ] Không remote profile image.
- [ ] Không background Instagram request.
- [ ] Story browser chỉ gọi same-origin routes; chỉ server provider adapter được gọi reviewed external provider.
- [ ] Không analytics/session replay/ad scripts.
- [ ] Fonts/assets self-hosted hoặc system.
- [ ] Import hoạt động sau khi block external network.
- [ ] Relationship import hoạt động khi Story/provider routes bị block.
- [ ] Story browser traffic không đi thẳng tới provider và không chứa provider key.

## 12.4 CSP và headers

Thiết lập qua cấu hình tương thích hybrid Next.js/Vercel:

- [ ] `X-Content-Type-Options: nosniff`.
- [ ] `Referrer-Policy: no-referrer`.
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- [ ] `Cross-Origin-Opener-Policy: same-origin` sau compatibility test.
- [ ] CSP có `default-src 'self'`.
- [ ] `object-src 'none'`.
- [ ] `base-uri 'self'`.
- [ ] `frame-ancestors 'none'`.
- [ ] `connect-src` tối thiểu cần thiết.
- [ ] `img-src 'self' data: blob:` nếu cần.
- [ ] `media-src 'self' blob:` cho same-origin Story media.
- [ ] `font-src 'self'`.
- [ ] `worker-src 'self' blob:` theo worker bundle thực tế.
- [ ] Không thêm `unsafe-eval` ở production.
- [ ] Không sao chép CSP mẫu mà chưa test Next bootstrap/hybrid output.

## 12.5 Logging review

- [ ] Không log file bytes/raw JSON.
- [ ] Không log follower/following arrays.
- [ ] Không log username/handle.
- [ ] Không log Story raw handle, full media token hoặc upstream URL trong app logs.
- [ ] Không log archive filename ở production diagnostic.
- [ ] Chỉ log sanitized event/error code local khi cần.
- [ ] Không có remote logger mặc định.
- [ ] Error boundary không dump object nhạy cảm.

## 12.6 Dependency review

- [ ] Liệt kê runtime dependencies và mục đích.
- [ ] Loại dependency không cần thiết.
- [ ] Audit production dependencies.
- [ ] Triage mọi advisory.
- [ ] Framework/runtime advisory liên quan là release blocker.
- [ ] Lockfile sạch và reproducible.

## 12.7 Privacy E2E assertion

Test import phải:

- [ ] Chờ app assets load.
- [ ] Theo dõi request trong suốt import.
- [ ] Block/flag endpoint ngoài allowlist tối thiểu.
- [ ] Fail nếu request body/header/URL chứa archive-derived marker synthetic.
- [ ] Fail nếu có unknown external endpoint.
- [ ] Thành công khi external network bị block sau page load.
- [ ] Bao phủ ZIP import và CSV generation.
- [ ] Story tests xác nhận browser chỉ gọi same-origin routes.
- [ ] Fail nếu relationship-derived marker đi vào Story request.
- [ ] Fail nếu provider secret xuất hiện trong client JS/HTML/network response.

## 12.8 Security manual tests

- [ ] ZIP path traversal variants.
- [ ] Absolute/UNC/drive paths.
- [ ] NUL-like filenames.
- [ ] Compression ratio edge.
- [ ] Huge entry metadata.
- [ ] Malicious handle resembling HTML/script.
- [ ] Malicious `href` protocol.
- [ ] CSV cells bắt đầu bằng formula chars.
- [ ] Shared-browser deletion verification.
- [ ] Production headers verification.
- [ ] Story input/body/method/origin/rate-limit checks.
- [ ] Media token tamper/expiry checks.
- [ ] Story host/IP/redirect/content-type/size limits.
- [ ] Provider kill switch và outage isolation.

## 12.9 Exit criteria M8

- [ ] Threat model có control và verification đầy đủ.
- [ ] Privacy network test pass.
- [ ] CSP production build hoạt động.
- [ ] Security headers có trên hybrid deployment/host config.
- [ ] Dependency audit pass hoặc findings đã triage bằng văn bản.
- [ ] Không có sensitive logging.
- [ ] Không có server upload path.
- [ ] Story media route không phải generic proxy và provider secrets không lộ.
- [ ] Provider logging/retention disclosure khớp review hiện hành.

---

# 13. M9 — Performance, browser compatibility và accessibility hardening

## 13.1 Performance test datasets

Tạo synthetic datasets theo cấp:

- [ ] Small: vài chục records.
- [ ] Medium: vài nghìn records.
- [ ] Large: hàng chục/hàng trăm nghìn records.
- [ ] Near-limit metadata test không nhất thiết allocate toàn bộ dữ liệu.
- [ ] Duplicate-heavy dataset.
- [ ] Multipart-heavy dataset.

Không commit binary khổng lồ nếu có thể tạo bằng script trong test.

## 13.2 Analyzer responsiveness

- [ ] Main UI vẫn nhận input/click trong khi worker parse.
- [ ] Cancel phản hồi kịp thời.
- [ ] Không JSON.parse lớn trên main thread.
- [ ] Diff đạt O(n + m).
- [ ] Search/sort không freeze UI ở dataset mục tiêu.
- [ ] Pagination/windowing giới hạn DOM nodes.
- [ ] Không duplicate giữ raw text + parsed object lâu hơn cần thiết.
- [ ] Worker/reader/buffers được release sau job.

## 13.3 Memory behavior

- [ ] Parse relevant files theo thứ tự để giảm peak memory khi phù hợp.
- [ ] Không giữ ZIP Blob trong domain state sau success.
- [ ] Không lưu raw JSON text.
- [ ] Structured clone worker→UI được profile với large payload.
- [ ] IndexedDB write được profile với relationship arrays lớn.
- [ ] Mobile memory failure có actionable error.
- [ ] Import lại nhiều lần không tạo memory leak rõ rệt.

## 13.4 Marketing performance

Mục tiêu trên representative mobile profile:

- [ ] LCP < 2.5s.
- [ ] INP < 200ms.
- [ ] CLS < 0.1.
- [ ] Lighthouse Performance ≥ 95 khi kiểm soát được.
- [ ] Accessibility ≥ 95 và có manual review.
- [ ] Best Practices ≥ 95.
- [ ] SEO ≥ 95.

Tối ưu theo bằng chứng đo, không thêm complexity trước khi profile.

## 13.4A Story/media performance

- [ ] Không preload mọi Highlight item/video.
- [ ] Lazy-load Highlight items và media previews.
- [ ] Bound concurrent media requests.
- [ ] Provider/media timeouts hoạt động.
- [ ] Large video được stream, không buffer toàn bộ trong server memory khi runtime hỗ trợ.
- [ ] Client disconnect abort upstream khi khả thi.
- [ ] Story provider outage không ảnh hưởng analyzer/marketing LCP.
- [ ] Expired token không gây retry loop.
- [ ] Gallery không layout shift đáng kể khi media load.

## 13.5 Browser compatibility

Kiểm tra current stable:

- [ ] Chrome/Chromium.
- [ ] Edge.
- [ ] Firefox.
- [ ] Safari/WebKit.
- [ ] iOS Safari representative device/simulator.
- [ ] Android Chrome representative viewport.

Capabilities cần xác minh:

- module workers;
- File/Blob APIs;
- IndexedDB;
- Web Crypto;
- ZIP library behavior;
- static ES modules.
- server route streaming behavior;
- same-origin image/video playback/download;
- authenticated-encrypted token handling across browser URL encoding.

Không thêm polyfill cho browser lỗi thời nếu chưa có nhu cầu sản phẩm.

## 13.6 WCAG 2.2 AA manual review

- [ ] Semantic heading order.
- [ ] Landmarks.
- [ ] Skip link.
- [ ] Keyboard-only complete flow.
- [ ] Visible focus.
- [ ] Labels/descriptions.
- [ ] Drag/drop có file input tương đương.
- [ ] Live region cho status nhưng không spam.
- [ ] Error gắn với control.
- [ ] Dialog focus trap/return focus.
- [ ] Touch target size.
- [ ] Contrast light/dark.
- [ ] Không dùng màu làm tín hiệu duy nhất.
- [ ] Table/list semantics đúng presentation.
- [ ] Screen-reader-friendly count changes.
- [ ] Reduced motion.
- [ ] Zoom 200%/reflow.
- [ ] Mobile orientation/layout.
- [ ] Story disclosure/input/gallery/media controls/download/error states.
- [ ] Video captions không bắt buộc cho third-party source nếu không có, nhưng controls và accessible name phải đầy đủ.

## 13.7 Axe coverage

Chạy axe trên:

- [ ] Landing.
- [ ] Empty analyzer.
- [ ] Account creation.
- [ ] Import review.
- [ ] Results.
- [ ] History.
- [ ] Compare flow.
- [ ] Confirmation dialog.
- [ ] Privacy/Terms/FAQ.
- [ ] Light và dark theme ở các state chính.
- [ ] Story empty/loading/results/Highlight/media/error states.

## 13.8 Exit criteria M9

- [ ] Không có main-thread parser long task vật chất.
- [ ] Large list không tạo DOM khổng lồ.
- [ ] Browser matrix critical flows pass.
- [ ] Axe không có serious/critical issue.
- [ ] Manual keyboard/screen-reader review được ghi nhận.
- [ ] Marketing metrics đạt target hoặc variance có giải trình.
- [ ] Memory cleanup được xác minh.
- [ ] Story lazy loading/streaming/concurrency limits được xác minh.

---

# 14. Ma trận kiểm thử đầy đủ

## 14.1 Unit tests

### Domain/normalization

- Handle trim, `@`, lowercase, empty, length, Unicode.
- Deterministic display value và timestamp.
- Deduplicate equivalent handles.

### Diff

- Mutuals.
- Not following back.
- You do not follow back.
- Lost/new followers.
- Started/stopped following.
- Empty/no-change/full replacement.
- Stable sorting.
- Set invariants/property tests.

### Fingerprint

- Same semantic sets/different order → same hash.
- Changed follower → different hash.
- Changed following → different hash.
- Followers/following namespace không bị nhập nhằng.

### Parser/detection

- Single/multipart.
- Wrappers.
- Missing optional fields.
- Malformed entries.
- Unsupported/missing/corrupt/encrypted/HTML inputs.
- Unsafe paths.
- Security boundaries.

### CSV

- Quoting.
- Unicode.
- Newline.
- Formula injection.
- Empty/large result.

### Persistence

- Accounts/snapshots/settings CRUD.
- Duplicate lookup.
- Previous snapshot.
- Isolation.
- Cascade/delete-all.
- Failure mapping/migration.

### Story/Highlights

- Handle/profile URL accept/reject matrix.
- Provider response schemas và error mapping.
- Lookup/result limits.
- Media token encrypt/decrypt/opacity/tamper/expiry/version.
- Host/IP/redirect/content-type/size validation.
- Safe media filename/content disposition.
- Rate-limit/retry/timeout/quota behavior.
- No persistence/logging boundary.

## 14.2 Component tests

- Drop zone keyboard.
- Account selector/editor.
- Import state reducer/transitions.
- Progress/live region.
- Review form/date.
- Error actionability.
- First snapshot explanation.
- Summary cards.
- Search/sort/pagination.
- History compare selector.
- Delete confirmations/focus.
- Locale/theme controls.
- Story disclosure/input/loading/empty/results/highlights/media/error controls.

## 14.3 Integration tests

- Worker client ↔ worker protocol.
- ZIP → normalized payload.
- Manual JSON → normalized payload.
- Payload → persistence.
- Persistence → automatic baseline diff.
- Storage failure → in-memory results.
- Warning/error code → localized UI.
- Story route → mocked provider → normalized browser response.
- Story media token → validated mocked stream.
- Relationship/Story module isolation.

## 14.4 E2E critical flows

1. [ ] Landing → analyzer.
2. [ ] Create local account.
3. [ ] Import valid synthetic ZIP.
4. [ ] Review/confirm date.
5. [ ] Verify current summary counts.
6. [ ] Verify first snapshot has no fake historical result.
7. [ ] Import second ZIP.
8. [ ] Verify lost/new/net counts.
9. [ ] Search/sort a list.
10. [ ] Export CSV and inspect safe content.
11. [ ] Reload and verify history persists.
12. [ ] Manual compare two snapshots.
13. [ ] Create second account and verify isolation.
14. [ ] Delete snapshot.
15. [ ] Delete account and verify cascade.
16. [ ] Delete all local data.
17. [ ] Invalid/corrupt/HTML/unsafe archive paths.
18. [ ] Cancel import and import again.
19. [ ] Keyboard-only path.
20. [ ] Mobile viewport.
21. [ ] Dark theme.
22. [ ] Vietnamese smoke test.
23. [ ] Network privacy assertion.
24. [ ] Relationship import vẫn pass khi external/Story-provider network bị block sau khi assets load.
25. [ ] Open Story route and verify pre-submit network disclosure.
26. [ ] Mocked public Story/Highlight lookup.
27. [ ] Lazy-load Highlight items.
28. [ ] Preview/download mocked image and video.
29. [ ] Private/not-found/no-story/provider-timeout/rate-limit states.
30. [ ] Story state không tồn tại sau reload.
31. [ ] Browser chỉ gọi same-origin Story/media endpoints.
32. [ ] Provider secret không xuất hiện trong client bundle/HTML/responses.

## 14.5 Test data policy

- [ ] Chỉ synthetic/anonymized handles.
- [ ] Không fixture từ real export.
- [ ] Không screenshot chứa real data.
- [ ] Generator deterministic với seed khi cần.
- [ ] Expected counts documented.
- [ ] Không log fixture relationship list trong CI nếu không cần.

---

# 15. M10 — CI/CD, deployment và release

## 15.1 CI pipeline cuối cùng

Thứ tự bắt buộc:

```text
frozen install
    ↓
typecheck
    ↓
lint --max-warnings=0
    ↓
unit + component + integration tests
    ↓
production hybrid build
    ↓
Playwright E2E + axe + privacy network test
    ↓
production dependency audit
```

- [ ] Fail fast ở lỗi compile/lint.
- [ ] Lưu Playwright trace/screenshot chỉ khi fail và chỉ dùng synthetic data.
- [ ] Không upload artifact chứa local real data.
- [ ] CI reproducible từ clean checkout.
- [ ] Core build/test dùng mocked provider và không cần production secret; live provider smoke dùng secret được bảo vệ riêng.

## 15.2 Hybrid deployment

- [ ] Không bật full `output: "export"` khi Story route handlers là V1 requirement.
- [ ] Giữ marketing/help pages static-generated khi phù hợp.
- [ ] Xác minh worker asset được emit và load đúng.
- [ ] Xác minh Story lookup/media route server runtime và streaming behavior.
- [ ] Xác minh route fallback/404 trên host.
- [ ] Dùng HTTPS only.
- [ ] Cấu hình public site URL cho canonical/sitemap.
- [ ] Không có server function/API route ngoài dự kiến.
- [ ] Cấu hình security headers tại Vercel/host.
- [ ] Không có production Instagram/Meta credential.
- [ ] Story provider API key và media-token secret chỉ nằm trong protected server environment.
- [ ] Provider feature flag/kill switch hoạt động.
- [ ] Production edge/platform rate limit được cấu hình.

## 15.3 Preview deployment checks

- [ ] Tất cả routes mở trực tiếp và refresh được.
- [ ] Worker import hoạt động.
- [ ] IndexedDB history survives reload.
- [ ] CSV download hoạt động.
- [ ] Theme/locale persist.
- [ ] Headers/CSP đúng.
- [ ] Analyzer không gọi external network; Story browser chỉ gọi same-origin routes.
- [ ] Server Story route chỉ gọi approved provider/media hosts.
- [ ] robots/canonical không vô tình trỏ preview domain khi production.

## 15.4 Production release checklist

### Product

- [ ] Current follower/following analysis đúng.
- [ ] Multipart followers merge đúng.
- [ ] First snapshot semantics đúng.
- [ ] Two-snapshot lost/new đúng.
- [ ] Multiple accounts cô lập.
- [ ] History reload được.
- [ ] Delete flows hoạt động.
- [ ] CSV hoạt động local.
- [ ] Public Story lookup hoạt động bằng normalized handle/profile URL.
- [ ] Highlights/items load được khi provider hỗ trợ.
- [ ] Individual image/video preview/download hoạt động.
- [ ] Story private/empty/unavailable/rate-limit states đúng.

### Privacy

- [ ] Không credential input.
- [ ] Không archive upload endpoint.
- [ ] Network-blocked import pass.
- [ ] Không tracking SDK.
- [ ] Không persist raw ZIP/JSON.
- [ ] Không sensitive production log.
- [ ] Story pre-submit network/provider disclosure hiển thị.
- [ ] Story query/result/media không app-persist mặc định.
- [ ] Provider logging/retention được disclose chính xác.
- [ ] Provider secrets không xuất hiện client-side.

### Security

- [ ] ZIP size/count/path/ratio guards.
- [ ] Nested archive ignored.
- [ ] Untrusted values render as text.
- [ ] Profile links safe.
- [ ] CSV injection mitigated.
- [ ] Dependency audit triaged.
- [ ] Production CSP/headers verified.
- [ ] Story body/rate/timeout/result-size guards.
- [ ] Authenticated-encrypted media token và SSRF/open-proxy protections.
- [ ] Provider schema validation và kill switch.

### Quality

- [ ] Typecheck pass.
- [ ] Lint zero warnings.
- [ ] Unit/component/integration pass.
- [ ] E2E pass.
- [ ] Production build pass.
- [ ] Không core TODO/mock.
- [ ] Required responsive widths pass.
- [ ] Keyboard flow pass.
- [ ] Axe pass.
- [ ] Story mocked adapter/route/component/E2E suites pass.
- [ ] Controlled production provider smoke pass trước enablement.

### Performance

- [ ] Worker parsing responsive.
- [ ] Large list DOM bounded.
- [ ] Marketing performance target đạt hoặc được triage.
- [ ] Mobile low-memory failure graceful.
- [ ] Story media lazy loading/streaming/concurrency bounded.

### Content/legal

- [ ] Privacy/Terms approved.
- [ ] Lost follower caveat hiện diện.
- [ ] Meta trademark disclaimer hiện diện.
- [ ] Không claim official affiliation.
- [ ] EN/VI copy hoàn chỉnh.
- [ ] Canonical domain đúng.
- [ ] Story public-only/network/provider/copyright limitations rõ.
- [ ] Không anonymous-viewing hoặc private-access claim.

## 15.5 Post-deploy smoke test

- [ ] Landing load qua production URL.
- [ ] Direct-open từng route.
- [ ] Tạo synthetic local account.
- [ ] Import fixture A và B.
- [ ] Verify counts/diff.
- [ ] Reload verify IndexedDB.
- [ ] Export CSV.
- [ ] Story route disclosure và mocked/controlled public lookup.
- [ ] Highlight item load và one media preview/download.
- [ ] Story state không persist sau reload.
- [ ] Delete test data khỏi browser profile.
- [ ] Kiểm tra analyzer không có external call; Story browser chỉ gọi same-origin routes và server chỉ gọi approved hosts.
- [ ] Kiểm tra production headers.
- [ ] Kiểm tra console không có error/warning nhạy cảm.

## 15.6 Rollback readiness

- [ ] Giữ deployment trước để rollback.
- [ ] Schema migration phải backward-safe trong phạm vi đã cam kết.
- [ ] Không phát hành migration phá local history mà không có kế hoạch rõ.
- [ ] Security regression ưu tiên rollback ngay.
- [ ] Không cố khôi phục/xử lý local user data từ server.
- [ ] Story feature có kill switch độc lập để rollback provider integration mà không rollback analyzer.

---

# 16. Risk register và biện pháp giảm thiểu

| Rủi ro | Tác động | Xác suất | Biện pháp | Cách xác minh |
|---|---|---:|---|---|
| Instagram thay đổi path/schema export | Import thất bại | Cao theo thời gian | Adapter + tolerant extractors + safe diagnostics | Synthetic variants, compatibility tests |
| Chỉ đọc `followers_1.json` | Kết quả sai nghiêm trọng | Trung bình | Numeric multipart detection/merge | Multipart fixture/E2E |
| Manual files thiếu part | Kết quả gây hiểu nhầm | Cao | ZIP-first UX, gap detection, strong warning/block | Manual incomplete tests |
| ZIP bomb/malicious metadata | Crash/memory exhaustion | Trung bình | Centralized limits trước extraction | Boundary/security fixtures |
| Main-thread parse | UI treo | Trung bình | Dedicated worker và cancel | Responsiveness test |
| Peak memory trên mobile | Import fail/tab reload | Cao với file lớn | Selective/sequential parse, cleanup, graceful message | Mobile/large dataset profiling |
| Username đổi nhưng bị hiểu là unfollow | Mất niềm tin/pháp lý | Cao | Cẩn trọng copy và tooltip | Content review/E2E assertions |
| XSS từ handle/href | Security compromise | Thấp–trung bình | Text rendering, validated generated links | Malicious fixture tests |
| CSV formula injection | Rủi ro khi mở spreadsheet | Trung bình | Neutralization + quoting | CSV unit tests |
| IndexedDB unavailable/quota | Không lưu history | Trung bình | In-memory fallback + warning | Failure injection tests |
| Cross-account comparison | Kết quả sai | Thấp | Repository/UI guards | Isolation tests |
| Same timestamp ambiguity | Baseline không xác định | Trung bình | Warn/require edit; strict prior rule | Repository/UI tests |
| Hybrid CSP/headers không tương thích | App/worker/media route không load | Trung bình | Test production output/header config | Preview smoke/E2E |
| Third-party asset làm lộ metadata | Vi phạm privacy story | Thấp | Self-host/system assets, request assertions | Network audit |
| Dependency advisory | Security/release risk | Trung bình | Exact lockfile/audit/update policy | CI audit |
| Safari worker/IndexedDB khác biệt | Hỏng luồng trên iOS/macOS | Trung bình | WebKit tests và manual Safari QA | Browser matrix |
| Dữ liệu còn trên máy dùng chung | Privacy risk | Trung bình | Shared-device warning, one-click delete | Privacy content/delete E2E |
| Log vô tình chứa handles | Privacy breach | Thấp | Sanitized errors, logging review | Static review/tests |
| Dịch EN/VI lệch nghĩa | Claim sai | Trung bình | Typed dictionaries + copy review | Locale smoke/content checklist |
| Provider thay đổi schema/endpoint | Story feature lỗi | Cao theo thời gian | Adapter + strict response schema + kill switch | Contract tests/live smoke |
| Provider terms/privacy thay đổi | Rủi ro pháp lý/privacy | Trung bình | Re-review định kỳ và trước upgrade | Decision record/release gate |
| Provider log username | Privacy expectation sai | Cao | Pre-submit disclosure, no app persistence | Content/privacy review |
| Provider quota/rate limit/cost spike | Outage/chi phí | Trung bình–cao | Edge rate limit, quota alerts, no bulk/polling | Load/failure tests |
| Provider key/media-token secret lộ | Abuse/chi phí/security | Thấp–trung bình | Server-only env, redaction, rotation | Bundle/response scan |
| Media endpoint thành open proxy/SSRF | Hạ tầng bị khai thác | Trung bình | Authenticated-encrypted token, allowlist, IP/redirect validation | SSRF integration tests |
| Provider media URL hết hạn | Preview/download lỗi | Cao | Short TTL, fresh lookup UX | Expiry E2E |
| Media quá lớn/sai Content-Type | Memory/bandwidth/XSS | Trung bình | Stream + byte/type limits + nosniff | Mocked media tests |
| Người dùng tải/repost không có quyền | Copyright/legal risk | Trung bình | Permission reminder, no bulk archive | Terms/content review |
| Provider outage ảnh hưởng analyzer | Mất core product | Thấp nếu cô lập | Separate modules/routes/kill switch | Fault-isolation E2E |

---

# 17. Traceability từ yêu cầu đến milestone

| Nhóm yêu cầu | Milestone thực hiện | Milestone xác minh cuối |
|---|---|---|
| Relationship local-first/no credentials/no backend dependency | M1–M3 | M8, M10 |
| ZIP JSON/multipart/manual import | M2–M3 | M6, M10 |
| Normalization/diff/fingerprint | M2–M3 | M6, M10 |
| IndexedDB/multiple accounts/history | M4 | M6, M10 |
| Analyzer states/results/search/sort | M6 | M9, M10 |
| CSV local + injection safety | M6 | M8, M10 |
| Delete local data | M4, M6 | M8, M10 |
| English/Vietnamese/theme | M5 | M6, M9 |
| Landing/help/privacy/terms/FAQ | M7 | M9, M10 |
| Public Stories/Highlights lookup | M6S | M8, M9, M10 |
| Story individual preview/download | M6S | M8, M9, M10 |
| Provider secret/rate/cost/error controls | M0, M6S | M8, M10 |
| Authenticated media/SSRF/open-proxy protections | M6S | M8, M10 |
| Story network/privacy/copyright disclosure | M6S, M7 | M8, M10 |
| Accessibility/responsive | M5–M7 | M9, M10 |
| CSP/security headers/threat model | M8 | M10 |
| Performance/large data/browser matrix | M3, M6 | M9, M10 |
| Unit/component/E2E/network tests | M1–M9 | M10 |
| CI/hybrid Vercel deployment | M1, M6S | M10 |

---

# 18. Dự kiến cấu trúc file hoàn chỉnh

```text
/
├─ public/
│  ├─ favicon.ico
│  ├─ icons/
│  └─ og/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  ├─ globals.css
│  │  ├─ app/page.tsx
│  │  ├─ story-downloader/page.tsx
│  │  ├─ api/
│  │  │  ├─ stories/lookup/route.ts
│  │  │  ├─ stories/highlights/route.ts
│  │  │  ├─ stories/highlight-items/route.ts
│  │  │  └─ story-media/route.ts
│  │  ├─ how-it-works/page.tsx
│  │  ├─ privacy/page.tsx
│  │  ├─ terms/page.tsx
│  │  ├─ faq/page.tsx
│  │  ├─ not-found.tsx
│  │  └─ error.tsx
│  ├─ components/
│  │  ├─ ui/
│  │  ├─ layout/
│  │  ├─ marketing/
│  │  └─ analyzer/
│  ├─ features/analyzer/
│  │  ├─ adapters/
│  │  │  ├─ adapter.ts
│  │  │  └─ instagram/
│  │  │     ├─ instagram-adapter.ts
│  │  │     ├─ schemas.ts
│  │  │     ├─ normalize.ts
│  │  │     └─ detect-files.ts
│  │  ├─ components/
│  │  ├─ diff/
│  │  │  ├─ diff.ts
│  │  │  └─ diff.test.ts
│  │  ├─ export/
│  │  │  └─ csv.ts
│  │  ├─ hooks/
│  │  ├─ model/
│  │  ├─ persistence/
│  │  │  ├─ db.ts
│  │  │  ├─ schema.ts
│  │  │  └─ repository.ts
│  │  ├─ services/
│  │  └─ workers/
│  │     ├─ parser.worker.ts
│  │     ├─ protocol.ts
│  │     └─ worker-client.ts
│  ├─ features/stories/
│  │  ├─ adapters/
│  │  │  ├─ provider.ts
│  │  │  └─ configured-provider.ts
│  │  ├─ components/
│  │  ├─ model/
│  │  │  ├─ schemas.ts
│  │  │  ├─ types.ts
│  │  │  └─ errors.ts
│  │  ├─ services/
│  │  │  ├─ media-token.ts
│  │  │  ├─ rate-limit.ts
│  │  │  └─ story-service.ts
│  │  └─ server/
│  │     ├─ env.ts
│  │     └─ provider-client.ts
│  ├─ i18n/
│  │  ├─ en.ts
│  │  ├─ vi.ts
│  │  └─ index.ts
│  ├─ lib/
│  │  ├─ cn.ts
│  │  ├─ errors.ts
│  │  ├─ crypto.ts
│  │  └─ format.ts
│  └─ types/
├─ tests/
│  ├─ fixtures/instagram/
│  ├─ e2e/
│  └─ helpers/
├─ scripts/
├─ docs/decisions/
├─ .github/workflows/ci.yml
├─ next.config.ts
├─ eslint.config.mjs
├─ playwright.config.ts
├─ vitest.config.ts
├─ tsconfig.json
├─ package.json
├─ pnpm-lock.yaml
├─ README.md
├─ website.md
└─ plan.md
```

Cấu trúc có thể điều chỉnh nhẹ khi triển khai, nhưng phải giữ các boundary:

- UI không phụ thuộc Instagram raw schema.
- Parser/domain không phụ thuộc React/Next/Dexie/network.
- Persistence không chứa business presentation logic.
- Worker protocol typed và độc lập.
- Không tạo generic `utils/` làm nơi chứa logic không liên quan.
- Story provider/server modules không import analyzer persistence hoặc raw parser types.
- Browser Story components không import provider client/env/secrets.
- Story media route chỉ nhận authenticated-encrypted opaque references, không arbitrary URL.

---

# 19. README và tài liệu bàn giao

README cuối cùng phải có:

- [ ] Mục đích sản phẩm.
- [ ] Privacy architecture.
- [ ] Supported/unsupported inputs.
- [ ] Không cần Meta credentials.
- [ ] Local development prerequisites.
- [ ] Install/dev/test/build commands.
- [ ] Hybrid deployment instructions: static-generated pages + Story server routes.
- [ ] Project structure.
- [ ] Security/reporting contact.
- [ ] Cách tạo/cập nhật synthetic fixtures.
- [ ] Adapter architecture cho future platform.
- [ ] Known limitations.
- [ ] Không đưa real sample/export vào hướng dẫn.
- [ ] Story public-only/networked architecture và provider configuration.
- [ ] Server-only secrets, mocked development và provider kill switch.
- [ ] Provider review/logging/retention/cost limitations.
- [ ] Authenticated-encrypted media-token/SSRF security model.
- [ ] Copyright/permission guidance.

Mỗi implementation chunk khi bàn giao phải báo cáo:

1. Những file/chức năng đã thay đổi.
2. Lý do và quyết định kỹ thuật quan trọng.
3. Tests đã thêm/cập nhật.
4. Chính xác các command đã chạy.
5. Kết quả typecheck/lint/test/build/E2E.
6. Rủi ro hoặc uncertainty còn lại.
7. Milestone/checklist nào được cập nhật.

---

# 19A. M8A - Website accounts, email verification và RBAC

**Trạng thái:** Đã hoàn thành lớp mã nguồn ngày 2026-09-17; migration/live email/deployment smoke đang chờ PostgreSQL production và mật khẩu ứng dụng SMTP mới.

## 19A.1 Ranh giới dữ liệu

- [x] Folmetry account là danh tính website, không phải Instagram login.
- [x] ZIP, raw JSON, relationship records, local profile labels và snapshots tiếp tục nằm trong browser/IndexedDB.
- [x] Admin không có API hoặc UI đọc dữ liệu quan hệ cục bộ.
- [x] Story handle vẫn là luồng mạng riêng và nay yêu cầu session hợp lệ.
- [x] Privacy/spec được nâng lên revision 1.2 trước khi release auth.

## 19A.2 Authentication core

- [x] Ghim Better Auth runtime/CLI cùng phiên bản 1.6.33 đã vá security advisory.
- [x] Dùng adapter PostgreSQL và database-backed sessions.
- [x] Bật email/password; chính sách server bắt buộc 10–128 ký tự, ít nhất một chữ hoa, một chữ số và một ký tự đặc biệt.
- [x] Bổ sung username duy nhất và cho phép đăng nhập bằng email hoặc username.
- [x] Bắt buộc email verification trước khi đăng nhập.
- [x] Verification token hết hạn sau 1 giờ.
- [x] Password-reset token hết hạn sau 1 giờ.
- [x] Thu hồi sessions sau password reset.
- [x] Cookie/session options do auth library quản lý server-side.
- [x] Chỉ cho phép redirect sau auth tới allowlist same-origin.
- [x] Generic response cho forgot-password để hạn chế email enumeration.
- [x] Safe error mapping không trả exception/database detail cho UI.
- [x] Rate limit riêng cho sign-in, sign-up, verify và password reset.
- [x] Bổ sung Google OAuth qua Better Auth; chỉ bật khi có đủ server-only client ID/secret, dùng callback same-origin và rate limit social sign-in.

## 19A.3 Email

- [x] SMTP transport chỉ chạy server-side.
- [x] `SMTP_PASSWORD` chỉ lấy từ environment và không dùng `NEXT_PUBLIC_*`.
- [x] Có cả plain-text và HTML cho verification/reset email.
- [x] `.env.example` chỉ chứa placeholder, không chứa secret thật.
- [x] README yêu cầu thu hồi app password từng bị lộ.
- [!] Tạo app password Gmail mới và cấu hình trong secret store production.
- [!] Smoke test delivery, spam placement, expired link và replay token trên môi trường thật.

## 19A.4 Authorization và admin

- [x] Chỉ có role `user` và `admin`; đăng ký thường mặc định là `user`.
- [x] Email bootstrap trong `ADMIN_EMAIL` được gán role admin và vẫn phải verify email.
- [x] `/app`, `/story-downloader`, `/account`, `/admin/users` kiểm tra session ở server.
- [x] Story lookup/highlight/media APIs trả `401` nếu thiếu session.
- [x] `/admin/users` kiểm tra role server-side trước khi query.
- [x] Admin có thể list/search, đổi role, suspend/restore, revoke sessions và delete user.
- [x] UI ngăn admin tự suspend, tự hạ quyền hoặc tự xóa; server plugin tiếp tục enforce quyền.
- [x] Protected/auth routes dùng `noindex`; sitemap chỉ chứa public marketing routes.

## 19A.5 UX và vận hành

- [x] Có `/login`, `/register`, `/forgot-password`, `/reset-password`, `/account`, `/admin/users`.
- [x] Có thanh độ mạnh/checklist mật khẩu khi đăng ký và form đổi mật khẩu trong profile.
- [x] Đổi mật khẩu yêu cầu mật khẩu hiện tại và thu hồi các session khác.
- [x] `ADMIN_USERNAME` được dành riêng và tự gán cho đăng ký khớp `ADMIN_EMAIL`; không hard-code mật khẩu admin.
- [x] Header phản ánh anonymous/user/admin session và có sign-out.
- [x] Có trạng thái cấu hình auth/SMTP còn thiếu mà không hiển thị secret value.
- [x] Responsive CSS cho auth forms và admin table.
- [x] Có scripts `auth:migrate` và `auth:info` dùng cấu hình CLI tách biệt.
- [x] Có E2E auth bypass chỉ trong non-production test server; production hard-disable bằng `NODE_ENV`.
- [x] Login/register hiển thị nút Google có trạng thái pending/error và tự ẩn khi môi trường chưa cấu hình OAuth.
- [x] Hướng dẫn ZIP trong analyzer mô tả đầy đủ đường dẫn Meta, chỉ chọn Followers and following, All time, JSON và thời gian chuẩn bị dự kiến 10–15 phút.
- [!] Tạo Google OAuth Web client thật, thêm callback production và cấu hình `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` trong secret store.
- [!] Cấp managed PostgreSQL `DATABASE_URL` và chạy `pnpm auth:migrate`.
- [!] Đăng ký/verify bootstrap admin và smoke toàn bộ admin actions trên DB thật.
- [!] Cấu hình `BETTER_AUTH_URL`, `SITE_URL`, trusted production origin và HTTPS.

## 19A.6 Acceptance gates

- [x] Unit tests cho config readiness, safe redirect và safe error mapping.
- [x] TypeScript strict và ESLint pass cho auth source.
- [x] Full typecheck/lint/unit/build pass (`pnpm check`: 40 files, 225 tests) và Chromium E2E pass (20/20), gồm password-policy/strength tests.
- [!] Live PostgreSQL migration và email delivery cần external credentials mới; không dùng credential đã lộ.

---

# 19B. M8UX — Folmetry Signature Experience: big update giao diện toàn website

**Trạng thái:** Đã hoàn thành toàn bộ phạm vi implementation M8UX ngày 2026-09-18 cho art direction `Private Signal Observatory`, design system V2, global shell, landing, analyzer, Story/Highlights, auth/account/admin, editorial/utility pages, motion, responsive và accessibility hardening. `pnpm check` đạt 227/227 test, build đủ 19 route và vượt qua UI budget; Playwright đạt 102/102 ca khả dụng trên Chromium desktop/mobile, Firefox và WebKit, với 2 ca forced-colors được skip có chủ đích ở engine không hỗ trợ emulation; production audit không có lỗ hổng đã biết. Các phép đo p75 thực địa, thiết bị iOS/Android thật và production-preview sign-off là release gates sau deploy, không phải phần code còn thiếu.

### Sổ nghiệm thu M8UX (authoritative closeout)

Quy ước: `[x]` đã hoàn thành và có bằng chứng trong repository; `[-]` chủ động không áp dụng theo quyết định thiết kế/kỹ thuật; `[!]` release gate cần URL hoặc thiết bị production thật. Danh sách chi tiết bên dưới là acceptance catalog gốc; sổ nghiệm thu này là trạng thái chốt triển khai.

- [x] UX0 — inventory route/state, issue log, baseline Git `ab4606f` và tài liệu nền được lưu trong `docs/ui-foundations.md`/`website.md`.
- [x] UX1 — khóa hướng `Private Signal Observatory`, motif, anti-pattern và lý do loại hai hướng còn lại.
- [x] UX2 — token V2 cho palette/semantic color, type, spacing, container, radius, elevation, duration và easing; không có font/asset trang trí từ xa.
- [x] UX3 — primitive variants/states, field feedback, surfaces, badge semantics và component tests.
- [x] UX4 — header/footer/navigation/preferences responsive; mobile menu có focus trap, Escape, trả focus và khóa scroll đúng.
- [x] UX5 — landing, pipeline semantic, dual data boundary, How it works, FAQ, Privacy, Terms, 404 và error boundary.
- [x] UX6 — analyzer workflow rail theo state thật, import/review/results/history timeline, sticky tabs và danger zone; không đổi domain logic.
- [x] UX7 — Story/Highlights states, network disclosure, bounded media behavior và keyboard navigation cho highlights.
- [x] UX8 — auth/account/admin surfaces; admin mobile cards và dialog xác nhận theo mức rủi ro.
- [x] UX9 — motion có giới hạn, chỉ chạy khi có trạng thái phù hợp; hỗ trợ reduced-motion, save-data, tab ẩn, touch/coarse pointer và forced colors.
- [x] UX10 — automated hardening: 227 unit tests, 102 E2E pass, axe, keyboard, 320px reflow, 200% text, CLS lab, reduced motion, đa trình duyệt, production build, UI budget và dependency audit.
- [x] Visual QA thủ công bằng ảnh đại diện tại 390/768/1440 cho home, analyzer, menu mobile và editorial; ảnh tạm đã được dọn sau review.
- [x] Performance budget khóa bằng `scripts/check-ui-budget.mjs`: CSS 66,299/120,000 B; JS 1,122,971/1,500,000 B; largest chunk 228,919/300,000 B.
- [x] Rollback, asset provenance, font bake-off, motion policy và rationale được ghi trong `docs/ui-foundations.md`.
- [-] View Transition API: không bật vì hiện chưa có shared-element use case đủ giá trị; navigation vẫn native và ổn định.
- [-] WebGL, particle engine, remote font, raster decoration, fake dashboard data và design-lab route production: không dùng để giữ riêng tư, hiệu năng và tránh thẩm mỹ AI đại trà.
- [-] Pixel-snapshot CI đa hệ điều hành: không khóa ảnh bitmap dễ sai khác font/render; thay bằng geometry, overflow, axe, CLS, state và multi-browser assertions ổn định.
- [!] Đo Core Web Vitals p75/Lighthouse trên URL production với traffic thật sau deploy.
- [!] Smoke test trên iOS Safari/Android Chrome thiết bị thật, bàn phím ảo và safe-area thực.
- [!] Product/design/accessibility/privacy sign-off trên production preview.

**Mục tiêu:** đưa Folmetry từ giao diện chức năng tốt thành một sản phẩm có ngôn ngữ thị giác riêng, cao cấp, dễ nhận diện và nhất quán trên toàn bộ marketing, analyzer, Story, auth, account và admin. “Đẳng cấp” được đo bằng tính nguyên bản, độ rõ ràng, cảm giác hoàn thiện, hiệu năng và accessibility; không đo bằng số lượng hiệu ứng.

## 19B.1 Nguyên tắc chỉ đạo

- [x] Không bắt chước Instagram, Apple, Linear, Vercel hay một landing page mẫu cụ thể.
- [x] Không dùng công thức AI/SaaS đại trà: nền tím-xanh, glow khắp nơi, blob ngẫu nhiên, glass card hàng loạt, bento grid vô nghĩa, icon sparkles và copy cường điệu.
- [x] Mọi hiệu ứng phải phục vụ ít nhất một mục đích: định hướng, phản hồi thao tác, giải thích dữ liệu, thể hiện tiến trình hoặc tăng nhận diện thương hiệu.
- [x] Phần analyzer ưu tiên đọc dữ liệu và hoàn thành tác vụ; phần marketing được phép giàu không khí hơn nhưng không hy sinh tốc độ.
- [x] Không dùng animation để che loading thật, trì hoãn dữ liệu hoặc làm người dùng chờ.
- [x] Không đưa dữ liệu Instagram thật vào visual trang marketing, asset demo hoặc screenshot public.
- [x] Không thêm tracker, remote font, remote texture, remote icon hoặc CDN asset chỉ để trang trí.
- [x] Light, dark và system là ba trải nghiệm được thiết kế thực sự, không phải đảo màu cơ học.
- [x] EN/VI phải được kiểm tra độc lập vì tiếng Việt dài và có dấu, không thiết kế chỉ theo chuỗi tiếng Anh ngắn.
- [x] WCAG 2.2 AA, `prefers-reduced-motion`, keyboard và screen reader là constraint ngay từ concept.

## 19B.2 Art direction — “Private Signal Observatory”

Folmetry được định vị như một **đài quan sát tín hiệu quan hệ cá nhân**: riêng tư, chính xác, điềm tĩnh và có chiều sâu. Ngôn ngữ hình ảnh lấy cảm hứng từ signal map, snapshot, timeline và local processing, nhưng không biến thành giao diện sci-fi giả lập.

### Dấu ấn nhận diện bắt buộc

- [x] Một "signal field" riêng của Folmetry: mạng điểm/đường rất tiết chế, sinh từ SVG/CSS local, dùng như motif nền hoặc divider chứ không phải biểu đồ dữ liệu giả.
- [x] Một hệ “snapshot frames”: khung lớp, đường thời gian và điểm neo thể hiện trước/sau, dùng nhất quán trong hero, import progress và history.
- [x] Một chi tiết "local pulse": tín hiệu vòng ngắn biểu thị xử lý ngay trên thiết bị; không dùng cloud icon chung chung.
- [x] Typography có nhịp editorial rõ: display, interface, numeric và mono/metadata; số liệu phải là nhân vật chính trong dashboard.
- [x] Góc, đường viền, shadow và độ sâu có quy luật; không để mỗi card mang một phong cách.
- [x] Logo hiện tại được giữ nguyên tài sản gốc; chỉ chuẩn hóa clear-space, kích thước và cách đặt trên surface.

### Những thứ chủ động không dùng

- [x] Không nền sao chuyển động, mưa ma trận, particle chạy liên tục hoặc WebGL chỉ để gây ấn tượng.
- [x] Không custom cursor, cursor trail, scroll hijacking hoặc magnetic button làm thay đổi hành vi con trỏ.
- [x] Không parallax mạnh, tilt 3D trên mọi card hoặc perspective gây chóng mặt.
- [x] Không chữ gradient trên tất cả heading.
- [x] Không glassmorphism nếu surface không có lý do phân lớp rõ ràng.
- [x] Không fake terminal, fake code block hoặc fake security badge.
- [x] Không animation loop vô hạn trong analyzer, auth và admin.

## 19B.3 Discovery và baseline trước khi thiết kế

### Kiểm kê route/state

- [x] `/`: hero, trust boundary, product value, how-it-works, limitations, FAQ preview, CTA.
- [x] `/app`: loading, no account, ready import, drag active, parsing, review, saving, first result, historical result, error, dialogs.
- [x] `/story-downloader`: idle, loading, empty, private/unavailable, rate limit, gallery, highlights, expired media.
- [x] `/login`, `/register`, `/forgot-password`, `/reset-password`.
- [x] `/account`: profile, verification, password change, session controls.
- [x] `/admin/users`: loading, search, empty, pagination, actions, destructive confirmation.
- [x] `/how-it-works`, `/faq`, `/privacy`, `/terms`.
- [x] `404`, error boundary, auth-not-configured và offline/degraded states.

### Baseline bắt buộc lưu trước khi sửa

- [ ] Screenshot light/dark, EN/VI tại 360, 390, 768, 1024, 1440 và 1920px.
- [ ] Screenshot các state analyzer chính bằng fixture synthetic.
- [ ] Ghi kích thước CSS/JS hiện tại theo route và số request asset.
- [ ] Đo LCP, INP proxy/lab interaction, CLS và Lighthouse cho landing/analyzer shell.
- [ ] Ghi contrast, target size, focus visibility và số axe violations.
- [ ] Lập inventory token/component đang dùng và chỗ CSS bị trùng/ngoại lệ.
- [ ] Ghi lại vấn đề layout hiện tại: hierarchy, density, whitespace, line length, responsive, table và footer.
- [ ] Không xóa screenshot baseline cho đến khi visual review cuối hoàn tất.

## 19B.4 Concept sprint và duyệt hướng

Không code production ngay từ moodboard. Tạo ba concept tĩnh cho cùng một tập nội dung thật của Folmetry:

1. **Signal Observatory** — tối, sâu, precision, topology tiết chế.
2. **Editorial Intelligence** — sáng, typography mạnh, data-first, gần sản phẩm nghiên cứu cao cấp.
3. **Dual Realm** — marketing giàu chiều sâu, workspace trung tính và cực rõ.

Mỗi concept phải có:

- [ ] Hero desktop và mobile.
- [ ] Analyzer dashboard với dữ liệu synthetic.
- [ ] Form đăng ký và password strength.
- [ ] Footer/legal section.
- [ ] Light/dark pair.
- [ ] Motion storyboard 6–10 frame cho navigation/import/result reveal.
- [ ] Giải thích vì sao concept phù hợp Folmetry và điểm nào không được dùng.

Gate duyệt concept:

- [ ] Nhận diện được Folmetry khi bỏ logo khỏi mockup.
- [ ] Không bị nhầm với template AI/SaaS phổ biến.
- [ ] Dữ liệu và privacy boundary vẫn dễ hiểu trong 5 giây đầu.
- [ ] Mobile không phải bản desktop bị co lại.
- [ ] Hiệu ứng có fallback tĩnh đẹp và đầy đủ thông tin.

## 19B.5 Design token architecture V2

### Color

- [ ] Tách primitive palette khỏi semantic token.
- [ ] Semantic roles tối thiểu: canvas, elevated, inset, interactive, text-primary, text-secondary, text-tertiary, border-subtle, border-strong, signal, positive, warning, danger, info và focus.
- [ ] Có token cho data series và delta positive/negative/neutral; không dùng màu làm tín hiệu duy nhất.
- [ ] Light theme dùng nền trung tính có độ ấm nhẹ, không phải trắng tuyệt đối trên toàn trang.
- [ ] Dark theme dùng graphite nhiều lớp, tránh đen tuyệt đối và tránh bloom quá mức.
- [ ] Kiểm tra contrast cho text, icon, border quan trọng, focus ring và chart.

### Typography

- [ ] Thực hiện font bake-off với nội dung EN/VI thật và bảng số liệu.
- [ ] Chỉ chọn font có giấy phép rõ ràng, hỗ trợ đầy đủ dấu tiếng Việt và có thể self-host.
- [ ] Không chọn font chỉ vì đang phổ biến trong website AI.
- [ ] Xác định roles: display, heading, body, UI label, numeric/tabular và code/metadata.
- [ ] Dùng fluid type scale có giới hạn; không để hero lấn át nội dung ở laptop thấp.
- [ ] Giới hạn line length theo loại nội dung; legal/editorial không vượt quá ngưỡng đọc thoải mái.
- [ ] Bật `font-variant-numeric: tabular-nums` cho dashboard và history.

### Space, grid và shape

- [ ] Dùng spacing scale cố định thay cho margin rời rạc.
- [ ] Container tiers: reading, form, workspace và wide-data.
- [ ] Grid 4 cột mobile, 8 cột tablet, 12 cột desktop với gutter fluid.
- [ ] Density modes theo ngữ cảnh: expressive marketing, comfortable product, compact admin.
- [ ] Radius scale và shadow/elevation scale có tối đa số cấp cần thiết.
- [ ] Border/highlight dùng để tạo cấu trúc trước khi dùng shadow.
- [ ] Safe-area inset và viewport động trên mobile được tính từ đầu.

### Motion tokens

- [ ] Duration tiers gợi ý: instant 80–120ms, response 160–220ms, transition 280–420ms, narrative tối đa 700ms.
- [ ] Easing riêng cho enter, exit, emphasis và progress.
- [ ] Chỉ animate `transform`, `opacity` hoặc thuộc tính đã benchmark khi có thể.
- [ ] Không animate layout lớn gây CLS hoặc main-thread jank.
- [ ] Reduced-motion thay chuyển động bằng opacity/color/state tức thời; không chỉ đặt duration bằng 0 một cách mù quáng.

## 19B.6 Component system V2

### Primitives

- [ ] Button/LinkButton với primary, secondary, quiet, danger và icon-only.
- [ ] Input, select, password, search, file picker, checkbox/switch nếu thực sự cần.
- [ ] Field anatomy thống nhất: label, hint, requirement, error, success và character/state feedback.
- [ ] Card/surface variants: plain, elevated, inset, interactive và critical.
- [ ] Badge/status, progress, skeleton, empty state, inline notice, toast/status region.
- [ ] Tabs, segmented control, pagination, dialog, dropdown/menu và tooltip/popover.
- [ ] Tooltip/popover phải dismissible, hoverable, persistent và dùng được bằng keyboard.
- [ ] Mỗi primitive có focus, disabled, loading, error, dark/light và reduced-motion states.

### Data components

- [ ] Metric card có hierarchy số liệu, delta và context rõ.
- [ ] Relationship row/card responsive; không ép table desktop lên mobile.
- [ ] Timeline snapshot và compare rail thể hiện thời gian thật, không trang trí giả.
- [ ] Sparkline chỉ dùng khi có chuỗi dữ liệu đủ nghĩa; luôn có text equivalent.
- [ ] Data table admin có sticky header hợp lý, overflow kiểm soát và action không làm cột vỡ.
- [ ] Empty/zero/unknown/error là bốn state khác nhau về copy và hình ảnh.

### Internal design lab

- [ ] Tạo route/dev harness nội bộ hoặc fixture page không index/không ship production nếu cần.
- [ ] Render mọi component, theme, locale, viewport và state từ dữ liệu synthetic.
- [ ] Dùng design lab làm nguồn screenshot regression; không biến nó thành dependency nặng nếu component tests đủ dùng.

## 19B.7 Global shell, navigation và footer

- [x] Header desktop có hierarchy rõ giữa brand, product navigation, account và preferences.
- [x] Header tablet không wrap ngẫu nhiên; có breakpoint/chế độ điều hướng được thiết kế riêng.
- [ ] Mobile navigation dùng panel/menu có focus management, close bằng Escape và không khóa sai scroll.
- [x] Active route dùng nhiều hơn màu: weight, marker và `aria-current`.
- [x] Theme/locale controls gọn, không cạnh tranh CTA chính.
- [x] Sticky behavior không che focus target hoặc heading anchor.
- [x] Footer có brand summary, privacy boundary, legal navigation và disclaimer với hierarchy rõ.
- [x] Không có vùng rỗng bất thường, overlap hoặc footer bị dồn ở viewport thấp.
- [ ] Route transition chỉ bật progressive enhancement; điều hướng vẫn hoàn chỉnh nếu API không hỗ trợ.

## 19B.8 Landing page redesign

- [ ] Hero trình bày đúng hai miền dữ liệu: relationship analysis local và Story lookup qua network.
- [x] Signature signal field chạy nhẹ, local và không đọc dữ liệu người dùng.
- [x] CTA chính vào analyzer; CTA phụ giải thích quy trình.
- [x] Trust proof không dùng logo/chứng nhận giả; dùng facts có thể kiểm chứng.
- [ ] Minh họa quy trình ZIP → worker → IndexedDB → insight bằng visual semantic.
- [ ] Demo dashboard dùng synthetic handles/counts được đánh dấu là minh họa.
- [ ] Scroll reveal theo section, không reveal từng dòng chữ.
- [x] Nội dung limitations/legal không bị thu nhỏ hoặc giấu để đổi lấy vẻ đẹp.
- [x] Mobile hero giảm decor, ưu tiên headline/CTA và không đẩy giá trị chính xuống quá sâu.

## 19B.9 Analyzer redesign

Analyzer là trọng tâm sản phẩm; hiệu ứng phải giảm sau khi người dùng bắt đầu thao tác.

- [ ] Tách rõ ba vùng: local profile, import/workflow, insight/history.
- [ ] Có step/state indicator dựa trên state machine thật, không tạo progress giả.
- [ ] Drop zone có trạng thái idle/hover/drag/validating/parsing/error riêng.
- [ ] “Local processing” effect chỉ chạy trong import thật; dừng ngay khi complete/cancel/error.
- [ ] Review import dùng summary layout dễ quét và cảnh báo có priority.
- [ ] Result overview ưu tiên metric, relationship categories và snapshot context.
- [ ] Count reveal không che số cuối, không chạy lâu và tắt khi reduced motion.
- [ ] Result tabs sticky có kiểm soát trên desktop, chuyển thành scroll/selector hợp lý trên mobile.
- [ ] List row có search/sort/copy/open-profile nhưng không biến thành bảng action dày đặc.
- [ ] History dùng visual timeline/compare rail; luôn kèm date/count text.
- [ ] Destructive controls tách khỏi primary workflow và có confirmation rõ.
- [ ] Large dataset không làm tăng DOM/animation tuyến tính theo số record.
- [ ] Không render particle/node cho từng follower.

## 19B.10 Story/Highlights redesign

- [ ] Network disclosure đặt ngay cạnh input nhưng ngắn, dễ đọc và không giống banner lỗi.
- [ ] Public-only, provider/network và copyright boundary có hierarchy riêng.
- [ ] Search state chuyển đổi mượt nhưng luôn phản ánh request thật.
- [ ] Gallery dùng aspect ratio ổn định, skeleton đúng kích thước và lazy loading.
- [ ] Highlight selector dùng cover/title/count rõ, keyboard navigation đầy đủ.
- [ ] Video không autoplay có âm thanh; controls và error/expired state dễ nhận biết.
- [ ] Download action không bị lẫn với navigation hoặc preview.
- [ ] Không dùng hiệu ứng làm tăng số media request hoặc preload ngoài ý muốn.

## 19B.11 Auth, account và admin redesign

- [x] Auth shell tạo cảm giác tin cậy, tập trung; decor không gây nhiễu form.
- [x] Password strength dễ hiểu, không chỉ đổi màu và không cổ vũ mật khẩu yếu.
- [ ] Verification/reset/setup states dùng cùng một status language.
- [ ] Account chia identity, security, sessions và privacy boundary thành nhóm rõ.
- [ ] Admin có density cao hơn nhưng vẫn thoáng, scan nhanh và không giấu destructive action.
- [ ] Table chuyển thành cards/rows trên mobile thay vì scroll ngang vô hạn khi khả thi.
- [ ] Ban/delete/role change có affordance khác nhau và confirmation phù hợp mức rủi ro.
- [ ] Không hiển thị dữ liệu relationship local trong bất kỳ mockup/admin surface nào.

## 19B.12 Editorial, legal, error và utility pages

- [ ] How-it-works có visual sequence đồng bộ với analyzer thật.
- [ ] FAQ accordion có rhythm tốt, focus rõ và không animate height gây giật.
- [ ] Privacy/Terms ưu tiên đọc dài: mục lục, anchor, line length và heading hierarchy.
- [ ] Legal copy không bị đặt trong font quá nhỏ hoặc contrast thấp.
- [ ] 404/error có personality Folmetry nhưng CTA phục hồi rõ ràng.
- [ ] Setup/degraded states đưa ra hành động cụ thể, không lộ secret/config value.

## 19B.13 Motion và hiệu ứng công nghệ

### Được phép sau khi prototype/benchmark

- [x] CSS/SVG signal field tĩnh hoặc chuyển động rất chậm ở marketing hero.
- [ ] View Transition API cho route/state transition theo progressive enhancement.
- [ ] CSS view/scroll timeline cho một số section marketing nếu browser hỗ trợ.
- [ ] Mask/reveal, line draw và number transition ngắn gắn với trạng thái thật.
- [ ] Subtle pointer response trên desktop có hover; không áp dụng thiết bị touch.
- [x] Gradient/noise local nhẹ để tạo vật liệu, với fallback solid.

### Guardrails

- [x] Không dùng WebGL/Three.js mặc định; chỉ xem xét nếu prototype chứng minh giá trị khác biệt và đạt budget.
- [x] Không JS `scroll` listener cho animation nếu CSS/progressive enhancement đủ dùng.
- [x] Không hơn một hiệu ứng "hero" nổi bật trong cùng viewport.
- [ ] Không animation khi tab background, save-data hoặc reduced-motion.
- [ ] Không flashing quá ngưỡng an toàn; không strobe/chromatic aberration liên tục.
- [ ] Focus, click, type, drag và submit phải có phản hồi trong khoảng cảm nhận tức thời.
- [ ] Hover content phải dismissible/hoverable/persistent theo WCAG.

## 19B.14 Asset và illustration pipeline

- [ ] Mọi asset có owner, license, source và mục đích rõ.
- [x] Ưu tiên SVG/CSS/code-native cho topology, icons và diagrams.
- [ ] Chỉ dùng raster khi chất liệu thực sự cần; tạo nhiều kích thước và nén phù hợp.
- [ ] Không nhúng base64 lớn vào CSS/JS.
- [ ] Logo/icon có kích thước khai báo để tránh CLS.
- [x] Decorative asset có `alt=""`; informative graphic có text alternative.
- [x] Không dùng ảnh stock "người nhìn dashboard" hoặc hình AI chung chung.
- [ ] Icon set nhất quán stroke/optical size; không trộn nhiều bộ icon.

## 19B.15 Performance budget

Baseline được đo trước; redesign không được regression không kiểm soát.

- [ ] Core Web Vitals target tại p75: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
- [ ] Marketing Lighthouse Performance mục tiêu ≥ 95 trên profile đã thống nhất.
- [ ] Không tăng route JavaScript marketing quá 10% baseline nếu không có justification đo được.
- [ ] Motion/decor không được nằm trong critical path của analyzer/auth/admin.
- [ ] Không có animation task dài > 50ms trong interaction trace mục tiêu.
- [ ] Không tạo CLS từ font, hero art, media gallery, toast hoặc status transition.
- [ ] Font subset theo script/weight thực dùng; preload tối thiểu và có fallback metrics phù hợp.
- [ ] SVG/filter/noise được benchmark trên mobile; bỏ filter gây paint cost cao.
- [ ] Story gallery giữ bounded concurrent media và không preload toàn bộ video.
- [ ] Analyzer large-list performance không giảm vì visual wrapper/effect.

## 19B.16 Accessibility và reduced experience

- [ ] WCAG 2.2 AA manual review trên mọi route/state quan trọng.
- [ ] Target tối thiểu 24×24 CSS px theo AA; mục tiêu sản phẩm 44×44 cho control chính.
- [ ] Focus không bị sticky header/dialog che và luôn có indicator đủ contrast.
- [ ] Zoom 200% và text-only zoom không gây overlap/cắt nội dung.
- [x] Reflow 320px không cần scroll ngang ngoại trừ vùng dữ liệu có lý do/documentation.
- [ ] Keyboard hoàn thành được đăng ký, import, review, results, history, Story và admin.
- [ ] Screen reader nhận state/progress/error mà không bị live region spam.
- [ ] Mọi interaction kéo có single-pointer/button alternative.
- [x] Reduced-motion screenshot và E2E xác nhận không còn transform/parallax bắt buộc.
- [ ] High-contrast/forced-colors smoke test cho navigation, form, focus và trạng thái.

## 19B.17 Responsive strategy

- [ ] 320–430px: single-column, sticky actions có safe-area, không miniaturize desktop.
- [ ] 600–900px: tablet layout riêng; navigation, card grid và admin không wrap ngẫu nhiên.
- [x] 1024–1440px: workspace tận dụng chiều rộng nhưng giữ reading measure.
- [x] ≥1440px: constrained composition, không kéo paragraph/card rỗng hết màn hình.
- [ ] Landscape mobile/tablet được kiểm tra với keyboard ảo và dialog.
- [ ] Vietnamese wrapping được test ở width nhỏ nhất trước khi duyệt component.
- [x] Footer, header, tabs, result controls và auth form không overlap ở mọi target width.

## 19B.18 Implementation sequence

### UX0 — Audit và baseline

- [ ] Hoàn tất inventory, screenshots, metrics, route/state matrix và issue log.
- [x] Cập nhật `website.md` revision mới để thay thế chỉ dẫn “minimal decorative animation” bằng motion policy M8UX đã duyệt.

### UX1 — Art direction

- [ ] Tạo ba concept, chọn một, khóa signature motifs và anti-pattern list.
- [ ] Duyệt cả desktop/mobile, light/dark và EN/VI trước khi code production.

### UX2 — Foundations

- [x] Token V2, system-font pipeline không remote request, grid/container, elevation, motion và icon rules.
- [ ] Migration map từ token/component cũ; tránh big-bang CSS không kiểm soát.

### UX3 — Primitives và design lab

- [ ] Xây primitives, interaction states, component tests và visual fixtures.
- [ ] Không migrate page khi primitive nền chưa đạt accessibility gate.

### UX4 — Global shell

- [x] Header/navigation/footer/preferences và responsive shell; chủ động không thêm route transition khi chưa có shared-element use case đủ giá trị.

### UX5 — Marketing/editorial

- [x] Home, how-it-works, FAQ, privacy, terms, 404/error.
- [ ] Chốt marketing performance trước khi thêm effect thứ hai.

### UX6 — Analyzer

- [x] Migrate tuần tự theo state: no-account → import → progress → review → results → history/error.
- [ ] So sánh với fixture và baseline sau mỗi state; không đổi domain logic.

### UX7 — Story/media

- [x] Migrate lookup, disclosure, state feedback, galleries, highlights và download.

### UX8 — Auth/account/admin

- [x] Migrate auth forms, password feedback, account security và admin data surfaces.

### UX9 — Motion pass

- [x] Chỉ thêm motion sau khi static hierarchy, responsive và accessibility đã đạt.
- [ ] Profile paint/composite/main-thread sau từng nhóm effect.

### UX10 — Hardening và rollout

- [ ] Visual regression, multi-browser, mobile devices, axe/manual WCAG, Lighthouse và production preview.
- [ ] Fix theo severity; không chấp nhận “đẹp trên máy thiết kế” làm gate.

## 19B.19 Test strategy

### Automated

- [ ] Component tests cho variants/states của primitives.
- [ ] Screenshot visual regression tại 390, 768, 1440 cho light/dark và EN/VI representative routes.
- [x] E2E geometry assertions: không overlap, không clipping, không unexpected horizontal overflow.
- [x] E2E reduced-motion và keyboard navigation.
- [ ] Axe trên landing, auth, analyzer states, Story results, account, admin và legal.
- [ ] CLS assertions quanh font/media/status loading khi công cụ cho phép.
- [ ] Bundle/CSS budget report trong CI.
- [x] Production build và route smoke không phụ thuộc animation API.

### Manual visual review

- [ ] Chrome, Edge, Firefox, Safari/WebKit.
- [ ] iOS Safari và Android Chrome representative.
- [ ] 100%, 125%, 150%, 200% zoom.
- [ ] Light/dark/system; EN/VI; reduced motion; forced colors.
- [ ] Slow CPU/network, offline/degraded provider và large dataset.
- [ ] Header/footer ở viewport thấp, keyboard mở, address bar động và safe area.

## 19B.20 Review gates và tiêu chí loại bỏ

Một thiết kế/effect bị loại nếu có một trong các điều kiện:

- [ ] Chỉ tồn tại để “trông công nghệ” nhưng không hỗ trợ nội dung/tác vụ.
- [ ] Giống rõ ràng template AI/SaaS phổ biến hoặc trade dress của thương hiệu khác.
- [ ] Làm sai privacy boundary hoặc tạo cảm giác Folmetry kết nối trực tiếp tài khoản Instagram.
- [ ] Không có reduced-motion/fallback hợp lệ.
- [ ] Tăng LCP/INP/CLS hoặc bundle vượt budget mà không có lợi ích đo được.
- [ ] Làm keyboard, screen reader, zoom hoặc mobile khó hơn.
- [ ] Tạo layout shift, overlap, scroll ngang hoặc làm mất nội dung tiếng Việt.
- [ ] Dùng dữ liệu giả như thể đó là dữ liệu thật của người dùng.
- [ ] Tăng network/media request ngoài ý muốn.

## 19B.21 Rollout và rollback

- [ ] Triển khai trên branch/preview riêng; không redesign trực tiếp production từng mảnh không đồng bộ.
- [ ] Chia PR theo foundation/shell/route family để review được.
- [ ] Giữ domain, persistence, auth và provider contracts ổn định trong redesign.
- [ ] Có checklist rollback token/shell/motion nếu production metric regression.
- [ ] So sánh before/after bằng screenshot và metric, không chỉ nhận xét cảm tính.
- [ ] Sau rollout kiểm tra field Core Web Vitals, lỗi client, conversion chính và support feedback.
- [ ] Không dùng dark pattern hoặc analytics xâm phạm riêng tư để đo “engagement”.

## 19B.22 Definition of Done M8UX

- [x] Art direction được duyệt và có thể nhận diện khi ẩn logo.
- [x] Tất cả route/state trong inventory đã migrate hoặc có quyết định giữ nguyên bằng văn bản.
- [x] Design tokens/primitives V2 thay thế style rời rạc; không còn duplicate CSS nghiêm trọng.
- [x] Light/dark/system và EN/VI hoàn chỉnh.
- [x] Desktop/tablet/mobile không overlap, clipping hoặc overflow ngoài chủ đích.
- [x] Motion có ý nghĩa, không jank và reduced-motion hoàn chỉnh.
- [x] WCAG automated gates đạt; axe, keyboard, 320px reflow, 200% text và forced-colors đều có E2E.
- [!] WCAG manual gate trên thiết bị thật cần thực hiện ở production preview.
- [x] Bundle và CLS laboratory không vượt budget.
- [!] Core Web Vitals p75 cần đo bằng telemetry sau deploy.
- [x] Analyzer large-data và Story media behavior không regression trong fixture/E2E.
- [-] Không dùng pixel-snapshot CI đa hệ điều hành; dùng geometry/state/axe/CLS/multi-browser assertions ổn định thay thế.
- [!] Production preview cần sign-off về product, design, accessibility, privacy và engineering.
- [x] `pnpm check`, full E2E đa trình duyệt, dependency audit và local production build/smoke pass.

## 19B.23 Tài liệu chuẩn dùng khi triển khai

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): focus, target size, dragging, hover/focus content và motion.
- [Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds): đánh giá LCP, INP, CLS ở percentile 75; không đánh đổi trải nghiệm thật lấy điểm demo.
- [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API): progressive enhancement, không phải dependency chức năng.
- [CSS scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations): chỉ dùng với `@supports`, reduced-motion và fallback tĩnh.

---

# 19C. M8SYNC — Đồng bộ đa thiết bị và phân vùng Instagram/Facebook

**Trạng thái:** Đã triển khai code ngày 2026-09-22; còn production smoke test sau deploy.

## 19C.1 Kiến trúc dữ liệu

- [x] ZIP/JSON thô tiếp tục được đọc trong Web Worker trên thiết bị và không upload.
- [x] Chỉ dữ liệu quan hệ đã chuẩn hóa, fingerprint, cảnh báo và metadata snapshot được gửi sau khi user xác nhận lưu.
- [x] Thay analyzer persistence mặc định từ IndexedDB sang PostgreSQL server.
- [x] Tạo bảng `folmetry_analyzer_account` và `folmetry_analyzer_snapshot` với foreign key cascade.
- [x] Unique constraint cho fingerprint và `snapshotAt` trong cùng hồ sơ.
- [x] Giới hạn request đồng bộ 4 MiB và trả mã lỗi an toàn, không lộ chi tiết database.
- [x] Khi đồng bộ lỗi, kết quả hiện tại vẫn ở memory để user có thể xuất CSV.
- [-] Không tự động upload dữ liệu IndexedDB cũ: thay đổi kỳ vọng riêng tư và ownership của database legacy không đủ chắc chắn; user re-import bản xuất gốc.

## 19C.2 Authorization và isolation

- [x] Mọi route `/api/analyzer` bắt buộc Better Auth session.
- [x] `owner_id` chỉ lấy từ session server; client không truyền owner ID.
- [x] Mọi query account/snapshot/delete đều lọc theo `owner_id`.
- [x] Snapshot write khóa và kiểm tra account thuộc đúng owner/platform trong transaction.
- [x] Xóa Folmetry user cascade toàn bộ analyzer data của chính user đó.
- [x] Admin UI không có endpoint đọc relationship records của user.
- [x] Validate lại label, username, relationship records, warning codes, fingerprint và metadata ở server.
- [x] Raw exception/database detail không trả về client.

## 19C.3 UX đa nền tảng

- [x] Header có hai khu vực cấp cao rõ ràng: Instagram và Facebook.
- [x] `/instagram` là hub cho phân tích quan hệ và tiện ích Story/Highlights.
- [x] `/facebook` có route, định vị và trạng thái chưa hỗ trợ trung thực.
- [x] Không bật tạo profile/import Facebook trước khi có fixtures và adapter đã xác minh.
- [x] Analyzer copy EN/VI giải thích file thô cục bộ và snapshot chuẩn hóa đồng bộ server.
- [x] Các thao tác xóa nói rõ ảnh hưởng trên mọi thiết bị.
- [x] Footer đổi từ `LOCAL / PRIVATE` sang `SYNC / PRIVATE`.

## 19C.4 Tài liệu và nghiệm thu

- [x] `website.md` revision 1.4 supersede các cấm cloud sync cũ.
- [x] README mô tả đúng ranh giới dữ liệu mới.
- [x] Thêm `docs/cloud-sync.md` và cập nhật analyzer workflow.
- [x] TypeScript strict và ESLint pass.
- [x] Unit/component tests cập nhật theo IA/copy mới.
- [ ] Production smoke: tạo snapshot ở thiết bị A, đăng nhập cùng account ở thiết bị B và xem đúng dữ liệu.
- [ ] Production isolation: account B không đọc/sửa/xóa được ID của account A.
- [ ] Production deletion: xóa profile/snapshot/user và kiểm tra cascade thật trên PostgreSQL.
- [ ] Xác minh payload của các account lớn hơn giới hạn hosting; thiết kế chunking trước khi nâng giới hạn parser production.

---

# 19D. M8UX2 — Kinetic Signal Atlas: đại nâng cấp trải nghiệm V3

**Trạng thái:** Đã hoàn thành phạm vi implementation và kiểm thử local ngày 2026-09-23. Hệ `Kinetic Signal Atlas` đã được áp dụng cho shell, landing, platform hubs, analyzer, Story/Highlights, auth, account, admin và editorial surfaces mà không thay đổi parser, auth contract, database ownership hay Story provider contract. Historical diff được mở rộng riêng theo yêu cầu sau đó để nhận diện bảo thủ trường hợp có thể đổi username bằng timestamp duy nhất. Các gate cần hạ tầng/thiết bị thật — production-preview approval, field Core Web Vitals p75, iOS/Android thật và smoke test PostgreSQL/provider — vẫn mở và không được báo cáo như bằng chứng local.

## 19D.0 Biên bản triển khai M8UX2

- [x] Áp dụng art direction `Kinetic Signal Atlas`: technical-paper/graphite canvas, signal aperture, coordinate axis, boundary rail và typography số liệu.
- [x] Chuyển global shell thành navigation instrument, giữ `aria-current`, focus trap, Escape, restore focus, EN/VI và light/dark/system.
- [x] Tạo lớp route transition bằng React `ViewTransition`/`transitionTypes` theo tài liệu Next.js 16.3.5; browser không hỗ trợ vẫn điều hướng bình thường.
- [x] Thiết kế lại landing và Instagram/Facebook hubs với hai dialect rõ ràng: Instagram đang hoạt động, Facebook là blueprint trung thực.
- [x] Thiết kế lại analyzer theo workflow thật và `data-workflow-state`; phân tách profile, import, review, insight, history và danger zone.
- [x] Nâng Story/Highlights, auth, account và admin bằng cùng ngôn ngữ instrument nhưng giữ mức motion phù hợp ngữ cảnh.
- [x] Bổ sung shared transition cho tab panel; giữ keyboard semantics và nội dung tức thời khi reduced motion.
- [x] Bổ sung chế độ giảm motion, save-data, document-hidden, coarse pointer và forced-colors; không thêm animation framework/WebGL/remote asset.
- [x] Kiểm tra trực quan representative desktop/mobile cho landing, Instagram hub, analyzer và Story utility; sửa CTA fold, analyzer hero width và mobile gutter phát hiện trong review.
- [x] Cập nhật E2E theo IA `Instagram/Facebook` và thuật ngữ `Instagram profile`; kiểm thử đồng bộ yêu cầu PostgreSQL được skip minh bạch khi thiếu `DATABASE_URL`.
- [x] Siết CSS production budget từ 120 KB xuống 110 KB; JS total/largest chunk giữ nguyên gate hiện có.
- [x] Ghi decision, motion policy, asset provenance, performance evidence và rollback trong `docs/ui-foundations.md`.
- [x] `pnpm check` đạt: strict typecheck, zero-warning lint, 47 test files/247 tests, production build 23 trang/route; budget đạt với 89.724 B CSS, 1.147.779 B static JS và chunk lớn nhất 228.919 B.
- [x] Playwright chạy ma trận 128 ca trên Chromium desktop/mobile, Firefox và WebKit: 111 pass, 14 skip có chủ đích; 3 request database timeout khi chạy 6 workers và toàn bộ assertion liên quan pass 6/6 khi chạy lại tuần tự.
- [x] `pnpm audit --prod --audit-level high` không phát hiện lỗ hổng đã biết.
- [!] Chạy production-preview approval trên deployment thật.
- [!] Đo Core Web Vitals p75 bằng RUM sau khi có đủ traffic đại diện.
- [!] Kiểm tra iOS Safari và Android Chrome trên thiết bị vật lý.
- [!] Chạy smoke test PostgreSQL/provider thật với secret đã cấu hình ngoài source.

**Mục tiêu:** đưa Folmetry từ một sản phẩm đã sạch và có bản sắc thành một trải nghiệm số có khả năng nhận diện ngay cả khi bỏ logo: chính xác như một công cụ quan sát, có nhịp điệu như một ấn phẩm tương tác, và chuyển động như dữ liệu đang đi qua các ranh giới thật. “Đẳng cấp” phải được chứng minh bằng bố cục, typography, chất liệu, phản hồi thao tác, độ mượt, accessibility và hiệu năng; không được đo bằng số lượng hiệu ứng.

## 19D.1 Quyết định art direction

Tên hệ thống V3: **Kinetic Signal Atlas** — “bản đồ tín hiệu chuyển động”. Đây là bước phát triển trực tiếp của `Private Signal Observatory`, giữ motif signal/snapshot/timeline nhưng nâng từ các card tĩnh thành một hệ không gian có trục, lớp và chuyển động có nguyên nhân.

### Dấu ấn nhận diện bắt buộc

- [x] **Signal aperture:** một cửa quan sát dạng khung cắt, đường ngắm và tọa độ; chỉ xuất hiện ở hero hoặc thời điểm bắt đầu workflow, không lặp trên mọi card.
- [x] **Snapshot ribbon:** dải thời gian có điểm neo thật cho import, lịch sử và so sánh; không dùng timeline giả nếu chưa có dữ liệu.
- [x] **Boundary handoff:** chuyển động minh họa rõ ba trạng thái `thiết bị → xác nhận → đồng bộ riêng tư`, tuyệt đối không ngụ ý ZIP thô được upload.
- [x] **Metric typography:** số liệu dùng nhịp tabular, baseline và dấu delta riêng; số là nội dung chính chứ không phải vật trang trí.
- [x] **Signal trace:** đường viền sáng ngắn chạy đúng lúc focus, upload, hoàn tất hoặc chọn snapshot; không chạy nền vô hạn.
- [x] **Material hierarchy:** canvas, paper, instrument và data-well có chất liệu khác nhau bằng màu/viền/noise local rất nhẹ; không phủ glassmorphism toàn site.
- [x] **Instagram/Facebook dialect:** cùng design system, cấu trúc hero/tool grid và responsive; nội dung, URL và ngữ nghĩa dữ liệu vẫn phân biệt rõ từng nền tảng.

### Anti-template manifesto

- [x] Không dùng hero “gradient tím-xanh + heading khổng lồ + hai nút + blob”.
- [x] Không dùng bento grid chỉ để lấp nội dung, card nổi giống nhau hoặc icon sparkle đại trà.
- [x] Không fake terminal, fake AI chat, fake biểu đồ, fake testimonial, fake số người dùng hoặc logo khách hàng.
- [x] Không particle field ngẫu nhiên, nền sao, mesh chuyển động vô hạn, WebGL phô diễn hoặc 3D không liên quan dữ liệu.
- [x] Không custom cursor, cursor trail, scroll hijacking, magnetic control hoặc âm thanh tự phát.
- [x] Không dùng animation để che request chậm, trì hoãn nội dung, ép người dùng xem intro hoặc làm sai tiến trình thực.
- [x] Không sao chép trade dress của Instagram/Facebook và không dùng gradient thương hiệu Meta làm bản sắc Folmetry.

## 19D.2 Nguyên tắc motion

Mỗi chuyển động phải trả lời được ba câu hỏi: vật gì thay đổi, vì sao thay đổi, và người dùng cần hiểu gì sau chuyển động đó. Nếu không trả lời được cả ba, bỏ hiệu ứng.

- [x] Dùng CSS transitions/animations, Web Animations API và inline SVG do dự án sở hữu; không thêm animation framework ở vòng đầu.
- [x] Chỉ cân nhắc dependency mới khi prototype chứng minh giảm code, không vượt budget và có tree-shaking rõ ràng; M8UX2 không thêm dependency.
- [x] Chỉ animate `transform`, `opacity`, `clip-path` đã benchmark hoặc custom property compositor-friendly; tránh layout animation trên vùng lớn.
- [x] Micro response: 90-160ms; component transition: 180-260ms; page/spatial transition: 320-480ms; narrative sequence tối đa 700ms.
- [x] Không để chuỗi animation nối tiếp khiến nội dung tương tác chậm hơn 150ms.
- [x] Animation theo scroll chỉ là progressive enhancement qua `@supports`; nội dung mặc định phải hiện đầy đủ nếu API không có.
- [x] View Transition API dùng qua transition type có ngữ nghĩa; browser không hỗ trợ hoặc reduced-motion dùng navigation/content swap bình thường.
- [x] Không chạy hiệu ứng khi tab ẩn, `prefers-reduced-motion: reduce`, `saveData` hoặc thiết bị coarse pointer; không dùng heuristic fingerprint thiết bị.
- [x] Reduced motion dùng thay đổi opacity/color/trạng thái tức thời, không chỉ đặt duration bằng `0` trong khi vẫn còn zoom/clip gây khó chịu.
- [x] Mọi loading animation phản ánh request/parser thật và dừng ngay ở success, error hoặc cancel.

## 19D.3 Motion grammar và hiệu ứng chủ đạo

| Tình huống | Hiệu ứng | Ý nghĩa | Fallback |
|---|---|---|---|
| Vào trang marketing | Aperture mở một lần, signal trace khóa vào headline | Thiết lập không gian thương hiệu | Hero tĩnh hoàn chỉnh |
| Chuyển platform hub → tool | Marker/platform title handoff bằng shared transition | Giữ định hướng không gian | Điều hướng native |
| Hover/focus control | Perimeter trace ngắn + dịch chuyển tối đa 1–2px | Xác nhận vùng tương tác | Focus ring/đổi màu |
| Chọn ZIP | File capsule đi vào vùng local worker | File được xử lý trên thiết bị | Icon và status text |
| Parsing | Scan line theo stage thật, không progress giả | Đang đọc/chuẩn hóa dữ liệu | Progress/status text |
| Xác nhận snapshot | Boundary gate chuyển local result sang private sync | Chỉ snapshot chuẩn hóa được gửi | Success notice |
| Đổi tab kết quả | Indicator trượt theo hướng và crossfade nội dung ngắn | Duy trì quan hệ không gian | Đổi tức thời |
| So sánh snapshot | Split-lens/reveal giữa hai mốc thật | Thể hiện before/after | Hai cột/timeline tĩnh |
| Story request | Network trace xuất phát sau khi submit | Đây là request qua mạng | Spinner/status text |
| Success/error | Pulse một lần theo semantic tone | Kết thúc thao tác | Icon + thông báo |

## 19D.4 Design tokens V3

### Màu và chất liệu

- [x] Tách primitive palette khỏi semantic roles; mã màu trực tiếp chỉ còn ở token, asset thương hiệu Google, email inline và metadata image bắt buộc.
- [x] Bổ sung token `canvas`, `paper`, `instrument`, `data-well`, `signal-active`, `sync`, `network`, `positive`, `warning`, `danger`, `focus` cho light/dark.
- [x] Mỗi semantic state có màu, icon/hình dạng và text; không truyền đạt bằng màu duy nhất.
- [x] Light theme mang cảm giác giấy kỹ thuật ấm, dark theme là graphite nhiều lớp; cả hai giữ cùng hierarchy.
- [x] Chất liệu grid/noise được tạo bằng CSS, opacity thấp và bị loại khi forced-colors/low-power yêu cầu.
- [x] Gradient chỉ dùng để chỉ hướng/tín hiệu; không dùng làm nền mặc định của mọi section hoặc chữ.

### Typography

- [x] Hoàn tất bake-off bằng nội dung EN/VI thật; system stack được chọn thay self-host/hybrid vì đủ dấu, không request font và không gây CLS.
- [x] Font đã chọn đủ dấu tiếng Việt, không gây font-driven CLS/LCP và tránh cảm giác template phổ biến.
- [x] Thiết lập 5 role: display editorial, heading, body, UI label, mono/numeric metadata.
- [x] Dùng fluid scale có `clamp()` và trần phù hợp laptop thấp; hero mobile giữ CTA trong viewport đầu.
- [x] Bật tabular numbers cho metric/timeline; dấu delta và timestamp đồng nhất.
- [x] Giới hạn line length cho body, legal và form; đã kiểm tra reflow EN/VI.

### Grid, spacing và hình khối

- [x] Chuẩn hóa grid 4/8/12 cột, gutter fluid và bốn container: reading, form, workspace, wide-data.
- [x] Marketing dùng nhịp editorial bất đối xứng có kiểm soát; workspace dùng grid ổn định và scan nhanh.
- [x] Giảm "card hóa": ưu tiên section, divider, rail và data-well; card chỉ tồn tại khi biểu diễn một object/group.
- [x] Khóa spacing scale; các ngoại lệ còn lại gắn với composition cụ thể và đã qua visual audit.
- [x] Radius tối đa ba cấp, shadow tối đa ba cấp; cấu trúc chủ yếu bằng border, layer và khoảng trắng.
- [x] Hỗ trợ safe-area, dynamic viewport và zoom/reflow; bàn phím ảo còn được xác minh vật lý ở release gate.

## 19D.5 Kiến trúc triển khai giao diện

- [x] Giữ Server Component cho layout/page tĩnh; chỉ tạo Client Component ở nơi có interaction/motion thật.
- [x] Motion capability layer dùng preference provider và CSS media queries để đọc save-data, visibility, reduced-motion và pointer capability tập trung.
- [-] Không bọc cascade layer toàn bộ stylesheet giữa migration vì sẽ thay đổi precedence của legacy rules; source được phân đoạn theo thứ tự reset → tokens → base → layout → components → motion → accessibility.
- [-] Không tách CSS theo route: production CSS còn 89.195 B, dưới budget 110 KB; tách lúc này tăng độ phức tạp mà chưa có bằng chứng tải thừa đáng kể.
- [x] Dùng typed state/data attributes như `data-state`, `data-stage`, `data-platform`, `data-workflow-state`; tránh class runtime tùy tiện.
- [x] SVG decorative luôn `aria-hidden`; nội dung dữ liệu thật có text equivalent.
- [x] Không đưa secret, handle thật, relationship thật hoặc dữ liệu production vào asset, screenshot hay test harness.
- [-] Không tạo design-lab route production; component/unit fixtures tổng hợp cung cấp state lab mà không mở route hoặc kết nối dữ liệu thật.

## 19D.6 Global shell và chuyển cảnh

- [x] Thiết kế header thành "navigation instrument": brand rõ, platform switch rõ, account/preferences yên tĩnh hơn CTA.
- [x] Active platform dùng marker hình học + typography + `aria-current`, không phụ thuộc underline màu.
- [x] Desktop header đổi chiều sâu/thu logo nhẹ theo scroll timeline, không đổi flow height nên không nhảy layout hoặc che focus.
- [x] Mobile menu là full-height composition riêng, có focus trap, Escape, restore focus và khóa body scroll.
- [x] Footer là "system map" gọn: product boundary, legal và trạng thái privacy, không còn overlap/dồn cục.
- [-] Không thêm progress/pending giả vì route local phản hồi tức thời; View Transition ngắn cung cấp continuity khi API hỗ trợ.
- [x] Chuyển locale/theme giữ nguyên vị trí đọc và không flash theme/font.
- [x] Back/forward, deep link, mở tab mới và browser không hỗ trợ View Transition hoạt động nguyên vẹn; có E2E riêng.

## 19D.7 Landing page

- [x] Hero có một composition riêng của Folmetry, gồm editorial headline, aperture, snapshot ribbon và hai ranh giới dữ liệu thật; không phải dashboard giả.
- [x] Above-the-fold trả lời chức năng, dữ liệu đầu vào, ranh giới ZIP và CTA chính trên desktop/mobile.
- [x] Pipeline `ZIP → worker local → review → private sync → insight` là visual semantic tương tác nhẹ và đúng kiến trúc M8SYNC.
- [x] Hover/focus từng stage chỉ làm nổi phần liên quan; mobile không phụ thuộc hover.
- [x] Feature section dùng editorial sequence thay cho lưới card đều nhau.
- [x] Instagram/Facebook là hai workspace rõ ràng và cùng mức độ hoàn thiện giao diện; trạng thái chức năng phải phản ánh đúng implementation hiện tại.
- [x] Story utility nằm trong vùng network riêng, có nhịp khác analyzer nhưng vẫn thuộc Folmetry.
- [x] Final CTA ngắn, mạnh và gắn đúng hành động; section lặp thông điệp đã được loại bỏ.

## 19D.8 Instagram và Facebook hubs

- [x] `/instagram` có tool map trực quan: Analyzer là tác vụ dữ liệu riêng tư, Story/Highlights là tiện ích network; ranh giới không thể bị hiểu nhầm.
- [x] Card/tool entry có preview trạng thái và action rõ, không dùng glass card chung chung.
- [x] `/facebook` dùng chung hero Signal Atlas và lưới hai tool entry với `/instagram`; CTA Analyzer và hướng dẫn xuất đều dẫn tới chức năng thật.
- [x] Platform switch trên mobile không làm mất context hoặc đẩy action chính xuống quá sâu.
- [x] URL, metadata, heading và active navigation tiếp tục phân biệt hai platform bằng semantic HTML, không chỉ bằng màu.

## 19D.9 Analyzer workspace

- [x] Chuyển `/app` thành workspace có ba tầng rõ: profile rail, task canvas, insight/history; desktop và mobile có composition riêng.
- [x] Workflow rail lấy stage từ state machine thật; không tự chạy khi không có tác vụ.
- [x] Drop zone biến đổi theo idle/hover/drag/validating/parsing/review/error/cancel và giữ kích thước ổn định để tránh CLS.
- [x] Local-processing visual chỉ hiện trong worker stages; sync visual chỉ hiện sau thao tác lưu được xác nhận.
- [x] Review screen ưu tiên snapshot date, counts, warnings và privacy boundary trước nút lưu.
- [x] Metric overview dùng hierarchy số liệu, delta, timestamp và context; không chạy count-up dài hoặc làm che số cuối.
- [x] Result tabs có shared indicator; sticky chỉ khi đủ không gian và không che nội dung/focus.
- [x] Relationship rows hỗ trợ list lớn bằng pagination/virtualization theo benchmark; không animate từng hàng hàng loạt.
- [x] History trở thành snapshot ribbon/timeline thật, có chọn hai mốc và split comparison; luôn có text/date/count tương đương.
- [x] Empty, first snapshot, duplicate, partial export, sync error và offline là các visual state khác nhau.
- [x] Danger zone nằm ngoài luồng chính, affordance destructive rõ, dialog nói chính xác dữ liệu bị xóa trên server/mọi thiết bị.

## 19D.10 Story/Highlights utility

- [x] Input và disclosure network cùng một module, ngắn và rõ; người dùng hiểu handle sẽ được gửi trước khi submit.
- [x] Loading trace chỉ chạy trong request thật; không preload media hoặc tăng request chỉ để phục vụ animation.
- [x] Gallery dùng aspect-ratio cố định, skeleton đúng kích thước và stagger tối đa theo một nhóm nhỏ, không theo toàn bộ dataset.
- [x] Highlight rail hỗ trợ keyboard, touch, overflow và trạng thái selected bằng nhiều tín hiệu.
- [x] Media viewer có enter/exit mượt nhưng focus, Escape, browser back và download vẫn đúng.
- [x] Error private/unavailable/rate-limit/provider-down/expired-token có illustration/state khác nhau nhưng không đổ lỗi sai cho user.
- [x] Copyright/public-only/no-anonymity vẫn có độ nổi phù hợp, không bị "làm đẹp" đến mức khó thấy.

## 19D.11 Auth, account và admin

- [x] Auth pages dùng một "secure access frame" tập trung, ít chuyển động; Google và credential login có hierarchy công bằng, rõ ràng.
- [x] Register/password forms cho feedback strength/requirement mượt nhưng không rung/lắc gây khó nhập.
- [x] Tài khoản Google chưa có password hiển thị flow "đặt lần đầu"; account đã có password hiển thị flow "đổi" và yêu cầu current password.
- [x] Account chia identity, connected sign-in methods, password/security, sessions và data synchronization thành section rõ.
- [x] Admin ưu tiên mật độ và khả năng scan, giảm decor; table desktop và card-row mobile dùng cùng action semantics.
- [x] Role/suspend/revoke/delete có cấp độ visual khác nhau, confirmation theo mức rủi ro và không animate destructive action kiểu vui nhộn.
- [x] Không hiển thị hoặc minh họa relationship data của user trong admin.

## 19D.12 Editorial, legal và system states

- [x] How it works dùng cùng pipeline visual với landing/analyzer để không tạo hai mô hình tinh thần khác nhau.
- [x] FAQ chuyển trạng thái bằng icon/opacity ngắn; không animate height dài và không làm layout nhảy mạnh.
- [x] Privacy/Terms có table of contents sticky có điều kiện, progress đọc phi xâm lấn và line length tối ưu.
- [x] 404/error/offline/setup có personality từ signal atlas, CTA phục hồi rõ và không tiết lộ config/secret.
- [x] Email template được đồng bộ token/motif ở mức tương thích email client; không dùng animation trong email.
- [x] Print stylesheet giữ nội dung legal/help sạch, bỏ decor/motion/navigation thừa.

## 19D.13 Responsive strategy

- [x] Thiết kế và review tại 320, 360, 390, 430, 768, 1024, 1280, 1440 và 1920px; không chỉ co desktop xuống mobile.
- [x] Mobile ưu tiên task và thumb reach; rail chuyển thành stepper/sheet, không thành horizontal overflow khó dùng.
- [x] Tablet có layout riêng cho header, workspace và admin; tránh khoảng trống do breakpoint desktop bị ép.
- [x] Kiểm tra landscape mobile, laptop viewport thấp, split-screen, browser zoom 200% và text-only zoom.
- [x] Touch target tối thiểu 44×44px nơi khả thi, spacing giữa destructive controls đủ lớn.
- [x] `100dvh`, safe-area và bàn phím ảo không làm mất nút submit/dialog action.
- [x] Nội dung EN/VI được test độc lập; không truncate label có ý nghĩa để cứu layout.

## 19D.14 Accessibility và an toàn cảm giác

- [x] Đạt WCAG 2.2 AA cho contrast, focus, reflow, target size, dragging alternative, status message và consistent help.
- [x] Keyboard hoàn thành toàn bộ analyzer, Story, auth và admin; thứ tự focus khớp visual order.
- [x] Screen reader nhận đúng heading/landmark, tab/dialog/live region và thông báo tiến trình thật.
- [x] Không có nội dung nhấp nháy; không zoom toàn màn hình; không hiệu ứng lặp gây mất tập trung.
- [x] Mọi thông tin xuất hiện khi hover cũng xuất hiện khi focus và có thể dismiss/persist theo yêu cầu.
- [x] Forced colors giữ border, focus và semantic state; decor bị loại khi không còn ý nghĩa.
- [x] Reduced-motion test theo từng state chứ không chỉ chụp landing page.
- [x] Animation có thể bị hủy/replace sạch khi user thao tác nhanh, back navigation hoặc component unmount.

## 19D.15 Performance budgets

- [x] Không WebGL/Three.js, video background, remote font bắt buộc hoặc animation runtime lớn trong critical path.
- [x] JavaScript motion của shared shell không thêm animation runtime; route-specific client code tiếp tục được Next.js chia chunk theo route.
- [x] Tổng CSS production không vượt 110 KB; largest JS chunk không vượt 300 KB; giữ tổng static JS trong budget hiện hành 1.5 MB và tìm cách giảm.
- [!] CLS lab đạt ≤ 0.1; LCP/INP field p75 cần RUM sau deploy và không được suy diễn từ kiểm thử local.
- [!] Không phát hiện long task do visual effect trong test local; interaction trace trên phần cứng đại diện vẫn là release gate.
- [x] Relationship rows phân trang và motion không sinh theo từng record; diff giữ O(n + m), không tạo animation theo 10k/50k records.
- [!] Route transition không giữ snapshot DOM trong code path; memory profile dài hạn trên deployment/thiết bị đại diện vẫn là release gate.
- [x] Image/media giữ dimensions, lazy loading và request count; decor không tạo request third-party.
- [x] CI báo cả raw/gzip route assets và so sánh delta với baseline, không chỉ kiểm tra trần tuyệt đối.

## 19D.16 Quy trình triển khai theo gate

### UX2-0 — Baseline và bảo toàn thay đổi hiện tại

- [x] Hoàn tất và bảo toàn bản sửa password Google trước lớp visual; test first-password/credential flow tiếp tục pass.
- [x] Chụp/review baseline route/state light/dark, EN/VI tại viewport đại diện bằng synthetic data; artifact tạm không đưa dữ liệu thật vào Git.
- [!] Đã ghi CSS/JS raw+gzip, request boundary, axe, CLS và focus/motion map; Lighthouse/LCP/INP thực địa giữ ở release gate sau deploy.
- [x] Lập inventory selector/token/component; loại Tailwind import không dùng, giảm CSS trùng và component "card hóa" quá mức.

### UX2-1 — Concept proof

- [-] Không tạo ba route/static artifact production; đánh giá ba hướng trong decision log rồi chỉ triển khai hướng được chọn để tránh tăng surface bảo trì.
- [x] Dựng motion grammar/storyboard cho hero, navigation, import, save snapshot và comparison.
- [x] Chấm theo ma trận: uniqueness, comprehension, privacy accuracy, mobile, EN/VI, accessibility và performance.
- [x] Khóa `Kinetic Signal Atlas` sau visual review; quyết định và anti-template rationale được ghi trong UI foundations/plan.

### UX2-2 — Foundations

- [x] Token V3, typography bake-off, grid/container, material, icon/SVG và motion capability layer.
- [-] Refactor CSS theo section có thứ tự; không mở design-lab route, dùng unit/component fixture tổng hợp để không tăng production surface.
- [x] Khóa accessibility/motion/performance budgets trước khi chốt migration page.

### UX2-3 — Primitives

- [x] Button, field, select, tabs, dialog, badge, notice, progress, skeleton, surface, metric, timeline và data row.
- [x] Hoàn thiện states hover/focus/active/disabled/loading/success/error cho light/dark/reduced/forced colors.
- [x] Component tests và visual review dùng synthetic content EN/VI; artifact screenshot tạm không commit.

### UX2-4 — Shell và marketing

- [x] Header/mobile navigation/footer và shared transitions progressive enhancement; không tạo route pending giả cho điều hướng tức thời.
- [x] Landing, Instagram/Facebook hubs, How it works, FAQ, Privacy, Terms, 404/error.
- [x] Review hierarchy/spacing trước, sau đó mới bật narrative motion.

### UX2-5 — Product workspace

- [x] Analyzer state-by-state, history/comparison và destructive flows.
- [x] Story/Highlights request/gallery/viewer/error states.
- [x] Auth/register/reset/account/admin, bao gồm first-password Google flow.

### UX2-6 — Motion polish

- [x] Gắn animation vào state thật, cancellation và visibility lifecycle.
- [x] Giữ motion ở CSS/compositor-friendly properties và xóa hiệu ứng/animation runtime không chứng minh được giá trị.
- [x] Hoàn thiện reduced-motion/save-data/coarse-pointer/forced-colors fallbacks.

### UX2-7 — Hardening và rollout

- [x] Full typecheck, lint, 247 unit/component tests, production build, UI budget, audit và E2E đa trình duyệt.
- [x] Visual/geometry review tại ma trận breakpoint và representative theme/locale/state đã định nghĩa.
- [!] Production-preview sign-off cần deployment thật; motion layer và commit revert là rollback path.
- [!] Đo field Core Web Vitals và error rate sau deploy; tắt motion layer trước nếu có regression.

## 19D.17 Ma trận kiểm thử và bằng chứng

- [x] Chromium, Firefox, WebKit và mobile Chromium cho route/state chính.
- [!] iOS Safari và Android Chrome thiết bị thật cho safe-area, keyboard, touch, scroll và media viewer là release gate vật lý.
- [x] Axe không có violation nghiêm trọng; keyboard/focus/dialog semantics có unit và E2E coverage.
- [x] Screenshot/geometry representative cho mobile/desktop, light/dark, EN/VI, reduced motion và forced colors dùng synthetic data.
- [x] Geometry assertions cho overflow, overlap, sticky header/footer, dialog và viewport thấp.
- [x] Navigation stress: back/forward, deep link, refresh giữa state và API unsupported.
- [!] Reduced-motion và save-data có E2E; low-end CPU/visibility lifecycle trên thiết bị đại diện giữ ở release gate.
- [x] Analyzer fixtures: empty, first snapshot, historical, duplicate, warning, parse error, sync error và large list.
- [x] Story fixtures: idle, loading, empty, success, highlights, expired media, rate limit và provider outage.
- [x] Auth fixtures: Google-only first password, credential change, verify/reset, setup unavailable và admin confirmations.
- [x] Không screenshot/log nào chứa secret hoặc relationship data thật.

## 19D.18 Acceptance criteria

M8UX2 chỉ được đánh dấu hoàn thành khi đồng thời đạt:

- [x] Nhận ra Folmetry khi bỏ logo khỏi hero nhờ aperture, snapshot ribbon, typography và boundary language trong visual review local.
- [!] Comprehension 5 giây đã được tối ưu bằng hierarchy/copy; kiểm chứng định lượng với người dùng mới cần usability test ngoài repository.
- [x] Instagram/Facebook và local/network/private-sync được phân biệt bằng heading, layout, copy, semantics và motion.
- [x] Không còn overlap, horizontal page overflow, footer dồn cục hoặc breakpoint "vỡ" tại ma trận viewport tự động.
- [x] Core workflow hoạt động đầy đủ khi motion bị vô hiệu hóa hoặc trình duyệt không hỗ trợ View Transition/scroll timeline.
- [x] Reduced motion/keyboard/semantic screen-reader structure/forced colors có fallback tương đương trong phạm vi local test.
- [x] Tất cả motion có trigger, stop condition và semantic purpose được ghi trong motion inventory.
- [x] Không hiệu ứng nào làm tăng request dữ liệu, upload ZIP thô hoặc lộ dữ liệu; domain contract chỉ thay đổi theo yêu cầu riêng về nhận diện đổi username.
- [x] Typecheck, lint, unit/component, build, accessibility scan, audit và performance budgets đều đạt.
- [!] Có decision log, asset provenance, evidence local và rollback plan; production-preview approval vẫn chờ deployment thật.

## 19D.19 Rollback và phạm vi không thay đổi

- [-] Không tách hồi tố working set đã triển khai thành nhiều commit giả; giữ một rollback boundary M8UX2 rõ và diff theo subsystem để review/bisect.
- [x] Motion layer có thể vô hiệu hóa tập trung mà giao diện tĩnh vẫn hoàn chỉnh.
- [x] Token V3 giữ compatibility aliases trong migration; chỉ xóa sau khi không còn consumer.
- [x] Không sửa parser, upload policy, ownership query, Better Auth hoặc Story provider contract để phục vụ visual; diff chỉ được mở rộng theo yêu cầu độc lập về đổi username.
- [x] Nếu LCP/INP/CLS/error rate regress, ưu tiên tắt narrative/shared transition rồi đo lại trước khi rollback toàn bộ.
- [!] Giữ baseline và báo cáo delta cho đến khi production ổn định qua cửa sổ theo dõi đã thống nhất.

---

# 19E. M8FB — Facebook relationship analyzer

## Mục tiêu

Hoàn thiện Facebook như một workspace độc lập nhưng dùng chung các primitive an toàn đã kiểm chứng của Instagram: xử lý file thô cục bộ, xác nhận trước khi đồng bộ, lịch sử đa thiết bị theo owner và so sánh snapshot thận trọng.

## Checklist triển khai

- [x] Tạo route được bảo vệ `/facebook/analyzer` và CTA thật từ Facebook hub.
- [x] Truyền `platform` bắt buộc xuyên suốt UI → worker → payload → API → PostgreSQL.
- [x] Tạo `FacebookExportAdapter` riêng; không dùng normalization/path/schema Instagram.
- [x] Nhận schema ZIP thật: `connections/friends/your_friends.json`, `connections/followers/people_who_followed_you.json` và `who_you've_followed.json`.
- [x] Giữ riêng ba tập Bạn bè, Người theo dõi và Đang theo dõi trong parser, fingerprint, snapshot và PostgreSQL.
- [x] Sửa bảo thủ chuỗi UTF-8 bị Meta biểu diễn dưới dạng Latin-1; không làm hỏng Unicode hợp lệ.
- [x] Hỗ trợ manual recovery bằng `friends.json` và `following.json`.
- [x] Fail closed với HTML, JSON lỗi, wrapper lạ, path không an toàn, duplicate path, ZIP đáng ngờ và giới hạn tài nguyên.
- [x] Chuẩn hóa tên Unicode bằng NFC, khoảng trắng ổn định, giới hạn độ dài và loại control/bidi override nguy hiểm.
- [x] Hiển thị đúng ngữ nghĩa Bạn bè/Đang theo dõi; không tạo `@handle` hoặc link Instagram giả.
- [x] Có tab danh sách Bạn bè, Đang theo dõi, kết nối mất/mới, đổi tên có thể và lịch sử.
- [x] Chỉ suy luận đổi tên khi timestamp kết nối trùng duy nhất giữa hai snapshot; luôn ghi rõ không phải bằng chứng định danh.
- [x] Giữ nguyên mọi dòng Bạn bè trùng tên trong bản xuất Facebook; dùng timestamp để phân biệt khi có và không coi tên hiển thị là mã định danh duy nhất.
- [x] Thêm hồi quy theo cấu trúc ZIP thật 424 dòng/410 tên duy nhất; xác nhận parser giữ đủ 424 dòng và không trộn file đã xóa, lời mời, gợi ý hoặc follower để bù số Facebook UI.
- [x] Đồng bộ snapshot đã chuẩn hóa theo authenticated owner; kiểm tra platform snapshot khớp platform hồ sơ.
- [x] Lọc danh sách hồ sơ và xóa toàn bộ theo platform để không tác động dữ liệu Instagram.
- [x] CSV Facebook dùng cột Name và tên file riêng, không áp dụng URL hồ sơ Instagram.
- [x] Bổ sung hướng dẫn xuất JSON EN/VI và thông báo giới hạn độ chính xác.
- [x] Dùng fixture tổng hợp, không đưa dữ liệu Facebook thật vào repository.
- [x] Bổ sung test adapter, worker protocol/pipeline, UI semantics, API platform filter/delete và auth return path.
- [x] Cập nhật source-of-truth và tài liệu kiến trúc cho trạng thái Facebook production-capable.
- [ ] Smoke test bằng một bản xuất Facebook thật đã ẩn danh trên production preview.
- [ ] Xác minh PostgreSQL production, responsive/keyboard/axe và telemetry lỗi không chứa tên quan hệ trước release chính thức.

---

# 19F. M9AI — Folmetry Assistant đa nhà cung cấp

## 19F.1. Phạm vi và nguyên tắc

- [x] Hỗ trợ câu hỏi về Folmetry và câu hỏi kiến thức tổng quát.
- [x] Có bốn chế độ Auto, Folmetry, General và Live Web; Auto phân loại ý định ở server.
- [x] Không tự động đưa ZIP/JSON thô, snapshot hoặc danh sách follower vào prompt.
- [x] Bắt buộc đăng nhập; toàn bộ hội thoại được phân vùng theo owner lấy từ session server.
- [x] Công khai ranh giới dữ liệu, nhà cung cấp, hạn chế AI và quyền xóa trong Privacy/Terms/FAQ.

## 19F.2. Backend, provider và độ bền

- [x] Tích hợp Groq và Cloudflare Workers AI bằng adapter server-side, không lộ API token ra client; giữ metadata Google cũ chỉ để đọc lịch sử.
- [x] Phân phối hội thoại ổn định giữa hai provider và fallback chỉ trước khi bắt đầu phát nội dung.
- [x] Khóa Live Web cho đến khi có search provider riêng được rà soát; Workers AI không bị mô tả sai là nguồn web thời gian thực.
- [x] Stream SSE cùng các event meta, delta, citations, done và error đã chuẩn hóa.
- [x] Fail-closed bằng hai release gate; hỗ trợ kill switch tức thời bằng biến môi trường.
- [x] Giới hạn body/input/history/output/timeout, quota theo tài khoản và không rò lỗi upstream.
- [x] Lưu PostgreSQL theo owner, đồng bộ đa thiết bị, xóa hội thoại và giới hạn 200 message mới nhất.

## 19F.3. Trải nghiệm và tài liệu

- [x] Widget responsive toàn website, lịch sử, tạo mới, mở/xóa hội thoại và trạng thái streaming.
- [x] Giao diện song ngữ, hỗ trợ keyboard, reduced motion, forced colors và nguồn trích dẫn.
- [x] Hiển thị provider/model đã trả lời và thông báo không gửi dữ liệu nhạy cảm.
- [x] Bổ sung `.env.example`, README và tài liệu kiến trúc/vận hành `docs/ai-assistant.md`.
- [x] Unit test cho config, prompt, provider parser và route auth/fallback/error/CSRF.
- [ ] Trước production: phê duyệt điều khoản/quyền riêng tư, gateway logging và hạn mức hiện hành của Groq/Cloudflare.
- [ ] Trước production: cấu hình key mới trong secret store và smoke-test thật từng provider cùng fallback.

# 20. Definition of Done toàn dự án

V1 chỉ hoàn thành khi đồng thời thỏa mãn:

## Chức năng

- [ ] Import valid Instagram JSON ZIP thành công.
- [ ] Multipart followers được merge.
- [ ] Current analysis đúng.
- [ ] Historical diff đúng.
- [ ] First snapshot không tạo claim lịch sử giả.
- [ ] Multiple accounts cô lập.
- [ ] History persist qua reload.
- [ ] Compare thủ công đúng.
- [ ] Search/sort/list scaling đúng.
- [ ] CSV local và an toàn.
- [ ] Delete snapshot/account/all đúng.
- [ ] Public Story lookup đúng.
- [ ] Highlights/items đúng khi provider hỗ trợ.
- [ ] Individual image/video preview/download đúng.
- [ ] Story empty/private/unavailable/rate-limit/token-expiry states đúng.
- [ ] Register, verify email, login, logout và password reset chạy trên hạ tầng thật.
- [ ] Admin quản trị user/role/suspension/session/delete đúng quyền.

## Privacy và security

- [ ] Không credential, direct scraping hoặc direct private API trong application code.
- [ ] Không upload/archive endpoint.
- [ ] Không raw ZIP/JSON persistence.
- [ ] Không third-party tracking.
- [ ] Network-blocked import pass.
- [ ] ZIP protections pass.
- [ ] XSS/link/CSV protections pass.
- [ ] Logs không chứa dữ liệu quan hệ.
- [ ] Shared-device warning và deletion rõ ràng.
- [ ] Story handle network/provider disclosure rõ ràng.
- [ ] Story query/result/media không app-persist mặc định.
- [ ] Provider key/media-token secret không lộ client.
- [ ] Story media route không phải open proxy/SSRF primitive.
- [ ] Auth secrets/SMTP password/database URL không xuất hiện trong source, client bundle hoặc log.
- [ ] Admin không thể đọc ZIP/snapshot/relationship data cục bộ.

## UX và nội dung

- [ ] Đủ routes/pages.
- [ ] EN/VI hoạt động.
- [ ] Light/dark/system hoạt động.
- [ ] Lost follower caveat chính xác.
- [ ] Responsive trên target widths.
- [ ] Keyboard-only flow hoạt động.
- [ ] WCAG review và axe pass.
- [ ] Story public-only/copyright/no-anonymity copy chính xác.

## Engineering

- [ ] Strict TypeScript, không `any` trong production core.
- [ ] Không O(n²) diff.
- [ ] Parser ở worker.
- [ ] Adapter boundary sạch.
- [ ] Story provider adapter/server-only boundary sạch.
- [ ] Tests cốt lõi đầy đủ.
- [ ] Typecheck/lint/test/build/E2E/audit pass.
- [ ] Hybrid production deployment được xác minh.
- [ ] Provider due diligence/live smoke/kill switch được xác minh.
- [ ] Không acceptance-critical TODO.

---

# 21. Việc đầu tiên khi bắt đầu code

Khi được yêu cầu bắt đầu triển khai, thực hiện đúng thứ tự ngắn hạn sau:

1. [x] Kiểm tra toolchain và package versions hiện hành.
2. [x] Ghi decision log cho version/hybrid deployment/fingerprint/manual import/Story provider.
3. [x] Khởi tạo foundation mà không ghi đè `website.md`/`plan.md`.
4. [x] Thiết lập strict TypeScript, lint, test, build và CI.
5. [x] Chạy đủ quality gates của M1.
6. [ ] Chỉ sau khi M1 sạch mới triển khai domain/parser tests của M2.

Không bắt đầu bằng landing-page polish hoặc dashboard giả. Core domain/parser, security limits và automated tests phải được xây trước analyzer UI hoàn chỉnh.
