# Clash Planner

Web app chạy trên máy bằng `npm start`, đồng bộ hồ sơ Clash of Clans gần
realtime qua API mà War Report đang sử dụng.

## Chạy trên Windows

1. Cài Node.js LTS: https://nodejs.org/
2. Mở CMD trong thư mục dự án và chạy:

```bat
npm install
npm start
```

Ứng dụng tự mở tại http://127.0.0.1:5173.

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
