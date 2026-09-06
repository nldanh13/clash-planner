/**
 * Static strategy-guide content for the "Hướng dẫn" tab — Clash of Clans
 * tips (troop/hero/pet focus, attack strategy, base building) cross-checked
 * against current (2026) strategy sources rather than pulled from any live
 * in-app data. Exact troop costs/stats and the "best" pet each season can
 * still shift with the next balance patch, so this favors named, durable
 * archetypes (GoWiPe, Queen Charge, Dragon Duke Charge...) over raw numbers
 * that go stale — the app's Upgrade Tracker / Roadmap tabs are the source
 * for anything that needs to track the player's actual current data.
 */

export interface TroopFocusTier {
  range: string;
  title: string;
  core: string;
  role: string;
  tip: string;
}

export const TROOP_FOCUS_TIERS: TroopFocusTier[] = [
  {
    range: "TH7–8",
    title: "GoWiPe / Giant Wizard",
    core: "Giant, Wizard, Balloon, Wall Breaker — hoặc Golem, Wizard, P.E.K.K.A (GoWiPe) khi vừa mở khoá",
    role: "Giant/Golem hút sát thương và mở đường ở tường ngoài, Wizard/Balloon/P.E.K.K.A dập sát thương diện rộng phía sau khi tường đã mở.",
    tip: "Luôn dò trước vị trí Giant Bomb dọc đường tiến quân — dùng Wall Breaker đúng lúc tank vừa tới chân tường, tránh dồn hết quân vào một điểm có nhiều Mortar/Wizard Tower cùng lúc.",
  },
  {
    range: "TH9–10",
    title: "GoWiPe / Mass Hog Rider",
    core: "Golem, Wizard, P.E.K.K.A, Hog Rider, Healer, Bùa Đóng Băng",
    role: "GoWiPe làm lõi tanky phù hợp khi phòng không đối phương tập trung ở giữa base; Hog Rider + Healer mạnh hơn khi phòng không dàn trải quanh base, Hog nhảy thẳng qua tường vào phòng thủ.",
    tip: "Trước khi thả cụm Hog, luôn dò kỹ khu vực nghi có Giant Bomb — Bùa Đóng Băng dùng để khống chế Inferno Tower/X-Bow ngay trước khi Hog tới, chậm nửa giây là mất cả đội hình.",
  },
  {
    range: "TH11–12",
    title: "Zap Dragons / Queen Charge Hybrid",
    core: "Electro Dragon, Baby Dragon, Bùa Sét, Queen Charge (Archer Queen + Healer)",
    role: "Queen Charge dọn phòng không và phòng thủ tầm xa ở vòng ngoài trước, sau đó thả Dragon và dùng Bùa Sét phá nhanh Air Defense/Inferno Tower ngay khi vào.",
    tip: "Zap Dragons vẫn là lựa chọn an toàn, dễ kiểm soát nhất ở mốc này — nên thành thạo trước khi chuyển sang các tổ hợp phức tạp hơn của TH cao.",
  },
  {
    range: "TH13–14",
    title: "Super Archer/Yeti Spam, Super Dragon",
    core: "Super Archer, Yeti, Super Dragon, Siege Barracks/Balloon",
    role: "Super Archer/Yeti tanky, dàn hàng ngang dọn phòng thủ diện rộng hiệu quả; Super Dragon là lối đánh ổn định, dễ kiểm soát hơn khi cần chắc chắn.",
    tip: "Super Archer Clone Hydra (dùng Bùa Nhân Bản nhân đôi Super Archer giữa trận) rất mạnh nhưng cần canh thời điểm chuẩn xác — nên luyện tập trước khi mang vào War.",
  },
  {
    range: "TH15–16",
    title: "Warden Charge Super Yeti / Root Rider Smash",
    core: "Grand Warden, Super Yeti, Root Rider, Dragon Duke (mở khoá từ TH15)",
    role: "Warden Charge dùng hào quang bay dọn phòng thủ trước khi Super Yeti tràn vào lõi; Root Rider Smash kết hợp Root Rider tanky tự hồi máu cùng Dragon Duke để xuyên phá các bố cục phức tạp.",
    tip: "Dragon Duke mới mở khoá từ TH15 — tận dụng khả năng của Duke để dọn bẫy và mở funnel sạch trước khi đội hình chính tiến vào.",
  },
  {
    range: "TH17–18",
    title: "Dragon Duke Charge",
    core: "Dragon Duke, Dragon Rider/Super Bowler/Root Rider, Sky Wagon (máy công thành)",
    role: "Dragon Duke Charge dọn sạch khu vực nhiều bẫy và mở funnel mà gần như không tốn máu, sau đó Dragon Rider/Super Bowler/Root Rider xuyên thẳng vào lõi.",
    tip: "RC Walk (Royal Champion đi trước dọn phòng thủ tầm xa) vẫn là lựa chọn dễ tiếp cận hơn nếu bạn mới lên TH17–18, trước khi học Dragon Duke Charge phức tạp hơn.",
  },
];

export interface HeroPetTip {
  hero: string;
  role: string;
  pets: string;
  tip: string;
}

export const HERO_PET_TIPS: HeroPetTip[] = [
  {
    hero: "Vua Man Di (Barbarian King)",
    role: "Đánh cận chiến, máu trâu, hút sát thương tốt cho cả đội hình.",
    pets: "Phoenix (lựa chọn phổ biến nhất — hồi sinh King ngay khi ngã xuống để tiếp tục chiến đấu)",
    tip: "Cho King dẫn đầu đội hình hấp thụ sát thương; Phoenix cho King thêm một \"mạng\" dự phòng nếu chẳng may bị hạ giữa trận.",
  },
  {
    hero: "Nữ Hoàng Cung Thủ (Archer Queen)",
    role: "Sát thương tầm xa ổn định, có thể ẩn thân né đòn.",
    pets: "Unicorn (đáng tin cậy nhất cho Queen Charge nhờ hồi máu + khiên), Spirit Fox (ẩn thân hỗ trợ charge nhanh hơn)",
    tip: "\"Queen Charge\": dùng Healer hoặc Grand Warden hộ tống Queen dọn quân/phòng thủ vòng ngoài — Unicorn giúp Queen trụ vững lâu hơn suốt pha charge.",
  },
  {
    hero: "Đại Pháp Sư (Grand Warden)",
    role: "Buff/debuff diện rộng qua hào quang bay, có thể hồi sinh Tướng khác khi Tướng đó ngã xuống.",
    pets: "Electro Owl (lựa chọn an toàn, tổng quát nhất), Sneezy (mạnh hơn trong đội hình toàn quân bay — đứng sau hắt ra Booger bay tanky hút phòng thủ, chỉ ra trận khi Warden ngã xuống)",
    tip: "Bật hào quang đúng lúc đội hình chính lao vào lõi phòng thủ để tối đa hoá hiệu quả buff; chọn Sneezy nếu đội hình chủ yếu là quân bay.",
  },
  {
    hero: "Nữ Tướng Hoàng Gia (Royal Champion)",
    role: "Khiên bay tự tìm và tấn công phòng thủ tầm xa, gây sát thương diện hẹp.",
    pets: "Spirit Fox (ẩn thân liên tục giúp Champion sống sót khi lao sâu vào phòng thủ)",
    tip: "Thả Champion trước để dọn Mortar/Wizard Tower/Air Defense từ xa, mở đường an toàn hơn cho đội hình chính vào sau.",
  },
  {
    hero: "Hoàng Tử Minion (Minion Prince)",
    role: "Sát thương bay tốc độ cao, cơ động tốt để dọn mục tiêu lẻ.",
    pets: "Angry Jelly (ép Hoàng Tử chỉ nhắm mục tiêu vào công trình phòng thủ, ẩn thân/miễn nhiễm khi đang gắn với Tướng)",
    tip: "Dùng khi muốn Minion Prince tập trung dọn sạch phòng thủ thay vì bị phân tâm bởi lính hoặc bẫy xung quanh.",
  },
  {
    hero: "Công Tước Rồng (Dragon Duke)",
    role: "Tướng rồng mới, mở khoá từ TH15 — chuyên dọn đường và mở funnel sạch cho đội hình chính.",
    pets: "Angry Jelly (tăng khả năng nhắm phòng thủ khi dọn đường) hoặc Phoenix (thêm một mạng để Duke trụ lâu hơn)",
    tip: "Dùng Dragon Duke đi đầu ở các base nhiều bẫy để mở funnel sạch, gần như không tốn máu, trước khi tung đội hình chính vào.",
  },
];

export interface AttackTip {
  title: string;
  body: string;
}

export const ATTACK_STRATEGY_TIPS: AttackTip[] = [
  {
    title: "Quét base trước khi tấn công",
    body: "Nhìn kỹ cách chia ngăn tường, vị trí có khả năng giấu bẫy (góc khuất, giữa các ngăn), và đâu là công trình phòng thủ mạnh nhất cần né hoặc vô hiệu hoá trước.",
  },
  {
    title: "Dùng quân rẻ dò đường",
    body: "Thả vài lính rẻ tiền ở các điểm nghi ngờ có bẫy trước khi tung đội hình chính — mất vài lính rẻ còn hơn mất cả đội hình vì Giant Bomb hoặc Tornado Trap.",
  },
  {
    title: "Funnel quân vào giữa",
    body: "Thả lính rẻ ở hai bên trước để phòng thủ hai cánh tự bắn ra ngoài, dồn hướng đội hình chính đi thẳng vào giữa base thay vì tản ra xử lý toàn bộ vòng ngoài.",
  },
  {
    title: "Thứ tự dùng phép",
    body: "Bùa Đóng Băng dành cho Inferno Tower/Eagle Artillery/X-Bow ngay khi chúng khoá mục tiêu; Bùa Cuồng Nộ dùng lúc phá lõi để tăng tốc độ dọn phòng thủ còn lại; Bùa Hồi Máu giữ mạng cho tank ở tuyến đầu.",
  },
  {
    title: "Dùng khả năng Tướng đúng lúc",
    body: "Không kích hoạt khả năng Tướng ngay khi vừa thả quân — để dành cho thời điểm đội hình chính chạm lõi phòng thủ, lúc hiệu quả buff/heal/damage phát huy tối đa.",
  },
  {
    title: "Dụ quân trong Lâu Đài Clan (CC lure)",
    body: "Thả 1–2 lính gần Lâu Đài Clan đối phương để dụ quân bên trong ra ngoài, xử lý gọn bằng bẫy/phòng thủ có sẵn hoặc quân riêng trước khi bắt đầu đợt tấn công chính — tránh bị quân CC phá đội hình giữa trận.",
  },
];

export interface DefenseTip {
  title: string;
  body: string;
}

export const DEFENSE_BUILD_TIPS: DefenseTip[] = [
  {
    title: "Chia nhỏ base bằng tường",
    body: "Chia base thành nhiều ngăn nhỏ (compartment) thay vì để một khu vực trống lớn — quân bộ đối phương phải phá nhiều lớp tường mới tới được lõi, kéo dài thời gian tấn công.",
  },
  {
    title: "Bảo vệ lõi nhiều lớp",
    body: "Đặt Tòa Thị Chính cùng các phòng thủ mạnh nhất (Inferno Tower, Eagle Artillery, Tesla Ẩn) ở trung tâm, bao quanh bởi nhiều lớp tường và phòng thủ hỗ trợ khác.",
  },
  {
    title: "Rải kho tài nguyên làm mồi",
    body: "Đặt kho Vàng/Elixir ở rìa base để làm mồi phân tán hướng tấn công của đối phương, tách biệt với khu vực phòng thủ lõi để không bị lợi dụng làm đường phá vào giữa.",
  },
  {
    title: "Phủ đều phòng không",
    body: "Rải Phòng Không quanh toàn bộ base thay vì dồn về một góc — tránh bị các đội hình bay (Lava Loon, Dragon) xuyên thủng dễ dàng ở phía không có phòng không.",
  },
  {
    title: "Đặt bẫy ở điểm quân địch dồn vào",
    body: "Ưu tiên đặt bẫy tại lối vào các ngăn tường, khu vực gần phòng thủ mạnh, hoặc chính giữa base — những nơi quân đối phương gần như chắc chắn phải đi qua.",
  },
  {
    title: "Kiểm tra lại bằng Base Planner",
    body: "Dùng tính năng chấm điểm phòng thủ và xem thử hướng tấn công ngay trong Base Planner của app để phát hiện lỗ hổng trước khi lưu bản thiết kế cuối cùng.",
  },
];
