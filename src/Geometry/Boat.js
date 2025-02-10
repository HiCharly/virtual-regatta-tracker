import {Fill, Style, Text} from "ol/style";
import CircleStyle from "ol/style/Circle";
import {LineString, MultiLineString, Point} from "ol/geom";
import BoatDrag from "./BoatDrag";

export default class Boat {
    constructor(name, color, trace) {
        this.name = name;
        this.color = color;
        this.trace = trace;
        this.start = false;

        this.geometry = new Point([])
        this.style = new Style({
            image: new CircleStyle({
                radius: 4,
                fill: new Fill({color: this.color}),
            }),
            text: new Text({
                font: 'bold 11px "Open Sans", "Arial Unicode MS", "sans-serif"',
                textAlign: 'left',
                offsetX: 10,
                placement: 'point',
                fill: new Fill({color: '#fff'}),
                // stroke: new Stroke({color: '#000', width: 2}),
                text: this.name,
            }),
        });

        this.drag = new BoatDrag(this.color)
    }

    getPosition(timestamp) {
        // fetch previous coordinates
        const previousStep = this.trace.findLast(point => point.ts <= timestamp);
        if(!previousStep)
            return false;

        const previousTimestamp = previousStep.ts;
        const previousCoordinates = [previousStep.lon, previousStep.lat];

        // fetch next coordinates
        const nextStep = this.trace.find(point => point.ts > timestamp);
        if(!nextStep) {
            return false;
        }
        const nextTimestamp = nextStep.ts;
        const nextCoordinates = [nextStep.lon, nextStep.lat];

        // My boat is between previous and next coordinates, create a virtual line and project the boat position
        // Create a projection line between previous and next points
        let projectionLine;
        const projectionLineDuration = nextTimestamp - previousTimestamp;
        const elapsedTimeOnProjection = timestamp - previousTimestamp;
        if (Math.abs(previousStep.lon - nextStep.lon) > 180) {
            const w1 = 180 - Math.abs(previousStep.lon);
            const w2 = 180 - Math.abs(nextStep.lon);
            const y = (w1 / (w1 + w2)) * (nextStep.lat - previousStep.lat) + previousStep.lat;

            projectionLine = new MultiLineString([
                [
                    previousCoordinates,
                    [previousCoordinates > 0 ? 180 : -180, y]
                ],
                [
                    [nextCoordinates[0] > 0 ? 180 : -180, y],
                    nextCoordinates,
                ],
            ]);
            return projectionLine.getCoordinateAtM(elapsedTimeOnProjection / projectionLineDuration);
        }
        else {
            projectionLine = new LineString([previousCoordinates, nextCoordinates]);
            return projectionLine.getCoordinateAt(elapsedTimeOnProjection / projectionLineDuration);
        }

    }
}