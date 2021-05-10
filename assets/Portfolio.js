import React from 'react';
import stacked_area_graph from './stacked_area_graph.png';
import './portfolio.css';
import PositionList from './PositionList.js';
import { APIClient } from './api_utils.js';


class PortfolioOverview extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            "accounts": []
        };
        this.apiClient = new APIClient('./api');
    }
    componentDidMount() {
        this.apiClient.getAccounts().then(
            accounts => this.setState({ "accounts": accounts })
        );
    }

    render() {
        let positions_count = 0;
        let transactions_count = 0;
        let account_event_count = "?";
        let total_value = 0;

        for (let account of this.state.accounts) {
            positions_count += account.positions_count;
            transactions_count += account.transactions_count;
            total_value += Number(account.balance);
        }
        this.state.accounts;
        let account_count = this.state.accounts.length;


        return (
            <div className="portfolio-overview">
                <div className="portfolio-overview-card card">
                    <span className="card-label">At a glance</span>
                    <ul className="portfolio-stats-list">
                        <li>
                            Total Value: {total_value} €
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

    constructor(props) {
        super(props);
        this.state = {
            "positions": []
        };
        this.apiClient = new APIClient('./api');
    }

    componentDidMount() {
        this.apiClient.getPositions().then(
            positions => this.setState({ "positions": positions })
        );
    }

    render() {
        return (
            <div>
                <h1>Portfolio</h1>
                <PortfolioOverview />
                <PortfolioChart />
                <PositionList positions={this.state.positions} />
            </div>
        )

    }
}