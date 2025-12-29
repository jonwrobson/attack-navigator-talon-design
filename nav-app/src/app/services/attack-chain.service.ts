import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';

/**
 * Index of all available attack chain files
 */
export interface ChainIndex {
    generated: string;
    attackVersion: string;
    techniqueCount: number;
    techniques: TechniqueIndexEntry[];
}

/**
 * Entry for a single technique in the index
 */
export interface TechniqueIndexEntry {
    id: string;
    name: string;
    chainCount: number;
    fileSize: number;
}

/**
 * Attack chains for a specific technique
 */
export interface TechniqueChains {
    id: string;
    name: string;
    tactic: string;
    chains: AttackChain[];
}

/**
 * A single attack chain showing how a group uses techniques
 */
export interface AttackChain {
    group: { id: string; name: string };
    campaigns: { id: string; name: string }[];
    campaignCount: number;
    path: ChainNode[];
}

/**
 * A node in an attack chain path
 */
export interface ChainNode {
    id: string;
    name: string;
    tactic: string;
    tacticOrder: number;
    selected?: boolean;
}

/**
 * Service for loading attack chain data from static JSON files
 * 
 * Loads attack chain JSON files and provides them to components.
 * Includes caching to avoid redundant HTTP requests.
 */
@Injectable({
    providedIn: 'root'
})
export class AttackChainService {
    private readonly baseUrl = 'assets/attack-chains/';
    private indexCache$: Observable<ChainIndex> | null = null;
    private techniqueCache = new Map<string, Observable<TechniqueChains | null>>();
    private indexData: ChainIndex | null = null;

    constructor(private http: HttpClient) {}

    /**
     * Load the index.json file containing metadata about all available techniques
     * Results are cached after the first load
     * 
     * @returns Observable of the chain index
     */
    loadIndex(): Observable<ChainIndex> {
        if (!this.indexCache$) {
            this.indexCache$ = this.http.get<ChainIndex>(`${this.baseUrl}index.json`).pipe(
                tap(index => {
                    this.indexData = index;
                }),
                shareReplay(1)
            );
        }
        return this.indexCache$;
    }

    /**
     * Check if a technique has chain data available
     * 
     * @param techniqueId - ATT&CK technique ID (e.g., 'T1078')
     * @returns true if the technique has chains, false otherwise
     */
    hasChains(techniqueId: string): boolean {
        if (!this.indexData) {
            return false;
        }
        return this.indexData.techniques.some(t => t.id === techniqueId);
    }

    /**
     * Load chain data for a specific technique
     * Results are cached after the first load
     * 
     * @param techniqueId - ATT&CK technique ID (e.g., 'T1078')
     * @returns Observable of technique chains, or null if technique not in index or on error
     */
    getChains(techniqueId: string): Observable<TechniqueChains | null> {
        // Check if technique is in index first
        if (this.indexData && !this.hasChains(techniqueId)) {
            return of(null);
        }

        // Return cached observable if available
        if (this.techniqueCache.has(techniqueId)) {
            return this.techniqueCache.get(techniqueId)!;
        }

        // Create new observable and cache it
        const chains$ = this.http.get<TechniqueChains>(`${this.baseUrl}${techniqueId}.json`).pipe(
            catchError(() => of(null)),
            shareReplay(1)
        );

        this.techniqueCache.set(techniqueId, chains$);
        return chains$;
    }

    /**
     * Clear all caches (useful for testing or forcing a refresh)
     */
    clearCache(): void {
        this.indexCache$ = null;
        this.techniqueCache.clear();
        this.indexData = null;
    }
}
