import React from 'react';
import { VictoryLine, VictoryChart, VictoryArea, VictoryCursorContainer, VictoryAxis } from 'victory';
import { findClosestValue } from '../timeseries_utils.js';
import PropTypes from 'prop-types';


export class AreaChartWithCursor extends React.Component {

    render() {
        return (
            <VictoryChart
                height={300}
                width={500}
                padding={{ left: 70, top: 10, right: 140, bottom: 50 }}
                containerComponent={<VictoryCursorContainer
                    cursorLabel={({ datum }) => {
                        let y = findClosestValue(datum.x, this.props.dataset);
                        let labelSuffix = this.props.labelSuffix ? this.props.labelSuffix : '';
                        return `${datum.x.toLocaleDateString()}, ${Math.round(y)}${labelSuffix}`;
                    }}
                    stanadlone={true}
                    cursorDimension="x"
                />}
                scale={{ x: "time" }}
                domain={{
                    x: [this.props.startDay, new Date()],
                }}
                minDomain={{ y: 0 }}
            >
                <VictoryAxis dependentAxis />
                <VictoryAxis style={{
                    tickLabels: { angle: -45, padding: 20 },
                }} />
                <VictoryArea
                    style={{ data: { fill: "#e96158" }, labels: { fontSize: 20 } }}
                    data={this.props.dataset}
                    x="date"
                    y="value"
                />
            </VictoryChart>
        );
    }
}


AreaChartWithCursor.propTypes = {
    dataset: PropTypes.array.isRequired,
    labelSuffix: PropTypes.string,
    startDay: PropTypes.instanceOf(Date),
};


export class LineChartWithCursor extends React.Component {

    render() {
        return (
            <VictoryChart
                height={300}
                width={500}
                padding={{ left: 70, top: 10, right: 140, bottom: 70 }}
                containerComponent={<VictoryCursorContainer
                    cursorLabel={({ datum }) => {
                        let y = findClosestValue(datum.x, this.props.dataset);
                        let labelSuffix = this.props.labelSuffix ? this.props.labelSuffix : '';
                        return `${datum.x.toLocaleDateString()}, ${Math.round(y)}${labelSuffix}`;
                    }}
                    stanadlone={true}
                    cursorDimension="x"
                />}
                scale={{ x: "time" }}
                domain={{
                    x: [this.props.startDay, new Date()],
                }}
                minDomain={{ y: 0 }}
            >
                <VictoryAxis dependentAxis />
                <VictoryAxis style={{
                    tickLabels: { angle: -45, padding: 20 },
                }} />
                <VictoryLine
                    style={{ data: { stroke: "#e96158" } }}
                    data={this.props.dataset}
                    x="date"
                    y="value"

                />
            </VictoryChart>
        );
    }
}

LineChartWithCursor.propTypes = {
    dataset: PropTypes.array.isRequired,
    labelSuffix: PropTypes.string,
    startDay: PropTypes.instanceOf(Date),
};