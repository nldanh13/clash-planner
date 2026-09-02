Clash Path — coc-admin (lấy dữ liệu tự động)
=============================================
Công cụ này TỰ ĐỘNG lấy dữ liệu thật từ các trang bên ngoài (coc.guide, CDN ảnh) và ghi ra thành các file JSON trong `coc-admin/data`.

CÁCH CHẠY & CẬP NHẬT (Trong gốc dự án)
----------------------------------------------------------
Thay vì copy thủ công, bạn hãy chạy script có sẵn ở gốc dự án (phải có Internet để tải dữ liệu):

    node scripts/update-data.mjs              # Chạy scrape cơ bản và tự động cập nhật vào public/data
    node scripts/update-data.mjs --levels     # Thêm cả chi phí/thời gian nâng cấp thật (THỬ NGHIỆM)
    node scripts/update-data.mjs --validate-only # Chỉ kiểm tra dữ liệu hiện có trong coc-admin/data và cập nhật vào public/data nếu hợp lệ

Script này sẽ:
1. Gọi `node coc-admin/scrape.mjs` để cào dữ liệu mới nhất (trừ khi dùng `--validate-only`).
2. Xác minh và validate định dạng của tất cả các file JSON (`images.json`, `catalog.json`, `townhalls.json` là bắt buộc, `levels.json` là tuỳ chọn).
3. Nếu TẤT CẢ các file bắt buộc đều hợp lệ, nó sẽ tự động chép an toàn (atomic swap) dữ liệu từ `coc-admin/data` sang `public/data`.
4. Nếu có bất kỳ lỗi nào, thư mục `public/data` cũ sẽ được giữ nguyên an toàn, không bị cập nhật dang dở.

Cần Node.js 18+ (đã có fetch sẵn), không cần cài thêm package phụ thuộc nào.

KẾT QUẢ
-------
Ghi vào thư mục `coc-admin/data` (tạm thời) và `public/data` (đích đến):
  data/images.json    — { "<item-id>": "<url ảnh>" }
  data/catalog.json   — [{ id, name, kind, owner }]
  data/townhalls.json — [{ level, title, blurb, unlocks }]
  data/levels.json    — (tuỳ chọn) Chi phí/thời gian nâng cấp THẬT từ coc.guide
  data/data-manifest.json — { source, updatedAt, version, files } (Được tự động tạo ra chứa metadata)

CẢNH BÁO VỀ --levels
--------------------------------------------------------
Đây là phần THỬ NGHIỆM, script đọc trực tiếp HTML từ coc.guide bằng parser tự viết.
Nếu coc.guide thay đổi cấu trúc, có thể xảy ra sai sót. Luôn kiểm tra lại số liệu trong `data/levels.json` sau khi scrape.
