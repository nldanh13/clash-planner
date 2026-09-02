import { describe, it, expect } from 'vitest';
import { validateImages, validateTownHalls, validateCatalog, validateLevels } from './validator.mjs';

describe('Validators', () => {
  describe('validateImages', () => {
    it('should return true for valid images', () => {
      expect(validateImages({ "cannon": "http://example.com/cannon.png" })).toBe(true);
    });
    it('should return false for invalid structure', () => {
      expect(validateImages([])).toBe(false);
      expect(validateImages(null)).toBe(false);
      expect(validateImages({ "cannon": 123 })).toBe(false);
    });
  });

  describe('validateTownHalls', () => {
    it('should return true for valid townhalls', () => {
      expect(validateTownHalls([
        { level: 1, title: 'TH1', unlocks: {} }
      ])).toBe(true);
    });
    it('should return false for invalid structure', () => {
      expect(validateTownHalls({})).toBe(false);
      expect(validateTownHalls([ { level: '1' } ])).toBe(false);
    });
  });

  describe('validateCatalog', () => {
    it('should return true for valid catalog', () => {
      expect(validateCatalog([
        { id: '1', name: 'Cannon', kind: 'defense', owner: 'th' },
        { id: '2', name: 'Archer', kind: 'troop', owner: null }
      ])).toBe(true);
    });
    it('should return false for missing fields', () => {
      expect(validateCatalog([
        { id: '1', name: 'Cannon' }
      ])).toBe(false);
    });
  });

  describe('validateLevels', () => {
    it('should return true for valid levels', () => {
      expect(validateLevels({
        "cannon": [ { level: 1, cost: 100, timeHours: 1 } ]
      })).toBe(true);
    });
    it('should return false for invalid structure', () => {
      expect(validateLevels({
        "cannon": [ { level: 1, cost: "100" } ]
      })).toBe(false);
    });
  });
});
