import React, { useState } from 'react';

import isValid from 'date-fns/isValid';
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';

import PropTypes from 'prop-types';

import DatePicker from "./components/DatePicker.js";

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import makeStyles from '@mui/styles/makeStyles';

import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

import { filter, map } from 'lodash';
import { ErrorBoundary } from './error_utils.js';

import { sumAsDecimals } from './forms/utils.js';

const useStyles = makeStyles({
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "10px",
        flexWrap: "wrap",
    },
    pickers: {
        marginBottom: "16px",
        "&>div": {
            marginRight: "5px",
        },
        gap: "10px",
        display: "flex",
        flexWrap: "wrap",
    },
    toggleButtons: {
        padding: "15px",
    }
});


export default function IncomeReport(props) {

    const classes = useStyles();
    const thisYear = {
        from: new Date(new Date().getFullYear(), 0),
        to: null,
    };
    const lastYear = {
        from: new Date(new Date().getFullYear() - 1, 0),
        to: new Date(new Date().getFullYear(), 0),
    };
    const defaultDates = thisYear;

    const selectionToDates = {
        "this year": thisYear,
        "last year": lastYear,
    };
    const [dateSelection, setDateSelection] = useState("this year");
    const [dates, setDates] = useState(defaultDates);
    // Variables for custom dates.
    const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), 0));
    const [toDate, setToDate] = useState(new Date());

    const handleDateSelection = (event, newSelection) => {
        if (newSelection === null) {
            return;
        }
        setDateSelection(newSelection);
        if (newSelection in selectionToDates) {
            setDates(selectionToDates[newSelection]);
        } else {

            let newDates = {
                from: dates.from,
                to: dates.to,
            };

            if (isValid(new Date(fromDate))) {
                newDates.from = new Date(fromDate);
            }

            if (isValid(new Date(toDate))) {
                newDates.to = new Date(toDate);
            }
            setDates(newDates);
        }
    };
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
        <div className={classes.header}>

            <ToggleButtonGroup
                value={dateSelection}
                color="primary"
                exclusive
                onChange={handleDateSelection}
                aria-label="date selection"
            >
                <ToggleButton value="this year" aria-label="this year"
                    className={classes.toggleButtons}>
                    This year up to now
                </ToggleButton>
                <ToggleButton value="last year" aria-label="last year"
                    className={classes.toggleButtons}>
                    Last year
                </ToggleButton>
                <ToggleButton value="custom" aria-label="custom dates"
                    className={classes.toggleButtons}>
                    Custom dates
                </ToggleButton>
            </ToggleButtonGroup>

            <div className={classes.pickers}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                        label="From date"
                        value={fromDate}
                        disabled={dateSelection !== "custom"}
                        onChange={(value) => {
                            if (isValid(new Date(value))) {
                                let newDates = {
                                    from: new Date(value),
                                    to: dates.to,
                                };
                                setDates(newDates);
                            }
                            setFromDate(value);
                        }}
                        ariaLabel='change from date'
                        helperText="Provide a date in YYYY/MM/DD format"
                    />
                    <DatePicker
                        label="To date"
                        value={toDate}
                        disabled={dateSelection !== "custom"}
                        onChange={(value) => {
                            if (isValid(new Date(value))) {
                                let newDates = {
                                    from: dates.from,
                                    to: new Date(value),
                                };
                                setDates(newDates);
                            }
                            setToDate(value);
                        }}
                        ariaLabel='change to date'
                    />
                </LocalizationProvider>
            </div>
        </div>
        <div className={classes.header}>
        </div>
        {incomeEventsDisplay}

    </ErrorBoundary>);
}

IncomeReport.propTypes = {
    events: PropTypes.array,
};