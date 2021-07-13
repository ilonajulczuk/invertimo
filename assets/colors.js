
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


export function generateColors(count) {
    const colorRangeInfo = {
        colorStart: 0,
        colorEnd: 1,
        useEndAsStart: false,
    };

    let colorScale = d3.interpolateRainbow;

    const dataLength = count;
    return interpolateColors(dataLength, colorScale, colorRangeInfo);
}