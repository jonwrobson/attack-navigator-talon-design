import { Filter } from './classes';

describe('Filter helpers', () => {
  it('initPlatformOptions, toggle, inFilter, serialize/deSerialize', () => {
    const f = new Filter();
    // fake domain
    const domain: any = { platforms: ['Windows', 'Linux'] };
    f.initPlatformOptions(domain);
    (expect(f.platforms.options.length) as any).toBe(2);
    f.toggleInFilter('platforms', 'Windows');
    (expect(f.inFilter('platforms', 'Windows')) as any).toBeFalse();
    f.toggleInFilter('platforms', 'Windows');
    (expect(f.inFilter('platforms', 'Windows')) as any).toBeTrue();
    const ser = f.serialize();
    const f2 = new Filter();
    f2.deSerialize(JSON.parse(ser));
    (expect(f2.inFilter('platforms', 'Windows')) as any).toBeTrue();
  });
});
