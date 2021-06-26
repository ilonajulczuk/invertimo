import React from 'react';
import './position_list.css';
import { APIClient } from './api_utils.js';
import { filterPointsWithNoChange, filterPoints } from './timeseries_utils.js';
import TimeSelector from './TimeSelector.js';
import { EmbeddedTransactionList } from './TransactionList.js';
import { ErrorBoundary } from './error_utils.js';
import PropTypes from 'prop-types';
import { AreaChartWithCursor, LineChartWithCursor } from './components/charts.js';
import { TableWithSort } from './components/TableWithSort.js';
import {toSymbol} from './currencies.js';
import {
    NavLink
} from "react-router-dom";


class ExpandedPositionContent extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            chartTimeSelectorOptionId: 3,
            chartTimePeriod: { months: 3 },
        };

        this.handleChartTimeSelectorChange = this.handleChartTimeSelectorChange.bind(this);
    }

    handleChartTimeSelectorChange(selectorOptionId, selectorData) {
        this.setState({
            chartTimeSelectorOptionId: selectorOptionId,
            chartTimePeriod: selectorData,
        });
    }

    daysFromDurationObject(duration) {
        if (duration == null) {
            return null;
        }
        let totalDays = 0;
        if (duration.days) {

            totalDays += duration.days;
        }
        if (duration.months) {
            totalDays += duration.months * 31;
        }
        if (duration.years) {
            totalDays += duration.years * 365;
        }
        return totalDays;
    }

    render() {

        let skipFactor = 1;
        const dataDays = this.daysFromDurationObject(this.state.chartTimePeriod) || 4 * 365;

        if (dataDays > 300) {
            skipFactor = 3;
        }
        const startDay = new Date();
        startDay.setDate(startDay.getDate() - dataDays);
        let quantities = this.props.data.quantities;
        if (dataDays) {
            quantities = this.props.data.quantities.slice(0, dataDays);
        }
        quantities = quantities.map((elem) => {
            let exactDate = new Date(elem[0]);
            return { date: new Date(exactDate.toDateString()), value: elem[1] };
        });

        let prices = this.props.data.prices.map((elem) => {
            let exactDate = new Date(elem.date);
            return { date: new Date(exactDate.toDateString()), value: Number(elem.value) };
        });

        let values = this.props.data.values.map((elem) => {
            let exactDate = new Date(elem[0]);
            return { date: new Date(exactDate.toDateString()), value: Number(elem[1]) };
        });

        let valuesAccountCurrency = this.props.data.values_account_currency.map((elem) => {
            let exactDate = new Date(elem[0]);
            return { date: new Date(exactDate.toDateString()), value: Number(elem[1]) };
        });
        quantities = filterPointsWithNoChange(quantities, skipFactor);
        prices = filterPoints(prices, skipFactor);
        values = filterPoints(values, skipFactor);
        valuesAccountCurrency = filterPoints(valuesAccountCurrency, skipFactor);

        let positionCurrency = this.props.data.security.currency;
        let accountCurrency = this.props.account.currency;
        return (
            <div className="position-card-expanded-content">
                <div className="position-card-charts-header">
                    <h3>Charts</h3>
                    <TimeSelector activeId={this.state.chartTimeSelectorOptionId} onClick={this.handleChartTimeSelectorChange} />
                </div>
                <div className="position-card-charts">
                    <div className="position-card-chart">
                        <h3>Price ({positionCurrency})</h3>
                        <LineChartWithCursor dataset={prices} labelSuffix={" " + positionCurrency} startDay={startDay} />
                    </div>

                    <div className="position-card-chart">
                        <h3>Quantity</h3>
                        <AreaChartWithCursor dataset={quantities} startDay={startDay} />
                    </div>
                    <div className="position-card-chart">
                        <h3>Value in trading currency ({positionCurrency})</h3>
                        <LineChartWithCursor dataset={values} labelSuffix={" " + positionCurrency} startDay={startDay} />
                    </div>

                    <div className="position-card-chart">
                        <h3>Value in account currency ({accountCurrency})</h3>
                        <LineChartWithCursor dataset={valuesAccountCurrency} labelSuffix={" " + accountCurrency} startDay={startDay} />
                    </div>

                </div>
                <div>
                    <h3>Transactions & Events</h3>
                    <EmbeddedTransactionList transactions={this.props.data.transactions} />
                </div>

            </div>
        );
    }
}

ExpandedPositionContent.propTypes = {
    data: PropTypes.object.isRequired,
    account: PropTypes.object.isRequired,
};