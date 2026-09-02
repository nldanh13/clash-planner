import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const cocAdminData = path.resolve(__dirname, '../coc-admin/data');

describe('update-data.mjs', () => {
  let backup;
  
  beforeAll(() => {
    // Backup existing coc-admin/data
    if (fs.existsSync(cocAdminData)) {
      backup = path.resolve(__dirname, '../coc-admin/data_backup');
      fs.cpSync(cocAdminData, backup, { recursive: true });
    }
  });

  afterAll(() => {
    // Restore backup
    if (backup && fs.existsSync(backup)) {
      fs.rmSync(cocAdminData, { recursive: true, force: true });
      fs.renameSync(backup, cocAdminData);
    }
  });

  it('should fail when a required file is missing', () => {
    // Temporarily remove a required file
    const target = path.resolve(cocAdminData, 'images.json');
    const temp = path.resolve(cocAdminData, 'images.json.tmp');
    if (fs.existsSync(target)) fs.renameSync(target, temp);
    
    try {
      execSync('node scripts/update-data.mjs --validate-only', { encoding: 'utf-8' });
      // Should not reach here
      expect(true).toBe(false);
    } catch (err) {
      expect(err.status).toBe(1);
      expect(err.stdout.toString() + err.stderr.toString()).toContain('Required file images.json is missing');
    }
    
    // Restore
    if (fs.existsSync(temp)) fs.renameSync(temp, target);
  });

  it('should fail when data is invalid', () => {
    const target = path.resolve(cocAdminData, 'catalog.json');
    const temp = path.resolve(cocAdminData, 'catalog.json.tmp');
    if (fs.existsSync(target)) {
      fs.renameSync(target, temp);
      // Write invalid data
      fs.writeFileSync(target, JSON.stringify([{ id: '1' }])); // Missing required fields
    }
    
    try {
      execSync('node scripts/update-data.mjs --validate-only', { encoding: 'utf-8' });
      expect(true).toBe(false);
    } catch (err) {
      expect(err.status).toBe(1);
      expect(err.stdout.toString() + err.stderr.toString()).toContain('catalog.json validation failed');
    }
    
    // Restore
    if (fs.existsSync(temp)) {
      fs.rmSync(target);
      fs.renameSync(temp, target);
    }
  });
});
