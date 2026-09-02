// Ánh xạ dataId nội bộ của Clash of Clans sang id nội bộ của app.
//
// Nguồn dữ liệu: trong game, Cài đặt > More Settings > Data Export > Copy sẽ
// chép một khối JSON mô tả toàn bộ làng vào clipboard. Khối này dùng id số
// (ví dụ Cannon = 1000008) thay vì tên, vì đó là id nội bộ trong file dữ
// liệu gốc của Supercell (buildings.csv, traps.csv...). Bảng dưới đây được
// đối chiếu từ hai nguồn cộng đồng độc lập (gist "Clash of Clans JSON Export
// Mapping" và gói dữ liệu chiefpansancolt/clash-of-clans-data), không phải
// tài liệu chính thức của Supercell.
//
// App chỉ cần map công trình / phòng thủ / bẫy của LÀNG CHÍNH (home village)
// — đây là những mục app đang phải nhập tay vì API chính thức không công bố
// cấp của chúng. Hero, quân, phép và trang bị đã tự động đồng bộ qua API nên
// không cần map ở đây. Dữ liệu Builder Base (khoá "...2" trong JSON, ví dụ
// buildings2/traps2) dùng dải id khác nên sẽ tự động không khớp bảng này và
// bị bỏ qua một cách an toàn thay vì gán nhầm.
//
// Nếu Supercell đổi id ở bản cập nhật sau và một mục không còn khớp, tính
// năng dán dữ liệu sẽ báo "bỏ qua" cho mục đó thay vì áp cấp sai — khi đó
// bảng này cần được cập nhật lại.
export const villageDataIdMap: Record<number, string> = {
  // Công trình
  1000000: "army-camp",
  1000002: "elixir-collector",
  1000003: "elixir-storage",
  1000004: "gold-mine",
  1000005: "gold-storage",
  1000006: "barracks",
  1000007: "laboratory",
  1000014: "clan-castle",
  1000020: "spell-factory",
  1000023: "dark-elixir-drill",
  1000024: "dark-elixir-storage",
  1000026: "dark-barracks",
  1000029: "dark-spell-factory",
  1000059: "workshop",
  1000068: "pet-house",
  1000070: "blacksmith",

  // Phòng thủ
  1000008: "cannon",
  1000009: "archer-tower",
  1000011: "wizard-tower",
  1000012: "air-defense",
  1000013: "mortar",
  1000015: "builder-hut",
  1000019: "hidden-tesla",
  1000021: "xbow",
  1000027: "inferno-tower",
  1000028: "air-sweeper",
  1000031: "eagle-artillery",
  1000067: "scattershot",
  1000072: "spell-tower",
  1000077: "monolith",
  1000084: "multi-archer-tower",
  1000085: "ricochet-cannon",
  1000089: "firespitter",

  // Tường (nhận diện được nhưng app cố tình bỏ qua Wall, xem ghi chú ở App.tsx)
  1000010: "wall",

  // Bẫy
  12000000: "bomb",
  12000001: "spring-trap",
  12000002: "giant-bomb",
  12000005: "air-bomb",
  12000006: "seeking-air-mine",
  12000008: "skeleton-trap",
  12000016: "tornado-trap"
};
