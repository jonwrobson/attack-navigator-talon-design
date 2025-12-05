import { Mitigation } from "../classes/stix";

// The view model for the scored mitigations
export class scoredMitigationVM {
    constructor(public count: number, public mitigation: Mitigation, public score: number) { }
}
