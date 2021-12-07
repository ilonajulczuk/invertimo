import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { fireEvent, within, render as testingRender, screen } from '@testing-library/react';
import { act } from "react-dom/test-utils";
import userEvent from '@testing-library/user-event';

// The import below is necessary for async/await to work.
// eslint-disable-next-line no-unused-vars
import regeneratorRuntime from "regenerator-runtime";

import { RecordTransactionForm } from "./RecordTransactionForm.js";

let container = null;


const assetOptions = [
    {
        "id": 30,
        "isin": "US0846707026",
        "symbol": "BRK-B",
        "name": "Berkshire Hathaway Inc",
        "asset_type": "Stock",
        "exchange": {
            "id": 132,
            "name": "USA Stocks"
        },
        "currency": "USD",
        "country": "USA"
    },
    {
        "id": 28,
        "isin": "US2561631068",
        "symbol": "DOCU",
        "name": "DocuSign, Inc",
        "asset_type": "Stock",
        "exchange": {
            "id": 132,
            "name": "USA Stocks"
        },
        "currency": "USD",
        "country": "USA"
    },
    {
        "id": 26,
        "isin": "US30303M1027",
        "symbol": "FB",
        "name": "Facebook, Inc",
        "asset_type": "Stock",
        "exchange": {
            "id": 132,
            "name": "USA Stocks"
        },
        "currency": "USD",
        "country": "USA"
    },
];


jest.mock("../api_utils", () => {
    // The form will send a request for assets.
    // Let's return it our default asset Options for simplicity.
    return {
        getAssets: jest.fn(async () => assetOptions)
    };
});


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
                <RecordTransactionForm accounts={accounts} handleSubmit={handleSubmit} hasTransactions={false} defaultAssetOptions={assetOptions} />,
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

    it("submits data correctly for buy transaction", async () => {
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
                    defaultAssetOptions={assetOptions}
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

            fireEvent.change(document.getElementById("totalCostAccountCurrency"),
                { target: { value: "16901" } });

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
            // Since we selected an available asset, the assetType should be disabled.
            expect(document.getElementById("assetType").getAttribute("aria-disabled")).toBe("true");
            expect(document.getElementById("currency").getAttribute("aria-disabled")).toBe("true");
            expect(document.getElementById("exchange").getAttribute("aria-disabled")).toBe("true");
            submitButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });

        for (let node of document.querySelectorAll('[aria-invalid="true"]')) {
            console.log(node.getAttribute("aria-describedby"));
        }

        const expectedValue = {
            account: accounts[0].id,
            currency: "USD",
            exchange: "USA Stocks",
            "executed_at": new Date("2021-08-10"),
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

    it("submits data correctly for sell transaction", async () => {
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
                    defaultAssetOptions={assetOptions}
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

            fireEvent.change(document.getElementById("totalCostAccountCurrency"),
                { target: { value: "16899" } });

            userEvent.type(screen.getByLabelText(/fees/i), '0.5');

            const radios = screen.getAllByRole('radio');

            fireEvent.click(radios[1]);

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
            currency: "USD",
            exchange: "USA Stocks",
            "executed_at": new Date("2021-08-10"),
            "asset": 30,
            "transaction_costs": -0.5,
            "price": 1300,
            "quantity": -13,
            "local_value": 16900,
            "value_in_account_currency": 16900,
            "total_in_account_currency": 16899,
            "order_id": "",
        };
        expect(document.querySelectorAll('[aria-invalid="true"]').length).toEqual(0);
        expect(handleSubmit).toHaveBeenCalledWith(expectedValue);
    });

    it("submits data correctly for sell transaction with custom asset", async () => {
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
                    defaultAssetOptions={assetOptions}
                />,

            );
        });

        await act(async () => {

            let selector = document.getElementById("currency");
            fireEvent.mouseDown(selector);
            let listbox = await screen.findByRole('listbox');
            fireEvent.click(within(listbox).getByText(/USD/i));

            selector = document.getElementById("exchange");
            fireEvent.mouseDown(selector);
            listbox = await screen.findByRole('listbox');
            fireEvent.click(within(listbox).getByText(/USA Stocks/i));

            selector = document.getElementById("account");
            fireEvent.mouseDown(selector);
            listbox = await screen.findByRole('listbox');
            fireEvent.click(within(listbox).getByText(/First account/i));

            userEvent.type(document.getElementById("quantity"), '13');
            userEvent.type(screen.getByLabelText(/price/i), '1300');

            fireEvent.change(document.getElementById("totalCostAccountCurrency"),
                { target: { value: "16899" } });

            userEvent.type(screen.getByLabelText(/fees/i), '0.5');

            const radios = screen.getAllByRole('radio');

            fireEvent.click(radios[1]);

            // Complicated part of the asset selection, can override other fields
            // if confirmed in the dialog.
            const symbolAutocomplete = document.getElementById("symbol");
            symbolAutocomplete.focus();
            fireEvent.change(symbolAutocomplete, { target: { value: "brrrrrr" } });
            fireEvent.keyDown(symbolAutocomplete, { key: 'ArrowDown' });
            fireEvent.keyDown(symbolAutocomplete, { key: 'Enter' });

            const confirmationDialog = screen.getByRole("dialog");
            const buttons = within(confirmationDialog).getAllByRole("button");
            // Acknowledge the dialog.
            fireEvent.click(buttons[0]);
        });

        // https://stackoverflow.com/questions/60882089/how-to-test-material-ui-autocomplete-with-react-testing-library
        // https://stackoverflow.com/questions/55184037/react-testing-library-on-change-for-material-ui-select-component

        const submitButton = document.querySelector(
            '[data-test-id=record-transaction-button]');

        expect(submitButton).not.toBeNull();
        await act(async () => {
            // Those fields should not be disabled, because there was no auto-fill of values.
            expect(document.getElementById("assetType").getAttribute("aria-disabled")).toBe(null);
            expect(document.getElementById("currency").getAttribute("aria-disabled")).toBe(null);
            expect(document.getElementById("exchange").getAttribute("aria-disabled")).toBe(null);

            submitButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });

        for (let node of document.querySelectorAll('[aria-invalid="true"]')) {
            console.log(node.getAttribute("aria-describedby"));
        }

        const expectedValue = {
            account: accounts[0].id,
            symbol: "brrrrrr",
            "asset_type": "Stock",
            currency: "USD",
            exchange: "USA Stocks",
            "executed_at": new Date("2021-08-10"),
            "transaction_costs": -0.5,
            "price": 1300,
            "quantity": -13,
            "local_value": 16900,
            "value_in_account_currency": 16900,
            "total_in_account_currency": 16899,
            "order_id": "",
        };
        expect(document.querySelectorAll('[aria-invalid="true"]').length).toEqual(0);
        expect(handleSubmit).toHaveBeenCalledWith(expectedValue);
    });

    it("submits data correctly for sell transaction with account in different currency", async () => {
        expect.hasAssertions();

        const accounts = [
            {
                id: 1,
                nickname: "First account",
                currency: "EUR",
            },
            {
                id: 77,
                nickname: "Another account",
                currency: "EUR",
            },
        ];

        const handleSubmit = jest.fn().mockReturnValue({ ok: true });

        act(() => {
            testingRender(
                <RecordTransactionForm
                    accounts={accounts} handleSubmit={handleSubmit} hasTransactions={false}
                    executedAtDate={new Date("2021-08-10")}
                    defaultAssetOptions={assetOptions}
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
            userEvent.type(document.getElementById("totalValueAccountCurrency"), '12901');
            userEvent.type(screen.getByLabelText(/price/i), '1300');

            fireEvent.change(document.getElementById("totalCostAccountCurrency"),
                { target: { value: "12899" } });

            userEvent.type(screen.getByLabelText(/fees/i), '2');

            const radios = screen.getAllByRole('radio');

            fireEvent.click(radios[1]);

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
            currency: "USD",
            exchange: "USA Stocks",
            "executed_at": new Date("2021-08-10"),
            "asset": 30,
            "transaction_costs": -2,
            "price": 1300,
            "quantity": -13,
            "local_value": 16900,
            "value_in_account_currency": 12901,
            "total_in_account_currency": 12899,
            "order_id": "",
        };
        expect(document.querySelectorAll('[aria-invalid="true"]').length).toEqual(0);
        expect(handleSubmit).toHaveBeenCalledWith(expectedValue);
    });

    it("submits data correctly for buy transaction with account in different currency", async () => {
        expect.hasAssertions();

        const accounts = [
            {
                id: 1,
                nickname: "First account",
                currency: "EUR",
            },
            {
                id: 77,
                nickname: "Another account",
                currency: "EUR",
            },
        ];

        const handleSubmit = jest.fn().mockReturnValue({ ok: true });

        act(() => {
            testingRender(
                <RecordTransactionForm
                    accounts={accounts} handleSubmit={handleSubmit} hasTransactions={false}
                    executedAtDate={new Date("2021-08-10")}
                    defaultAssetOptions={assetOptions}
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
            userEvent.type(document.getElementById("totalValueAccountCurrency"), '12901');
            userEvent.type(screen.getByLabelText(/price/i), '1300');

            fireEvent.change(document.getElementById("totalCostAccountCurrency"),
                { target: { value: "12903" } });

            userEvent.type(screen.getByLabelText(/fees/i), '2');

            const radios = screen.getAllByRole('radio');

            fireEvent.click(radios[0]);

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
            currency: "USD",
            exchange: "USA Stocks",
            "executed_at": new Date("2021-08-10"),
            "asset": 30,
            "transaction_costs": -2,
            "price": 1300,
            "quantity": 13,
            "local_value": -16900,
            "value_in_account_currency": -12901,
            "total_in_account_currency": -12903,
            "order_id": "",
        };
        expect(document.querySelectorAll('[aria-invalid="true"]').length).toEqual(0);
        expect(handleSubmit).toHaveBeenCalledWith(expectedValue);
    });
});