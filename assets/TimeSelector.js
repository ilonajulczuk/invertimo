import React from 'react';

export default class TimeSelector extends React.Component {

    render() {
        let items = [
            { id: 1, content: "1 week", value: { days: 7 } },
            { id: 2, content: "1 month", value: { months: 1 } },
            { id: 3, content: "3 months", value: { months: 3 } },
            { id: 4, content: "1 year", value: { years: 1 } },
            { id: 5, content: "3 years", value: { years: 3 } },
            { id: 6, content: "Max", value: null },
        ]

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