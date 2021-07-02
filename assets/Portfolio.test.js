import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
import pretty from "pretty";

// The import below is necessary for async/await to work.
// eslint-disable-next-line no-unused-vars
import regeneratorRuntime from "regenerator-runtime";
import Portfolio from "./Portfolio.js";
import { PortfolioOverview, divideByAccount } from "./Portfolio.js";
import { MemoryRouter } from "react-router-dom";


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


const _ACCOUNT_TRANSACTIONS = [
  {
    "id": 666,
    "executed_at": "2021-04-07T20:25:00Z",
    "last_modified": "2021-06-06T17:14:28.728056Z",
    "position": {
      "id": 121,
      "account": 4,
      "security": {
        "id": 1,
        "isin": "US2546871060",
        "symbol": "DIS",
        "name": "The Walt Disney Company",
        "exchange": {
          "id": 132,
          "name": "USA Stocks"
        },
        "currency": "USD",
        "country": "USA"
      },
      "quantity": "16.00"
    },
    "quantity": "16.00",
    "price": "188.12",
    "transaction_costs": "-0.55",
    "local_value": "-3009.92",
    "value_in_account_currency": "-2533.39",
    "total_in_account_currency": "-2533.94",
    "order_id": "420be97a-265e-4b69-b7a7-acfad1ba8940"
  },
  {
    "id": 531,
    "executed_at": "2021-04-07T20:25:00Z",
    "last_modified": "2021-06-06T15:07:31.366491Z",
    "position": {
      "id": 91,
      "account": 3,
      "security": {
        "id": 1,
        "isin": "US2546871060",
        "symbol": "DIS",
        "name": "The Walt Disney Company",
        "exchange": {
          "id": 132,
          "name": "USA Stocks"
        },
        "currency": "USD",
        "country": "USA"
      },
      "quantity": "35.00"
    },
    "quantity": "16.00",
    "price": "188.12",
    "transaction_costs": "-0.55",
    "local_value": "-3009.92",
    "value_in_account_currency": "-2533.39",
    "total_in_account_currency": "-2533.94",
    "order_id": "420be97a-265e-4b69-b7a7-acfad1ba8940"
  },
  {
    "id": 532,
    "executed_at": "2021-04-07T20:23:00Z",
    "last_modified": "2021-06-06T15:07:31.373143Z",
    "position": {
      "id": 92,
      "account": 3,
      "security": {
        "id": 2,
        "isin": "US0378331005",
        "symbol": "AAPL",
        "name": "Apple Inc",
        "exchange": {
          "id": 132,
          "name": "USA Stocks"
        },
        "currency": "USD",
        "country": "USA"
      },
      "quantity": "53.00"
    },
    "quantity": "18.00",
    "price": "127.64",
    "transaction_costs": "-0.56",
    "local_value": "-2297.52",
    "value_in_account_currency": "-1933.78",
    "total_in_account_currency": "-1934.34",
    "order_id": "5e9d4dd0-6d3a-4ca2-aba5-356ac49e7ab4"
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
        getPositionDetail: () => { },
        getTransactions: () => {

          return Promise.resolve(_ACCOUNT_TRANSACTIONS);
        },
      };
    }),
  };
});

let container = null;

describe('portfolio tests', () => {

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


  it("shows portfolio overview with one account", async () => {
    expect.hasAssertions();
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

    expect(pretty(container.innerHTML)).toMatchSnapshot();
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
    expect.hasAssertions();
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

    expect(pretty(container.innerHTML)).toMatchSnapshot();
  });

  it("shows portfolio overview without any accounts", async () => {
    expect.hasAssertions();
    const accounts = [];

    const positions = [];
    await act(async () => {
      render(
        <PortfolioOverview accounts={accounts} positions={positions} />,
        container
      );
    });

    expect(pretty(container.innerHTML)).toMatchSnapshot();
  });

  it("renders portfolio value", async () => {
    expect.hasAssertions();
    await act(async () => {
      render(<MemoryRouter initialEntries={['/positions']}>
        <Portfolio />
      </MemoryRouter>, container);
    });
    expect(pretty(container.innerHTML)).toContain('The Walt Disney Company');
  });

});