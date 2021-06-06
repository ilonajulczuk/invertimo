import React from 'react';
import stacked_area_graph from './stacked_area_graph.png';
import './portfolio.css';
import PositionList from './PositionList.js';
import TimeSelector from './TimeSelector.js';
import { APIClient } from './api_utils.js';


const CURRENCY_TO_SYMBOL = new Map(
    [
        ["USD", "$"],
        ["EUR", "€"],
        ["GBP", "£"],
    ]
)


class PortfolioOverview extends React.Component {

    render() {
        let positions_count = 0;
        let transactions_count = 0;
        let account_event_count = "?";
        let total_value = 0;

        let accounts = this.props.accounts;
        for (let account of accounts) {
            positions_count += account.positions_count;
            transactions_count += account.transactions_count;
            total_value += Number(account.balance);
        }
        let account_count = accounts.length;

        let currencySymbol = "?";
        if (accounts.length) {
            currencySymbol = CURRENCY_TO_SYMBOL.has(accounts[0].currency) ? CURRENCY_TO_SYMBOL.get(accounts[0].currency) : accounts[0].currency;
        }
        // TODO: rethink if positions should have an api endpoint per account or not
        // (likely, yes, because accounts can be in different currencies).
        // Assumes all accounts in one currency for now.

        const assetValues = this.props.positions.map(position => {
            // Exchange rate is null if account and position trading currency are the same.
            let latest_exchange_rate = position.latest_exchange_rate ? position.latest_exchange_rate : 1;
            return position.quantity * position.latest_price * latest_exchange_rate;
        });
        const totalAssetValue = Math.round(
            assetValues.reduce((sum, current) => sum + current, 0) * 100) / 100;

        return (
            <div className="portfolio-overview">
                <div className="portfolio-overview-card card">
                    <span className="card-label">At a glance</span>
                    <ul className="portfolio-stats-list">
                        <li>
                            Total Cash: {total_value} {currencySymbol}
                        </li>
                        <li>
                            Total Assets: {totalAssetValue} {currencySymbol}
                        </li>
                        <li>
                            Portfolio Value: {Math.round((total_value + totalAssetValue) * 100) / 100} {currencySymbol}
                        </li>
                    </ul>
                </div>
                <div className="card">
                    <span className="card-label">Assets</span>
                    <p>
                        {positions_count} <a href="">Positions</a> in {account_count}  <a href=""> {account_count > 1 ? "Accounts" : "Account"}</a>
                    </p>
                    <a className="button">See all Positions</a>
                    <a className="button">Manage accounts</a>
                </div>
                <div className="card">
                    <span className="card-label">Events</span>
                    <div>{transactions_count} <a href="">Transactions</a></div>
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
                {/* <img src={stacked_area_graph} /> */}
                <TimeSelector />
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

    constructor(props) {
        super(props);
        this.state = {
            "positions": [],
            "accounts": [],
        };
        this.apiClient = new APIClient('./api');
    }

    async componentDidMount() {
        this.apiClient.getAccounts().then(accounts =>
            this.setState({ "accounts": accounts }));
        this.apiClient.getPositions().then(
            positions => {
                this.setState({ "positions": positions });
            });
    }

    render() {
        return (
            <div>
                <h1>Portfolio</h1>
                <PortfolioOverview positions={this.state.positions} accounts={this.state.accounts} />
                <PositionList positions={this.state.positions} accounts={this.state.accounts} />
            </div>
        )

    }
}