import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";

// The import below is necessary for async/await to work.
import regeneratorRuntime from "regenerator-runtime";
import Portfolio from "./Portfolio";

let container = null;
beforeEach(() => {
    // setup a DOM element as a render target
    container = document.createElement("div");
    document.body.appendChild(container);
});

afterEach(() => {
    // cleanup on exiting
    unmountComponentAtNode(container);
    container.remove();
    container = null;
});

jest.mock('./api_utils', () => {
    // Works and lets you check for constructor calls:
    return {
        APIClient: jest.fn().mockImplementation(() => {
            return {
                getAccounts: () => {
                    let accounts = [
                        {
                            "id": 2,
                            "currency": "EUR",
                            "nickname": "test account",
                            "description": "",
                            "balance": "-106584.76000",
                            "last_modified": "2021-05-03T14:20:29.732353Z",
                            "positions_count": 30,
                            "transactions_count": 135
                        }
                    ];
                    return Promise.resolve(accounts)
                },
                getPositions: () => {
                    let positions = [];
                    return Promise.resolve(positions);
                },
                getPositionDetail: (positionId) => { }
            };
        }),
    };
});


it("renders portfolio value", async () => {
    await act(async () => {
        render(<Portfolio />, container);
    });
    const textValue = "PortfolioAt a glanceTotal Value: -106584.76 €1 Week Δ: +12.24 €1 Month Δ: -145.24 €3 Months Δ: +15.24 €6 Months Δ: +123.24 €1 Year Δ: +1245.24 €Assets30 Positions in 1   AccountSee all PositionsManage accountsEvents135 Transactions? Account EventsManage transactionsManage eventsPerformance over timeTime period1 week1 month3 months6 months1 year3 yearsMaxBreakdown typeBy securityBy accountPositionsProductExchangeQuantityPriceValue";
    expect(container.textContent).toEqual(textValue);

});