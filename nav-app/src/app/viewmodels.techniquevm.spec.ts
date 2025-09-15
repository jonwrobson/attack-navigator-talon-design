import { TechniqueVM, Metadata, Link } from './viewmodels.service';

describe('TechniqueVM helpers', () => {
  it('annotated and modified reflect state and resetAnnotations clears', () => {
    const tvm = new TechniqueVM('T1000^exec');
    (expect(tvm.annotated()) as any).toBeFalse();
    (expect(tvm.modified()) as any).toBeFalse();

    tvm.score = '5';
    tvm.color = '#fff';
    tvm.enabled = false;
    tvm.comment = 'note';
    tvm.links.push(Object.assign(new Link(), { label: 'l', url: 'u' }));
    tvm.metadata.push(Object.assign(new Metadata(), { name: 'k', value: 'v' }));

    (expect(tvm.annotated()) as any).toBeTrue();
    (expect(tvm.modified()) as any).toBeTrue();

    const ser = tvm.serialize();
    (expect(ser.includes('"score": 5')) as any).toBeTrue();

    tvm.resetAnnotations();
    (expect(tvm.annotated()) as any).toBeFalse();
    (expect(tvm.enabled) as any).toBeTrue();
  });

  it('deSerialize sets fields from JSON', () => {
    const tvm = new TechniqueVM('T2000^exec');
    const rep = JSON.stringify({ score: 3, comment: 'c', color: '#111111', enabled: false, showSubtechniques: true, metadata: [{ name: 'a', value: 'b' }], links: [{ label: 'L', url: 'U' }] });
    // techniqueID and tactic provided to avoid alert path
    tvm.deSerialize(rep, 'T2000', 'exec');
    (expect(tvm.score) as any).toBe('3');
    (expect(tvm.comment) as any).toBe('c');
    (expect(tvm.color) as any).toBe('#111111');
    (expect(tvm.enabled) as any).toBeFalse();
    (expect(tvm.showSubtechniques) as any).toBeTrue();
    (expect(tvm.metadata[0].name) as any).toBe('a');
    (expect(tvm.links[0].label) as any).toBe('L');
  });
});
