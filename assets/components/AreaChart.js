import React from 'react';

import { ResponsiveLine } from '@nivo/line';
import PropTypes from 'prop-types';


export const AreaChart = ({ data }) => {

    return (<ResponsiveLine
        data={data}
        margin={{ top: 40, right: 110, bottom: 40, left: 60 }}

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
            legendOffset: -60,
            legendPosition: 'middle'
        }}
        colors={{ datum: 'color' }}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={- 12}
        useMesh={true}
        sliceTooltip={({ slice }) => {

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
                    {slice.points.map(point => (
                        <div
                            key={point.id}
                            style={{
                                padding: '3px 0',
                            }}
                        >
                            <span style={{
                                color: point.serieColor
                            }}>#</span><strong>{point.serieId}</strong>: {point.data.yFormatted}
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