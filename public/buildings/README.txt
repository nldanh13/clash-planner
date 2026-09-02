Ảnh công trình / phòng thủ / bẫy — lưu local
=============================================

CÁCH NHANH NHẤT: chạy lệnh dưới đây một lần từ thư mục gốc dự án, script sẽ
tự tải toàn bộ ảnh (công trình lẫn quân/hero/phép/trang bị/pet/máy công
thành) về đúng các thư mục public/ mà app cần, không phải làm gì thêm:

    node scripts/download-images.mjs

Xem chi tiết cách hoạt động trong scripts/download-images.mjs. Sau khi chạy
xong, mọi ảnh trong app đều load từ máy bạn, không phụ thuộc mạng ngoài nữa.

App hiển thị ảnh theo 3 tầng ưu tiên, tự động rớt tầng khi không có:
  1) File local trong public/buildings/<id>.png — ổn định nhất, script trên
     tự tải vào đây, hoặc bạn tự bỏ ảnh vào cũng được.
  2) Hotlink từ coc.guide (trang dữ liệu Clash of Clans lấy trực tiếp từ
     file game gốc, không phải suy đoán tên file như trước) — dùng tạm khi
     chưa chạy script tải ảnh. Có thể lệch nếu coc.guide đổi cấu trúc ảnh.
  3) Icon minh họa (lucide-react) — luôn có, không bao giờ trống.

Nếu muốn tự bỏ ảnh riêng, bỏ file .png vào thư mục này với đúng tên id bên
dưới (viết thường, có dấu gạch ngang), ví dụ public/buildings/cannon.png —
app tự ưu tiên dùng ảnh này trước, không cần sửa code. Ảnh vuông, tối thiểu
128x128px, nền trong suốt là đẹp nhất.

NGUỒN ẢNH CHẤT LƯỢNG CAO NHẤT — Supercell Fankit (fankit.supercell.com)
-------------------------------------------------------------------
Đây là kho ảnh CHÍNH THỨC từ Supercell (hơn 1.600 asset cho Clash of
Clans, có cả biến thể theo từng cấp). Chất lượng và độ ổn định tốt hơn hẳn
các trang cộng đồng ở tầng "remote" (coc.guide/colinschmale) vì là nguồn
gốc, nhưng KHÔNG thể tự động tải qua script vì trang này yêu cầu đăng nhập
tài khoản Supercell để duyệt/tải, nên phải tự làm thủ công:
  1. Vào fankit.supercell.com, đăng nhập, chọn game Clash of Clans.
  2. Tìm ảnh công trình/quân/hero muốn dùng, bấm vào, chọn độ phân giải
     rồi tải về (PNG khuyến nghị để có nền trong suốt).
  3. Đổi tên file đúng theo id trong danh sách bên dưới (hoặc trong
     public/heroes, public/troops, public/spells, public/equipment,
     public/pets với đuôi .webp — xem localFolder()/localExt() trong
     src/App.tsx nếu không chắc thư mục/đuôi file của một mục nào đó).
  4. Bỏ file vào đúng thư mục — app tự ưu tiên dùng ngay, không cần sửa
     code hay chạy lại script nào.

Theo Fan Content Policy của Supercell (supercell.com/en/fan-content-policy),
dùng Supercell Assets cho công cụ/app cá nhân phi thương mại như thế này
là được phép, với điều kiện: không chỉnh sửa ảnh gốc, không thương mại
hoá, và có ghi chú "not endorsed by Supercell" — app đã có sẵn dòng ghi
chú này ở footer.

Danh sách id (không bắt buộc phải đủ, thiếu id nào thì mục đó vẫn hiển thị
icon như bình thường):

-- Công trình --
army-camp.png
elixir-collector.png
elixir-storage.png
gold-mine.png
gold-storage.png
dark-elixir-drill.png
dark-elixir-storage.png
barracks.png
dark-barracks.png
spell-factory.png
dark-spell-factory.png
laboratory.png
clan-castle.png
blacksmith.png
workshop.png
pet-house.png

-- Phòng thủ --
builder-hut.png
cannon.png
archer-tower.png
mortar.png
air-defense.png
wizard-tower.png
air-sweeper.png
hidden-tesla.png
xbow.png
inferno-tower.png
eagle-artillery.png
scattershot.png
monolith.png
spell-tower.png
multi-archer-tower.png
ricochet-cannon.png
firespitter.png
wall.png

-- Bẫy --
bomb.png
spring-trap.png
air-bomb.png
giant-bomb.png
seeking-air-mine.png
skeleton-trap.png
tornado-trap.png
giga-bomb.png

Ảnh hero/quân/phép/trang bị/pet/máy công thành thì nằm trong các thư mục
anh em cùng cấp: public/heroes, public/troops, public/spells,
public/equipment, public/pets — cũng theo đúng cơ chế 3 tầng như trên,
script tải ảnh ở trên lo luôn phần này.
