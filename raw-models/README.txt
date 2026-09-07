Thư mục trung chuyển cho model 3D Hyper3D
==========================================

Đây CHỈ là nơi tạm để bạn thả file .glb tải về từ Hyper3D lên GitHub (qua
nút "Add file → Upload files" trên trang repo, không cần cài git). App
KHÔNG đọc trực tiếp từ thư mục này — sau khi bạn upload xong, báo lại để
chạy:

    node scripts/import-glb-models.mjs

Script sẽ tự động:
  - Đối chiếu tên file (không tính đuôi .glb) với đúng danh sách id công
    trình bên dưới.
  - Kiểm tra file có đúng định dạng .glb hợp lệ không (magic header).
  - Copy vào public/models/<id>.glb — chỗ app thật sự sẽ đọc.
  - Báo cáo file nào khớp, file nào tên sai/không nhận diện được, và
    những id nào còn thiếu.

QUAN TRỌNG — đặt tên file đúng id bên dưới (viết thường, gạch ngang),
ví dụ cannon.glb, archer-tower.glb. Sai tên = script không nhận ra.

Danh sách đầy đủ 53 id (giống hệt public/buildings/README.txt):

-- Trụ sở & Phòng thủ --
town-hall, cannon, archer-tower, mortar, air-defense, wizard-tower,
air-sweeper, hidden-tesla, bomb-tower, xbow, inferno-tower,
eagle-artillery, scattershot, builder-hut, monolith, spell-tower,
multi-archer-tower, ricochet-cannon, firespitter

-- Tài nguyên --
gold-mine, elixir-collector, dark-elixir-drill, gold-storage,
elixir-storage, dark-elixir-storage, helper-hut

-- Quân đội --
clan-castle, army-camp, barracks, dark-barracks, laboratory,
spell-factory, dark-spell-factory, blacksmith, workshop, pet-house,
hero-hall, hero-banner

-- Hero Altar --
barbarian-king, archer-queen, minion-prince, grand-warden,
royal-champion, dragon-duke

-- Bẫy --
bomb, spring-trap, air-bomb, giant-bomb, seeking-air-mine,
skeleton-trap, tornado-trap, giga-bomb

-- Tường --
wall

Không bắt buộc phải làm đủ 53 id cùng lúc — thả bao nhiêu file cũng
được, script chỉ xử lý những file có tên khớp, phần còn lại vẫn dùng
ảnh/vector cũ bình thường.
