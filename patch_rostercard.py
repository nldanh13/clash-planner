import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace RosterCard
content = re.sub(
    r'function RosterCard.*?return <article className=\{`roster-card\$\{unlocked\?"":" locked"\}\`\} title=\{unlocked\?undefined:lockNoteFor\(item\)\}>\n\s*<div className="roster-image">\n\s*\{stage==="icon"\|\|\(stage==="remote"&&!remote\)\n\s*\? <Icon/>\n\s*: <img src=\{stage==="local"\?localArt\(item\):\(remote as string\)\} alt=\{item\.name\} onError=\{\(\)=>setStage\(stage==="local"\?\(remote\?"remote":"icon"\):"icon"\)\}/>\}\n\s*\{\!unlocked&&<span className="roster-lock"><Lock/></span>\}\n\s*</div>\n\s*<div className="roster-copy">\n\s*<strong>\{item\.name\}</strong>\n\s*\{item\.owner&&<span className="roster-owner">\{item\.owner\}</span>\}\n\s*<small>\{unlocked\?`Cấp \$\{current\} · Max \$\{max\}`:`Mở ở TH\$\{item\.unlockTownHall\}`\}</small>\n\s*</div>\n\s*</article>;\n\}',
    """function RosterCard({item,player,manualLevels}:{item:UpgradeItem;player:Player;manualLevels:Record<string,number>}){
  const current=currentLevelFor(item,player,manualLevels);
  const max=item.levels.at(-1)?.level||1;
  const unlocked=player.townHallLevel>=item.unlockTownHall;
  return <article className={`roster-card${unlocked?"":" locked"}`} title={unlocked?undefined:lockNoteFor(item)}>
    <div className="roster-image">
      <SmartArt item={item} />
      {!unlocked&&<span className="roster-lock"><Lock/></span>}
    </div>
    <div className="roster-copy">
      <strong>{item.name}</strong>
      {item.owner&&<span className="roster-owner">{item.owner}</span>}
      <small>{unlocked?`Cấp ${current} · Max ${max}`:`Mở ở TH${item.unlockTownHall}`}</small>
    </div>
  </article>;
}""",
    content,
    flags=re.DOTALL
)

content = content.replace("const townHallInfo=townHallDb||townHallInfoDefault;", "const townHallInfo=getTownHallInfo();")
content = content.replace('thImage(', 'import { thImage } from "./components/SmartArt";\nthImage(')

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
