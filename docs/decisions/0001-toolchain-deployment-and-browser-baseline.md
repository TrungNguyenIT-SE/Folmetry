# ADR-0001: Toolchain, deployment và browser baseline

- Trạng thái: Accepted
- Ngày: 2026-09-15
- Phạm vi: M0

## Quyết định

### Version matrix

Các version dưới đây là exact baseline để tạo `package.json` và lockfile ở M1. Lockfile phải pin toàn bộ dependency graph.

| Thành phần | Version được chọn | Ghi chú |
|---|---:|---|
| Node.js | 24.13.0 | LTS; dùng thống nhất local/CI/build |
| Corepack | 0.34.5 | Tool đang có trong môi trường preflight |
| pnpm | 12.4.2 | Đã kích hoạt qua Corepack |
| Next.js | 16.3.5 | Bản vá mới hơn baseline 16.3.3; Node engine `>=20.9.0` |
| React / React DOM | 19.3.0 | Thỏa peer range của Next 16.3.5 |
| TypeScript | 6.0.3 | Cố ý giữ major 6 theo spec; chưa nâng TypeScript 7 ở M0 |
| Tailwind CSS | 4.3.3 | Styling baseline |
| `@zip.js/zip.js` | 2.15.0 | ZIP processing trong analyzer worker |
| Dexie | 4.4.6 | IndexedDB wrapper; Node engine `>=20` |
| Zod | 4.6.5 | Validation boundary |
| Vitest | 5.0.1 | Peer hỗ trợ Node 24 và Vite 6/7/8 |
| `@playwright/test` | 1.63.0 | Khớp CI image `mcr.microsoft.com/playwright:v1.63.0-noble` |
| Testing Library React | 16.3.3 | Peer hỗ trợ React 19; M1 phải cài `@testing-library/dom` tương thích |
| `@axe-core/playwright` | 4.13.0 | Accessibility automation |
| lucide-react | 1.46.0 | Icons; chỉ dùng khi thật sự cần |

Không dùng tag `latest` trong manifest. Mỗi lần nâng Next/React phải chạy lại typecheck, unit, component, E2E, build và audit.

### Rendering và deployment

- Dùng Next.js App Router trên Vercel theo mô hình hybrid.
- Marketing/help/legal được static generate khi có thể.
- Analyzer là client boundary, xử lý ZIP/diff local và không phụ thuộc backend.
- Story/Highlights dùng route handlers server-only tối thiểu; không bật `output: "export"`.
- Story outage hoặc feature flag không được làm hỏng analyzer hay public pages.

### ZIP worker và CSP

- Parser chạy trong một dedicated module worker do ứng dụng sở hữu.
- Bên trong worker này, ưu tiên `@zip.js/zip.js/index-native.js` và `useWebWorkers: false` để tránh nested worker pool và tránh phải thêm `wasm-unsafe-eval` vào CSP.
- M1/M3 phải có browser smoke test chứng minh Next bundler tạo đúng worker asset và ZIP reader chạy trên Chromium, Firefox, WebKit.
- CSP production không dùng `unsafe-eval`. Baseline: `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `connect-src 'self'`, `img-src 'self' data: blob:`, `media-src 'self' blob:`, `font-src 'self'`, `worker-src 'self' blob:`. Script policy cuối cùng dùng nonce/hash nếu deployment cho phép và phải được kiểm tra trên production build.

### Dexie tests

- Unit/repository tests dùng `fake-indexeddb` với database name riêng cho từng test và cleanup bắt buộc.
- Integration/E2E quan trọng chạy trên IndexedDB thật bằng Playwright ở Chromium, Firefox và WebKit.
- Các lỗi unavailable, blocked upgrade và quota phải được fault-inject; không xem fake IndexedDB là bằng chứng duy nhất cho browser behavior.

### Browser support

- Hỗ trợ hai major mới nhất của Chrome/Edge/Firefox tại thời điểm release.
- Safari và iOS Safari tối thiểu 16.4.
- Không thêm polyfill cho browser cũ ngoài matrix nếu chưa có yêu cầu sản phẩm.
- CI chuẩn dùng Playwright 1.63.0 và image Noble đúng cùng version. Manual Safari/iOS QA vẫn là release gate.

## Bằng chứng preflight

- Local: Node 24.13.0, Corepack 0.34.5, pnpm 12.4.2, Git 2.52.0.
- npm registry được kiểm tra ngày 2026-09-15; peer ranges của Next, Vitest và Testing Library không có xung đột với matrix trên.
- Tài liệu zip.js xác nhận ESM, module worker, Web Worker và browser compatibility; kiểm tra bundle thực tế được đặt tại M1/M3 vì M0 chưa tạo application package.

## Hệ quả

- TypeScript 7.0.2 tuy mới hơn nhưng chưa được dùng; việc nâng major cần ADR riêng và compatibility run.
- Native zip.js đổi một phần bundle/performance để có CSP chặt hơn và kiến trúc worker dễ kiểm soát.
- Full static export không còn phù hợp vì Story route cần server runtime.

## Ghi chú triển khai M1 — 2026-09-15

`skipLibCheck` được bật có chủ đích vì Vitest 5.0.1 phát hành các declaration nội bộ khai báo `Assertion` với type parameters không đồng nhất dưới TypeScript 6.0.3 (`TS2428`). Lỗi được tái hiện khi không có production code và không phản ánh type error của dự án. Đây là compatibility exception tạm thời, không phải cách che lỗi trong `src/`/`tests/`; phải thử tắt lại khi Vitest hoặc TypeScript được nâng.
