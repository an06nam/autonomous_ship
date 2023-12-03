import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, LayerGroup, Polyline } from 'react-leaflet';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Leafl } from 'react-leaflet'
import useStore from '../../helpers/store'
import cv from '../../services/cv'
import L from 'leaflet'
import leafletImage from 'leaflet-image'
import { data } from 'autoprefixer'
import React from "react";

const RadarRedMap = () => {
    //console.log("==Filter map re render")
    let redMap = useStore(state => state.radarMap)
    let redMarkerLayer = useStore(state => state.radarMarkerLayer)
    let redRouteLayer = useStore(state => state.radarRouteLayer)
    let startPos = useStore(state => state.currentPosition)
    let destPos = useStore(state => state.destinationPosition)
    let savedPath = useStore(state => state.aPath)
    let northEast = useStore(state => state.northEast)
    let southWest = useStore(state => state.southWest)
    let [processing, updateProcessing] = useState(false)
    const lowerRedMap = useRef()
    const legends = useRef()
    const TileSize = useStore.getState().TileSize
    

    const[autoSize, setSize] = useState({height: '100', width: '100'})

    function checkAvaliabe(array, index) {
        for(let i=0; i < array.length ;i++){
            if(array[i].x == index.x && array[i].y == index.y){
            return true
            }
        }
        return false
    }

    return (
    <div>
        <canvas ref={lowerRedMap} {...autoSize}></canvas>
        <canvas ref={legends} {...autoSize}></canvas>
        
    </div>
    )
}

export default RadarRedMap;