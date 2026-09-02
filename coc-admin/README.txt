Clash Path — coc-admin (lấy dữ liệu tự động)
=============================================

Project RIÊNG BIỆT với web app — không dùng chung code. Việc của công cụ
này là TỰ ĐỘNG lấy dữ liệu thật từ các trang bên ngoài (coc.guide, CDN ảnh
assets.colinschmale.dev) và ghi ra thành "cơ sở dữ liệu" — nhiều file JSON,
mỗi loại 1 file — để web app đọc lúc chạy. KHÔNG có form nhập tay: bạn
không tự gõ dữ liệu game vào đây, script tự đi lấy hộ.

CÁCH CHẠY (cần máy có Internet thật — sandbox không tải được)
----------------------------------------------------------
    node scrape.mjs              # ảnh + danh mục + roadmap (nhanh, an toàn)
    node scrape.mjs --levels     # thêm cả chi phí/thời gian nâng cấp thật
                                  # (chậm hơn — gọi ~90 trang chi tiết, và
                                  # là phần THỬ NGHIỆM, đọc kỹ mục cuối file
                                  # này trước khi tin dùng số liệu)

Cần Node.js 18+ (đã có fetch sẵn), không cần cài thêm gì (không có
package.json, không có node_modules).

KẾT QUẢ
-------
Ghi vào thư mục ./data (tự tạo nếu chưa có):
  data/images.json    — { "<item-id>": "<url ảnh>" } — ảnh cho toàn bộ item
  data/catalog.json   — [{ id, name, kind, owner }]  — danh mục item đã biết
  data/townhalls.json — [{ level, title, blurb, unlocks }] — Roadmap TH1-18
  data/levels.json    — (chỉ có khi chạy --levels) { "<item-id>": [{level,
                         cost, resource, timeHours, townHall?}, ...] } — chi
                         phí/thời gian nâng cấp THẬT lấy từ trang chi tiết
                         từng item trên coc.guide, cho ~90 công
                         trình/phòng thủ/bẫy/quân/phép đã xác minh URL.

Script cũng in ra:
  - Danh sách link ảnh có vấn đề (404/không phản hồi) để bạn biết item nào
    đang phải rớt xuống icon minh họa trong app.
  - Danh sách ảnh MỚI phát hiện được trên coc.guide mà chưa có trong bảng
    id->url đang dùng (best-effort — do không tự đoán chắc ảnh đó thuộc
    item nào nên chỉ báo cho bạn tự xem và thêm tay vào bảng
    COC_GUIDE_BUILDING_ART trong scrape.mjs nếu đúng là công trình/phòng
    thủ/bẫy mới).
  - (Khi chạy --levels) từng item cào được/không cào được, kèm 1 dòng ví dụ
    số liệu để bạn liếc qua ngay trong lúc chạy.

ĐEM DỮ LIỆU SANG WEB APP
-------------------------
Copy nguyên thư mục data/ vừa tạo, đè vào: coc-web-app/public/data/
(đổi coc-web-app thành đúng tên thư mục project web app của bạn). Web app
tự fetch("/data/images.json"), fetch("/data/townhalls.json") và
fetch("/data/levels.json") lúc chạy, không cần build lại, không cần sửa
code. Thiếu file levels.json cũng không sao — app tự dùng lại số liệu ước
tính có sẵn trong code cho các item chưa có trong đó.

Bản zip web app gửi kèm lần này đã có sẵn 1 bộ data/ mẫu (ảnh + danh mục +
roadmap, KHÔNG kèm levels.json — xem lý do ở mục cảnh báo bên dưới) để bạn
dùng ngay không cần chạy script trước — chạy lại script bất cứ khi nào
muốn làm mới/kiểm tra lại link ảnh còn sống không, hoặc coc.guide có nội
dung mới.

NGUỒN DỮ LIỆU & GIỚI HẠN
-------------------------
- Công trình/phòng thủ/bẫy: ảnh — URL đã xác minh thủ công từ coc.guide
  (đối chiếu từng URL, không suy đoán tên file), có phần tự quét lại trang
  sống để phát hiện ảnh mới (best-effort, không tự gán bừa vào item nào).
- Hero/quân/phép/trang bị/pet/máy công thành: ảnh tính theo công thức URL
  của assets.colinschmale.dev từ tên item — đã xác minh hoạt động ổn định,
  script tự kiểm tra từng link còn sống không mỗi lần chạy.
- Roadmap TH1-18: nội dung đã nghiên cứu trước đó (ClashVault town-hall
  guide), hiện KHÔNG tự động cào lại — script chỉ xuất y nguyên nội dung
  đã có sẵn ra JSON. Muốn tự động hoá phần này thì cần mở rộng thêm, báo
  lại nếu cần.

CẢNH BÁO VỀ --levels (chi phí/thời gian nâng cấp thật)
--------------------------------------------------------
Đây là phần THỬ NGHIỆM, rủi ro cao hơn hẳn phần ảnh:
- Script đọc trực tiếp HTML trang chi tiết từng item trên coc.guide (ví dụ
  coc.guide/defense/cannon, coc.guide/troop/barbarian) bằng 1 parser bảng
  HTML tự viết, không dùng thư viện ngoài. Logic parser đã được kiểm tra kỹ
  với dữ liệu mẫu khớp với những gì quan sát được từ coc.guide, NHƯNG mình
  không có cách xem trực tiếp mã HTML gốc của trang thật từ môi trường hiện
  tại để xác nhận 100% cấu trúc bảng — nếu coc.guide đổi cấu trúc trang,
  hoặc có vài trang lệch cấu trúc so với số ít trang đã kiểm tra, kết quả
  parse có thể sai mà script không nhận ra được.
- CHỈ cào được cho ~90 item đã xác minh có URL trang chi tiết thật (công
  trình/phòng thủ/bẫy/công trình quân sự + phần lớn quân/phép/máy công
  thành). CHƯA cào được cho hero, trang bị, pet, và vài quân/phép quá mới
  (Furnace, Ruin Witch, Thrower, Totem Spell, Troop Launcher, Sky Wagon...)
  — các mục này giữ nguyên số liệu ước tính cũ trong upgradeData.ts.
- Quân/phép: trang coc.guide ghi yêu cầu theo "Laboratory level" chứ không
  phải Town Hall trực tiếp, nên phần Town Hall gating của các item này
  KHÔNG bị ghi đè — chỉ chi phí + thời gian nâng cấp được cập nhật từ số
  liệu thật, Town Hall/gate vẫn theo công thức có sẵn trong code.
- NÊN LÀM: sau khi chạy --levels, mở vài dòng trong data/levels.json, so
  với chính trang coc.guide tương ứng hoặc số liệu bạn biết trong game,
  trước khi dùng để lập kế hoạch tài nguyên thật. Nếu thấy sai, báo lại kèm
  item bị sai — mình sẽ chỉnh lại parser.
