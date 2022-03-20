import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
import pretty from "pretty";

// The import below is necessary for async/await to work.
// eslint-disable-next-line no-unused-vars
import regeneratorRuntime from "regenerator-runtime";
import { EventDetail } from "./EventDetail.js";
import { MemoryRouter } from "react-router-dom";
let container = null;


describe('event detail tests', () => {

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
            id: 47,
            nickname: "First account",
            currency: "EUR",
        },
        {
            id: 77,
            nickname: "Another account",
            currency: "USD",
        },
    ];

    const positions = [
        {
            "id": 1,
            "account": 47,
            "asset": {
                "id": 1,
                "isin": "US2546871060",
                "symbol": "DIS",
                "name": "The Walt Disney Company",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": "USD",
                "country": "USA",
                "asset_type": "Stock",
                "tracked": true
            },
            "quantity": "32.00",
            "latest_price": "137.38",
            "latest_price_date": "2022-01-21",
            "latest_exchange_rate": "0.88390000",
            "realized_gain": "142.74250",
            "cost_basis": "-4145.64250"
        }
    ];
    const events = [
        {
            "id": 39,
            "event_type": "DEPOSIT",
            "executed_at": "2022-01-05T20:50:13Z",
            "amount": "999.000000",
            "withheld_taxes": "0.000000",
            "account": 47,
            "position": null,
            "event_records": [
                {
                    "id": 3,
                    "transaction": null,
                    "event": 39,
                    "event_type": "DEPOSIT",
                    "raw_record": ",18\nUser_ID,139221274\nUTC_Time,2022-01-05 20:50:13\nAccount,Spot\nOperation,Deposit\nCoin,EUR\nChange,999.0\nRemark,\n",
                    "created_new": true,
                    "successful": true,
                    "issue_type": null,
                    "raw_issue": null,
                    "transaction_import": 52,
                    "created_at": "2022-01-31T18:04:51.005459Z",
                    "integration": "BINANCE_CSV"
                },
                {
                    "id": 12,
                    "transaction": null,
                    "event": 39,
                    "event_type": "DEPOSIT",
                    "raw_record": ",18\nUser_ID,139221274\nUTC_Time,2022-01-05 20:50:13\nAccount,Spot\nOperation,Deposit\nCoin,EUR\nChange,999.0\nRemark,\n",
                    "created_new": false,
                    "successful": true,
                    "issue_type": null,
                    "raw_issue": null,
                    "transaction_import": 53,
                    "created_at": "2022-01-31T18:05:50.764113Z",
                    "integration": "BINANCE_CSV"
                },
                {
                    "id": 21,
                    "transaction": null,
                    "event": 39,
                    "event_type": "DEPOSIT",
                    "raw_record": ",18\nUser_ID,139221274\nUTC_Time,2022-01-05 20:50:13\nAccount,Spot\nOperation,Deposit\nCoin,EUR\nChange,999.0\nRemark,\n",
                    "created_new": false,
                    "successful": true,
                    "issue_type": null,
                    "raw_issue": null,
                    "transaction_import": 54,
                    "created_at": "2022-02-01T11:32:11.049765Z",
                    "integration": "BINANCE_CSV"
                }
            ]
        },
        {
            "id": 55,
            "event_type": "STAKING_INTEREST",
            "executed_at": "2022-01-04T00:50:06Z",
            "amount": "0.461094",
            "withheld_taxes": "0.000000",
            "account": 47,
            "position": 1,
            "event_records": [
                {
                    "id": 27,
                    "transaction": 1133,
                    "event": 55,
                    "event_type": "STAKING_INTEREST",
                    "raw_record": ",20\nUser_ID,139221274\nUTC_Time,2022-01-04 00:50:06\nAccount,Spot\nOperation,POS savings interest\nCoin,DOT\nChange,0.01416702\nRemark,\n",
                    "created_new": true,
                    "successful": true,
                    "issue_type": null,
                    "raw_issue": null,
                    "transaction_import": 54,
                    "created_at": "2022-02-01T11:32:11.049765Z",
                    "integration": "BINANCE_CSV"
                }
            ]
        },
    ];

    const handleDeleteEvent = jest.fn();
    it("renders deposit event with correct actions", async () => {
        expect.hasAssertions();
        await act(async () => {
            render(<MemoryRouter initialEntries={['/events/39']}>
                <EventDetail
                    accounts={accounts}
                    events={events}
                    positions={positions}
                    handleDeleteEvent={handleDeleteEvent}
                />
            </MemoryRouter>, container);
        });
        expect(pretty(container.innerHTML)).toContain('/events/39/delete');

        // Related to the `event_records`.
        expect(pretty(container.innerHTML)).toContain('/transactions/imports/52');
        expect(pretty(container.innerHTML)).toContain('/transactions/imports/53');
        expect(pretty(container.innerHTML)).toContain('/transactions/imports/54');
        expect(pretty(container.innerHTML)).toContain('DEPOSIT');
    });
    it("renders staking event with correct actions", async () => {
        expect.hasAssertions();
        const handleDeleteEvent = jest.fn();
        await act(async () => {
            render(<MemoryRouter initialEntries={['/events/55']}>
                <EventDetail
                    accounts={accounts}
                    events={events}
                    positions={positions}
                    handleDeleteEvent={handleDeleteEvent}
                />
            </MemoryRouter>, container);
        });
        expect(pretty(container.innerHTML)).toContain('The Walt Disney Company');
        expect(pretty(container.innerHTML)).toContain('/events/55/delete');

        // Related to the `event_records`.
        expect(pretty(container.innerHTML)).toContain('/transactions/imports/54');
    });

});