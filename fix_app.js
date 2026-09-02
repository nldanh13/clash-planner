const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /async function loadPlayer[\s\S]*?if\(!res\.ok\)[\s\S]*?\}finally\{\n\s*setLoading\(false\);\n\s*\}\n\s*\}/,
  `async function loadPlayer(raw=input){
    await load(raw);
    const tag = normalizeTag(raw);
    const cached = localStorage.getItem(\`coc-cache-\${tag}\`);
    if(cached){
      setPlayer(JSON.parse(cached));
      setRoadTH(JSON.parse(cached).townHallLevel);
      setMaxTownHall(JSON.parse(cached).townHallLevel);
    }
    setSyncedAt(new Date());
    localStorage.setItem("coc-last-tag", tag);
  }`
);

// We also need to add usePlayer
content = content.replace(
  /export default function App\(\)\{/,
  `import { usePlayer } from "./hooks/usePlayer";\n\nexport default function App(){`
);

// We need to replace the state variables that usePlayer now manages.
content = content.replace(/const \[input,setInput\]=useState\(\(\)=>localStorage\.getItem\("coc-last-tag"\)\|\|""\);\n\s*const \[player,setPlayer\]=useState<Player\|null>\(null\);\n\s*const \[loading,setLoading\]=useState\(false\),\[error,setError\]=useState\(""\),\[syncedAt,setSyncedAt\]=useState<Date\|null>\(null\);/, `const { input, setInput, loading, error, cacheWarning, player, setPlayer, history, load } = usePlayer();\n  const [syncedAt, setSyncedAt] = useState<Date|null>(null);`);

content = content.replace(/const \[cacheWarning,setCacheWarning\]=useState\(""\);\n\s*const abortControllerRef=useRef<AbortController\|null>\(null\);/, ``);

fs.writeFileSync('src/App.tsx', content);
