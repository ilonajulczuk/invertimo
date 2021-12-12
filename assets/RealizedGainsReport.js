import React, { useState } from 'react';

import isValid from 'date-fns/isValid';
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';

import DatePicker from "./components/DatePicker.js";

import { makeStyles } from '@material-ui/core/styles';
import { ErrorBoundary } from './error_utils.js';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';



const useStyles = makeStyles({
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
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

    const [showAssetHoldAge, setShowAssetHoldAge] = useState(false);
    const handleSetShowAssetHoldAge = (event) => {
        setShowAssetHoldAge(event.target.checked);
      };

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

    return (<ErrorBoundary>

        <div className={classes.header}>
            <h2><a href="#transactions">Transactions</a> / realized gains</h2>
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
            <FormGroup>
                <FormControlLabel control={<Checkbox checked={showAssetHoldAge} onChange={handleSetShowAssetHoldAge} />} label="Show how long assets were held" />
            </FormGroup>

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