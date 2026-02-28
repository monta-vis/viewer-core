import { describe, it, expect } from 'vitest';
import {
  getCategoryFromFilename,
  getCategoryColor,
  getCategoryPriority,
  SAFETY_ICON_CATEGORIES,
  NOTE_CATEGORY_STYLES,
  LEGACY_LEVEL_TO_ICON,
  type SafetyIconCategory,
} from './safetyIcons';

describe('getCategoryFromFilename', () => {
  it('returns Warnzeichen for W-prefixed files', () => {
    expect(getCategoryFromFilename('W001-Allgemeines-Warnzeichen.jpg')).toBe('Warnzeichen');
  });

  it('returns Verbotszeichen for P-prefixed files', () => {
    expect(getCategoryFromFilename('P001-Allgemeines-Verbotszeichen.jpg')).toBe('Verbotszeichen');
  });

  it('returns Gebotszeichen for M-prefixed files', () => {
    expect(getCategoryFromFilename('M001_Allgemeines-Gebotszeichen.jpg')).toBe('Gebotszeichen');
  });

  it('returns Gefahrstoffe for GHS-prefixed files', () => {
    expect(getCategoryFromFilename('GHS_01_gr.gif')).toBe('Gefahrstoffe');
  });

  it('returns Piktogramme-Leitern for PI-prefixed files', () => {
    expect(getCategoryFromFilename('PI001_Maximale_Belastung.jpg')).toBe('Piktogramme-Leitern');
  });

  it('returns Verbotszeichen for D-P country-specific variants', () => {
    expect(getCategoryFromFilename('D-P006-Zutritt-fuer-Unbefugte-verboten.jpg')).toBe('Verbotszeichen');
  });

  it('returns Warnzeichen for D-W country-specific variants', () => {
    expect(getCategoryFromFilename('D-W021-Warnung-vor-explosionsfaehiger-Atmosphaere.jpg')).toBe('Warnzeichen');
  });

  it('returns Verbotszeichen for WSP-prefixed files', () => {
    expect(getCategoryFromFilename('WSP001-Laufen-verboten.jpg')).toBe('Verbotszeichen');
  });

  it('returns Gebotszeichen for WSM-prefixed files', () => {
    expect(getCategoryFromFilename('WSM001-Rettungsweste-benutzen.jpg')).toBe('Gebotszeichen');
  });

  it('no longer returns deleted categories', () => {
    // E-prefixed files (Rettungszeichen) — category removed, should not appear
    // F-prefixed files (Brandschutz) — category removed, should not appear
    // Unrecognized prefixes no longer return 'Sonstige' — returns null
    const result = getCategoryFromFilename('Reichtungspfeil_rechts.jpg');
    expect(result).toBeNull();
  });

  it('returns null for E-prefixed files (Rettungszeichen removed)', () => {
    expect(getCategoryFromFilename('E003-Erste-Hilfe.jpg')).toBeNull();
  });

  it('returns null for F-prefixed files (Brandschutz removed)', () => {
    expect(getCategoryFromFilename('F001-Feuerloescher.jpg')).toBeNull();
  });
});

describe('getCategoryColor', () => {
  it('returns red for Verbotszeichen', () => {
    expect(getCategoryColor('Verbotszeichen')).toBe('#CC0000');
  });

  it('returns yellow for Warnzeichen', () => {
    expect(getCategoryColor('Warnzeichen')).toBe('#FFD700');
  });

  it('returns blue for Gebotszeichen', () => {
    expect(getCategoryColor('Gebotszeichen')).toBe('#0066CC');
  });

  it('returns red for Gefahrstoffe', () => {
    expect(getCategoryColor('Gefahrstoffe')).toBe('#CC0000');
  });

  it('returns light gray for Piktogramme-Leitern', () => {
    expect(getCategoryColor('Piktogramme-Leitern')).toBe('#E0E0E0');
  });

  it('returns gray for unknown category', () => {
    expect(getCategoryColor('Unknown')).toBe('#666666');
  });
});

describe('getCategoryPriority', () => {
  it('sorts Verbotszeichen before Warnzeichen', () => {
    expect(getCategoryPriority('Verbotszeichen')).toBeLessThan(getCategoryPriority('Warnzeichen'));
  });

  it('sorts Gefahrstoffe before Gebotszeichen', () => {
    expect(getCategoryPriority('Gefahrstoffe')).toBeLessThan(getCategoryPriority('Gebotszeichen'));
  });

  it('returns 99 for unknown categories', () => {
    expect(getCategoryPriority('Unknown')).toBe(99);
  });
});

describe('LEGACY_LEVEL_TO_ICON', () => {
  it('maps Critical to P001', () => {
    expect(LEGACY_LEVEL_TO_ICON.Critical).toBe('P001-Allgemeines-Verbotszeichen.png');
  });

  it('maps Warning to W001', () => {
    expect(LEGACY_LEVEL_TO_ICON.Warning).toBe('W001-Allgemeines-Warnzeichen.png');
  });

  it('maps Quality to M001', () => {
    expect(LEGACY_LEVEL_TO_ICON.Quality).toBe('M001_Allgemeines-Gebotszeichen.png');
  });

  it('maps Info to W001 (fallback to warning)', () => {
    expect(LEGACY_LEVEL_TO_ICON.Info).toBe('W001-Allgemeines-Warnzeichen.png');
  });
});

describe('SAFETY_ICON_CATEGORIES', () => {
  it('has exactly 5 categories', () => {
    expect(Object.keys(SAFETY_ICON_CATEGORIES)).toHaveLength(5);
  });

  it('only contains the 5 remaining categories', () => {
    const keys = Object.keys(SAFETY_ICON_CATEGORIES);
    expect(keys).toContain('Verbotszeichen');
    expect(keys).toContain('Warnzeichen');
    expect(keys).toContain('Gefahrstoffe');
    expect(keys).toContain('Gebotszeichen');
    expect(keys).toContain('Piktogramme-Leitern');
    expect(keys).not.toContain('Rettungszeichen');
    expect(keys).not.toContain('Brandschutz');
    expect(keys).not.toContain('Sonstige');
  });

  it('each category has color, label, priority', () => {
    for (const cat of Object.values(SAFETY_ICON_CATEGORIES)) {
      expect(cat).toHaveProperty('color');
      expect(cat).toHaveProperty('label');
      expect(typeof cat.priority).toBe('number');
    }
  });
});

describe('NOTE_CATEGORY_STYLES', () => {
  it('has a style entry for each category', () => {
    const categories: SafetyIconCategory[] = [
      'Verbotszeichen', 'Warnzeichen', 'Gefahrstoffe', 'Gebotszeichen', 'Piktogramme-Leitern',
    ];
    for (const cat of categories) {
      expect(NOTE_CATEGORY_STYLES[cat]).toBeDefined();
      expect(NOTE_CATEGORY_STYLES[cat]).toHaveProperty('bg');
      expect(NOTE_CATEGORY_STYLES[cat]).toHaveProperty('border');
      expect(NOTE_CATEGORY_STYLES[cat]).toHaveProperty('text');
    }
  });
});
