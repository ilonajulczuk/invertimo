import React, { useState } from 'react';

import isValid from 'date-fns/isValid';
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import PropTypes from 'prop-types';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import DatePicker from "./DatePicker.js";


const thisYear = {
    from: new Date(new Date().getFullYear(), 0),
    to: null,
};
const lastYear = {
    from: new Date(new Date().getFullYear() - 1, 0),
    to: new Date(new Date().getFullYear(), 0),
};

export const DEFAULT_DATES = thisYear;

const selectionToDates = {
    "this year": thisYear,
    "last year": lastYear,
};

export default function StartEndSelector(props) {

    const dates = props.dates;
    const setDates = props.setDates;

    let defaultSelection = "this year";
    if (dates !== DEFAULT_DATES) {
        defaultSelection = "custom";
    }

    const [dateSelection, setDateSelection] = useState(defaultSelection);

    const [fromDate, setFromDate] = useState(dates.from ?? new Date(new Date().getFullYear(), 0));
    const [toDate, setToDate] = useState(dates.to ?? new Date());

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

    const toggleButtonsStyle = {
        padding: "15px",
    };

    return (
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "10px",
            flexWrap: "wrap",
        }}>

            <ToggleButtonGroup
                value={dateSelection}
                color="primary"
                exclusive
                onChange={handleDateSelection}
                aria-label="date selection"
            >
                <ToggleButton value="this year" aria-label="this year"
                    sx={toggleButtonsStyle}>
                    This year up to now
                </ToggleButton>
                <ToggleButton value="last year" aria-label="last year"
                    sx={toggleButtonsStyle}>
                    Last year
                </ToggleButton>
                <ToggleButton value="custom" aria-label="custom dates"
                    sx={toggleButtonsStyle}>
                    Custom dates
                </ToggleButton>
            </ToggleButtonGroup>

            <div style={{
                marginBottom: "16px",
                "&>div": {
                    marginRight: "5px",
                },
                gap: "10px",
                display: "flex",
                flexWrap: "wrap",
            }}>
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
    );
}

StartEndSelector.propTypes = {
    dates:  PropTypes.shape({
        from: PropTypes.instanceOf(Date),
        to: PropTypes.instanceOf(Date),
    }).isRequired,
    setDates: PropTypes.func.isRequired,
};