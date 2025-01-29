import {Fill, Stroke, Style, Text} from "ol/style";
import CircleStyle from "ol/style/Circle";
import {Feature} from "ol";
import {LineString, Point} from "ol/geom";

export default class Boat {
    constructor(name, color) {
        this.name = name;
        this.color = color;

        this.marker = new Feature({
            geometry: new Point([]),
        })

        this.markerStyle = new Style({
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

        this.line = new Feature({
            geometry: new LineString([]),
        })

        this.lineStyle = new Style({
            stroke: new Stroke({
                color: this.color,
                width: 1
            })
        });
    }

    fetchTrace() {
        return fetch('data/boats/' + this.name + '.json')
            .then(res => res.json())
            .then(json => { this.trace = json; })
    }

    getPosition(timestamp) {
        // fetch previous coordinates
        const previousStep = this.trace.findLast(point => point.ts < timestamp);
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
        const projectionLine = new LineString([previousCoordinates, nextCoordinates]);
        const projectionLineDuration = nextTimestamp - previousTimestamp;
        const elapsedTimeOnProjection = timestamp - previousTimestamp;
        return projectionLine.getCoordinateAt(elapsedTimeOnProjection / projectionLineDuration);
    }
}