/**
 * Vietnamese strings — the reference locale. Every other locale (see
 * src/i18n/index.ts) must supply the exact same key shape; TypeScript
 * enforces this via `Dictionary = typeof vi`, so a missing translation is a
 * compile error instead of a silent fallback to Vietnamese text.
 *
 * Keep wording consistent with itself: a term used in two screens (e.g.
 * "Hero", "Cấp", "Đồng bộ hồ sơ") should reuse `common.*` rather than being
 * retyped, so screens can't drift apart the way they used to before this
 * file existed.
 */
export const vi = {
  common: {
    hero: "Hero",
    building: "Công trình",
    defense: "Phòng thủ",
    trap: "Bẫy",
    wall: "Tường",
    troop: "Quân",
    troopsFull: "Quân đội",
    spell: "Phép",
    siege: "Máy công thành",
    equipment: "Trang bị",
    pet: "Pet",
    level: "Cấp",
    all: "Tất cả",
    close: "Đóng",
    cancel: "Hủy",
    save: "Lưu",
    delete: "Xóa",
    edit: "Sửa",
    confirm: "Xác nhận",
    loading: "Đang tải…",
    syncProfile: "Đồng bộ hồ sơ",
    syncAgain: "Đồng bộ lại",
    playerTag: "Player Tag",
    townHall: "Town Hall",
  },
  app: {
    brandName: "Clash Path",
    brandTagline: "Đồng bộ từ War Report",
    searchPlaceholder: "Nhập Player Tag, ví dụ #R0CV8RVU2",
    syncTooltip: "Đồng bộ lại",
    banners: {
      notFound:
        "Không tìm thấy Player Tag này trên War Report. Hệ thống chỉ đồng bộ được các tài khoản đã từng được tra cứu trên war-report.com — thử mở hồ sơ của bạn ở đó trước, rồi quay lại đây.",
      stale:
        'Dữ liệu đang hiển thị là bản lưu từ lần đồng bộ trước, có thể đã cũ. Bấm "{syncLabel}" hoặc biểu tượng đồng bộ ở góc trên bên phải để cập nhật số liệu mới nhất.',
      dataWarningTitle: "Cảnh báo dữ liệu:",
    },
    nav: {
      home: "Trang chủ",
      overview: "Hồ sơ người chơi",
      planner: "Upgrade Tracker",
      roadmap: "Roadmap TH1–18",
      basePlanner: "Base Planner (Lưới 44×44)",
    },
    overviewTab: {
      rosterHint:
        "Hiển thị toàn bộ hero/quân/phép/pet/máy công thành có trong game — mục nào chưa mở khóa vẫn hiện, làm mờ và có khóa; rê chuột vào để xem điều kiện mở.",
      groupHeroSubtitle: "Toàn bộ hero hiện có trong game",
      groupTroopSubtitle: "Quân thường dùng để tấn công (không tính quân Super tạm thời)",
      spellTitle: "Phép thuật",
      groupSpellSubtitle: "Phép từ Spell Factory và Dark Spell Factory",
      groupSiegeSubtitle: "Mở khóa qua Workshop, dùng để phá lớp phòng thủ ngoài",
      groupPetSubtitle: "Ghép cùng hero qua Pet House",
      groupEquipmentSubtitle: "Toàn bộ trang bị hero, nâng qua Blacksmith — xem nhãn hero trên từng thẻ",
      manualEyebrow: "NHẬP DỮ LIỆU KHÔNG CÓ TRONG API",
      manualTitle: "Tình trạng công trình và bẫy",
      manualCountLabel: "{filled}/{total} đã nhập · {percent}%",
      pasteDescription:
        "War Report không cung cấp cấp độ của công trình phòng thủ, bẫy và máy khai thác — những mục này bạn cần tự nhập tay ở dưới, hoặc dán dữ liệu JSON xuất ra từ công cụ bên ngoài vào ô dưới đây để cập nhật hàng loạt.",
      pastePlaceholder: "Dán dữ liệu JSON vào đây...",
      pasteApply: "Áp dụng",
      pasteInvalid: "Dữ liệu không hợp lệ.",
      pasteNoChange: "Dữ liệu hợp lệ nhưng không có cấp độ nào thay đổi.",
      pasteSuccess: "Đã cập nhật {count} công trình: {list}.",
      manualGroupResource: "Tài nguyên & Quân sự",
      manualMax: "Max {max}",
      manualEmpty: "Chưa mở khóa công trình nào ở mốc Town Hall này.",
    },
    footer: {
      dataSource: "Dữ liệu người chơi: War Report / API chính thức Clash of Clans",
      manualProgressNote: "Tiến độ thủ công lưu riêng theo từng Player Tag",
      admin: "Admin",
      disclaimer:
        "Nội dung không chính thức, không được Supercell xác nhận hay ủng hộ. Xem Fan Content Policy tại supercell.com/en/fan-content-policy",
    },
  },
  home: {
    headlineLine1: "Lên kế hoạch Clash of Clans",
    headlineLine2: "bằng dữ liệu thật của bạn",
    subheadline: "Đồng bộ hồ sơ, biết nên nâng gì trước, và thiết kế base — tất cả trong một chỗ.",
    ctaSearch: "Tra cứu hồ sơ của bạn",
    ctaBasePlanner: "Khám phá Base Planner",
    features: {
      overviewHint: "Đồng bộ trực tiếp từ War Report",
      plannerHint: "Thứ tự nâng cấp tối ưu",
      roadmapHint: "Toàn cảnh lộ trình phát triển",
      basePlannerTitle: "Base Planner 44×44",
      basePlannerHint: "Thiết kế & chấm điểm phòng thủ",
    },
    authNote: "Xem hồ sơ và roadmap không cần tài khoản — chỉ Base Planner cần đăng nhập Google để lưu bản thiết kế của bạn.",
    credit: "Làm bởi {name}, một Clasher đến từ Việt Nam.",
    creatorName: "Osmox",
  },
  auth: {
    signIn: "Đăng nhập",
    signInWithGoogle: "Đăng nhập với Google",
    openingPopup: "Đang mở…",
    openingPopupFull: "Đang mở cửa sổ đăng nhập…",
    signedIn: "Đã đăng nhập",
    signOut: "Đăng xuất",
    guestName: "Clasher",
    errors: {
      popupBlocked: "Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép popup cho trang này rồi thử lại.",
      popupClosed: "Cửa sổ đăng nhập đã bị đóng trước khi hoàn tất. Bấm lại để thử tiếp.",
      networkFailed: "Không thể kết nối tới máy chủ đăng nhập. Kiểm tra lại mạng rồi thử lại.",
      generic: "Đăng nhập không thành công. Vui lòng thử lại.",
    },
    gate: {
      title: "Cần đăng nhập để tạo Base",
      description:
        "Bản thiết kế được lưu thẳng vào tài khoản của bạn để không bị mất khi đổi máy hoặc trình duyệt tự xoá bộ nhớ tạm. Đăng nhập bằng Google — miễn phí, không cần tạo mật khẩu riêng cho ClashPath.",
      privacyNote: "Chỉ dùng tài khoản Google để xác thực, không lưu mật khẩu của bạn.",
      back: "Quay lại",
    },
  },
  pwa: {
    installApp: "Cài đặt ứng dụng",
    installAppTitle: "Cài đặt ứng dụng vào máy",
    installIOS: "Cài đặt iOS",
    installIOSTitle: "Hướng dẫn cài đặt trên iOS",
    iosModalTitle: "Cài đặt trên iPhone / iPad",
    iosModalDescription: "Ứng dụng này hỗ trợ chạy toàn màn hình siêu mượt không cần trình duyệt web!",
    iosStep1Prefix: "Nhấn vào nút",
    iosShareLabel: "Chia sẻ (Share)",
    iosStep1Suffix: "ở thanh công cụ Safari dưới cùng.",
    iosStep2Prefix: "Kéo xuống và chọn",
    iosAddToHomeLabel: "Thêm vào MH chính (Add to Home Screen)",
    iosStep2Suffix: ".",
    gotIt: "Đã hiểu",
  },
} as const;
