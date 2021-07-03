import React from 'react';
import { AreaChartWithCursor } from './components/charts.js';

import PropTypes from 'prop-types';


export function AccountValue(props) {

    let values = props.values.map((positionValues) => {

        let row = [positionValues[0], positionValues[1].map((elem) => {
            let exactDate = new Date(elem[0]);
            return { date: new Date(exactDate.toDateString()), value: Number(elem[1]) };
        }

        )];
        return row;
    });

    let dataset = [];
    if (values && values.length > 0) {
        dataset = values[0][1];
    }
    // TODO: make this dynamic.
    const dataDays = 30;
    const startDay = new Date();
    startDay.setDate(startDay.getDate() - dataDays);

    return (<div>
        <h2>Hello!</h2>

        <AreaChartWithCursor dataset={dataset} startDay={startDay}/>

    </div>);
}

AccountValue.propTypes = {
    account: PropTypes.object.isRequired,
    positions: PropTypes.array.isRequired,
    values: PropTypes.array.isRequired,
};