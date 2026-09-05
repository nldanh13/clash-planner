import {
  BookOpen,
  Castle,
  Compass,
  Heart,
  LogIn,
  MapPinned,
  Search,
  Shield,
  Sparkles,
  Swords,
  Wand2,
} from "lucide-react";

type NavigableTab = "overview" | "planner" | "roadmap" | "base-planner";

interface HomeTabProps {
  onNavigate: (tab: NavigableTab) => void;
}

const FEATURES: {
  tab: NavigableTab;
  icon: typeof Castle;
  color: string;
  title: string;
  description: string;
}[] = [
  {
    tab: "overview",
    icon: Castle,
    color: "text-amber-400",
    title: "Hồ sơ người chơi",
    description: "Đồng bộ Town Hall, hero, quân, phép và trang bị trực tiếp từ hồ sơ thật qua War Report.",
  },
  {
    tab: "planner",
    icon: Wand2,
    color: "text-cyan-400",
    title: "Upgrade Tracker",
    description: "Xếp thứ tự nâng cấp tối ưu theo tài nguyên và thời gian thợ xây đang có.",
  },
  {
    tab: "roadmap",
    icon: MapPinned,
    color: "text-emerald-400",
    title: "Roadmap TH1–18",
    description: "Nhìn toàn bộ lộ trình phát triển làng từ Town Hall 1 đến 18 trên một trục thời gian.",
  },
  {
    tab: "base-planner",
    icon: Compass,
    color: "text-violet-400",
    title: "Base Planner 44×44",
    description: "Thiết kế bố trí làng trên lưới isometric, chấm điểm phòng thủ và lưu lại theo tài khoản.",
  },
];

const GUIDE_STEPS = [
  {
    title: "Nhập Player Tag của bạn",
    description: "Gõ Player Tag vào thanh tìm kiếm trên cùng rồi bấm \"Tải tài khoản\" để đồng bộ dữ liệu thật.",
  },
  {
    title: "Xem hồ sơ & tiến độ",
    description: "Tab \"Hồ sơ người chơi\" tổng hợp toàn bộ hero, quân, phép, trang bị và những gì chưa mở khoá.",
  },
  {
    title: "Lên kế hoạch nâng cấp",
    description: "\"Upgrade Tracker\" và \"Roadmap\" giúp bạn biết nên nâng gì trước để không phí tài nguyên hay thời gian thợ xây.",
  },
  {
    title: "Thiết kế base của riêng bạn",
    description: "Đăng nhập bằng Google để mở Base Planner — bản thiết kế được lưu vào tài khoản, dùng lại trên mọi thiết bị.",
  },
];

export function HomeTab({ onNavigate }: HomeTabProps) {
  return (
    <div className="pt-8 pb-4 flex flex-col gap-14">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-[#2C3340] bg-gradient-to-b from-[#1B202A] to-[#14171F] px-6 sm:px-10 py-12 text-center">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Chào mừng đến với Clash Path
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#F0F0F0] tracking-tight mb-4">
            Lập kế hoạch Clash of Clans, dựa trên dữ liệu thật của chính bạn
          </h1>
          <p className="text-sm sm:text-base text-[#B0BECA] leading-relaxed mb-8">
            Clash Path đồng bộ hồ sơ Clash of Clans của bạn gần như theo thời gian
            thực, biến hàng chục con số nâng cấp rời rạc thành một lộ trình rõ
            ràng — và cho bạn một bàn thiết kế base riêng để lên bố trí phòng thủ
            trước khi xây thật.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onNavigate("overview")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#1e1406] text-sm font-bold transition-colors"
            >
              <Search className="w-4 h-4" />
              Tra cứu hồ sơ của bạn
            </button>
            <button
              onClick={() => onNavigate("base-planner")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#142636] hover:bg-[#1f374e] border border-[#ffffff1a] text-slate-200 text-sm font-bold transition-colors"
            >
              <Compass className="w-4 h-4" />
              Khám phá Base Planner
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <div className="text-center mb-8">
          <p className="text-amber-400 text-xs font-black tracking-[.13em] uppercase mb-2">Clash Path có gì</p>
          <h2 className="text-2xl font-extrabold text-[#F0F0F0]">Bốn công cụ, một mục tiêu: đỡ tốn thời gian đoán mò</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ tab, icon: Icon, color, title, description }) => (
            <button
              key={tab}
              onClick={() => onNavigate(tab)}
              className="text-left p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-600 hover:bg-slate-900 transition-colors flex flex-col gap-2.5"
            >
              <Icon className={`w-5 h-5 ${color}`} />
              <strong className="text-sm text-slate-100 font-bold">{title}</strong>
              <span className="text-xs text-slate-400 leading-relaxed">{description}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Quick guide */}
      <section className="rounded-2xl border border-[#2C3340] bg-[#161B24] p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-extrabold text-[#F0F0F0]">Hướng dẫn nhanh</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {GUIDE_STEPS.map((step, i) => (
            <div key={step.title} className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 text-xs font-black flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <strong className="block text-sm text-slate-100 font-bold mb-0.5">{step.title}</strong>
                <p className="text-xs text-slate-400 leading-relaxed m-0">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2.5 mt-6 pt-5 border-t border-slate-800 text-xs text-slate-400">
          <LogIn className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span>
            Chưa cần tài khoản để xem hồ sơ, roadmap hay upgrade tracker — chỉ Base
            Planner mới yêu cầu đăng nhập Google, vì bản thiết kế được lưu thẳng
            vào tài khoản của bạn.
          </span>
        </div>
      </section>

      {/* About / creator */}
      <section className="rounded-2xl border border-[#2C3340] bg-gradient-to-br from-[#1B202A] to-[#14171F] p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-rose-400" />
          <h2 className="text-xl font-extrabold text-[#F0F0F0]">Vì sao có Clash Path?</h2>
        </div>
        <p className="text-sm text-[#B0BECA] leading-relaxed mb-4 max-w-3xl">
          Clash Path ra đời từ một nhu cầu rất thật của người chơi: mở hàng chục
          tab để so cost nâng cấp, đoán xem công trình nào nên xây trước, rồi vẽ
          tay sơ đồ base lên giấy nháp. Đó là lý do toàn bộ dữ liệu, chi phí và
          thời gian nâng cấp được gom về một chỗ, và trình thiết kế base ra đời để
          bạn thử bố trí phòng thủ trước khi tiêu tài nguyên xây thật ngoài game.
        </p>
        <p className="text-sm text-[#B0BECA] leading-relaxed max-w-3xl">
          Dự án được xây dựng và duy trì bởi{" "}
          <strong className="text-amber-300 font-bold">Osmox</strong> — một người
          chơi Clash of Clans đến từ Việt Nam, làm ra công cụ này trước hết để
          dùng cho chính làng của mình, rồi chia sẻ lại cho những Clasher khác
          đang loay hoay với cùng bài toán.
        </p>
        <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-slate-800">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
            <Shield className="w-3.5 h-3.5" />
            Không thu thập dữ liệu cá nhân ngoài những gì cần để đồng bộ hồ sơ
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
            <Swords className="w-3.5 h-3.5" />
            Không liên kết chính thức với Supercell
          </span>
        </div>
      </section>
    </div>
  );
}
