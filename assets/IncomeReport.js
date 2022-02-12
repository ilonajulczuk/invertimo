import React, { useState } from 'react';

import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

import { filter, map } from 'lodash';
import { ErrorBoundary } from './error_utils.js';

import StartEndSelector, { DEFAULT_DATES } from './components/StartEndSelector.js';
import { sumAsDecimals } from './forms/utils.js';


export default function IncomeReport(props) {
    const [dates, setDates] = useState(DEFAULT_DATES);

    let incomeEventsDisplay = <div>Loading income events...</div>;
    if (props.events) {
        const eventsFilteredByDates = filter(props.events, (event) => {
            return (new Date(event.executed_at) > dates.from || dates.from === null) && (new Date(event.executed_at) <= dates.to || dates.to === null);
        });
        // TODO: values are account currency and account currencies can be different for different accounts.
        // Because of that first it should be broken down by currency and then added together!
        const stakingEvents = filter(eventsFilteredByDates, event => event.event_type == "STAKING_INTEREST");
        const savingsEvents = filter(eventsFilteredByDates, event => event.event_type == "SAVINGS_INTEREST");

        const stakingEventsValues = map(stakingEvents, event => event.amount);
        const savingsEventsValues = map(savingsEvents, event => event.amount);
        const totalGainStaking = sumAsDecimals(stakingEventsValues);
        const totalGainSavings = sumAsDecimals(savingsEventsValues);

        incomeEventsDisplay = <div style={{ display: "flex", gap: 10, marginTop: "30px" }}>
            <Card sx={{ minWidth: 275 }} variant="outlined">
                <CardContent>
                    <Typography variant="h6" component="h6">
                        Total income
                    </Typography>
                    <Typography variant="body1" component="p">
                        {totalGainStaking.plus(totalGainSavings).toString()}
                    </Typography>

                </CardContent>
            </Card>
            <Card variant="outlined">
                <CardContent>
                    <Typography variant="h6" component="h6">
                        Staking income
                    </Typography>
                    <Typography variant="body1" component="p">
                        {stakingEvents.length} staking events produced {totalGainStaking.toString()}
                    </Typography>
                    <Typography variant="h6" component="h6">
                        Savings income
                    </Typography>
                    <Typography variant="body1" component="p">{savingsEvents.length} savings events produced {totalGainSavings.toString()}
                    </Typography>
                </CardContent>
            </Card>
        </div>;
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

    </ErrorBoundary>);
}

IncomeReport.propTypes = {
    events: PropTypes.array,
};