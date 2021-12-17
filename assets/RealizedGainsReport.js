import React, { useState, useEffect } from 'react';

import isValid from 'date-fns/isValid';
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';

import PropTypes from 'prop-types';
import { filter, reduce } from 'lodash';

import DatePicker from "./components/DatePicker.js";

import makeStyles from '@mui/styles/makeStyles';
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
        alignItems: "flex-start",
        gap: "10px",
        flexWrap: "wrap",
    },
    pickers: {
        marginBottom: "16px",
        "&>div": {
            marginRight: "5px",
        }
    },
    toggleButtons: {
        padding: "15px",
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

    const [showAssetHoldTime, setShowAssetHoldTime] = useState(false);
    const handleSetShowAssetHoldAge = (event) => {
        setShowAssetHoldTime(event.target.checked);
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
        [props.positions]
    );

    const lotsDisplay = lots ? <GainsDisplay
        lots={lots}
        positions={props.positions}
        accounts={props.accounts}
        startDate={dates.from}
        endDate={dates.to}
        holdTime={showAssetHoldTime}
    /> : <div>Loading...</div>;
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
            <FormGroup>
                <FormControlLabel control={<Checkbox checked={showAssetHoldTime} onChange={handleSetShowAssetHoldAge} />} label="Show how long assets were held" />
            </FormGroup>

        </div>
        {lotsDisplay}

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

    const lotsFilteredByDates = filter(props.lots, (lot) => {
        return (new Date(lot.sell_date) < props.endDate || props.endDate === null) && (new Date(lot.sell_date) >= props.startDate);
    });

    let lotsByPositionId = new Map(lotsFilteredByDates.map(lot => [lot.position, []]));
    lotsFilteredByDates.forEach(lot => {
        const lots = lotsByPositionId.get(lot.position);
        lots.push(lot);
    });
    let positionsAndLots = [];
    const positionsById = new Map(props.positions.map(position => [position.id, position]));
    const accountsById = new Map(props.accounts.map(account => [account.id, account]));
    for (let [positionId, lots] of lotsByPositionId) {
        const position = positionsById.get(positionId);
        const account = accountsById.get(position.account);

        const totalGain = reduce(lots, (sum, lot) => sum + Number(lot.realized_gain_account_currency), 0);
        const totalGainRounded = Math.round(totalGain * 100) / 100;
        positionsAndLots.push(
            <div key={positionId}>
                <div style={{ display: "flex", gap: "10px", alignItems: "baseline", marginBottom: "1rem", marginTop: "3rem" }}>
                    <h3><PositionLink position={position} account={account} style={{ fontSize: "14px" }} /></h3>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span className="card-label">Total gain / loss</span>
                        {totalGainRounded}
                    </div>
                </div>
                <ul>
                    <LotList lots={lots} position={position} account={account} holdTime={props.holdTime} />
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
    startDate: PropTypes.instanceOf(Date).isRequired,
    endDate: PropTypes.instanceOf(Date),
    holdTime: PropTypes.bool.isRequired,
};
