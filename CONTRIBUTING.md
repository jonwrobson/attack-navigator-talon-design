# How to contribute

Thanks for contributing to `attack-navigator`!

You are welcome to comment on issues, open new issues, and open pull requests.

Pull requests should target the **develop** branch of the repository.

Also, if you contribute any source code, we need you to agree to the following Developer's Certificate of Origin below.

## Working with Attack Chain Visualization

If you're contributing to the attack chain visualization feature, please note:

### Code Structure
- **Components:** Located in `nav-app/src/app/attack-chain-viewer/` and `nav-app/src/app/attack-chain-tree/`
- **Service:** `nav-app/src/app/services/attack-chain.service.ts` handles data loading
- **Generation Scripts:** `scripts/generate-attack-chains.js` and `scripts/lib/` for data generation
- **Data Files:** Static JSON files in `nav-app/src/assets/attack-chains/`

### Testing Requirements
- Add unit tests for component/service changes
- Add E2E tests for user-facing functionality in `nav-app/cypress/e2e/attack-chain-visualization.cy.ts`
- Add script tests in `tests/scripts/` for data generation changes
- Run full test suite before submitting PRs: `npm run test:all`

### Data Generation
- If modifying chain generation logic, regenerate test data: `node scripts/generate-attack-chains.js`
- Ensure generated files are minified JSON (no pretty printing)
- Test with both cached and fresh STIX data (`--no-cache`)

### Documentation
- Update user documentation in `USAGE.md` for UI/UX changes
- Update developer documentation in `README.md` for API/architecture changes
- Add JSDoc comments to new functions and components

See the **Attack Chain Visualization** section in README.md for detailed architecture and development guidance.

## Developer's Certificate of Origin v1.1

```text
By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```
