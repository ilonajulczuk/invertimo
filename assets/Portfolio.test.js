import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
import pretty from "pretty";

// The import below is necessary for async/await to work.
import regeneratorRuntime from "regenerator-runtime";
import Portfolio from "./Portfolio.js";
import { PortfolioOverview, divideByAccount } from "./Portfolio.js";

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

const _ACCOUNT_POSITIONS = [
  {
    id: 91,
    account: 3,
    security: {
      id: 1,
      isin: "US2546871060",
      symbol: "DIS",
      name: "The Walt Disney Company",
      exchange: {
        id: 132,
        name: "USA Stocks",
      },
      currency: "USD",
      country: "USA",
    },
    quantity: "35.00",
    latest_price: "176.24",
    latest_price_date: "2021-06-03",
    latest_exchange_rate: "0.82470000",
  },
  {
    id: 93,
    account: 3,
    security: {
      id: 3,
      isin: "US4781601046",
      symbol: "JNJ",
      name: "Johnson & Johnson",
      exchange: {
        id: 132,
        name: "USA Stocks",
      },
      currency: "USD",
      country: "USA",
    },
    quantity: "29.00",
    latest_price: "166.04",
    latest_price_date: "2021-06-03",
    latest_exchange_rate: "0.82470000",
  },
  {
    id: 96,
    account: 3,
    security: {
      id: 6,
      isin: "IE00BF4RFH31",
      symbol: "IUSN",
      name: "iShares MSCI World Small Cap UCITS ETF USD (Acc)",
      exchange: {
        id: 143,
        name: "XETRA Exchange",
      },
      currency: "EUR",
      country: "Germany",
    },
    quantity: "2775.00",
    latest_price: "6.06",
    latest_price_date: "2021-06-04",
    latest_exchange_rate: null,
  },
];

const _ACCOUNT_POSITIONS_USD = [
  {
    id: 121,
    account: 4,
    security: {
      id: 1,
      isin: "US2546871060",
      symbol: "DIS",
      name: "The Walt Disney Company",
      exchange: {
        id: 132,
        name: "USA Stocks",
      },
      currency: "USD",
      country: "USA",
    },
    quantity: "16.00",
    latest_price: "176.24",
    latest_price_date: "2021-06-03",
    latest_exchange_rate: null,
  },
  {
    id: 122,
    account: 4,
    security: {
      id: 2,
      isin: "US0378331005",
      symbol: "AAPL",
      name: "Apple Inc",
      exchange: {
        id: 132,
        name: "USA Stocks",
      },
      currency: "USD",
      country: "USA",
    },
    quantity: "18.00",
    latest_price: "123.54",
    latest_price_date: "2021-06-03",
    latest_exchange_rate: null,
  },
];

jest.mock("./api_utils", () => {
  // Works and lets you check for constructor calls:
  return {
    APIClient: jest.fn().mockImplementation(() => {
      return {
        getAccounts: () => {
          let accounts = [
            {
              id: 3,
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
          return Promise.resolve(_ACCOUNT_POSITIONS);
        },
        getPositionDetail: (positionId) => {},
      };
    }),
  };
});

it("shows portfolio overview with one account", async () => {
  const accounts = [
    {
      id: 3,
      currency: "EUR",
      nickname: "test account",
      description: "",
      balance: "-16584.76000",
      last_modified: "2021-05-03T14:20:29.732353Z",
      positions_count: 3,
      transactions_count: 15,
    },
  ];
  const positions = _ACCOUNT_POSITIONS;
  await act(async () => {
    render(
      <PortfolioOverview accounts={accounts} positions={positions} />,
      container
    );
  });

  expect(pretty(container.innerHTML)).toMatchInlineSnapshot(`
    "<div class=\\"portfolio-overview\\">
      <div class=\\"portfolio-overview-card card\\"><span class=\\"card-label\\">At a glance</span>
        <ul class=\\"portfolio-stats-list\\">
          <li class=\\"portfolio-stats-account-name\\">In <a href=\\"\\">test account</a> account:</li>
          <li>Total Cash: -16584.76 €</li>
          <li>Total Assets: 25874.64 €</li>
          <li>Portfolio Value: 9289.88 €</li>
        </ul>
      </div>
      <div class=\\"card\\"><span class=\\"card-label\\">Assets</span>
        <p>3 <a href=\\"\\">Positions</a> in 1 <a href=\\"\\"> Account</a></p><a class=\\"button\\">See all Positions</a><a class=\\"button\\">Manage accounts</a>
      </div>
      <div class=\\"card\\"><span class=\\"card-label\\">Events</span>
        <div>15 <a href=\\"\\">Transactions</a></div>
        <div>? <a href=\\"\\">Account Events</a></div><a class=\\"button\\">Manage transactions</a><a class=\\"button\\">Manage events</a>
      </div>
    </div>"
  `);
});

it("divides positions by account correctly", () => {
  const accounts = [
    {
      id: 3,
      currency: "EUR",
      nickname: "test account",
      description: "",
      balance: "-16584.76000",
      last_modified: "2021-05-03T14:20:29.732353Z",
      positions_count: 3,
      transactions_count: 15,
    },
    {
      id: 4,
      currency: "USD",
      nickname: "second account",
      description: "",
      balance: "161",
      last_modified: "2021-05-03T14:20:29.732353Z",
      positions_count: 2,
      transactions_count: 5,
    },
  ];

  const positions = _ACCOUNT_POSITIONS.concat(_ACCOUNT_POSITIONS_USD);
  const positionsByAccount = divideByAccount(accounts, positions);
  expect(positionsByAccount).toHaveLength(2);
  expect(positionsByAccount[0].account.nickname).toBe("test account");
  expect(positionsByAccount[0].positions).toHaveLength(3);
  expect(positionsByAccount[1].account.nickname).toBe("second account");
  expect(positionsByAccount[1].positions).toHaveLength(2);
});

it("shows portfolio overview with two accounts", async () => {
  const accounts = [
    {
      id: 3,
      currency: "EUR",
      nickname: "test account",
      description: "",
      balance: "-16584.76000",
      last_modified: "2021-05-03T14:20:29.732353Z",
      positions_count: 3,
      transactions_count: 15,
    },
    {
      id: 4,
      currency: "USD",
      nickname: "second account",
      description: "",
      balance: "161",
      last_modified: "2021-05-03T14:20:29.732353Z",
      positions_count: 2,
      transactions_count: 5,
    },
  ];

  const positions = _ACCOUNT_POSITIONS.concat(_ACCOUNT_POSITIONS_USD);
  await act(async () => {
    render(
      <PortfolioOverview accounts={accounts} positions={positions} />,
      container
    );
  });

  expect(pretty(container.innerHTML)).toMatchInlineSnapshot(`
    "<div class=\\"portfolio-overview\\">
      <div class=\\"portfolio-overview-card card\\"><span class=\\"card-label\\">At a glance</span>
        <ul class=\\"portfolio-stats-list\\">
          <li class=\\"portfolio-stats-account-name\\">In <a href=\\"\\">test account</a> account:</li>
          <li>Total Cash: -16584.76 €</li>
          <li>Total Assets: 25874.64 €</li>
          <li>Portfolio Value: 9289.88 €</li>
        </ul>
        <ul class=\\"portfolio-stats-list\\">
          <li class=\\"portfolio-stats-account-name\\">In <a href=\\"\\">second account</a> account:</li>
          <li>Total Cash: 161 $</li>
          <li>Total Assets: 5043.56 $</li>
          <li>Portfolio Value: 5204.56 $</li>
        </ul>
      </div>
      <div class=\\"card\\"><span class=\\"card-label\\">Assets</span>
        <p>5 <a href=\\"\\">Positions</a> in 2 <a href=\\"\\"> Accounts</a></p><a class=\\"button\\">See all Positions</a><a class=\\"button\\">Manage accounts</a>
      </div>
      <div class=\\"card\\"><span class=\\"card-label\\">Events</span>
        <div>20 <a href=\\"\\">Transactions</a></div>
        <div>? <a href=\\"\\">Account Events</a></div><a class=\\"button\\">Manage transactions</a><a class=\\"button\\">Manage events</a>
      </div>
    </div>"
  `);
});

it("shows portfolio overview without any accounts", async () => {
  const accounts = [];

  const positions = [];
  await act(async () => {
    render(
      <PortfolioOverview accounts={accounts} positions={positions} />,
      container
    );
  });

  expect(pretty(container.innerHTML)).toMatchInlineSnapshot(`
    "<div class=\\"portfolio-overview\\">
      <div class=\\"portfolio-overview-card card\\"><span class=\\"card-label\\">At a glance</span></div>
      <div class=\\"card\\"><span class=\\"card-label\\">Assets</span>
        <p>0 <a href=\\"\\">Positions</a> in 0 <a href=\\"\\"> Account</a></p><a class=\\"button\\">See all Positions</a><a class=\\"button\\">Manage accounts</a>
      </div>
      <div class=\\"card\\"><span class=\\"card-label\\">Events</span>
        <div>0 <a href=\\"\\">Transactions</a></div>
        <div>? <a href=\\"\\">Account Events</a></div><a class=\\"button\\">Manage transactions</a><a class=\\"button\\">Manage events</a>
      </div>
    </div>"
  `);
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
            <li class=\\"portfolio-stats-account-name\\">In <a href=\\"\\">test account</a> account:</li>
            <li>Total Cash: -106584.76 €</li>
            <li>Total Assets: 25874.64 €</li>
            <li>Portfolio Value: -80710.12 €</li>
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
          <li>
            <div class=\\"position-card \\">
              <div class=\\"position-name\\"><span class=\\"card-label\\">US2546871060</span><span class=\\"position-symbol\\">DIS</span><span>The Walt Disney Company</span></div>
              <div>USA Stocks</div>
              <div>35.00</div>
              <div><span class=\\"card-label\\">As of 2021-06-03</span>176.24 USD</div>
              <div><span>6168.4 USD</span><span>5087.08 EUR</span></div>
            </div>
          </li>
          <li>
            <div class=\\"position-card \\">
              <div class=\\"position-name\\"><span class=\\"card-label\\">US4781601046</span><span class=\\"position-symbol\\">JNJ</span><span>Johnson &amp; Johnson</span></div>
              <div>USA Stocks</div>
              <div>29.00</div>
              <div><span class=\\"card-label\\">As of 2021-06-03</span>166.04 USD</div>
              <div><span>4815.16 USD</span><span>3971.06 EUR</span></div>
            </div>
          </li>
          <li>
            <div class=\\"position-card \\">
              <div class=\\"position-name\\"><span class=\\"card-label\\">IE00BF4RFH31</span><span class=\\"position-symbol\\">IUSN</span><span>iShares MSCI World Small Cap UCITS ETF USD (Acc)</span></div>
              <div>XETRA Exchange</div>
              <div>2775.00</div>
              <div><span class=\\"card-label\\">As of 2021-06-04</span>6.06 EUR</div>
              <div><span>16816.5 EUR</span><span></span></div>
            </div>
          </li>
        </ul>
      </div>
    </div>"
  `);
});
