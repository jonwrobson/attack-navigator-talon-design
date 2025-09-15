import { LayoutOptions } from './viewmodels.service';

describe('LayoutOptions', () => {
  it('enforces valid layouts and toggles showName/showID with mini', () => {
    const lo = new LayoutOptions();
    lo.layout = 'mini';
    (expect(lo.showID) as any).toBeFalse();
    (expect(lo.showName) as any).toBeFalse();
    lo.showID = true; // should force layout away from mini
    (expect(lo.layout) as any).toBe('side');
    lo.layout = 'flat';
    (expect(lo.layout) as any).toBe('flat');
  });

  it('serialize/deserialize roundtrip', () => {
    const lo = new LayoutOptions();
    lo.showAggregateScores = true;
    lo.countUnscored = true;
    lo.aggregateFunction = 'sum';
    const rep = lo.serialize();
    const lo2 = new LayoutOptions();
    lo2.deserialize(rep);
    (expect(lo2.showAggregateScores) as any).toBeTrue();
    (expect(lo2.aggregateFunction) as any).toBe('sum');
  });
});
