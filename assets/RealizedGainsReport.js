import React, { useState } from 'react';

import 'date-fns';
import isValid from 'date-fns/isValid';
import DateFnsUtils from '@date-io/date-fns';
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from '@material-ui/pickers';

import { makeStyles } from '@material-ui/core/styles';
import { ErrorBoundary } from './error_utils.js';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

const useStyles = makeStyles({
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    pickers: {
        marginBottom: "16px",
    }
});

export default function RealizedGainsReport() {

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

    return (<ErrorBoundary>

        <div className={classes.header}>
            <h2>Transactions / realized gains</h2>
        </div>
        <div className={classes.header}>

            <ToggleButtonGroup
                value={dateSelection}
                color="primary"
                exclusive
                onChange={handleDateSelection}
                size="small"
                aria-label="date selection"
            >
                <ToggleButton value="this year" aria-label="this year">
                    This year up to now
                </ToggleButton>
                <ToggleButton value="last year" aria-label="last year">
                    Last year
                </ToggleButton>
                <ToggleButton value="custom" aria-label="custom dates">
                    Custom dates
                </ToggleButton>
            </ToggleButtonGroup>
            <div className={classes.pickers}>
                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <KeyboardDatePicker
                        disableToolbar
                        variant="inline"
                        format="yyyy/MM/dd"
                        margin="normal"
                        label="From date"
                        value={fromDate}
                        autoOk={true}
                        disabled={dateSelection !== "custom"}
                        error={!isValid(new Date(fromDate))}
                        onChange={(_, value) => {

                            if (isValid(new Date(value))) {
                                let newDates = {
                                    from: new Date(value),
                                    to: dates.to,
                                };
                                setDates(newDates);
                            }
                            setFromDate(value);
                        }}
                        KeyboardButtonProps={{
                            'aria-label': 'change from date',
                        }}
                    />
                </MuiPickersUtilsProvider>
                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <KeyboardDatePicker
                        disableToolbar
                        variant="inline"
                        format="yyyy/MM/dd"
                        margin="normal"
                        label="To date"
                        value={toDate}
                        autoOk={true}
                        disabled={dateSelection !== "custom"}
                        error={!isValid(new Date(toDate))}
                        onChange={(_, value) => {

                            console.log(value);
                            if (isValid(new Date(value))) {
                                console.log("valid");
                                let newDates = {
                                    from: dates.from,
                                    to: new Date(value),
                                };
                                setDates(newDates);
                            }

                            setToDate(value);
                        }}
                        KeyboardButtonProps={{
                            'aria-label': 'change to date',
                        }}
                    />
                </MuiPickersUtilsProvider>
            </div>
        </div>
        <p>
            Hello gainz!
        </p>
        <p>
            Dates: {dates.from ? dates.from.toLocaleDateString() : "custom"} - {dates.to ? dates.to.toLocaleDateString() : "now"}

        </p>

    </ErrorBoundary>);
}

RealizedGainsReport.propTypes = {
};