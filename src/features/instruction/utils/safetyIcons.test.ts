import { describe, it, expect } from 'vitest';
import {
  getCategoryFromFilename,
  getCategoryColor,
  getCategoryPriority,
  isLegacyLevel,
  SAFETY_ICON_CATEGORIES,
  LEGACY_LEVEL_TO_ICON,
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

  it('returns Rettungszeichen for E-prefixed files', () => {
    expect(getCategoryFromFilename('E003-Erste-Hilfe.jpg')).toBe('Rettungszeichen');
  });

  it('returns Brandschutz for F-prefixed files', () => {
    expect(getCategoryFromFilename('F001-Feuerloescher.jpg')).toBe('Brandschutz');
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

  it('returns Rettungszeichen for D-E country-specific variants', () => {
    expect(getCategoryFromFilename('D-E019_Notausstieg.jpg')).toBe('Rettungszeichen');
  });

  it('returns Warnzeichen for D-W country-specific variants', () => {
    expect(getCategoryFromFilename('D-W021-Warnung-vor-explosionsfaehiger-Atmosphaere.jpg')).toBe('Warnzeichen');
  });

  it('returns Warnzeichen for WS-prefixed warning supplementals', () => {
    expect(getCategoryFromFilename('WSP001-Laufen-verboten.jpg')).toBe('Verbotszeichen');
    expect(getCategoryFromFilename('WSE001-Oeffentliche-Rettungsausruestung.jpg')).toBe('Rettungszeichen');
    expect(getCategoryFromFilename('WSM001-Rettungsweste-benutzen.jpg')).toBe('Gebotszeichen');
  });

  it('returns Sonstige for unrecognized prefixes', () => {
    expect(getCategoryFromFilename('Reichtungspfeil_rechts.jpg')).toBe('Sonstige');
    expect(getCategoryFromFilename('Beispiel-Rettungsweg-Notausgang-E002-Zusatzzeichen.jpg')).toBe('Sonstige');
  });
});

describe('getCategoryColor', () => {
  it('returns red for Verbotszeichen', () => {
    expect(getCategoryColor('Verbotszeichen')).toBe('#CC0000');
  });

  it('returns yellow for Warnzeichen', () => {
    expect(getCategoryColor('Warnzeichen')).toBe('#FFD700');
  });

  it('returns green for Rettungszeichen', () => {
    expect(getCategoryColor('Rettungszeichen')).toBe('#009933');
  });

  it('returns blue for Gebotszeichen', () => {
    expect(getCategoryColor('Gebotszeichen')).toBe('#0066CC');
  });

  it('returns gray for unknown category', () => {
    expect(getCategoryColor('Unknown')).toBe('#666666');
  });
});

describe('getCategoryPriority', () => {
  it('sorts Verbotszeichen before Warnzeichen', () => {
    expect(getCategoryPriority('Verbotszeichen')).toBeLessThan(getCategoryPriority('Warnzeichen'));
  });

  it('sorts Warnzeichen before Rettungszeichen', () => {
    expect(getCategoryPriority('Warnzeichen')).toBeLessThan(getCategoryPriority('Rettungszeichen'));
  });

  it('sorts Gefahrstoffe before Gebotszeichen', () => {
    expect(getCategoryPriority('Gefahrstoffe')).toBeLessThan(getCategoryPriority('Gebotszeichen'));
  });

  it('returns 99 for unknown categories', () => {
    expect(getCategoryPriority('Unknown')).toBe(99);
  });
});

describe('isLegacyLevel', () => {
  it('returns true for old note levels', () => {
    expect(isLegacyLevel('Critical')).toBe(true);
    expect(isLegacyLevel('Warning')).toBe(true);
    expect(isLegacyLevel('Quality')).toBe(true);
    expect(isLegacyLevel('Info')).toBe(true);
  });

  it('returns false for non-level strings', () => {
    expect(isLegacyLevel('something')).toBe(false);
    expect(isLegacyLevel('')).toBe(false);
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

  it('maps Info to E003', () => {
    expect(LEGACY_LEVEL_TO_ICON.Info).toBe('E003-Erste-Hilfe.png');
  });
});

describe('SAFETY_ICON_CATEGORIES', () => {
  it('has all 8 categories (including Sonstige)', () => {
    expect(Object.keys(SAFETY_ICON_CATEGORIES)).toHaveLength(8);
  });

  it('each category has color, label, priority', () => {
    for (const cat of Object.values(SAFETY_ICON_CATEGORIES)) {
      expect(cat).toHaveProperty('color');
      expect(cat).toHaveProperty('label');
      expect(typeof cat.priority).toBe('number');
    }
  });
});
