import './style.css';
import {Feature, Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import {LineString, Point} from "ol/geom";
import {Fill, Stroke, Style, Text} from "ol/style";
import CircleStyle from "ol/style/Circle";
import {getVectorContext} from "ol/render";
import {useGeographic} from "ol/proj";
import {XYZ} from "ol/source";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import {GeoJSON} from "ol/format";

useGeographic();

// Satellite layer
const tileLayer = new TileLayer({
    source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19
    })
});

// Exclusion zones layer
const zonesLayer = new VectorLayer({
    source: new VectorSource({
        features: [],
    }),
    style: new Style({
        fill: new Fill({color: 'rgba(255,0,0,0.30)'}),
        stroke: new Stroke({color: 'rgba(255,0,0,1)'}),
    })
});
const zonesFiles = [
    'zones/pv_zea_v7.json',
    'zones/pv_zi_vg_2024.json',
    'zones/pv_zone_whales.json',
]
zonesFiles.forEach(zoneFile => {
    fetch(zoneFile)
        .then(res => res.json())
        .then(json => { zonesLayer.getSource().addFeatures(new GeoJSON().readFeatures(json)) })
});

const map = new Map({
    target: 'map',
    layers: [
        tileLayer,
        zonesLayer,
    ],
    view: new View({
        center: [-1.831527, 46.4713], // race start
        zoom: 8
    })
});

const raceStartTimestamp = 1731240120000
let currentTimestamp = raceStartTimestamp;

// List boats
const boatOptions = [
    {
        name: 'Hugo(85)',
        color: 'black',
    }, {
        name: 'CharlySkipper3000',
        color: 'white'
    },
    {
        name: 'Les sardines des sables',
        color: 'red',
    }
]

const boats = []
for(const boatId in boatOptions) {
    const boat = boatOptions[boatId];
    fetch('boats/' + boat.name + '.json')
        .then(res => res.json())
        .then(json => {
            boats.push({
                'name': boat.name,
                'routePoints': json,
                'marker': new Feature({
                    geometry: new Point([]),
                }),
                'markerStyle': new Style({
                    image: new CircleStyle({
                        radius: 4,
                        fill: new Fill({color: boat.color}),
                    }),
                    text: new Text({
                        font: 'bold 11px "Open Sans", "Arial Unicode MS", "sans-serif"',
                        textAlign: 'left',
                        offsetX: 10,
                        placement: 'point',
                        fill: new Fill({color: '#fff'}),
                        // stroke: new Stroke({color: '#000', width: 2}),
                        text: boat.name,
                    }),
                }),
                'line': new Feature({
                    geometry: new LineString([]),
                }),
                'lineStyle': new Style({
                    stroke: new Stroke({
                        color: boat.color,
                        width: 1
                    })
                }),
            })
        })
}

// Animations
const speedInput = document.getElementById('speed');
const startButton = document.getElementById('start-animation');
let animating = false;

function startAnimation() {
    animating = true;
    startButton.textContent = 'Stop Animation';
    currentTimestamp = raceStartTimestamp;
    tileLayer.on('postrender', moveBoats);
    map.render();
}

function stopAnimation() {
    animating = false;
    startButton.textContent = 'Start Animation';
    tileLayer.un('postrender', moveBoats);

    boats.forEach(boat => {
        boat.line.getGeometry().setCoordinates([]);
    });
}

function moveBoats(event) {
    // increase current timestamp
    const speed = Number(speedInput.value);
    currentTimestamp += speed * 1000; // 1000 multiplication to convert ms to s

    // loop over boats
    for (const boatId in boats) {
        const boat = boats[boatId];
        const vectorContext = getVectorContext(event);

        // fetch boat position at new timestamp
        const newCoordinates = getBoatPosition(boat, currentTimestamp)
        if(newCoordinates) {
            // update boat position
            boat.marker.getGeometry().setCoordinates(newCoordinates);

            // add point to boat line
            boat.line.getGeometry().appendCoordinate(newCoordinates);
        }

        // draw boat marker
        vectorContext.setStyle(boat.markerStyle);
        vectorContext.drawGeometry(boat.marker.getGeometry());

        // draw boat line
        vectorContext.setStyle(boat.lineStyle);
        vectorContext.drawGeometry(boat.line.getGeometry());
    }

    // tell OpenLayers to continue the postrender animation
    map.render();
}

function getBoatPosition(boat, timestamp) {
    // fetch previous coordinates
    const previousStep = boat.routePoints.findLast(point => point.ts < timestamp);
    const previousTimestamp = previousStep.ts;
    const previousCoordinates = [previousStep.lon, previousStep.lat];

    // fetch next coordinates
    const nextStep = boat.routePoints.find(point => point.ts > timestamp);
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

startButton.addEventListener('click', function () {
    if (animating) {
        stopAnimation();
    } else {
        startAnimation();
    }
});

startAnimation()