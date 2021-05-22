import React from 'react';

export default class TimeSelector extends React.Component {

    render() {
        return (
            <ul className="time-selectors">
                <li>
                    1 week
                    </li>
                <li>
                    1 month
                    </li>
                <li className="active-time-selector">
                    3 months
                    </li>
                <li>
                    6 months
                    </li>
                <li>
                    1 year
                    </li>
                <li>
                    3 years
                    </li>
                <li>
                    Max
                    </li>
            </ul>
        );
    }
}