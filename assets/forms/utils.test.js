import { to2DecimalPlacesOr4SignificantDigits } from './utils.js';


describe("Utils", () => {

    it("numbers display reasonable number of digits", () => {

        const inputToExpected = new Map(Object.entries({
            "0.0000001": "0.0000001",
            // Very small numbers still get a good number of digits displayed.
            "0.0000001234": "0.0000001234",
            // Big numbers are rounded to 2 decimal places.
            "123.3330000": "123.33",
            "12000": "12000",
            "-234.440": "-234.44",
            "1234": "1234",
        }));

        for (let [input, expected] of inputToExpected.entries()) {
            let got = to2DecimalPlacesOr4SignificantDigits(input);
            expect(got).toBe(expected);
        }
    });

});