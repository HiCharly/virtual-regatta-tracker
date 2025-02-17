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
const timelineInput = document.getElementById('timeline')
const teamInput = document.getElementById('team')
const followInput = document.getElementById('follow')
const speedInput = document.getElementById('speed');
const zoomInput = document.getElementById('zoom');
const displayOnlyTrackedInput = document.getElementById('displayOnlyTracked');
const startButton = document.getElementById('start-pause');
const resetButton = document.getElementById('reset');
const dateText = document.getElementById('date');
let rendering = false;
let isPaused = false;

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
        extent: [-180,-90,180,90],
    }),
    controls: [],
});

// Init timeline
const raceStartTimestamp = 1731240120000
const raceEndTimestamp = 1742050800000
timelineInput.setAttribute("min", raceStartTimestamp)
timelineInput.setAttribute("max", raceEndTimestamp)
timelineInput.value = raceStartTimestamp
let boats = []

function startAnimation() {
    rendering = true;
    isPaused = false;
    startButton.innerHTML = '<i class="bi-pause-fill"></i>';
    tileLayer.on('postrender', moveBoats);
    map.render();
}

function pauseAnimation() {
    rendering = false;
    isPaused = true;
    startButton.innerHTML = '<i class="bi-play-fill"></i>';
}

function resetAnimation() {
    pauseAnimation();
    timelineInput.value = raceStartTimestamp;
    tileLayer.un('postrender', moveBoats);

    boats.forEach(boat => {
        boat.drag.reset();
        boat.start = false;
    });
}

function moveBoats(event) {
    // increase current timestamp
    if(!isPaused) {
        const speed = Number(speedInput.value);
        timelineInput.value = Number(timelineInput.value) + speed * 1000; // 1000 multiplication to convert ms to s
        const date = new Date(Number(timelineInput.value));
        dateText.innerText = date.toLocaleString(globalThis.navigator.language)
    }

    // loop over boats
    const vectorContext = getVectorContext(event);
    boats.forEach(boat => {
        // fetch boat position at new timestamp
        const newCoordinates = boat.getPosition(timelineInput.value);
        if(newCoordinates) {
            boat.start = true;

            // update boat position
            boat.geometry.setCoordinates(newCoordinates);

            // add point to boat line
            boat.drag.addPoint(newCoordinates);

            // follow boat
            if(followInput.value === boat.name) {
                map.getView().setCenter(newCoordinates);
            }
        }

        if(boat.start) {
            if(!displayOnlyTrackedInput.checked || boat.name === followInput.value) {
                // draw boat marker
                vectorContext.setStyle(boat.style);
                vectorContext.drawGeometry(boat.geometry);

                // draw boat line
                vectorContext.setStyle(boat.drag.style);
                vectorContext.drawGeometry(boat.drag.getGeometry());
            }
        }
    })

    // update zoom
    map.getView().setZoom(zoomInput.value);

    // tell OpenLayers to continue the postrender animation
    map.render();
}

teamInput.addEventListener('change', function () {
    resetAnimation();

    followInput.innerHTML = "<option class=\"default\" value=\"null\" selected></option>";
    boats = [];

    fetch('data/teams/' + teamInput.value + '.json')
        .then(res => res.json())
        .then(res => res.sort(function(a, b) {
            return a.name.localeCompare(b.name);
        }))
        .then(boatOptions => {
            for (const boatOption of boatOptions) {
                const boat = new Boat(boatOption.name, boatOption.color, boatOption.trace);
                boats.push(boat);

                const opt = document.createElement('option');
                opt.value = boat.name;
                opt.innerHTML = boat.name;
                followInput.appendChild(opt);
            }
            return boats
        })
        .then(() => startAnimation())
});

startButton.addEventListener('click', function () {
    if (rendering) {
        pauseAnimation();
    } else {
        startAnimation();
    }
});

resetButton.addEventListener('click', function () {
    resetAnimation();
});

fullScreen.addEventListener('click', function () {
    const elem = document.getElementById("main")

    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
    }
});

