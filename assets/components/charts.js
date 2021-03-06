import React from 'react';
import { VictoryStack, VictoryLine, VictoryGroup, VictoryScatter, VictoryChart, VictoryArea, VictoryCursorContainer, VictoryAxis } from 'victory';
import { findClosestValue } from '../timeseries_utils.js';
import PropTypes from 'prop-types';
import { generateColors } from '../colors.js';
import { to2DecimalPlacesOr4SignificantDigits } from '../forms/utils.js';


export class AreaChartWithCursor extends React.Component {

    render() {
        let endDate = new Date();
        endDate.setDate(endDate.getDate() + 1);

        return (
            <VictoryChart
                height={300}
                width={500}
                padding={{ left: 70, top: 10, right: 140, bottom: 50 }}
                containerComponent={<VictoryCursorContainer
                    cursorLabel={({ datum }) => {
                        let y = findClosestValue(datum.x, this.props.dataset);
                        let labelSuffix = this.props.labelSuffix ? this.props.labelSuffix : '';
                        return `${datum.x.toLocaleDateString()}, ${to2DecimalPlacesOr4SignificantDigits(y)}${labelSuffix}`;
                    }}
                    stanadlone={true}
                    cursorDimension="x"
                />}
                scale={{ x: "time" }}
                domain={{
                    x: [this.props.startDay, endDate],
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


export function AreChartWithMultipleDatasetsAndCursor(props) {

    const dataLength = props.datasets.length;
    let COLORS = generateColors(dataLength);

    let areas = [];
    let events = [];
    let childNames = [];
    for (let i = 0; i < dataLength; i++) {
        let [id, dataset] = props.datasets[i];
        let style = { data: { fill: COLORS[i] }, labels: { fontSize: 20 } };
        if (props.activePosition == id) {
            style.data.fill = 'gold';
        }
        areas.push(
            <VictoryArea
                name={`data-${id}`}
                key={id}
                style={style}
                data={dataset}
                x={0}
                y={1}
            />
        );
        childNames.push(`data-${id}`);
        events.push({
            target: 'data',
            childName: `data-${id}`,
            eventHandlers: {
                onClick: () => {
                    props.handlePositionChange(id);
                    return ({
                        target: "data",
                    });
                },
            }
        });
    }

    return (
        <div>
            <VictoryChart
                height={500}
                width={800}
                padding={{ left: 70, top: 40, right: 140, bottom: 50 }}
                events={events}
                scale={{ x: "time" }}
                domain={{
                    x: [props.startDay, new Date()],
                }}
                minDomain={{ y: 0 }}
            >
                <VictoryAxis dependentAxis />
                <VictoryAxis style={{
                    tickLabels: { angle: -45, padding: 20 },
                }} />
                <VictoryStack >

                    {areas}
                </VictoryStack>
            </VictoryChart>
        </div>

    );

}


AreChartWithMultipleDatasetsAndCursor.propTypes = {
    datasets: PropTypes.array.isRequired,
    labelSuffix: PropTypes.string,
    startDay: PropTypes.instanceOf(Date),
    activePosition: PropTypes.number,
    handlePositionChange: PropTypes.func.isRequired,
};


export class LineChartWithCursor extends React.Component {

    render() {
        let endDate = new Date();
        endDate.setDate(endDate.getDate() + 1);
        return (
            <VictoryChart
                height={300}
                width={500}
                padding={{ left: 70, top: 10, right: 140, bottom: 70 }}
                containerComponent={<VictoryCursorContainer
                    cursorLabel={({ datum }) => {
                        let y = findClosestValue(datum.x, this.props.dataset);
                        let labelSuffix = this.props.labelSuffix ? this.props.labelSuffix : '';
                        return `${datum.x.toLocaleDateString()}, ${to2DecimalPlacesOr4SignificantDigits(y)}${labelSuffix}`;
                    }}
                    stanadlone={true}
                    cursorDimension="x"
                />}
                scale={{ x: "time" }}
                domain={{
                    x: [this.props.startDay, endDate],
                }}
                minDomain={{ y: 0 }}
            >
                <VictoryAxis dependentAxis />
                <VictoryAxis style={{
                    tickLabels: { angle: -45, padding: 20 },
                }} />
                <VictoryGroup>

                    <VictoryLine
                        style={{ data: { stroke: "#e96158" } }}
                        data={this.props.dataset}
                        x="date"
                        y="value"

                    />
                    <VictoryScatter
                        style={{ data: { stroke: "#e96158" } }}
                        data={this.props.dataset}
                        x="date"
                        y="value"

                    />
                </VictoryGroup>

            </VictoryChart>
        );
    }
}

LineChartWithCursor.propTypes = {
    dataset: PropTypes.array.isRequired,
    labelSuffix: PropTypes.string,
    startDay: PropTypes.instanceOf(Date),
};