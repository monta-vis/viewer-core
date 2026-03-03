import { describe, it, expect } from 'vitest';
import { buildIconList, resolveNoteIconUrl } from './iconUtils';
import type { SafetyIconCatalog } from '../types';
import type { SafetyIconItem } from '../components/SafetyIconPicker';

const makeCatalog = (name: string, entries: SafetyIconCatalog['entries'], dirName?: string): SafetyIconCatalog => ({
  name,
  dirName: dirName ?? name,
  assetsDir: `C:/Catalogs/SafetyIcons/${dirName ?? name}/assets`,
  categories: [],
  entries,
});

describe('buildIconList', () => {
  it('includes catalogName and catalogDirName from the catalog', () => {
    const catalog = makeCatalog('ISO 7010 Safety Signs', [
      { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', filename: 'W001.png', category: 'Warnzeichen', label: { en: 'General warning' } },
      { id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', filename: 'P001.png', category: 'Verbotszeichen', label: { en: 'No entry' } },
    ], 'ISO-7010-Safety-Signs');

    const icons = buildIconList([catalog], 'en');

    expect(icons).toHaveLength(2);
    expect(icons[0].catalogName).toBe('ISO 7010 Safety Signs');
    expect(icons[0].catalogDirName).toBe('ISO-7010-Safety-Signs');
    expect(icons[1].catalogName).toBe('ISO 7010 Safety Signs');
    expect(icons[1].catalogDirName).toBe('ISO-7010-Safety-Signs');
  });

  it('uses entry.id (UUID) as SafetyIconItem.id, not filename', () => {
    const entryId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const catalog = makeCatalog('Test', [
      { id: entryId, filename: 'W001.png', category: 'Warn', label: { en: 'Warning' } },
    ]);

    const icons = buildIconList([catalog], 'en');

    expect(icons[0].id).toBe(entryId);
    expect(icons[0].filename).toBe('W001.png');
  });

  it('sets catalogName and catalogDirName to undefined for built-in icons', () => {
    // When no catalogs provided, falls back to built-in manifest
    const icons = buildIconList([], 'en');

    // Built-in icons should not have catalogName or catalogDirName
    for (const icon of icons) {
      expect(icon.catalogName).toBeUndefined();
      expect(icon.catalogDirName).toBeUndefined();
    }
  });

  it('passes through isoCode from catalog entries', () => {
    const catalog = makeCatalog('Test', [
      { id: 'uuid-1', filename: 'M009.png', category: 'Gebotszeichen', label: { de: 'Handschutz benutzen' }, isoCode: 'M009 Handschutz benutzen' },
    ]);

    const icons = buildIconList([catalog], 'de');

    expect(icons[0].isoCode).toBe('M009 Handschutz benutzen');
    expect(icons[0].label).toBe('Handschutz benutzen');
  });

  it('sets isoCode to undefined when catalog entry has no isoCode', () => {
    const catalog = makeCatalog('Test', [
      { id: 'uuid-1', filename: 'W001.png', category: 'Warn', label: { en: 'Warning' } },
    ]);

    const icons = buildIconList([catalog], 'en');

    expect(icons[0].isoCode).toBeUndefined();
  });

  it('strips ISO prefix from built-in fallback labels', () => {
    // Built-in icons derive labels from filenames; the regex should strip ISO prefixes
    const icons = buildIconList([], 'en');

    // Find a known built-in icon with an ISO prefix pattern (e.g. M009)
    const m009 = icons.find((i) => i.filename.includes('M009'));
    if (m009) {
      expect(m009.label).not.toMatch(/^M009\s/);
    }
  });
});

describe('resolveNoteIconUrl', () => {
  const builtinIcons: SafetyIconItem[] = [
    { id: 'W001.png', filename: 'W001.png', category: 'Warnzeichen', label: 'Warning' },
    { id: 'P001.png', filename: 'P001.png', category: 'Verbotszeichen', label: 'No entry' },
  ];

  const catalogIcons: SafetyIconItem[] = [
    { id: 'W001.png', filename: 'W001.png', category: 'Warnzeichen', label: 'Warning', catalogName: 'ISO_7010', catalogDirName: 'ISO-7010' },
    { id: 'C001.png', filename: 'C001.png', category: 'Custom', label: 'Custom', catalogName: 'Custom', catalogDirName: 'Custom-Cat' },
  ];

  const allIcons = [...catalogIcons, ...builtinIcons];

  const getIconUrl = (icon: SafetyIconItem) => `resolved://${icon.filename}`;

  it('returns built-in URL when safetyIconId matches a built-in icon', () => {
    const url = resolveNoteIconUrl('W001.png', builtinIcons, getIconUrl);
    expect(url).toBe('resolved://W001.png');
  });

  it('does NOT match catalog icons (prevents catalog path leakage)', () => {
    // C001.png only exists in catalog, not built-in — should not resolve
    const url = resolveNoteIconUrl('C001.png', allIcons, getIconUrl);
    expect(url).toBeNull();
  });

  it('skips catalog icon even when same filename exists in both catalog and built-in', () => {
    // W001.png exists in both — should resolve to built-in, not catalog
    const url = resolveNoteIconUrl('W001.png', allIcons, getIconUrl, 'my-project');
    expect(url).toBe('resolved://W001.png');
  });

  it('returns VFA media URL for UUID with folderName', () => {
    const vfaId = '550e8400-e29b-41d4-a716-446655440000';
    const url = resolveNoteIconUrl(vfaId, builtinIcons, getIconUrl, 'my-project');

    // Should build a mvis-media URL for the VFA frame
    expect(url).toContain(vfaId);
    expect(url).toContain('my-project');
    expect(url).toContain('media/frames');
  });

  it('returns null for UUID without folderName', () => {
    const vfaId = '550e8400-e29b-41d4-a716-446655440000';
    const url = resolveNoteIconUrl(vfaId, builtinIcons, getIconUrl);
    expect(url).toBeNull();
  });

  it('returns null for empty safetyIconId', () => {
    const url = resolveNoteIconUrl('', builtinIcons, getIconUrl);
    expect(url).toBeNull();
  });

  it('returns built-in URL for legacy filename even if folderName is set', () => {
    // Built-in match takes priority over VFA resolution
    const url = resolveNoteIconUrl('W001.png', builtinIcons, getIconUrl, 'my-project');
    expect(url).toBe('resolved://W001.png');
  });
});
