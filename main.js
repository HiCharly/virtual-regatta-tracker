import './style.css';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import {Fill, Stroke, Style} from "ol/style";
import {getVectorContext} from "ol/render";
import {useGeographic} from "ol/proj";
import {XYZ} from "ol/source";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import {GeoJSON} from "ol/format";
import Boat from "./src/Geometry/Boat";

useGeographic();

// Animations
const followInput = document.getElementById('follow')
const speedInput = document.getElementById('speed');
const zoomInput = document.getElementById('zoom');
const startButton = document.getElementById('start-animation');
let animating = false;

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
    'data/zones/pv_zea_v7.json',
    'data/zones/pv_zi_vg_2024.json',
    'data/zones/pv_zone_whales.json',
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
        zoom: 7,
        enableRotation: false,
    })
});

const raceStartTimestamp = 1731240120000
let currentTimestamp = raceStartTimestamp;

// List boats
const boatOptions = [
    {
        name: 'Hugo(85)',
        color: 'black',
    },
    {
        name: 'CharlySkipper3000',
        color: 'white'
    },
    {
        name: 'Les sardines des sables',
        color: 'red',
    }
]
const boats = []
for (const boatOption of boatOptions) {
    const boat = new Boat(boatOption.name, boatOption.color);
    boat.fetchTrace().then(() => {
        boats.push(boat);

        const opt = document.createElement('option');
        opt.value = boat.name;
        opt.innerHTML = boat.name;
        followInput.appendChild(opt);
    })
}

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
        boat.drag.reset();
    });
}

function moveBoats(event) {
    // increase current timestamp
    const speed = Number(speedInput.value);
    currentTimestamp += speed * 1000; // 1000 multiplication to convert ms to s

    // loop over boats
    const vectorContext = getVectorContext(event);
    boats.forEach(boat => {
        // fetch boat position at new timestamp
        const newCoordinates = boat.getPosition(currentTimestamp)
        if(newCoordinates) {
            // update boat position
            boat.geometry.setCoordinates(newCoordinates);

            // add point to boat line
            boat.drag.addPoint(newCoordinates);
        }

        // draw boat marker
        vectorContext.setStyle(boat.style);
        vectorContext.drawGeometry(boat.geometry);

        // draw boat line
        vectorContext.setStyle(boat.drag.style);
        vectorContext.drawGeometry(boat.drag.getGeometry());

        // follow boat
        if(followInput.value === boat.name) {
            map.getView().setCenter(newCoordinates);
        }
        map.getView().setZoom(zoomInput.value);
    })

    // tell OpenLayers to continue the postrender animation
    map.render();
}

startButton.addEventListener('click', function () {
    if (animating) {
        stopAnimation();
    } else {
        startAnimation();
    }
});

startAnimation()