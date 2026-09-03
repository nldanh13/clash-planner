import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/const \{ player, loading, error, syncedAt, load, isStale \} = usePlayer\(\);/,
`const { player, loading, error, syncedAt, load } = usePlayer();
  const isStale = Boolean(player && syncedAt && (Date.now() - syncedAt.getTime() > 1000 * 60 * 60 * 2));`);
fs.writeFileSync('src/App.tsx', content);
