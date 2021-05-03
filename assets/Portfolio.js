import React from 'react';
import stacked_area_graph from './stacked_area_graph.png';
import './portfolio.css';
import PositionList from './PositionList.js';

// GET /api/positions/?limit=50
const TEST_DATA = {
    "count": 30,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": 31,
            "account": 2,
            "security": {
                "id": 1,
                "isin": "US2546871060",
                "symbol": "DIS",
                "name": "The Walt Disney Company",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "35.00"
        },
        {
            "id": 32,
            "account": 2,
            "security": {
                "id": 2,
                "isin": "US0378331005",
                "symbol": "AAPL",
                "name": "Apple Inc",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "53.00"
        },
        {
            "id": 33,
            "account": 2,
            "security": {
                "id": 3,
                "isin": "US4781601046",
                "symbol": "JNJ",
                "name": "Johnson & Johnson",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "29.00"
        },
        {
            "id": 34,
            "account": 2,
            "security": {
                "id": 4,
                "isin": "US31428X1063",
                "symbol": "FDX",
                "name": "FedEx Corporation",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "18.00"
        },
        {
            "id": 35,
            "account": 2,
            "security": {
                "id": 5,
                "isin": "US1912161007",
                "symbol": "KO",
                "name": "The Coca-Cola Company",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "90.00"
        },
        {
            "id": 36,
            "account": 2,
            "security": {
                "id": 6,
                "isin": "IE00BF4RFH31",
                "symbol": "IUSN",
                "name": "iShares MSCI World Small Cap UCITS ETF USD (Acc)",
                "exchange": {
                    "id": 143,
                    "name": "XETRA Exchange"
                },
                "currency": 1,
                "country": "Germany"
            },
            "quantity": "2775.00"
        },
        {
            "id": 37,
            "account": 2,
            "security": {
                "id": 7,
                "isin": "US58733R1023",
                "symbol": "MELI",
                "name": "MercadoLibre, Inc",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "1.00"
        },
        {
            "id": 38,
            "account": 2,
            "security": {
                "id": 8,
                "isin": "US01609W1027",
                "symbol": "BABA",
                "name": "Alibaba Group Holding Limited",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "16.00"
        },
        {
            "id": 39,
            "account": 2,
            "security": {
                "id": 9,
                "isin": "US00507V1098",
                "symbol": "ATVI",
                "name": "Activision Blizzard, Inc",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "38.00"
        },
        {
            "id": 40,
            "account": 2,
            "security": {
                "id": 10,
                "isin": "GB00B18JK166",
                "symbol": "JETG",
                "name": "JPMorgan European Investment Trust (Growth Pool)",
                "exchange": {
                    "id": 133,
                    "name": "London Exchange"
                },
                "currency": 4,
                "country": "UK"
            },
            "quantity": "1552.00"
        },
        {
            "id": 41,
            "account": 2,
            "security": {
                "id": 11,
                "isin": "GB0008829292",
                "symbol": "TEM",
                "name": "Templeton Emerging Markets Investment Trust TEMIT",
                "exchange": {
                    "id": 133,
                    "name": "London Exchange"
                },
                "currency": 4,
                "country": "UK"
            },
            "quantity": "720.00"
        },
        {
            "id": 42,
            "account": 2,
            "security": {
                "id": 12,
                "isin": "US7170811035",
                "symbol": "PFE",
                "name": "Pfizer Inc",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "112.00"
        },
        {
            "id": 43,
            "account": 2,
            "security": {
                "id": 13,
                "isin": "IE00B52MJY50",
                "symbol": "SXR1",
                "name": "iShares VII PLC - iShares Core MSCI Pac ex-Jpn ETF USD Acc",
                "exchange": {
                    "id": 143,
                    "name": "XETRA Exchange"
                },
                "currency": 1,
                "country": "Germany"
            },
            "quantity": "8.00"
        },
        {
            "id": 44,
            "account": 2,
            "security": {
                "id": 14,
                "isin": "CA11284V1058",
                "symbol": "BEPC",
                "name": "Brookfield Renewable Corporation",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "85.00"
        },
        {
            "id": 45,
            "account": 2,
            "security": {
                "id": 15,
                "isin": "US0970231058",
                "symbol": "BA",
                "name": "The Boeing Company",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "10.00"
        },
        {
            "id": 46,
            "account": 2,
            "security": {
                "id": 16,
                "isin": "DE000A1EWWW0",
                "symbol": "ADS",
                "name": "adidas AG",
                "exchange": {
                    "id": 143,
                    "name": "XETRA Exchange"
                },
                "currency": 1,
                "country": "Germany"
            },
            "quantity": "11.00"
        },
        {
            "id": 47,
            "account": 2,
            "security": {
                "id": 17,
                "isin": "US46625H1005",
                "symbol": "JPM",
                "name": "JPMorgan Chase & Co",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "30.00"
        },
        {
            "id": 48,
            "account": 2,
            "security": {
                "id": 18,
                "isin": "US17275R1023",
                "symbol": "CSCO",
                "name": "Cisco Systems, Inc",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "43.00"
        },
        {
            "id": 49,
            "account": 2,
            "security": {
                "id": 19,
                "isin": "US0605051046",
                "symbol": "BAC",
                "name": "Bank of America Corporation",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "123.00"
        },
        {
            "id": 50,
            "account": 2,
            "security": {
                "id": 20,
                "isin": "US7427181091",
                "symbol": "PG",
                "name": "The Procter & Gamble Company",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "21.00"
        },
        {
            "id": 51,
            "account": 2,
            "security": {
                "id": 21,
                "isin": "US92826C8394",
                "symbol": "V",
                "name": "Visa Inc",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "16.00"
        },
        {
            "id": 52,
            "account": 2,
            "security": {
                "id": 22,
                "isin": "US0231351067",
                "symbol": "AMZN",
                "name": "Amazon.com, Inc",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "4.00"
        },
        {
            "id": 53,
            "account": 2,
            "security": {
                "id": 23,
                "isin": "US5949181045",
                "symbol": "MSFT",
                "name": "Microsoft Corporation",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "31.00"
        },
        {
            "id": 54,
            "account": 2,
            "security": {
                "id": 24,
                "isin": "GB00BMXWN182",
                "symbol": "JMG",
                "name": "JPMorgan Emerging Markets Inv Trust",
                "exchange": {
                    "id": 133,
                    "name": "London Exchange"
                },
                "currency": 4,
                "country": "UK"
            },
            "quantity": "2450.00"
        },
        {
            "id": 55,
            "account": 2,
            "security": {
                "id": 25,
                "isin": "US70450Y1038",
                "symbol": "PYPL",
                "name": "PayPal Holdings, Inc",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "21.00"
        },
        {
            "id": 56,
            "account": 2,
            "security": {
                "id": 26,
                "isin": "US30303M1027",
                "symbol": "FB",
                "name": "Facebook, Inc",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "19.00"
        },
        {
            "id": 57,
            "account": 2,
            "security": {
                "id": 27,
                "isin": "US1985161066",
                "symbol": "COLM",
                "name": "Columbia Sportswear Company",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "26.00"
        },
        {
            "id": 58,
            "account": 2,
            "security": {
                "id": 28,
                "isin": "US2561631068",
                "symbol": "DOCU",
                "name": "DocuSign, Inc",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "0.00"
        },
        {
            "id": 59,
            "account": 2,
            "security": {
                "id": 29,
                "isin": "DE0005190003",
                "symbol": "BMW",
                "name": "Bayerische Motoren Werke Aktiengesellschaft",
                "exchange": {
                    "id": 143,
                    "name": "XETRA Exchange"
                },
                "currency": 1,
                "country": "Germany"
            },
            "quantity": "32.00"
        },
        {
            "id": 60,
            "account": 2,
            "security": {
                "id": 30,
                "isin": "US0846707026",
                "symbol": "BRK-B",
                "name": "Berkshire Hathaway Inc",
                "exchange": {
                    "id": 132,
                    "name": "USA Stocks"
                },
                "currency": 3,
                "country": "USA"
            },
            "quantity": "22.00"
        }
    ]
};

class PortfolioOverview extends React.Component {
    render() {
        let position_count = 18;
        let account_count = 2;

        let transaction_count = 45;
        let account_event_count = 123;

        return (
            <div className="portfolio-overview">
                <div className="portfolio-overview-card card">
                    <span className="card-label">At a glance</span>
                    <ul className="portfolio-stats-list">
                        <li>
                            Total Value: 12345.24 €
                        </li>
                        <li>
                            1 Week Δ: +12.24 €
                        </li>
                        <li>
                            1 Month Δ: -145.24 €
                        </li>
                        <li>
                            3 Months Δ: +15.24 €
                        </li>
                        <li>
                            6 Months Δ: +123.24 €
                        </li>
                        <li>
                            1 Year Δ: +1245.24 €
                        </li>
                    </ul>
                </div>
                <div className="card">
                    <span className="card-label">Assets</span>
                    <p>
                        {position_count} <a href="">Positions</a> in {account_count}  <a href=""> {account_count > 1 ? "Accounts" : "Account"}</a>
                    </p>
                    <a className="button">See all Positions</a>
                    <a className="button">Manage accounts</a>
                </div>
                <div className="card">
                    <span className="card-label">Events</span>
                    <div>{transaction_count} <a href="">Transactions</a></div>
                    <div>{account_event_count} <a href="">Account Events</a></div>
                    <a className="button">Manage transactions</a>
                    <a className="button">Manage events</a>
                </div>
            </div>
        )
    }
}

class PortfolioChart extends React.Component {
    render() {
        return (
            <div className="portfolio-chart">
                <h2>Performance over time</h2>
                <img src={stacked_area_graph} />
                <span className="card-label">
                    Time period
                </span>
                <ul className="time-selectors">
                    <li>
                        1 week
                    </li>
                    <li>
                        1 month
                    </li>
                    <li className="active-time-selector">
                        3 months
                    </li>
                    <li>
                        6 months
                    </li>
                    <li>
                        1 year
                    </li>
                    <li>
                        3 years
                    </li>
                    <li>
                        Max
                    </li>
                </ul>
                <span className="card-label">
                    Breakdown type
                </span>
                <select>
                    <option value="security">By security</option>
                    <option value="account">By account</option>
                </select>
            </div>
        )
    }
}

export default class Portfolio extends React.Component {

    render() {
        return (
            <div>
                <h1>Portfolio</h1>
                <PortfolioOverview />
                <PortfolioChart />
                <PositionList positions={TEST_DATA.results} />
            </div>
        )

    }
}