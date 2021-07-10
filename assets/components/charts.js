import React from 'react';
import { VictoryStack, VictoryLine, VictoryChart, VictoryArea, VictoryCursorContainer, VictoryAxis } from 'victory';
import { findClosestValue } from '../timeseries_utils.js';
import PropTypes from 'prop-types';
import * as d3 from 'd3-scale-chromatic';



function calculatePoint(i, intervalSize, colorRangeInfo) {
    let { colorStart, colorEnd, useEndAsStart } = colorRangeInfo;
    return (useEndAsStart
        ? (colorEnd - (i * intervalSize))
        : (colorStart + (i * intervalSize)));
}

/* Must use an interpolated color scale, which has a range of [0, 1] */
function interpolateColors(dataLength, colorScale, colorRangeInfo) {
    let { colorStart, colorEnd } = colorRangeInfo;
    let colorRange = colorEnd - colorStart;
    let intervalSize = colorRange / dataLength;
    let i, colorPoint;
    let colorArray = [];

    for (i = 0; i < dataLength; i++) {
        colorPoint = calculatePoint(i, intervalSize, colorRangeInfo);
        colorArray.push(colorScale(colorPoint));
    }

    return colorArray;
}



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


export function AreChartWithMultipleDatasetsAndCursor(props) {


    const colorRangeInfo = {
        colorStart: 0,
        colorEnd: 1,
        useEndAsStart: false,
    };

    let colorScale = d3.interpolateSpectral;

    const dataLength = props.datasets.length;
    let COLORS = interpolateColors(dataLength, colorScale, colorRangeInfo);

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