import {MultiLineString} from "ol/geom";
import {Stroke, Style} from "ol/style";

export default class BoatDrag {
    constructor(color) {
        this.style = new Style({
            stroke: new Stroke({
                color: color,
                width: 1
            })
        });

        this.lastLon = Infinity;
        this.lastLat = undefined;

        this.lineStrings = [];
        this.lineString = undefined;
    }

    getGeometry() {
        return new MultiLineString(this.lineStrings);
    }

    addPoint(coordinates) {
        const lon = coordinates[0];
        const lat = coordinates[1];

        if (Math.abs(this.lastLon - lon) > 180) { // Crossing date line will be shorter
            if (this.lineString) {
                const w1 = 180 - Math.abs(this.lastLon);
                const w2 = 180 - Math.abs(lon);
                const y = (w1 / (w1 + w2)) * (lat - this.lastLat) + this.lastLat;
                if (Math.abs(this.lastLon) !== 180) {
                    this.lineString.push([this.lastLon > 0 ? 180 : -180, y]);
                }
                this.newLineString()
                if (Math.abs(lon) !== 180) {
                    this.lineString.push([lon > 0 ? 180 : -180, y]);
                }
            } else {
                this.newLineString()
            }
        }

        this.lastLon = lon;
        this.lastLat = lat;

        this.lineString.push(coordinates);
    }

    newLineString() {
        this.lineStrings.push(this.lineString = [])
    }
}