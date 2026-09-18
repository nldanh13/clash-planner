const fs = require('fs');

const appFile = 'src/components/app/MobileNavDrawer.tsx';
let content = fs.readFileSync(appFile, 'utf8');

const target = `<span className="mobile-nav-brand">
            <ShieldCheck className="w-[18px] h-[18px]" />
            <strong>{t("app.brandName")}</strong>
          </span>`;

const replacement = `<span className="mobile-nav-brand" style={{ display: "flex", alignItems: "center" }}>
            <img 
              src="/logo-text.png" 
              alt={t("app.brandName")} 
              style={{ height: "20px", objectFit: "contain" }} 
              onError={(e) => {
                const target = e.target;
                target.style.display = 'none';
                if (target.nextElementSibling) {
                  target.nextElementSibling.style.display = 'flex';
                }
              }} 
            />
            <span style={{ display: "none", alignItems: "center", gap: "6px" }}>
              <ShieldCheck className="w-[18px] h-[18px]" />
              <strong>{t("app.brandName")}</strong>
            </span>
          </span>`;

content = content.replace(target, replacement);
fs.writeFileSync(appFile, content);
