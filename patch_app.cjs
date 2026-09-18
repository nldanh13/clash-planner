const fs = require('fs');

const appFile = 'src/App.tsx';
let content = fs.readFileSync(appFile, 'utf8');

const target = `<div className="brand" onClick={() => handleTabChange("home")} style={{ cursor: "pointer" }}>
            <span className="crest"><ShieldCheck /></span>
            <div>
              <strong>{t("app.brandName")}</strong>
              <small>{t("app.brandTagline")}</small>
            </div>
          </div>`;

const replacement = `<div className="brand" onClick={() => handleTabChange("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
            <img 
              src="/logo-text.png" 
              alt={t("app.brandName")} 
              className="h-7 sm:h-8 object-contain"
              onError={(e) => {
                const target = e.target;
                target.style.display = 'none';
                if (target.nextElementSibling) {
                  target.nextElementSibling.style.display = 'flex';
                }
              }} 
            />
            <div style={{ display: "none", alignItems: "center", gap: "8px" }}>
              <span className="crest"><ShieldCheck /></span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <strong>{t("app.brandName")}</strong>
                <small>{t("app.brandTagline")}</small>
              </div>
            </div>
          </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(appFile, content);
