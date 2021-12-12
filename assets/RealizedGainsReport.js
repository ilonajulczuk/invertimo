import React, { useState, useEffect } from 'react';

import isValid from 'date-fns/isValid';
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';

import PropTypes from 'prop-types';

import DatePicker from "./components/DatePicker.js";

import { makeStyles } from '@material-ui/core/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

import { ErrorBoundary } from './error_utils.js';
import { getLots } from './api_utils.js';
import { LotList } from './LotList.js';
import { PositionLink } from './components/PositionLink.js';


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

export default function RealizedGainsReport(props) {

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

    const [lots, setLots] = useState(null);

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

    useEffect(() => {
        let mounted = true;
        getLots().then(lots => {
            if (mounted) {
                setLots(lots);
            }
        });

        return () => mounted = false;
    },
        [props.positions]// Specify dependencies.
    );

    const lotsDisplay = lots ? <GainsDisplay
        lots={lots} positions={props.positions} accounts={props.accounts} /> : <div>Loading...</div>;
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
        {lotsDisplay}
        <p>
            Dates: {dates.from ? dates.from.toLocaleDateString() : "custom"} - {dates.to ? dates.to.toLocaleDateString() : "now"}
        </p>

    </ErrorBoundary>);
}

RealizedGainsReport.propTypes = {
    accounts: PropTypes.array.isRequired,
    positions: PropTypes.array.isRequired,
};

function GainsDisplay(props) {
    // Divide lots per position.
    // Then render position + total gains
    // And then lots with links to transactions as a table with sort but no pagination.
    // Or should I still have pagination?
    let lotsByPositionId = new Map(props.lots.map(lot => [lot.position, []]));
    props.lots.forEach(lot => {
        const lots = lotsByPositionId.get(lot.position);
        lots.push(lot);
    });
    let positionsAndLots = [];
    const positionsById = new Map(props.positions.map(position => [position.id, position]));
    const accountsById = new Map(props.accounts.map(account => [account.id, account]));
    for (let [positionId, lots] of lotsByPositionId) {
        const position = positionsById.get(positionId);
        const account = accountsById.get(position.account);
        positionsAndLots.push(
            <div key={positionId}>
                <h3><PositionLink position={position} account={account} /></h3>
                <ul>
                    <LotList lots={lots} position={position} account={account} />
                </ul>
            </div>
        );
    }

    return <div>
        {positionsAndLots}
    </div>;
}


GainsDisplay.propTypes = {
    lots: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        quantity: PropTypes.string.isRequired,
        buy_date: PropTypes.string.isRequired,
        buy_price: PropTypes.string.isRequired,
        cost_basis_account_currency: PropTypes.string.isRequired,
        sell_date: PropTypes.string.isRequired,
        sell_price: PropTypes.string.isRequired,
        sell_basis_account_currency: PropTypes.string.isRequired,
        realized_gain_account_currency: PropTypes.string.isRequired,
        position: PropTypes.number.isRequired,
        buy_transaction: PropTypes.number.isRequired,
        sell_transaction: PropTypes.number.isRequired,
    })).isRequired,
    accounts: PropTypes.array.isRequired,
    positions: PropTypes.array.isRequired,
};
