import React from 'react';

import { ResponsiveLine } from '@nivo/line';
import PropTypes from 'prop-types';


export const AreaChart = ({ data }) => {

    return (<ResponsiveLine
        data={data}
        margin={{ top: 100, right: 110, bottom: 100, left: 80 }}

        xScale={{
            type: 'time',
            format: '%d/%m/%Y',
            precision: 'day',
        }}

        xFormat="time:%Y/%m/%d"
        yScale={{ type: 'linear', min: 0, max: 'auto', stacked: false, reverse: false }}
        yFormat=" >-.2f"
        axisTop={null}
        axisRight={null}
        enablePoints={false}
        enableSlices="x"
        areaOpacity={0.9}
        axisBottom={{
            format: '%b %d',
            legendOffset: 32,
            tickRotation: 45,
        }}
        axisLeft={{
            orient: 'left',
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Value',
            legendOffset: -60,
            legendPosition: 'middle'
        }}
        colors={{ scheme: 'category10' }}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={- 12}
        useMesh={true}
        sliceTooltip={({ slice }) => {

            const total = Math.round(slice.points.reduce((previous, current) => previous + current.data.y, 0) * 100) / 100;
            const date = slice.points[0].data.x;
            return (
                <div
                    style={{
                        background: 'white',
                        padding: '9px 12px',
                        border: '1px solid #ccc',
                    }}
                >
                    <h3>At {date.toISOString().slice(0, 10)}</h3>
                    <div><strong>Total</strong>: {total}</div>
                    {slice.points.map(point => (
                        <div
                            key={point.id}
                            style={{
                                color: point.serieColor,
                                padding: '3px 0',
                            }}
                        >
                            <strong>{point.serieId}</strong>: {point.data.yFormatted}
                        </div>
                    ))}
                </div>
            );
        }}
    />);
};

AreaChart.propTypes = {
    data: PropTypes.array.isRequired,
};