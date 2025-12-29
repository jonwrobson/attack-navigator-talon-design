import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AttackChainService } from './attack-chain.service';

describe('AttackChainService', () => {
    let service: AttackChainService;
    let httpMock: HttpTestingController;
    const baseUrl = 'assets/attack-chains/';

    const mockIndex = {
        generated: '2024-01-01T00:00:00.000Z',
        attackVersion: '14.1',
        techniqueCount: 2,
        techniques: [
            {
                id: 'T1078',
                name: 'Valid Accounts',
                chainCount: 2,
                fileSize: 500
            },
            {
                id: 'T1566',
                name: 'Phishing',
                chainCount: 1,
                fileSize: 300
            }
        ]
    };

    const mockTechniqueChains = {
        id: 'T1078',
        name: 'Valid Accounts',
        tactic: 'persistence',
        chains: [
            {
                group: { id: 'G0001', name: 'Test Group 1' },
                campaigns: [{ id: 'C0001', name: 'Test Campaign 1' }],
                campaignCount: 1,
                path: [
                    {
                        id: 'T1566',
                        name: 'Phishing',
                        tactic: 'initial-access',
                        tacticOrder: 3
                    },
                    {
                        id: 'T1078',
                        name: 'Valid Accounts',
                        tactic: 'persistence',
                        tacticOrder: 5,
                        selected: true
                    }
                ]
            }
        ]
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [AttackChainService]
        });
        service = TestBed.inject(AttackChainService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('loadIndex', () => {
        it('should load index.json on first call to loadIndex()', (done) => {
            service.loadIndex().subscribe((index) => {
                expect(index).toEqual(mockIndex);
                expect(index.techniqueCount).toBe(2);
                expect(index.techniques.length).toBe(2);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}index.json`);
            expect(req.request.method).toBe('GET');
            req.flush(mockIndex);
        });

        it('should cache index after first load', (done) => {
            // First call - should make HTTP request
            service.loadIndex().subscribe(() => {
                // Second call - should use cache
                service.loadIndex().subscribe((index) => {
                    expect(index).toEqual(mockIndex);
                    done();
                });
            });

            // Only one HTTP request should be made
            const req = httpMock.expectOne(`${baseUrl}index.json`);
            req.flush(mockIndex);
        });
    });

    describe('hasChains', () => {
        it('should return true from hasChains() for technique in index', (done) => {
            service.loadIndex().subscribe(() => {
                expect(service.hasChains('T1078')).toBe(true);
                expect(service.hasChains('T1566')).toBe(true);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}index.json`);
            req.flush(mockIndex);
        });

        it('should return false from hasChains() for technique not in index', (done) => {
            service.loadIndex().subscribe(() => {
                expect(service.hasChains('T9999')).toBe(false);
                expect(service.hasChains('T0000')).toBe(false);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}index.json`);
            req.flush(mockIndex);
        });

        it('should return false before index is loaded', () => {
            expect(service.hasChains('T1078')).toBe(false);
        });
    });

    describe('getChains', () => {
        beforeEach((done) => {
            // Load index first for all getChains tests
            service.loadIndex().subscribe(() => {
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}index.json`);
            req.flush(mockIndex);
        });

        it('should load technique JSON from correct URL', (done) => {
            service.getChains('T1078').subscribe((chains) => {
                expect(chains).toEqual(mockTechniqueChains);
                expect(chains?.id).toBe('T1078');
                expect(chains?.chains.length).toBe(1);
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}T1078.json`);
            expect(req.request.method).toBe('GET');
            req.flush(mockTechniqueChains);
        });

        it('should cache technique data after first load', (done) => {
            // First call - should make HTTP request
            service.getChains('T1078').subscribe(() => {
                // Second call - should use cache
                service.getChains('T1078').subscribe((chains) => {
                    expect(chains).toEqual(mockTechniqueChains);
                    done();
                });
            });

            // Only one HTTP request should be made
            const req = httpMock.expectOne(`${baseUrl}T1078.json`);
            req.flush(mockTechniqueChains);
        });

        it('should return null for technique not in index', (done) => {
            service.getChains('T9999').subscribe((chains) => {
                expect(chains).toBeNull();
                done();
            });

            // No HTTP request should be made
        });

        it('should handle HTTP errors gracefully', (done) => {
            service.getChains('T1566').subscribe((chains) => {
                expect(chains).toBeNull();
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}T1566.json`);
            req.error(new ProgressEvent('error'), { status: 404 });
        });

        it('should return null for invalid technique ID format', (done) => {
            service.getChains('../../../etc/passwd').subscribe((chains) => {
                expect(chains).toBeNull();
                done();
            });

            // No HTTP request should be made
        });

        it('should accept valid technique ID with sub-technique', (done) => {
            service.getChains('T1078.001').subscribe((chains) => {
                expect(chains).toBeNull(); // Returns null due to 404
                done();
            });

            const req = httpMock.expectOne(`${baseUrl}T1078.001.json`);
            req.error(new ProgressEvent('error'), { status: 404 });
        });
    });

    describe('clearCache', () => {
        it('should clear all caches on clearCache()', (done) => {
            // Load index and technique data
            service.loadIndex().subscribe(() => {
                service.getChains('T1078').subscribe(() => {
                    // Clear cache
                    service.clearCache();

                    // Verify cache is cleared by making new requests
                    service.loadIndex().subscribe(() => {
                        service.getChains('T1078').subscribe(() => {
                            done();
                        });

                        // Should make new HTTP request for technique
                        const req2 = httpMock.expectOne(`${baseUrl}T1078.json`);
                        req2.flush(mockTechniqueChains);
                    });

                    // Should make new HTTP request for index
                    const req3 = httpMock.expectOne(`${baseUrl}index.json`);
                    req3.flush(mockIndex);
                });

                // First technique request
                const req = httpMock.expectOne(`${baseUrl}T1078.json`);
                req.flush(mockTechniqueChains);
            });

            // First index request
            const req = httpMock.expectOne(`${baseUrl}index.json`);
            req.flush(mockIndex);
        });
    });
});
