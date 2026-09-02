export function validateImages(data) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
  return Object.values(data).every(v => typeof v === 'string' && v.startsWith('http'));
}

export function validateTownHalls(data) {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return false;
  return data.every(th => 
    typeof th.level === 'number' &&
    typeof th.title === 'string' &&
    typeof th.unlocks === 'object' && th.unlocks !== null
  );
}

export function validateCatalog(data) {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return false;
  return data.every(item => 
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.kind === 'string' &&
    (typeof item.owner === 'string' || item.owner === null)
  );
}

export function validateLevels(data) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
  return Object.values(data).every(arr => 
    Array.isArray(arr) && arr.every(row => 
      typeof row.level === 'number' &&
      typeof row.cost === 'number' &&
      typeof row.timeHours === 'number'
    )
  );
}
