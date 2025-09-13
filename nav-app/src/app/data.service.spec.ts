import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DataService } from './data.service';

describe('DataService', () => {
  let service: DataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataService]
    });
    service = TestBed.inject(DataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should handle version setup correctly', () => {
    const mockVersions = [
      {
        name: 'ATT&CK v12',
        domains: [
          {
            name: 'Enterprise',
            data: ['https://example.com/enterprise-attack.json']
          }
        ]
      }
    ];

    service.setUpURLs(mockVersions);
    expect(service.versions).toEqual(mockVersions);
  });

  it('should get domain by identifier', () => {
    const mockVersions = [
      {
        name: 'ATT&CK v12',
        domains: [
          {
            name: 'Enterprise',
            identifier: 'enterprise-attack-v12',
            data: ['https://example.com/enterprise-attack.json']
          }
        ]
      }
    ];

    service.setUpURLs(mockVersions);
    const domain = service.getDomain('enterprise-attack-v12');
    expect(domain).toBeTruthy();
    expect(domain.name).toBe('Enterprise');
  });

  it('should handle STIX data parsing', () => {
    const mockStixData = {
      objects: [
        {
          type: 'attack-pattern',
          id: 'attack-pattern--12345',
          external_references: [
            {
              source_name: 'mitre-attack',
              external_id: 'T1059'
            }
          ],
          name: 'Command and Scripting Interpreter',
          kill_chain_phases: [
            {
              kill_chain_name: 'mitre-attack',
              phase_name: 'execution'
            }
          ]
        },
        {
          type: 'x-mitre-tactic',
          id: 'x-mitre-tactic--67890',
          external_references: [
            {
              source_name: 'mitre-attack',
              external_id: 'TA0002'
            }
          ],
          name: 'Execution',
          x_mitre_shortname: 'execution'
        }
      ]
    };

    const domain = service.getDomain('test-domain') || {
      name: 'Test',
      identifier: 'test-domain',
      data: [],
      techniques: [],
      tactics: [],
      mitigations: [],
      groups: [],
      software: [],
      matrices: [],
      relationships: []
    };

    service.parseBundle(domain, mockStixData.objects);

    expect(domain.techniques.length).toBe(1);
    expect(domain.techniques[0].attackID).toBe('T1059');
    expect(domain.techniques[0].name).toBe('Command and Scripting Interpreter');
    
    expect(domain.tactics.length).toBe(1);
    expect(domain.tactics[0].attackID).toBe('TA0002');
    expect(domain.tactics[0].name).toBe('Execution');
  });

  it('should handle HTTP errors gracefully', () => {
    const testUrl = 'https://example.com/test.json';
    
    service.getDataFromURL(testUrl).subscribe({
      next: () => fail('Expected error'),
      error: (error) => {
        expect(error).toBeTruthy();
      }
    });

    const req = httpMock.expectOne(testUrl);
    req.error(new ErrorEvent('Network error', {
      message: 'Failed to fetch'
    }));
  });

  it('should validate technique objects correctly', () => {
    const validTechnique = {
      type: 'attack-pattern',
      id: 'attack-pattern--12345',
      external_references: [
        {
          source_name: 'mitre-attack',
          external_id: 'T1059'
        }
      ],
      name: 'Valid Technique',
      kill_chain_phases: [
        {
          kill_chain_name: 'mitre-attack',
          phase_name: 'execution'
        }
      ]
    };

    const invalidTechnique = {
      type: 'attack-pattern',
      id: 'attack-pattern--67890',
      name: 'Invalid Technique'
      // Missing required fields
    };

    expect(service.isValidTechnique(validTechnique)).toBe(true);
    expect(service.isValidTechnique(invalidTechnique)).toBe(false);
  });

  it('should filter deprecated and revoked objects', () => {
    const mockObjects = [
      {
        type: 'attack-pattern',
        id: 'attack-pattern--active',
        external_references: [{ source_name: 'mitre-attack', external_id: 'T1001' }],
        name: 'Active Technique',
        kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'execution' }]
      },
      {
        type: 'attack-pattern',
        id: 'attack-pattern--revoked',
        external_references: [{ source_name: 'mitre-attack', external_id: 'T1002' }],
        name: 'Revoked Technique',
        revoked: true,
        kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'execution' }]
      },
      {
        type: 'attack-pattern',
        id: 'attack-pattern--deprecated',
        external_references: [{ source_name: 'mitre-attack', external_id: 'T1003' }],
        name: 'Deprecated Technique',
        x_mitre_deprecated: true,
        kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'execution' }]
      }
    ];

    const domain = {
      name: 'Test',
      identifier: 'test-domain',
      data: [],
      techniques: [],
      tactics: [],
      mitigations: [],
      groups: [],
      software: [],
      matrices: [],
      relationships: []
    };

    service.parseBundle(domain, mockObjects);

    // Should only include the active technique
    expect(domain.techniques.length).toBe(1);
    expect(domain.techniques[0].name).toBe('Active Technique');
  });
});
