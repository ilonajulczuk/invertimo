import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
import pretty from "pretty";

// The import below is necessary for async/await to work.
// eslint-disable-next-line no-unused-vars
import regeneratorRuntime from "regenerator-runtime";
import { TransactionDetail } from "./TransactionDetail.js";
import { MemoryRouter } from "react-router-dom";
let container = null;

describe('transaction detail tests', () => {

    beforeEach(() => {
        // setup a DOM element as a render target.
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    afterEach(() => {
        // Cleanup on exiting.
        unmountComponentAtNode(container);
        container.remove();
        container = null;
    });

    const accounts = [
        {
            id: 1,
            nickname: "First account",
            currency: "EUR",
        },
        {
            id: 77,
            nickname: "Another account",
            currency: "USD",
        },
    ];

    const transactions = [
        {
            id: 1,
            quantity: "33",
            price: "3.44",
            local_value: "-123.11",
            transaction_costs: "-0.51",
            executed_at: "2021-08-11",
            value_in_account_currency: "-123.22",
            position: {
                id: 11,
                account: 1,
                asset: {
                    "symbol": "DIS",
                    "currency": "USD",
                    "name": 'The Walt Disney Company',
                    "id": 123,
                    "isin": "",
                    "tracked": true,
                    "exchange": {
                        name: "USA Stocks"
                    }
                },
            },
            records: [
                {
                    "id": 342,
                    "transaction": 555,
                    "raw_record": ",56\nDate,02-12-2020\nTime,09:04\nProduct,JPMORGAN G\nISIN,GB00B18JK166\nReference,LSE\nVenue,XLON\nQuantity,152\nPrice,296.0\nLocal value,-44992.0\nValue,-498.41\nExchange rate,90.1803\nTransaction and/or third,-4.25\nTotal,-502.66\nOrder ID,c4a5d067-214c-4a2b-96db-6e3838e8c5ee\nPrice currency,GBX\nLocal value currency,GBX\nValue currency,EUR\nTransaction costs currency,EUR\nTotal currency,EUR\nTransaction costs,-4.25\nDatetime,2020-12-02 09:04:00+00:00\n",
                    "created_new": false,
                    "successful": true,
                    "issue_type": null,
                    "raw_issue": null,
                    "transaction_import": 10,
                    "created_at": "2021-12-28T16:59:30.701718Z",
                    "integration": "DEGIRO"
                },
            ],
            event_records: [
                {
                    "id": 9,
                    "transaction": 1115,
                    "event": 45,
                    "event_type": "STAKING_INTEREST",
                    "raw_record": ",20\nUser_ID,139221274\nUTC_Time,2022-01-04 00:50:06\nAccount,Spot\nOperation,POS savings interest\nCoin,DOT\nChange,0.01416702\nRemark,\n",
                    "created_new": true,
                    "successful": true,
                    "issue_type": null,
                    "raw_issue": null,
                    "transaction_import": 52,
                    "created_at": "2022-01-31T18:04:51.005459Z",
                    "integration": "BINANCE_CSV"
                }
            ]
        }
    ];

    const handleDeleteTransaction = jest.fn();
    const handleCorrectTransaction = jest.fn();
    it("renders transaction with correct actions", async () => {
        expect.hasAssertions();
        await act(async () => {
            render(<MemoryRouter initialEntries={['/transactions/1']}>
                <TransactionDetail
                    accounts={accounts}
                    transactions={transactions}
                    handleDeleteTransaction={handleDeleteTransaction}
                    handleCorrectTransaction={handleCorrectTransaction}
                />
            </MemoryRouter>, container);
        });
        expect(pretty(container.innerHTML)).toContain('The Walt Disney Company');
        expect(pretty(container.innerHTML)).toContain('/transactions/1/correct');
        expect(pretty(container.innerHTML)).toContain('/transactions/1/delete');

        // Related to the `records` and `event_records`.
        expect(pretty(container.innerHTML)).toContain('/transactions/imports/52');
        expect(pretty(container.innerHTML)).toContain('/transactions/imports/10');
        expect(pretty(container.innerHTML)).toContain('STAKING_INTEREST');
    });

});