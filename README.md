# Clash Planner

Web app chạy trên máy bằng `npm start`, đồng bộ hồ sơ Clash of Clans gần
realtime qua API mà War Report đang sử dụng.

## Yêu cầu môi trường

Dự án này sử dụng API của bên thứ 3 nên yêu cầu một API key được cung cấp thông qua biến môi trường.

1. Tạo file `.env.local` (hoặc `.env`) từ `.env.example`:
   `cp .env.example .env.local`
2. Điền khóa API vào biến `WAR_REPORT_API_KEY`. (Chú ý: KHÔNG bao giờ commit file `.env.local` chứa khóa thật lên git).

> **Lưu ý Bảo mật**: Khóa API cũ (thật) đã từng bị lộ trong file `.env.example` trước đó và có thể vẫn còn tồn tại trong lịch sử commit của Git. Để đảm bảo an toàn tuyệt đối, bạn NÊN thu hồi (revoke) khóa bị lộ từ phía nhà cung cấp (War Report) và tạo một khóa API hoàn toàn mới để thay thế.

## Chạy trên Windows

1. Cài Node.js LTS: https://nodejs.org/
2. Mở CMD trong thư mục dự án và chạy:

```bat
npm install
npm start
```

Ứng dụng tự mở tại http://127.0.0.1:3000.

Lưu ý quan trọng: Khi chạy `npm start`, `npm run dev` hoặc `npm run preview`, Vite sẽ đóng vai trò làm backend proxy để gắn API key vào header, giấu nó khỏi trình duyệt của người dùng. Nếu bạn chạy `npm run build` để sinh file tĩnh (`dist/`), các file này sẽ không thể tự gửi API key được, bạn cần một backend riêng để làm proxy nếu muốn host bản tĩnh này lên mạng.

## Phạm vi dữ liệu

Tự đồng bộ: Town Hall, hồ sơ, clan, cúp, hero, quân, phép và hero equipment.

Đánh dấu thủ công: cấp công trình, tường, bẫy, Laboratory, Army Camp và Clan
Castle. API chính thức của Clash of Clans không công bố các cấp này.

War Report có thể lưu dữ liệu trong bộ nhớ đệm khoảng 60 giây. Đây là dữ liệu
gần realtime, không phải kết nối trực tiếp với thiết bị đang chơi.

## Lưu ý kỹ thuật

Ứng dụng dùng proxy cục bộ trong `vite.config.ts` vì API của War Report chỉ
cho phép trình duyệt từ tên miền của họ gọi trực tiếp. Nếu War Report đổi API
hoặc khóa web công khai, phần đồng bộ có thể cần được cập nhật.

## Nhận bản zip cập nhật mới

Nếu bạn giải nén một bản zip mới của dự án này ĐÈ LÊN thư mục cũ đang dùng:
giải nén (ghi mới/ghi đè file) không tự xóa file mà bản mới đã bỏ đi (đổi
tên file, xóa bớt file, dọn code chết...) — file cũ vẫn nằm lại trên máy.

Sau khi giải nén đè, chạy:

```bat
node scripts/cleanup.mjs
```

Lệnh trên chỉ LIỆT KÊ những file không còn thuộc bản đóng gói hiện tại,
không xóa gì. Xem qua danh sách rồi chạy lại với `--apply` để xóa thật:

```bat
node scripts/cleanup.mjs --apply
```

Script luôn coi `dist/` là rác (Vite đặt tên file theo hash nội dung nên bản
build cũ không bao giờ còn cần) và sẽ xóa toàn bộ thư mục này — chạy
`npm run build` để tạo lại khi cần. Ngoài ra script KHÔNG BAO GIỜ đụng tới
`node_modules/`, `.git/`, `public/data/`, `coc-admin/data/`, hay bất kỳ ảnh
nào bạn tự tải (`scripts/download-images.mjs`) hoặc tự thêm tay vào
`public/buildings`, `heroes`, `troops`, `spells`, `equipment`, `pets` —
những chỗ đó là nội dung của riêng bạn.

(Việc này dựa trên `scripts/package-manifest.json` — danh sách file chuẩn
được sinh lại bằng `node scripts/generate-manifest.mjs` mỗi khi dự án được
đóng gói thành zip mới; không cần bạn tự chạy lệnh này trừ khi tự đóng gói
lại dự án.)

## Kiến trúc thư mục

- `src/components`: Các thành phần giao diện (UI components).
  - `base-planner`: Cụm chức năng xếp base thủ công.
- `src/hooks`: Các hook tái sử dụng.
- `src/services`: Tích hợp API bên ngoài (War Report, Game Database).
- `src/storage`: Quản lý lưu trữ local.
- `src/utils`: Các hàm tiện ích (format, chuẩn hóa, ...).
- `public/data`: Lưu trữ dữ liệu lấy từ game database.

## Quy trình kiểm tra (Testing)

Dự án sử dụng `vitest` để viết unit test cho các logic tính toán, import dữ liệu, và đánh giá phòng thủ.

- Chạy test: `npm run test`
- Typecheck: `npm run typecheck`
- CI/CD được tích hợp qua GitHub Actions (cài đặt, typecheck, test, build) tự động khi có Pull Request.

## Mức độ tin cậy của dữ liệu

Dự án cung cấp thông tin cấp độ và chi phí bằng ba cấp độ:
- **Chính xác (exact)**: Lấy tự động từ dữ liệu game thật. Có thể yên tâm sử dụng để lập kế hoạch.
- **Ước tính (estimated)**: Số liệu nội suy bằng công thức tương đối, chỉ dùng để dựng khung sườn lúc chờ update. Không nên dùng cho tính toán chi tiết.
- **Chưa kiểm tra (unchecked)**: Thường là các công trình đặc biệt (như tường) hoặc tính năng đang beta.

## Cập nhật dữ liệu an toàn

Để làm mới dữ liệu từ coc.guide:
1. Chạy lệnh: `npm run update-data`
2. Lệnh này sẽ kiểm tra schema của file `images.json`, `townhalls.json` và `levels.json`. Nếu cấu trúc thay đổi làm hỏng ứng dụng, bản cập nhật sẽ bị hủy (fallback giữ nguyên bản cũ).
3. Sau khi xác nhận an toàn, các file JSON sẽ được đưa vào `public/data/` sẵn sàng để Web App tiêu thụ trực tiếp.
