import { Gradient } from './viewmodels.service';

describe('Gradient utility', () => {
  it('should initialize with a default preset and serialize/deserialize', () => {
    const g = new Gradient();
    // default preset has at least 2 colors
    (expect(g.colors.length >= 2) as any).toBeTrue();
    g.minValue = 10;
    g.maxValue = 90;
    const ser = g.serialize();
    const g2 = new Gradient();
    g2.deSerialize(ser);
    (expect(g2.colors.length) as any).toBe(g.colors.length);
    (expect(g2.minValue) as any).toBe(10);
    (expect(g2.maxValue) as any).toBe(90);
  });

  it('should change presets and update gradient', () => {
    const g = new Gradient();
    const initial = g.colors.map(c => c.color).join(',');
    g.setGradientPreset('bluered');
    (expect(g.colors.length) as any).toBeGreaterThanOrEqual(2);
    const after = g.colors.map(c => c.color).join(',');
    (expect(after === initial) as any).toBeFalse();
    g.updateGradient();
    // gradientRGB should be computed
    (expect(Array.isArray(g.gradientRGB)) as any).toBeTrue();
    (expect(g.gradientRGB.length) as any).toBeGreaterThan(0);
  });

  it('should map values to gradient endpoints', () => {
    const g = new Gradient();
    g.minValue = 0;
    g.maxValue = 100;
    g.updateGradient();
    const low = g.getColor('0');
    const high = g.getColor('100');
    (expect(low) as any).toBeDefined();
    (expect(high) as any).toBeDefined();
    // endpoints should differ for non-flat gradients
    (expect(JSON.stringify(low) === JSON.stringify(high)) as any).toBeFalse();
  });

  it('should add and remove colors', () => {
    const g = new Gradient();
    const before = g.colors.length;
    g.addColor();
    (expect(g.colors.length) as any).toBe(before + 1);
    g.removeColor(g.colors.length - 1);
    (expect(g.colors.length) as any).toBe(before);
  });
});
