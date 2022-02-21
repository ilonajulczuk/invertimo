import React from "react";
import { fireEvent, within, render as testingRender, screen } from '@testing-library/react';
import { act } from "react-dom/test-utils";
import userEvent from '@testing-library/user-event';

// The import below is necessary for async/await to work.
// eslint-disable-next-line no-unused-vars
import regeneratorRuntime from "regenerator-runtime";

import { RecordCryptoIncomeForm } from "./RecordCryptoIncomeForm";
import { MyThemeProvider } from '../theme.js';



const assetOptions = [
    {
        "id": 122,
        "isin": "",
        "symbol": "DOGE",
        "name": "DOGE",
        "exchange": {
            "id": 197,
            "name": "Other / NA"
        },
        "currency": "USD",
        "country": null,
        "asset_type": "Crypto",
        "tracked": true
    },
    {
        "id": 117,
        "isin": "",
        "symbol": "BTC",
        "name": "BTC",
        "exchange": {
            "id": 197,
            "name": "Other / NA"
        },
        "currency": "USD",
        "country": null,
        "asset_type": "Crypto",
        "tracked": true
    },
    {
        "id": 116,
        "isin": "",
        "symbol": "BNB",
        "name": "BNB",
        "exchange": {
            "id": 197,
            "name": "Other / NA"
        },
        "currency": "USD",
        "country": null,
        "asset_type": "Crypto",
        "tracked": true
    },
];


jest.mock("../api_utils", () => {
    // The form will send a request for assets.
    // Let's return it our default asset Options for simplicity.
    return {
        getAssets: jest.fn(async () => assetOptions)
    };
});


describe('form for recording crypto income', () => {

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
                currency: "EUR",
            },
        ];

        let submittedValues = null;
        const handleSubmit = (values) => {
            submittedValues = values;
        };

        act(() => {
            testingRender(
                <MyThemeProvider>
                    <RecordCryptoIncomeForm accounts={accounts} handleSubmit={handleSubmit} defaultAssetOptions={assetOptions} />
                </MyThemeProvider>,
            );
        });


        await act(async () => {
            const submitButton = document.querySelector(
                'button[type="submit"]');

            expect(submitButton).not.toBeNull();
            submitButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });

        // There isn't enough data to submit the form so validation should have failed.
        // Hence no values.
        expect(submittedValues).toEqual(null);

        // Only shows if there are errors.
        const quantityHelperText = document.querySelector('#quantity-helper-text');
        expect(quantityHelperText.innerHTML).toContain("Quantity is required");

        console.log(Array.from(document.querySelectorAll('[aria-invalid="true"]')).map(
            node => node.getAttribute("aria-describedby")));

    });

    it("submits data correctly for income event", async () => {
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
                currency: "EUR",
            },
        ];

        const handleSubmit = jest.fn().mockReturnValue({ ok: true });

        act(() => {
            testingRender(
                <MyThemeProvider>
                    <RecordCryptoIncomeForm
                        accounts={accounts} handleSubmit={handleSubmit}
                        executedAtDate={new Date("2021-08-10")}
                        defaultAssetOptions={assetOptions}
                    /></MyThemeProvider>,

            );
        });

        await act(async () => {

            let selector = document.getElementById("account");
            fireEvent.mouseDown(selector);
            let listbox = await screen.findByRole('listbox');
            fireEvent.click(within(listbox).getByText(/First account/i));

            userEvent.type(document.getElementById("quantity"), '3');
            userEvent.type(screen.getByLabelText(/price/i), '13.22');
            userEvent.type(document.getElementById("local_value"), '4.5');
            userEvent.type(document.getElementById("value_in_account_currency"), '4.6');

            // Complicated part of the asset selection, can override other fields
            // if confirmed in the dialog.
            const symbolAutocomplete = document.getElementById("symbol");
            symbolAutocomplete.focus();
            fireEvent.change(symbolAutocomplete, { target: { value: "BT" } });
            fireEvent.keyDown(symbolAutocomplete, { key: 'ArrowDown' });
            fireEvent.keyDown(symbolAutocomplete, { key: 'Enter' });

            const submitButton = document.querySelector(
                'button[type="submit"]');

            expect(submitButton).not.toBeNull();
            submitButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        });

        // In case if there was something invalid this makes debugging easier.
        for (let node of document.querySelectorAll('[aria-invalid="true"]')) {
            console.log(node.getAttribute("aria-describedby"));
        }

        const expectedValue = {
            account: accounts[0].id,
            "executed_at": (new Date("2021-08-10")).toISOString().slice(0, 10) + "T00:00",
            "symbol": "BTC",
            "price": 13.22,
            "quantity": 3,
            "local_value": 4.5,
            "event_type": "STAKING_INTEREST",
            "value_in_account_currency": 4.6,
        };
        expect(document.querySelectorAll('[aria-invalid="true"]').length).toEqual(0);
        expect(handleSubmit).toHaveBeenCalledWith(expectedValue);
    });

});