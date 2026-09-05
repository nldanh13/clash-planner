import { upgradeItems } from "./src/upgradeData";
const cannon = upgradeItems.find(i => i.id === "cannon");
console.log(cannon.levels.slice(8, 12));
