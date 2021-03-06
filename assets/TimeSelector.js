import React from 'react';
import PropTypes from 'prop-types';



export function daysFromDurationObject(duration) {
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

export class TimeSelector extends React.Component {

    render() {
        let items = [
            { id: 1, content: "1 week", value: { days: 7 } },
            { id: 2, content: "1 month", value: { months: 1 } },
            { id: 3, content: "3 months", value: { months: 3 } },
            { id: 4, content: "1 year", value: { years: 1 } },
            { id: 5, content: "3 years", value: { years: 3 } },
            { id: 6, content: "Max", value: null },
        ];

        let options = items.map(item => (<li
            key={item.id}
            className={this.props.activeId == item.id ? "active-time-selector" : ""}
            onClick={() => this.props.onClick(item.id, item.value)}
            >
                {item.content}

        </li>)
        );

        return (
            <ul className="time-selectors">
                {options}
            </ul>
        );
    }
}

TimeSelector.propTypes = {
    activeId: PropTypes.any.isRequired,
    onClick: PropTypes.func.isRequired
};