import type { ReactNode } from "react";
import { ChevronDown, Crown, Gem, ShieldCheck, Swords, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ACCOUNT_PROGRESS_TIPS,
  ATTACK_STRATEGY_TIPS,
  DEFENSE_BUILD_TIPS,
  HERO_PET_TIPS,
  TROOP_FOCUS_TIERS,
} from "../../guideData";
import { GuideIcon } from "./guideIcons";
import { AttackScene } from "./guideAttackScenes";

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
        Nội dung dưới đây đã được đối chiếu theo các chiến thuật đang phổ biến hiện nay, nhưng vẫn tập
        trung vào nguyên tắc và tổ hợp quân/tướng/thú ổn định lâu dài — không phải bảng chỉ số chính xác.
        Chi phí, sát thương và mức mở khoá cụ thể có thể thay đổi theo từng đợt cập nhật cân bằng, hãy đối
        chiếu lại trong game hoặc tab Roadmap/Upgrade Tracker của app.
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
              <div className="guide-card guide-card--feature" key={tier.range}>
                <div className="guide-card-media">
                  <AttackScene range={tier.range} />
                  <span className="guide-card-media-badge">{tier.range}</span>
                </div>
                <header>
                  <GuideIcon id={tier.icon} size={32} />
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
              <div className="guide-card guide-card--profile" key={hero.hero}>
                <div className="guide-hero-media">
                  <GuideIcon id={hero.icon} size={64} />
                </div>
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
          <ol className="guide-tip-grid">
            {ATTACK_STRATEGY_TIPS.map((tip, i) => (
              <li className="guide-tip-card" key={tip.title}>
                <span className="guide-tip-kicker">{String(i + 1).padStart(2, "0")}</span>
                <GuideIcon id={tip.icon} size={44} />
                <strong>{tip.title}</strong>
                <span className="guide-tip-body">{tip.body}</span>
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
          <ol className="guide-tip-grid">
            {DEFENSE_BUILD_TIPS.map((tip, i) => (
              <li className="guide-tip-card" key={tip.title}>
                <span className="guide-tip-kicker">{String(i + 1).padStart(2, "0")}</span>
                <GuideIcon id={tip.icon} size={44} />
                <strong>{tip.title}</strong>
                <span className="guide-tip-body">{tip.body}</span>
              </li>
            ))}
          </ol>
        </GuideSection>

        <GuideSection
          icon={Gem}
          eyebrow="TÀI KHOẢN & TÀI NGUYÊN"
          title="Mẹo phát triển tài khoản"
          intro="Ngoài base và đội hình, tốc độ phát triển tài khoản (thợ xây, trang bị Tướng, tài nguyên) cũng quyết định bạn lên Town Hall nhanh hay chậm."
        >
          <ol className="guide-tip-grid">
            {ACCOUNT_PROGRESS_TIPS.map((tip, i) => (
              <li className="guide-tip-card" key={tip.title}>
                <span className="guide-tip-kicker">{String(i + 1).padStart(2, "0")}</span>
                <GuideIcon id={tip.icon} size={44} />
                <strong>{tip.title}</strong>
                <span className="guide-tip-body">{tip.body}</span>
              </li>
            ))}
          </ol>
        </GuideSection>
      </div>
    </section>
  );
}
