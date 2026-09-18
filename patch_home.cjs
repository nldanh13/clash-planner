const fs = require('fs');

const appFile = 'src/components/app/HomeTab.tsx';
let content = fs.readFileSync(appFile, 'utf8');

const target = `<div className="pt-6 pb-10 flex flex-col gap-10 w-full max-w-5xl mx-auto">
      {/* Hero */}`;

const replacement = `<div className="pt-2 pb-10 flex flex-col gap-8 w-full max-w-5xl mx-auto">
      {/* Hero Banner */}
      <div className="w-full max-w-5xl mx-auto rounded-b-3xl overflow-hidden shadow-2xl border-b border-x border-slate-800/80 hidden sm:block relative">
        <img 
          src="/banner.jpg" 
          alt="Osmox COC Banner" 
          className="w-full h-auto object-cover max-h-[360px]"
          onError={(e) => {
            const t = e.target;
            t.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1822] to-transparent pointer-events-none opacity-80" />
      </div>
      
      {/* Hero */}`;

content = content.replace(target, replacement);
fs.writeFileSync(appFile, content);
