// import { FrameworkItemFactory } from "./interfaces/framework-item-factory";
// import { AsvsNist80053Rev4MappingItem } from "./asvs-nist-80053Rev4-mapping-item";
// /**
//  * Designed to parse the excel found https://docs.google.com/spreadsheets/d/1SEhSXKBDiiUZIhBtq0EM_lHCgw5Y19A7mCORRa-3Zwc
//  */
// export class AsvsNist80053Rev4MappingItemFactory implements FrameworkItemFactory {

//     public parseRow(row: any, rowIndex: number, sheet: any) {
//         if (rowIndex === 1) {
//             //This should be a header row, lets verify that this looks like a NIST standard framework export
//             if (row.values.toString() !== ",Req,#,Category,Detail,Level 1,Level 2,Level 3,Since,NIST SP 800-53 (Rev.4) Equivalent Category,Detail,NIST Priority") {
//                 throw new Error("The file does not have the expected headers, please verify that the file is the owasp asvs framework export. (["
//                     + row.values.toString() + "] Expected [,Req,#,Category,Detail,Level 1,Level 2,Level 3,Since,NIST SP 800-53 (Rev.4) Equivalent Category,Detail,NIST Priority]");
//             }
//         }
//         else {

//             try {
//                 let mappings: any = {};

//                 const colNist = row.getCell(9).value;
//                 mappings['NIST'] = colNist ? colNist.toString().split(/\r?\n/).map((x: string) => {
//                     let match = x.match(/([a-z]){2}-([0-9]){1,3}/i);
//                     return match ? match[0] : "";
//                 }) : null;

//                 return new AsvsNist80053Rev4MappingItem(
//                     row.getCell(1).value + '.' + row.getCell(2).value,
//                     mappings);
//             }
//             catch (error) {

//                 throw new Error("Error processing row: " + row.values + " Error: " + error.toString());
//             }
//         }
//     }
// }

import { AsvsNist80053Rev4MappingItem } from "./asvs-nist-80053Rev4-mapping-item";
import { AsvsNist80053Rev4MappingItemFactory } from "./Asvs-Nist-80053Rev4-Mapping-Item-Factory";

// test parse row
describe("AsvsNist80053Rev4MappingItemFactory", () => {
    it("should create a new AsvsNist80053Rev4MappingItem", () => {
        const factory = new AsvsNist80053Rev4MappingItemFactory();
        const row = {
            getCell: (index: number) => {
                switch (index) {
                    case 1:
                        return {
                            value: "V1"
                        };
                    case 2:
                        return {
                            value: "1.1"
                        };
                    case 9:
                        return {
                            value: "AC-3 (3)"
                        };
                    default:
                        return {
                            value: ""
                        };
                }
            }
        };
        const result = factory.parseRow(row, 2, null);
        expect(result).toBeInstanceOf(AsvsNist80053Rev4MappingItem);
        expect(result.itemId).toBe("V1.1.1");
        expect(result.mappings.NIST).toEqual(["AC-3"]);
    });
});

