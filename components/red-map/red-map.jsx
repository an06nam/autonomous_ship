import leafletImage from "leaflet-image";
import React, { useState } from "react";
import { drawRadarIndicator, generatePathData, pathToCoordinate, turnRedMap } from '../radar/map-helper';
import cv from '../../services/cv'
import {coordinateToPixel} from '../radar/map-helper'
import { motion } from "framer-motion";
import { FiSettings } from "react-icons/fi";
import { useEffect } from "react";

const Status = {
    start: {text: 'Processing Map', index: 0}, 
    inProcess: {text: 'Generate Autonomus Path', index: 1}, 
    finish: {text: 'Finished Render', index: 2}
}

const RedMap = ({map, layers, onResult, onStatus, triggerRender, realTimeBy, boatManager, ...props}) => {

    const mapRef = React.useRef()
    const [autoSize, setSize] = React.useState({height: '100%', width: '100%'})
    const [_status, setStatus] = React.useState(Status.start)
    const [_tiles, setTiles] = React.useState([])
    const [mapImageData, setMapImage] = React.useState(null)
    const [activateRecalulate, setActivateRecalulate] = React.useState(false)
    const [activateReturnPath, setActivateReturnPath] = React.useState(false)

    const removeLayers = async () => layers.map(l => map.removeLayer(l))
    const addLayers = async () => layers.map(l =>map.addLayer(l))

    useEffect(() => {
        setBoatManagerTriggers()
    }, [])

    function setBoatManagerTriggers(){
        boatManager.on('recalculate', () => {
            // console.log("Recalculate by recaluclate emit")
            setActivateRecalulate(prefix => !prefix)
        })

        boatManager.on('move', () => {
            // console.log("Recalculate by move emit")
            // setActivateRecalulate(prefix => !prefix)
            if(boatManager.autoDrive){
                setActivateReturnPath(prefix => !prefix)
            }else{
                setActivateRecalulate(prefix => !prefix)
            }
        })
    }

    function replaceStartAndEndTile(path){
        let curPos = boatManager.curPos
        let destPos = boatManager.destPos
        path[0] = destPos
        path[path.length - 1] = curPos
        return path
    }

    const generatePath = async (imageData) => {
        const startPos = boatManager.curPos
        const destPos = boatManager.destPos
        const TileSize = boatManager._tileSize

        let result = await generatePathData(startPos, destPos, TileSize, map, imageData)
        result.path = replaceStartAndEndTile(result.path)
        return result
    }

    const recalculatePath = async (imageData) => {
        let processedImage = imageData
        
        // if (_status.index != 2) return// 2 means map should be finisih rendered

        const startPos = boatManager.curPos
        const destPos = boatManager.destPos
        const TileSize = boatManager._tileSize
        const savedBoundaries = boatManager._boundaries
        

        const {from, to} = coordinateToPixel(startPos, destPos, processedImage, savedBoundaries)

        const {data: {payload: {aPath}}} = await cv.recalculatePath({tiles: _tiles, from: from, to: to, tileSize: TileSize, imageData: processedImage})

        const pixelPath = aPath.map(tile => tile.index)
        // console.log(savedBoundaries)

        let longlatPath = pathToCoordinate(pixelPath, processedImage, TileSize, savedBoundaries)
        longlatPath = replaceStartAndEndTile(longlatPath)

        return {path: longlatPath, tiles: _tiles, boundaries: savedBoundaries, imageData: processedImage}
        //console.log("XXXUPDATE aPath pixelBoatPosition")
        
    }

    const mapToCanvas = (map) => {
        leafletImage(map, async (err, canvas) => {
            var ctx = mapRef.current.getContext('2d')
            var dimensions = map.getSize()
            setSize({height: dimensions.y, width: dimensions.x})

            // get map in canvas 2d from leaflet image
            var _canvasMap = canvas.getContext('2d')
            var imageData = _canvasMap.getImageData(0, 0, dimensions.x, dimensions.y)

            boatManager._processedImage = imageData
            setMapImage(imageData)

            // await turnRedMap(ctx, imageData)
            if (onResult) {
                setStatus(Status.inProcess)

                const result = await generatePath(imageData)

                // save tiles
                setTiles(result.tiles)

                ctx.clearRect(0,0,canvas.width,canvas.height)
                ctx.putImageData(result.imageData, 0, 0)

                onResult(result)

                setStatus(Status.finish)
            } else {
                ctx.clearRect(0,0,canvas.width,canvas.height)
                ctx.putImageData(imageData, 0, 0)

                setStatus(Status.finish)
            }
        })
    }

    React.useEffect(() => {
        if (map && layers.length > 0) {
            // hide for render red map
            removeLayers()
            mapToCanvas(map)
            // console.log(map)
            // show layers map
            addLayers()
        }
    }, [map, layers])

    React.useEffect(() => {
        if (map) {
            setStatus(Status.start)
            mapToCanvas(map)
            // console.log(map)
        }        
    }, [triggerRender])

    React.useEffect(async () => {
        var ctx = mapRef.current.getContext('2d')
        if (map && boatManager._boundaries != null) {
            const result = await recalculatePath(mapImageData)
            onResult(result)
        }
    }, [activateRecalulate])

    React.useEffect(async () => {
        var ctx = mapRef.current.getContext('2d')
        if (map) {
            let currentPath = replaceStartAndEndTile(boatManager._aPath)
            let result = {path: currentPath}
            onResult(result)
        }
    }, [activateReturnPath])

    React.useEffect(() => {
        onStatus(_status)
    }, [_status])

    return (
        <div className="w-full h-full absolute">
            <motion.div style={{top: -50}} className="absolute z-50 shadow-xl rounded-br left-0 bg-white flex p-2 items-center" 
                animate={_status == Status.finish ? { top: -50 } : { top: 0 }}
                transition={{ duration: 0.5 }}>
                <FiSettings className="mr-3 animate-spin" /><span className="text-sm">{_status.text}</span>
            </motion.div>
            <canvas className="pointer-events-none absolute z-0" ref={mapRef} {...autoSize}></canvas>
        </div>
    )
}

export default RedMap;