import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { fireEvent, within, render as testingRender, screen} from '@testing-library/react';
import { act } from "react-dom/test-utils";
import userEvent from '@testing-library/user-event';

// The import below is necessary for async/await to work.
// eslint-disable-next-line no-unused-vars
import regeneratorRuntime from "regenerator-runtime";

import { RecordTransactionForm } from "./RecordTransactionForm.js";

let container = null;

describe('form for recording transactions', () => {
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

    it("form renders correctly", async () => {
        expect.hasAssertions();

        const accounts = [
            {
                id: 1,
                nickname: "First account",
                currency: "USD",
            },
            {
                id: 77,
                nickname: "Another account",
                currency: "USD",
            },
        ];

        let submittedValues = null;
        const handleSubmit = (values) => {
            submittedValues = values;
        };

        act(() => {
            render(
                <RecordTransactionForm accounts={accounts} handleSubmit={handleSubmit} hasTransactions={false} />,
                container
            );
        });

        const submitButton = container.querySelector(
            '[data-test-id=record-transaction-button]');

        expect(submitButton).not.toBeNull();
        await act(async () => {
            submitButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });

        // There isn't enough data to submit the form so validation should have failed.
        // Hence no values.
        expect(submittedValues).toEqual(null);

        // Only shows if there are errors.
        const quantityHelperText = container.querySelector('#quantity-helper-text');
        expect(quantityHelperText.innerHTML).toContain("Quantity is required");

        console.log(Array.from(document.querySelectorAll('[aria-invalid="true"]')).map(
            node => node.getAttribute("aria-describedby")));


    });

    it("submits data correctly", async () => {
        expect.hasAssertions();

        const accounts = [
            {
                id: 1,
                nickname: "First account",
                currency: "USD",
            },
            {
                id: 77,
                nickname: "Another account",
                currency: "USD",
            },
        ];

        const handleSubmit = jest.fn().mockReturnValue({ ok: true });

        act(() => {
            testingRender(
                <RecordTransactionForm
                    accounts={accounts} handleSubmit={handleSubmit} hasTransactions={false}
                    executedAtDate={new Date("2021-08-10")}
                />,

            );
        });

        await act(async () => {

            let selector = document.getElementById("currency");
            fireEvent.mouseDown(selector);
            let listbox = await screen.findByRole('listbox');
            fireEvent.click(within(listbox).getByText(/USD/i));

            selector = document.getElementById("account");
            fireEvent.mouseDown(selector);
            listbox = await screen.findByRole('listbox');
            fireEvent.click(within(listbox).getByText(/First account/i));

            userEvent.type(document.getElementById("quantity"), '13');
            userEvent.type(screen.getByLabelText(/price/i), '1300');

            fireEvent.change(document.getElementById("total-cost-account-currency"),
             {target: {value: "16901"}});

            userEvent.type(screen.getByLabelText(/fees/i), '0.5');

            // Complicated part of the asset selection, can override other fields
            // if confirmed in the dialog.
            const symbolAutocomplete = document.getElementById("symbol");
            symbolAutocomplete.focus();
            fireEvent.change(symbolAutocomplete, { target: { value: "br" } });
            fireEvent.keyDown(symbolAutocomplete, { key: 'ArrowDown' });
            fireEvent.keyDown(symbolAutocomplete, { key: 'Enter' });

            const confirmationDialog = screen.getByRole("dialog");
            const buttons = within(confirmationDialog).getAllByRole("button");
            // Fill in the fields based on the asset.
            fireEvent.click(buttons[1]);
        });

        // https://stackoverflow.com/questions/60882089/how-to-test-material-ui-autocomplete-with-react-testing-library
        // https://stackoverflow.com/questions/55184037/react-testing-library-on-change-for-material-ui-select-component

        const submitButton = document.querySelector(
            '[data-test-id=record-transaction-button]');

        expect(submitButton).not.toBeNull();
        await act(async () => {
            submitButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });

        for (let node of document.querySelectorAll('[aria-invalid="true"]')) {
            console.log(node.getAttribute("aria-describedby"));
        }

        const expectedValue = {
            account: accounts[0].id,
            assetType: "stock",
            currency: "USD",
            exchange: "USA Stocks",
            "executed_at": new Date("2021-08-10"),
            "tradeType": "buy",
            "asset": 30,
            "transaction_costs": -0.5,
            "price": 1300,
            "quantity": 13,
            "local_value": -16900,
            "value_in_account_currency": -16900,
            "total_in_account_currency": -16901,
            "order_id": "",
        };
        expect(document.querySelectorAll('[aria-invalid="true"]').length).toEqual(0);
        expect(handleSubmit).toHaveBeenCalledWith(expectedValue);


    });

});