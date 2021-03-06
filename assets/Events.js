import React from 'react';
import PropTypes from 'prop-types';
import {
    Switch,
    Route,
    useRouteMatch
} from "react-router-dom";

import { EventList } from './EventList.js';
import { EventDetail } from './EventDetail.js';
import { RecordTransferForm } from './forms/RecordTransferForm.js';
import { RecordDividendForm } from './forms/RecordDividendForm.js';
import { RecordCryptoIncomeForm } from './forms/RecordCryptoIncomeForm.js';


export function Events(props) {

    let { path } = useRouteMatch();

    return (
        <Switch>
            <Route exact path={path}>
                <EventList accounts={props.accounts} events={props.events} positions={props.positions} />
            </Route>
            <Route path={`${path}/record_dividend`}>
                <h2><a href="#events/">Events</a> / record dividend</h2>
                <RecordDividendForm
                    handleSubmit={props.handleAddEvent}
                    accounts={props.accounts}
                    positions={props.positions}
                />
            </Route>
            <Route path={`${path}/record_transfer`}>
                <h2><a href="#events/">Events</a> / record transfer</h2>
                <RecordTransferForm
                    handleSubmit={props.handleAddEvent}
                    accounts={props.accounts} />
            </Route>
            <Route path={`${path}/record_crypto_income`}>
                <h2><a href="#events/">Events</a> / record crypto income</h2>
                <p>This form helps you record income you received from staking or savings interest. If you use  <a href="http://binance.com" target="blank()">Binance</a>, you can instead use automatic import <a href="#/transactions/import/binance">here</a>. </p>
                <RecordCryptoIncomeForm
                    handleSubmit={props.handleAddCryptoIncomeEvent}
                    accounts={props.accounts}
                    defaultAssetOptions={[]} />
            </Route>
            <Route path={`${path}/:eventId`}>
                <EventDetail accounts={props.accounts}
                    events={props.events}
                    positions={props.positions}
                    handleDeleteEvent={props.handleDeleteEvent} />
            </Route>
        </Switch>
    );
}

Events.propTypes = {
    accounts: PropTypes.array.isRequired,
    events: PropTypes.array.isRequired,
    positions: PropTypes.array.isRequired,
    handleAddEvent: PropTypes.func.isRequired,
    handleAddCryptoIncomeEvent: PropTypes.func.isRequired,
    handleDeleteEvent: PropTypes.func.isRequired,
};