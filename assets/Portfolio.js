import React from 'react';
import './portfolio.css';
import PositionList from './PositionList.js';
import { APIClient } from './api_utils.js';
import PropTypes from 'prop-types';
import {
    Switch,
    Route,
    NavLink
} from "react-router-dom";


const CURRENCY_TO_SYMBOL = new Map(
    [
        ["USD", "$"],
        ["EUR", "€"],
        ["GBP", "£"],
    ]
)

class AccountStats extends React.Component {
    render() {
        const account = this.props.account;

        let totalCash = Number(account.balance);
        let currencySymbol = CURRENCY_TO_SYMBOL.has(account.currency) ? CURRENCY_TO_SYMBOL.get(account.currency) : account.currency;

        const assetValues = this.props.positions.map(position => {
            // Exchange rate is null if account and position trading currency are the same.
            let latest_exchange_rate = position.latest_exchange_rate ? position.latest_exchange_rate : 1;
            return position.quantity * position.latest_price * latest_exchange_rate;
        });
        const totalAssetValue = Math.round(
            assetValues.reduce((sum, current) => sum + current, 0) * 100) / 100;

        return (
            <ul className="portfolio-stats-list">
                <li className="portfolio-stats-account-name">
                    In <a href="">{account.nickname}</a> account:
                </li>
                <li>
                    Total Cash: {totalCash} {currencySymbol}
                </li>
                <li>
                    Total Assets: {totalAssetValue} {currencySymbol}
                </li>
                <li>
                    Portfolio Value: {Math.round((totalCash + totalAssetValue) * 100) / 100} {currencySymbol}
                </li>
            </ul>);
    }
}


AccountStats.propTypes = {
    positions: PropTypes.array.isRequired,
    account: PropTypes.object.isRequired,
}

export function divideByAccount(accounts, positions) {
    const positionsByAccount = [];
    for (let account of accounts) {
        const positionsForAccount = [];
        for (let position of positions) {
            if (position.account == account.id) {
                positionsForAccount.push(position);
            }
        }
        positionsByAccount.push(
            { account: account, positions: positionsForAccount }
        );
    }
    return positionsByAccount;
}


export class PortfolioOverview extends React.Component {

    render() {
        let positionsCount = 0;
        let transactionsCount = 0;
        let accountEventCount = "?";

        let accounts = this.props.accounts;

        const accountStatsEntries = divideByAccount(accounts, this.props.positions).map(entry => {
            return (
                <AccountStats
                    key={entry.account.id}
                    account={entry.account}
                    positions={entry.positions}
                />
            )
        })
        for (let account of accounts) {
            positionsCount += account.positions_count;
            transactionsCount += account.transactions_count;
        }

        return (
            <div className="portfolio-overview">
                <div className="portfolio-overview-card card">
                    <span className="card-label">At a glance</span>
                    {accountStatsEntries}
                </div>
                <div className="card">
                    <span className="card-label">Assets</span>
                    <p>
                        {positionsCount} <a href="">Positions</a> in {accounts.length}  <a href=""> {accounts.length > 1 ? "Accounts" : "Account"}</a>
                    </p>
                    <a className="button">See all Positions</a>
                    <a className="button">Manage accounts</a>
                </div>
                <div className="card">
                    <span className="card-label">Events</span>
                    <div>{transactionsCount} <a href="">Transactions</a></div>
                    <div>{accountEventCount} <a href="">Account Events</a></div>
                    <a className="button">Manage transactions</a>
                    <a className="button">Manage events</a>
                </div>
            </div>
        )
    }
}

PortfolioOverview.propTypes = {
    positions: PropTypes.array.isRequired,
    accounts: PropTypes.array.isRequired,
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
                <div className="main-grid">
                    <nav className="sidenav">
                        <ul>
                            <li>
                                <NavLink to="/" exact={true}>Home</NavLink>
                            </li>
                            <li>
                                <NavLink to="/transactions">Transactions</NavLink>
                            </li>
                            <li>
                                <NavLink to="/positions">Positions</NavLink>
                            </li>
                        </ul>
                    </nav>

                    <div className="main-content">
                        <h1>Portfolio</h1>
                        <PortfolioOverview positions={this.state.positions} accounts={this.state.accounts} />
                        <Switch>
                            <Route path="/transactions">
                                <h2>Transactions</h2>
                            </Route>
                            <Route path="/positions">
                                <PositionList positions={this.state.positions} accounts={this.state.accounts} />
                            </Route>
                        </Switch>
                    </div>
                </div>
        );

    }
}