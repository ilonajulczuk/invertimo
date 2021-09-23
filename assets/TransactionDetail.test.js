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
                    "exchange": {
                        name: "USA Stocks"
                    }
                },
            }
        }
    ];

    const handleDeleteTransaction = jest.fn();
    it("renders transaction with correct actions", async () => {
        expect.hasAssertions();
        await act(async () => {
            render(<MemoryRouter initialEntries={['/transactions/1']}>
                <TransactionDetail
                    accounts={accounts}
                    transactions={transactions}
                    handleDeleteTransaction={handleDeleteTransaction} />
            </MemoryRouter>, container);
        });
        expect(pretty(container.innerHTML)).toContain('The Walt Disney Company');
        expect(pretty(container.innerHTML)).toContain('/transactions/1/correct');
        expect(pretty(container.innerHTML)).toContain('/transactions/1/delete');
    });

});