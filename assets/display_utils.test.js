import { trimTrailingDecimalZeroes } from './display_utils.js';


describe("Display utils", () => {

    it("trimming trailing zeroes works for correct inputs", () => {

        const inputToExpected = new Map(Object.entries({
            "0.000000": "0",
            "123.3330000": "123.333",
            "12000": "12000",
            "-234.440": "-234.44",
            "1234": "1234",
        }));

        for (let [input, expected] of inputToExpected.entries()) {
            let got = trimTrailingDecimalZeroes(input);
            expect(got).toEqual(expected);
        }
    });

});