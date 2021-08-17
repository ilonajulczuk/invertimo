import { subMilliseconds } from "date-fns";
import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
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
            },
            {
                id: 77,
                nickname: "Another account",
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
            submitButton.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        });

        // There isn't enough data to submit the form so validation should have failed.
        // Hence no values.
        expect(submittedValues).toEqual(null);

        // Only shows if there are errors.
        const quantityHelperText = container.querySelector('#quantity-helper-text');
        expect(quantityHelperText.innerHTML).toContain("Quantity is required");
    });
});