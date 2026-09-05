import { upgradeItems } from "./src/upgradeData";
const cannon = upgradeItems.find(i => i.id === "cannon");
console.log(cannon.levels.map(l => "L" + l.level + ": TH" + l.townHall).join(", "));
