// The import below is necessary for async/await to work.
// eslint-disable-next-line no-unused-vars
import regeneratorRuntime from "regenerator-runtime";

import { generateDates } from "./timeseries_utils.js";


describe("timeseries utils", () => {

    it("generate correctly", async () => {
        expect.hasAssertions();
        const startDate = new Date('2020-02-01');
        const endDate = new Date('2020-02-11');
        const dates = generateDates(startDate, endDate);

        expect(dates[0]).toEqual(startDate);
        expect(dates.length).toEqual(11);
        expect(dates[dates.length - 1]).toEqual(endDate);

    });

});
