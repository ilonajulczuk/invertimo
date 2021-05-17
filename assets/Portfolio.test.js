import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
import pretty from "pretty";

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

jest.mock("./api_utils", () => {
  // Works and lets you check for constructor calls:
  return {
    APIClient: jest.fn().mockImplementation(() => {
      return {
        getAccounts: () => {
          let accounts = [
            {
              id: 2,
              currency: "EUR",
              nickname: "test account",
              description: "",
              balance: "-106584.76000",
              last_modified: "2021-05-03T14:20:29.732353Z",
              positions_count: 30,
              transactions_count: 135,
            },
          ];
          return Promise.resolve(accounts);
        },
        getPositions: () => {
          let positions = [];
          return Promise.resolve(positions);
        },
        getPositionDetail: (positionId) => {},
      };
    }),
  };
});

it("renders portfolio value", async () => {
  await act(async () => {
    render(<Portfolio />, container);
  });
  expect(pretty(container.innerHTML)).toMatchInlineSnapshot(`
    "<div>
      <h1>Portfolio</h1>
      <div class=\\"portfolio-overview\\">
        <div class=\\"portfolio-overview-card card\\"><span class=\\"card-label\\">At a glance</span>
          <ul class=\\"portfolio-stats-list\\">
            <li>Total Value: -106584.76 €</li>
            <li>1 Week Δ: +12.24 €</li>
            <li>1 Month Δ: -145.24 €</li>
            <li>3 Months Δ: +15.24 €</li>
            <li>6 Months Δ: +123.24 €</li>
            <li>1 Year Δ: +1245.24 €</li>
          </ul>
        </div>
        <div class=\\"card\\"><span class=\\"card-label\\">Assets</span>
          <p>30 <a href=\\"\\">Positions</a> in 1 <a href=\\"\\"> Account</a></p><a class=\\"button\\">See all Positions</a><a class=\\"button\\">Manage accounts</a>
        </div>
        <div class=\\"card\\"><span class=\\"card-label\\">Events</span>
          <div>135 <a href=\\"\\">Transactions</a></div>
          <div>? <a href=\\"\\">Account Events</a></div><a class=\\"button\\">Manage transactions</a><a class=\\"button\\">Manage events</a>
        </div>
      </div>
      <div class=\\"portfolio-chart\\">
        <h2>Performance over time</h2><span class=\\"card-label\\">Time period</span>
        <ul class=\\"time-selectors\\">
          <li>1 week</li>
          <li>1 month</li>
          <li class=\\"active-time-selector\\">3 months</li>
          <li>6 months</li>
          <li>1 year</li>
          <li>3 years</li>
          <li>Max</li>
        </ul><span class=\\"card-label\\">Breakdown type</span><select>
          <option value=\\"security\\">By security</option>
          <option value=\\"account\\">By account</option>
        </select>
      </div>
      <div>
        <h2>Positions</h2>
        <ul class=\\"position-list\\">
          <li class=\\"position-list-header\\">
            <ul class=\\"position-list-fields\\">
              <li class=\\"position-list-fields-product\\">Product</li>
              <li>Exchange</li>
              <li>Quantity</li>
              <li>Price</li>
              <li>Value</li>
            </ul>
          </li>
        </ul>
      </div>
    </div>"
  `);
});
