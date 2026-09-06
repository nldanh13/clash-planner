import type { ReactNode } from "react";
import { ChevronDown, Crown, ShieldCheck, Swords, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ATTACK_STRATEGY_TIPS,
  DEFENSE_BUILD_TIPS,
  HERO_PET_TIPS,
  TROOP_FOCUS_TIERS,
} from "../../guideData";

interface GuideSectionShellProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  intro: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

function GuideSection({ icon: Icon, eyebrow, title, intro, defaultOpen, children }: GuideSectionShellProps) {
  return (
    <details className="guide-section" open={defaultOpen}>
      <summary className="guide-section-head">
        <span className="guide-section-icon"><Icon /></span>
        <span className="guide-section-heading">
          <p>{eyebrow}</p>
          <h3>{title}</h3>
        </span>
        <ChevronDown className="guide-section-chevron" />
      </summary>
      <div className="guide-section-body">
        <p className="guide-section-intro">{intro}</p>
        {children}
      </div>
    </details>
  );
}

export function GuideTab() {
  return (
    <section className="panel guide-panel">
      <div className="section-head">
        <div>
          <p>MẸO CHƠI &amp; CHIẾN THUẬT</p>
          <h2>Hướng dẫn chơi</h2>
        </div>
      </div>

      <p className="guide-disclaimer">
        Nội dung dưới đây là các nguyên tắc và tổ hợp quân/tướng/thú phổ biến, ổn định theo thời gian —
        không phải bảng chỉ số chính xác. Chi phí, sát thương và mức mở khoá cụ thể có thể thay đổi theo
        từng đợt cập nhật, hãy đối chiếu lại trong game hoặc tab Roadmap/Upgrade Tracker của app.
      </p>

      <div className="guide-sections">
        <GuideSection
          icon={Swords}
          eyebrow="TỔ HỢP QUÂN THEO TOWN HALL"
          title="Chọn lính tấn công theo Town Hall"
          intro="Mỗi mốc Town Hall thường có một vài tổ hợp quân chủ lực đã được kiểm chứng qua thời gian. Dưới đây là các hướng đi phổ biến theo từng giai đoạn."
          defaultOpen
        >
          <div className="guide-card-grid">
            {TROOP_FOCUS_TIERS.map((tier) => (
              <div className="guide-card" key={tier.range}>
                <header>
                  <span className="guide-card-badge">{tier.range}</span>
                  <strong>{tier.title}</strong>
                </header>
                <dl>
                  <dt>Quân chủ lực</dt>
                  <dd>{tier.core}</dd>
                  <dt>Vai trò</dt>
                  <dd>{tier.role}</dd>
                </dl>
                <p className="guide-card-tip">💡 {tier.tip}</p>
              </div>
            ))}
          </div>
        </GuideSection>

        <GuideSection
          icon={Crown}
          eyebrow="PHỐI HỢP TƯỚNG & THÚ CƯNG"
          title="Tướng nào đi với Thú nào"
          intro="Mỗi Tướng có vai trò riêng trên chiến trường, và một số Thú cưng đã trở thành lựa chọn quen thuộc nhờ hợp cơ chế với đúng Tướng đó."
        >
          <div className="guide-card-grid">
            {HERO_PET_TIPS.map((hero) => (
              <div className="guide-card" key={hero.hero}>
                <header>
                  <strong>{hero.hero}</strong>
                </header>
                <dl>
                  <dt>Vai trò</dt>
                  <dd>{hero.role}</dd>
                  <dt>Thú cưng phổ biến</dt>
                  <dd>{hero.pets}</dd>
                </dl>
                <p className="guide-card-tip">💡 {hero.tip}</p>
              </div>
            ))}
          </div>
        </GuideSection>

        <GuideSection
          icon={Target}
          eyebrow="KỸ THUẬT TẤN CÔNG"
          title="Chiến thuật tấn công tổng thể"
          intro="Chọn đúng quân chỉ là một nửa trận đấu — cách đọc base và điều khiển đội hình mới thường quyết định thắng thua."
        >
          <ol className="guide-tip-list">
            {ATTACK_STRATEGY_TIPS.map((tip) => (
              <li key={tip.title}>
                <strong>{tip.title}</strong>
                <span>{tip.body}</span>
              </li>
            ))}
          </ol>
        </GuideSection>

        <GuideSection
          icon={ShieldCheck}
          eyebrow="XÂY BASE & PHÒNG THỦ"
          title="Mẹo xây base cơ bản"
          intro="Vài nguyên tắc phòng thủ nền tảng luôn đúng bất kể Town Hall của bạn ở mốc nào — áp dụng trực tiếp khi thiết kế trong Base Planner."
        >
          <ol className="guide-tip-list">
            {DEFENSE_BUILD_TIPS.map((tip) => (
              <li key={tip.title}>
                <strong>{tip.title}</strong>
                <span>{tip.body}</span>
              </li>
            ))}
          </ol>
        </GuideSection>
      </div>
    </section>
  );
}
