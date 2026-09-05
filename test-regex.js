const COC_GUIDE_BUILDING_ART = {
  "army-camp":"/static/imgs/army/troop-housing-12.png",
  "barracks":"/static/imgs/army/barrack-18.png",
  "cannon":"/static/imgs/defense/cannon-21.png",
  "spell-tower":"/static/imgs/defense/spell-tower-3.png",
  "wall":"/static/imgs/defense/wall-18.png"
};

for (const [k, v] of Object.entries(COC_GUIDE_BUILDING_ART)) {
  const m = v.match(/^(.*)-(\d+)\.png$/);
  if (!m) console.log(k, "NO MATCH");
}
console.log("Done checking regex");
