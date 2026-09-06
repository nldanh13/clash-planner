/**
 * Static strategy-guide content for the "Hướng dẫn" tab — general, evergreen
 * Clash of Clans tips (troop/hero/pet focus, attack strategy, base building)
 * written from broad game knowledge rather than pulled from any live data
 * source. Exact troop costs/stats and the "best" pet each season shift with
 * balance patches, so this deliberately favors durable principles and
 * well-established archetypes over numbers that go stale — the app's
 * Upgrade Tracker / Roadmap tabs are the source for anything that needs to
 * track the player's actual current data.
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
    title: "Giant + Wizard / Balloon",
    core: "Giant, Wizard, Balloon, Wall Breaker",
    role: "Giant hút sát thương và mở đường ở tường ngoài, Wizard/Balloon dập sát thương diện rộng phía sau khi tường đã mở.",
    tip: "Dùng Wall Breaker đúng lúc Giant vừa tới chân tường, tránh dồn hết quân vào một điểm có nhiều Mortar/Wizard Tower cùng lúc.",
  },
  {
    range: "TH9–10",
    title: "Hog Rider / Miner Rush",
    core: "Hog Rider, Miner, Healer, Bùa Đóng Băng",
    role: "Hog Rider nhảy qua tường lao thẳng vào phòng thủ, Miner đào ngầm né phần lớn bẫy mặt đất, Healer bay theo hồi máu cho cả hai.",
    tip: "Bùa Đóng Băng dùng để khống chế Inferno Tower/X-Bow ngay trước khi Hog/Miner tới nơi — chậm nửa giây là mất cả đội hình.",
  },
  {
    range: "TH11–12",
    title: "Dragon / Yeti Smash",
    core: "Electro Dragon, Yeti, Ice Golem, Super Witch",
    role: "Ice Golem hoặc Yeti đi đầu mở đường và hút sát thương, Electro Dragon/Witch dập diện rộng và triệu hồi lính hỗ trợ phía sau.",
    tip: "Bùa Cuồng Nộ dùng lúc phá lõi để đẩy nhanh tốc độ dọn phòng thủ, cẩn thận các phòng thủ đa mục tiêu (Chain Lightning, Multi-Archer Tower) khi dồn quân bay thành cụm.",
  },
  {
    range: "TH13+",
    title: "Root Rider / Siege Push",
    core: "Root Rider, Siege Machine, Super Troops",
    role: "Máy công thành (Siege Barracks, Stone Slammer...) mở đường và tăng viện giữa trận, Root Rider tanky và tự hồi máu khi di chuyển.",
    tip: "Kích hoạt khả năng Tướng đúng lúc đội hình chính vừa vào lõi, tính toán sát thương phòng thủ còn lại để chọn giữa bùa Sét hoặc bùa Cuồng Nộ cho hợp lý.",
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
    pets: "L.A.S.S.I (bền hơn ở giai đoạn đầu game), Mighty Yak (siêu trâu bò cho late game)",
    tip: "Cho King dẫn đầu đội hình để hấp thụ sát thương, kích hoạt khả năng ngay khi vào sâu trong base thay vì dùng quá sớm ở vòng ngoài.",
  },
  {
    hero: "Nữ Hoàng Cung Thủ (Archer Queen)",
    role: "Sát thương tầm xa ổn định, có thể ẩn thân né đòn.",
    pets: "Electro Owl (sát thương chuỗi sang mục tiêu lân cận), Frosty (làm chậm phòng thủ xung quanh)",
    tip: "\"Queen Charge\": dùng Healer hoặc Grand Warden hộ tống Queen dọn quân/phòng thủ vòng ngoài trước khi tung đội hình chính.",
  },
  {
    hero: "Đại Pháp Sư (Grand Warden)",
    role: "Buff/debuff diện rộng qua hào quang bay, có thể hồi sinh Tướng khác khi Tướng đó ngã xuống.",
    pets: "Phoenix (hồi sinh Tướng đi cùng khi chết, giữ hào quang luôn hoạt động)",
    tip: "Bật hào quang đúng lúc đội hình chính lao vào lõi phòng thủ để tối đa hoá hiệu quả buff, không bật quá sớm khi quân còn ở vòng ngoài.",
  },
  {
    hero: "Nữ Tướng Hoàng Gia (Royal Champion)",
    role: "Khiên bay tự tìm và tấn công phòng thủ tầm xa, gây sát thương diện hẹp.",
    pets: "Unicorn (hồi máu và khiên hỗ trợ đồng đội xung quanh)",
    tip: "Thả Champion trước để dọn Mortar/Wizard Tower/Air Defense từ xa, mở đường an toàn hơn cho đội hình chính vào sau.",
  },
  {
    hero: "Hoàng Tử Minion (Minion Prince)",
    role: "Sát thương bay tốc độ cao, cơ động tốt để dọn mục tiêu lẻ.",
    pets: "Spirit Fox (tăng tốc và lướt gây sát thương)",
    tip: "Dùng để dọn phòng không sớm hoặc hộ tống Queen Charge di chuyển nhanh hơn qua các cụm phòng thủ.",
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
