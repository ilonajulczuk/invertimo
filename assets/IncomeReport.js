import React, { useState } from 'react';

import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

import { filter, map, groupBy } from 'lodash';
import { ErrorBoundary } from './error_utils.js';

import StartEndSelector, { DEFAULT_DATES } from './components/StartEndSelector.js';
import { sumAsDecimals } from './forms/utils.js';
import { PositionLink } from './components/PositionLink.js';
import { toSymbol } from './currencies';



function IncomeFromAccount(props) {

    const stakingEvents = filter(props.events, event => event.event_type == "STAKING_INTEREST");
    const savingsEvents = filter(props.events, event => event.event_type == "SAVINGS_INTEREST");

    const stakingEventsValues = map(stakingEvents, event => event.amount);
    const savingsEventsValues = map(savingsEvents, event => event.amount);
    const totalGainStaking = sumAsDecimals(stakingEventsValues);
    const totalGainSavings = sumAsDecimals(savingsEventsValues);

    const accountCurrency = toSymbol(props.account.currency);
    return <div>

        <h3>Income from <a href={`#accounts/${props.account.id}`}>{props.account.nickname}</a> account</h3>
        <div style={{ display: "flex", gap: 10, marginTop: "10px" }}>
            <Card sx={{ minWidth: 275 }} variant="outlined">
                <CardContent>
                    <span className='card-label'>
                        Total income
                    </span>
                    <Typography variant="body1" component="p">
                        {totalGainStaking.plus(totalGainSavings).toDecimalPlaces(2).toString()} {accountCurrency}
                    </Typography>

                </CardContent>
            </Card>
            <Card variant="outlined">
                <CardContent>
                    <span className='card-label'>
                        Staking income
                    </span>
                    <Typography variant="body1" component="p">
                        {stakingEvents.length} staking events produced {totalGainStaking.toDecimalPlaces(2).toString()} {accountCurrency}
                    </Typography>
                    <span className='card-label'>
                        Savings income
                    </span>
                    <Typography variant="body1" component="p">{savingsEvents.length} savings events
                        produced {totalGainSavings.toDecimalPlaces(2).toString()} {accountCurrency}
                    </Typography>
                </CardContent>
            </Card>
        </div>
    </div>;
}

IncomeFromAccount.propTypes = {
    events: PropTypes.array.isRequired,
    account: PropTypes.object.isRequired,
};


function IncomeFromPosition(props) {
    const stakingEvents = filter(props.events, event => event.event_type == "STAKING_INTEREST");
    const savingsEvents = filter(props.events, event => event.event_type == "SAVINGS_INTEREST");

    const stakingEventsValues = map(stakingEvents, event => event.amount);
    const savingsEventsValues = map(savingsEvents, event => event.amount);
    const totalGainStaking = sumAsDecimals(stakingEventsValues);
    const totalGainSavings = sumAsDecimals(savingsEventsValues);

    const accountCurrency = toSymbol(props.account.currency);
    return (
        <div>
            <div style={{
                display: "flex",
                gap: 10,
                marginTop: 20,
                marginBottom: 30,
                alignItems: 'flex-start',
            }}>
                <PositionLink position={props.position} account={props.account} style={{ flexBasis: "100px" }} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <span className='card-label'>
                        Staking income
                    </span>
                    <Typography variant="body1" component="p">
                        {totalGainStaking.toDecimalPlaces(2).toString()} {accountCurrency}
                    </Typography>
                    <span className='card-label' style={{ marginTop: 10 }}>Savings income
                    </span>
                    <Typography variant="body1" component="p">
                        {totalGainSavings.toDecimalPlaces(2).toString()} {accountCurrency}
                    </Typography>
                </div>
            </div>

        </div>
    );
}

IncomeFromPosition.propTypes = {
    events: PropTypes.array.isRequired,
    position: PropTypes.object.isRequired,
    account: PropTypes.object.isRequired,
};

export default function IncomeReport(props) {
    const [dates, setDates] = useState(DEFAULT_DATES);

    let incomeEventsDisplay = <div>Loading income events...</div>;
    let detailedIncomes = null;
    let accountsById = new Map(props.accounts.map(account => [account.id, account]));
    let positionsById = new Map(props.positions.map(position => [position.id, position]));

    if (props.events) {
        const relevantEvents = filter(props.events, event => event.event_type == "STAKING_INTEREST" || event.event_type == "SAVINGS_INTEREST");
        const eventsFilteredByDates = filter(relevantEvents, (event) => {
            return (new Date(event.executed_at) > dates.from || dates.from === null) && (new Date(event.executed_at) <= dates.to || dates.to === null);
        });
        const eventsByAccount = groupBy(eventsFilteredByDates, 'account');
        incomeEventsDisplay = Object.entries(eventsByAccount).map(
            entry => <IncomeFromAccount
                account={accountsById.get(Number(entry[0]))}
                events={entry[1]}
                key={entry[0]} />);
        const eventsByPositionAccount = groupBy(eventsFilteredByDates, e => [e.position, e.account]);
        detailedIncomes = Object.entries(eventsByPositionAccount).map(
            entry => {
                return <IncomeFromPosition
                    position={positionsById.get(Number(entry[0].split(",")[0]))}
                    key={entry[0]}
                    account={accountsById.get(Number(entry[0].split(",")[1]))}
                    events={entry[1]}
                />;
            });
    }

    return (<ErrorBoundary>

        <div>
            <h2><a href="#reports">Reports</a> / crypto income</h2>
        </div>
        <StartEndSelector dates={dates} setDates={setDates} />

        <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "10px",
            flexWrap: "wrap",
        }}>
        </div>
        {incomeEventsDisplay}
        {detailedIncomes.length > 0 ? <h3>Details by asset</h3> : null}
        {detailedIncomes}
    </ErrorBoundary>);
}

IncomeReport.propTypes = {
    events: PropTypes.array,
    accounts: PropTypes.array.isRequired,
    positions: PropTypes.array.isRequired,
};