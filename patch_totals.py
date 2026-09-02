import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Modify townHallTotals
content = content.replace(
    """  const townHallTotals=useMemo(()=>{
    const costs=emptyCosts();
    const laneHours:Record<UpgradeLane,number>={Builder:0,Laboratory:0,Blacksmith:0,"Pet House":0,Instant:0};
    for(const row of townHallRows){addCosts(costs,row.plan.costs);laneHours[row.item.lane]+=row.plan.totalHours}
    return {costs,laneHours,count:townHallRows.length};
  },[townHallRows]);""",
    """  const townHallTotals=useMemo(()=>{
    const costs=emptyCosts();
    const laneHours:Record<UpgradeLane,number>={Builder:0,Laboratory:0,Blacksmith:0,"Pet House":0,Instant:0};
    let hasEstimated = false;
    for(const row of townHallRows){
        if (row.item.dataStatus === "unchecked") continue;
        if (row.item.dataStatus === "estimated") hasEstimated = true;
        addCosts(costs,row.plan.costs);
        laneHours[row.item.lane]+=row.plan.totalHours;
    }
    return {costs,laneHours,count:townHallRows.filter(r => r.item.dataStatus !== "unchecked").length, hasEstimated};
  },[townHallRows]);"""
)

# Modify suggestTotals
content = content.replace(
    """  const suggestTotals=useMemo(()=>{
    const costs=emptyCosts();
    const laneHours:Record<UpgradeLane,number>={Builder:0,Laboratory:0,Blacksmith:0,"Pet House":0,Instant:0};
    for(const row of suggestRows){addCosts(costs,row.plan.costs);laneHours[row.item.lane]+=row.plan.totalHours}
    return {costs,laneHours,count:suggestRows.length};
  },[suggestRows]);""",
    """  const suggestTotals=useMemo(()=>{
    const costs=emptyCosts();
    const laneHours:Record<UpgradeLane,number>={Builder:0,Laboratory:0,Blacksmith:0,"Pet House":0,Instant:0};
    let hasEstimated = false;
    for(const row of suggestRows){
        if (row.item.dataStatus === "unchecked") continue;
        if (row.item.dataStatus === "estimated") hasEstimated = true;
        addCosts(costs,row.plan.costs);
        laneHours[row.item.lane]+=row.plan.totalHours;
    }
    return {costs,laneHours,count:suggestRows.filter(r => r.item.dataStatus !== "unchecked").length, hasEstimated};
  },[suggestRows]);"""
)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
