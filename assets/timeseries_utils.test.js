// The import below is necessary for async/await to work.
// eslint-disable-next-line no-unused-vars
import regeneratorRuntime from "regenerator-runtime";

import { generateDates, addAcrossDates, addAcrossDatesWithFill } from "./timeseries_utils.js";

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

    it("generate correctly for long periods", async () => {
        expect.hasAssertions();
        const startDate = new Date('2018-02-01');
        const endDate = new Date('2020-02-11');
        const dates = generateDates(startDate, endDate);

        expect(dates[0]).toEqual(startDate);
        expect(dates.length).toEqual(741);
        expect(dates[dates.length - 1]).toEqual(endDate);

    });
});


describe("Summing across time series", () => {

    it("works with empty data", () => {
        expect.hasAssertions();

        const got = addAcrossDates([]);
        expect(got).toEqual([]);

    });

    it("works with simple data", () => {
        expect.hasAssertions();
        const exampleData = [
            [
                [1, 100], [2, 101], [3, 103], [5, 106], [6, 107]
            ],
            [
                [1, 100], [3, 101], [4, 103], [5, 106], [7, 108]
            ],
            [
                [1, 100], [3, 101], [3, 103], [5, 106],
            ]

        ];
        const want = [
            [1, 300], [3, 305], [5, 318]
        ];
        const got = addAcrossDates(exampleData, (a, b) => a - b);
        expect(got).toEqual(want);

    });

    it("works with dates backward", () => {
        expect.hasAssertions();
        const exampleData = [
            [
                [
                    "2021-06-18",
                    1228.96
                ],
                [
                    "2021-06-17",
                    1243.04
                ],
                [
                    "2021-06-16",
                    1239.68
                ],
                [
                    "2021-06-15",
                    1233.76
                ],
                [
                    "2021-06-11",
                    1236.16
                ],
                [
                    "2021-06-10",
                    1233.44
                ],
            ],
            [
                [
                    "2021-06-17",
                    3694.6245
                ],
                [
                    "2021-06-16",
                    3713.71
                ],
                [
                    "2021-06-15",
                    3763.6018
                ],
                [
                    "2021-06-14",
                    3821.412
                ],
                [
                    "2021-06-11",
                    3824.695
                ],
                [
                    "2021-06-10",
                    3818.9865
                ],

            ],

        ];
        const want = [
            [
                "2021-06-17",
                4937.6645
            ],
            [
                "2021-06-16",
                4953.39
            ],
            [
                "2021-06-15",
                4997.3618
            ],
            [
                "2021-06-11",
                5060.8550000000005
            ],
            [
                "2021-06-10",
                5052.4265,
            ],
        ];
        const got = addAcrossDates(exampleData, (a, b) => new Date(b) - new Date(a));
        expect(got).toEqual(want);

    });
});

describe("Summing across time series with fill", () => {

    it("works with empty data", () => {
        expect.hasAssertions();

        const got = addAcrossDates([]);
        expect(got).toEqual([]);

    });

    it("works with simple data", () => {
        expect.hasAssertions();
        const exampleData = [
            [
                ['2020-01-06', 107],
                ['2020-01-05', 106],
                ['2020-01-03', 103],
                ['2020-01-02', 101],
                ['2020-01-01', 100]
            ],
            [
                ['2020-01-07', 108],
                ['2020-01-05', 106],
                ['2020-01-04', 103],
                ['2020-01-03', 101],
                ['2020-01-01', 100]
            ],
            [
                ['2020-01-05', 106],
                ['2020-01-03', 105],
                ['2020-01-03', 101],
                ['2020-01-01', 100]
            ]];

        const want = [
            ['2020-01-01', 300], ['2020-01-02', 301], ['2020-01-03', 305], ['2020-01-04', 311],
            ["2020-01-05", 318], ["2020-01-06", 319], ["2020-01-07", 321]

        ];
        const got = addAcrossDatesWithFill(exampleData);
        expect(got).toEqual(want);

    });

    it("works with dates backward", () => {
        expect.hasAssertions();
        const exampleData = [
            [
                [
                    "2021-06-18",
                    1228.96
                ],
                [
                    "2021-06-17",
                    1243.04
                ],
                [
                    "2021-06-16",
                    1239.68
                ],
                [
                    "2021-06-15",
                    1233.76
                ],
                [
                    "2021-06-11",
                    1236.16
                ],
                [
                    "2021-06-10",
                    1233.44
                ],
            ],
            [
                [
                    "2021-06-17",
                    3694.6245
                ],
                [
                    "2021-06-16",
                    3713.71
                ],
                [
                    "2021-06-15",
                    3763.6018
                ],
                [
                    "2021-06-14",
                    3821.412
                ],
                [
                    "2021-06-11",
                    3824.695
                ],
                [
                    "2021-06-10",
                    3818.9865
                ],

            ],

        ];
        const want = [
            ['2021-06-10', 5052.4265],
            ['2021-06-11', 5060.8550000000005],
            ["2021-06-12", 5060.8550000000005],
            ["2021-06-13", 5060.8550000000005],
            ["2021-06-14", 5057.572],
            ['2021-06-15', 4997.3618],
            ['2021-06-16', 4953.39],
            ['2021-06-17', 4937.6645],
            ["2021-06-18", 4923.5845],
        ];

        const got = addAcrossDatesWithFill(exampleData, (a, b) => new Date(b) - new Date(a));
        expect(got).toEqual(want);

    });
});