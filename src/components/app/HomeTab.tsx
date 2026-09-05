import { ArrowRight, Castle, Compass, LogIn, MapPinned, Search, Wand2 } from "lucide-react";

type NavigableTab = "overview" | "planner" | "roadmap" | "base-planner";

interface HomeTabProps {
  onNavigate: (tab: NavigableTab) => void;
}

const FEATURES: {
  tab: NavigableTab;
  icon: typeof Castle;
  title: string;
  hint: string;
}[] = [
  { tab: "overview", icon: Castle, title: "Hồ sơ người chơi", hint: "Đồng bộ trực tiếp từ War Report" },
  { tab: "planner", icon: Wand2, title: "Upgrade Tracker", hint: "Thứ tự nâng cấp tối ưu" },
  { tab: "roadmap", icon: MapPinned, title: "Roadmap TH1–18", hint: "Toàn cảnh lộ trình phát triển" },
  { tab: "base-planner", icon: Compass, title: "Base Planner 44×44", hint: "Thiết kế & chấm điểm phòng thủ" },
];

export function HomeTab({ onNavigate }: HomeTabProps) {
  return (
    <div className="pt-16 pb-10 flex flex-col gap-16 max-w-4xl mx-auto">
      {/* Hero */}
      <section className="text-center flex flex-col items-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#F5F5F5] tracking-tight leading-[1.1] mb-5">
          Lên kế hoạch Clash of Clans<br className="hidden sm:block" /> bằng dữ liệu thật của bạn
        </h1>
        <p className="text-[15px] text-[#8B98A5] leading-relaxed mb-8 max-w-lg">
          Đồng bộ hồ sơ, biết nên nâng gì trước, và thiết kế base — tất cả trong một chỗ.
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm font-bold transition-colors"
          >
            Khám phá Base Planner
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Features — a light strip, not a wall of cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FEATURES.map(({ tab, icon: Icon, title, hint }) => (
          <button
            key={tab}
            onClick={() => onNavigate(tab)}
            className="text-left p-4 rounded-xl border border-slate-800/80 hover:border-slate-600 hover:bg-slate-900/40 transition-colors flex flex-col gap-2"
          >
            <Icon className="w-4 h-4 text-slate-400" />
            <strong className="text-[13px] text-slate-100 font-bold leading-tight">{title}</strong>
            <span className="text-[11px] text-slate-500 leading-tight">{hint}</span>
          </button>
        ))}
      </section>

      {/* One quiet line instead of a boxed guide + about section */}
      <section className="text-center text-xs text-slate-500 flex flex-col items-center gap-2 pt-2">
        <p className="flex items-center gap-1.5 m-0">
          <LogIn className="w-3.5 h-3.5" />
          Xem hồ sơ và roadmap không cần tài khoản — chỉ Base Planner cần đăng nhập Google để lưu bản thiết kế của bạn.
        </p>
        <p className="m-0">
          Làm bởi <span className="text-slate-300 font-semibold">Osmox</span>, một Clasher đến từ Việt Nam.
        </p>
      </section>
    </div>
  );
}
