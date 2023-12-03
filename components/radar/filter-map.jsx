import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, LayerGroup, Polyline } from 'react-leaflet';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Leafl } from 'react-leaflet'
import useStore from '../../helpers/store'
import cv from '../../services/cv'
import leafletImage from 'leaflet-image'
import React from "react";
import { drawPath, coordinateToPixel, drawRadarIndicator, pathToCoordinate, drawRadar, turnRedMap } from './map-helper';
import { FiSettings } from 'react-icons/fi';
import { motion } from "framer-motion"
import RedMap from '../red-map/red-map';

const Status = {
    start: {text: 'Starting', index: 0}, 
    inProcess: {text: 'Processing Map', index: 1}, 
    finish: {text: 'Finish Rendered', index: 2}
}

const FilterMap = ({isCenter}) => {
    //console.log("==Filter map re render")
    let map = useStore(state => state.map)
    let markerLayer = useStore(state => state.markerLayer)
    let routeLayer = useStore(state => state.routeLayer)
    let shipsLayer = useStore(state => state.shipsLayer)

    let redMap = useStore(state => state.radarMap)
    let redMarkerLayer = useStore(state => state.radarMarkerLayer)
    let redRouteLayer = useStore(state => state.radarRouteLayer)

    let startPos = useStore(state => state.currentPosition)
    let destPos = useStore(state => state.destinationPosition)
    let savedPath = useStore(state => state.aPath)
    let savedBoundaries = useStore(state => state.savedBoundaries)
    
    let [processing, updateProcessing] = useState(false)
    const lowerMap = useRef()
    const legends = useRef()
    const TileSize = useStore.getState().TileSize

    const [canvasRedMap, setCanvasRedMap] = useState(null)
    

    const[autoSize, setSize] = useState({height: '100', width: '100'})

    function checkAvaliabe(array, index) {
        for(let i=0; i < array.length ;i++){
            if(array[i].x == index.x && array[i].y == index.y){
            return true
            }
        }
        return false
    }

    const [_status, setStatus] = React.useState(Status.start)
    const [isRendered, setFinishRendered] = React.useState(false)
    // handle status
    useEffect(() => {
        
    }, [isRendered])

    // useEffect(async () => {
    //     console.log("Setup starter map called")
    //     // console.log(map)
    //     if (map) {
    //         console.log("Thid is use effect")
    //         //updateProcessing(true)
    //         map.removeLayer(markerLayer)
    //         map.removeLayer(routeLayer)
    //         leafletImage(map, async (err, canvas) => {
    //             setCanvasRedMap(canvas)

    //             var ctx = lowerMap.current.getContext('2d')
    //             // var ctxLegends = legends.current.getContext('2d')
    //             var dimensions = map.getSize()
    //             const northEast = map.getBounds()._northEast
    //             const southWest = map.getBounds()._southWest
    //             const boundaries = {northEast: northEast, southWest: southWest}

    //             setSize({height: dimensions.y, width: dimensions.x})

    //             // get images from map canvas
    //             // draw image into display canvas
    //             setStatus(Status.inProcess)
    //             await ctx.drawImage(canvas, 0, 0, dimensions.x, dimensions.y)
    //             const imageData = ctx.getImageData(0, 0, dimensions.x, dimensions.y)
    //             // Make lat lan coord to pixel
    //             const {from, to} = coordinateToPixel(startPos, destPos, imageData, boundaries)
    //             await cv.load()

    //             //Make image red and calculate weight
    //             const {data: {payload: {result, tilePath, tiles}}} = await cv.imageProcessing({map: imageData, from: from, to: to, tileSize: TileSize})//, TileSize, mapStartPos, mapDestPos])
    //             // save tiles
    //             setStatus(Status.finish)
    //             // let processedImage = getImg.data.payload[0]
    //             // console.log(processedImage)
    //             // let Tiles = getImg.data.payload[1]
    //             // let TileStartPos = getImg.data.payload[2]
    //             // let TileEndPos = getImg.data.payload[3]
    //             // let aPath = getImg.data.payload[4]
    //             // let redMapDimesions = getImg.data.payload[5]
    //             // let startIndex = getImg.data.payload[6]
    //             // let radarApath = getImg.data.payload[7]
    //             // useStore.setState({
    //             //     Tiles: Tiles,
    //             //     processedImage: processedImage,
    //             //     northEastBounds: northEast,
    //             //     southWestBounds: southWest,
    //             //     redMapDimesions: redMapDimesions,
    //             //     pixelBoatPosition: startIndex,
    //             // })
    //             // //Put red image
    //             ctx.clearRect(0,0,canvas.width,canvas.height)
    //             ctx.putImageData(result, 0, 0)

    //             // //Print lines and weight
    //             const imageWidth = result.width
    //             const imageHeight = result.height

    //             // draw tiles repeat for each tiles
    //             // drawTiles(ctx, result, TileSize, tiles)

    //             // //console.log(aPath)
    //             // //console.log(northEast)
    //             // //console.log(southWest)
                
    //             //aPath[0] = [mapStartPos.lng, mapStartPos.lat]
    //             //aPath[aPath.length-1] = [mapDestPos.lng, mapDestPos.lat]
    //             /*let turningPoint = []
    //             for(let i = 1; i < aPath.length-1; i++){
    //                 let diff1 = {x: Math.abs(aPath[i].x - aPath[i-1].x), y: Math.abs(aPath[i].y - aPath[i-1].y)}
    //                 let diff2 = {x: Math.abs(aPath[i].x - aPath[i+1].x), y: Math.abs(aPath[i].y - aPath[i+1].y)}
    //                 if(diff1.x > 1 || diff1.y > 1 || diff2.x > 1 || diff2.y > 1) continue
    //                 if(diff1.x != diff2.x || diff1.y != diff2.y){
    //                 turningPoint.push(i)
    //                 }
    //             }*/

    //             drawPath(ctx, tilePath, TileSize)
    //             // set status render is finished
    //             setFinishRendered(true)

    //             // for (let i = 0; i < radarApath.length; i++){
    //             //     if(!radarApath[i]){
    //             //         continue
    //             //     }
                    
    //             //     ctx.beginPath();
    //             //     ctx.lineWidth = "1";
    //             //     ctx.strokeStyle = "blue";
    //             //     ctx.rect(radarApath[i].x * TileSize, radarApath[i].y * TileSize, TileSize, TileSize);  
    //             //     ctx.stroke();

    //             // }
    //             // let rectSize = TileSize
    //             // let rectOffset = rectSize / 2

    //             // ctx.beginPath();
    //             // ctx.lineWidth = "1";
    //             // ctx.fillStyle = "blue";
    //             // ctx.fillRect(TileStartPos.x, TileStartPos.y , rectSize, rectSize);  
    //             // ctx.stroke();

    //             // ctx.beginPath();
    //             // ctx.lineWidth = "1";
    //             // ctx.fillStyle = "green";
    //             // ctx.fillRect(TileEndPos.x, TileEndPos.y, rectSize, rectSize);  
    //             // ctx.stroke();
                
    //             // //console.log('image processing is done');
    //             const pixelPath = tilePath.map(tile => tile.index)
    //             const longlatPath = pathToCoordinate(pixelPath, result, TileSize, boundaries)
                
    //             useStore.setState({
    //                 aPath: longlatPath,
    //                 processedImage: result,
    //                 Tiles: tiles,
    //                 savedBoundaries: boundaries,
    //             })
    //         })
    //         map.addLayer(markerLayer)
    //         map.addLayer(routeLayer)            
    //     }
    // }, [map])

    // useEffect(() => {
    //     if (map) {
    //         map.removeLayer(markerLayer)
    //         map.removeLayer(routeLayer)
    //         leafletImage(map, async (err, canvas) => {
    //             setCanvasRedMap(canvas)
    //             var ctx = lowerMap.current.getContext('2d')
    //             var dimensions = map.getSize()
    //             setSize({height: dimensions.y, width: dimensions.x})

    //             await turnRedMap(ctx, canvas, map.getSize())
    //         })
    //     }
    // }, [map])

    
    useEffect(async () => {
        let processedImage = useStore.getState().processedImage
        let tiles = useStore.getState().Tiles
        
        if (_status.index != 2) return// 2 means map should be finisih rendered

        startPos = useStore.getState().currentPosition
        destPos = useStore.getState().destinationPosition

        const {from, to} = coordinateToPixel(startPos, destPos, processedImage, savedBoundaries)
        const {data: {payload: {aPath}}} = await cv.recalculatePath({tiles: tiles, from: from, to: to, tileSize: TileSize, imageData: processedImage})
        
        var ctx = lowerMap.current.getContext('2d')

        const {forwardDirection, leftDirection, rightDirection} = useStore.getState(s => {s.forwardDirection, s.leftDirection, s.rightDirection})
        // console.log({forwardDirection, leftDirection, rightDirection})
        drawRadarIndicator(ctx, startPos, destPos, TileSize, {forward: forwardDirection, left: leftDirection, right: rightDirection})
        
        let pixelPath = aPath.map(tile => tile.index)

        if (pixelPath.length > 2) {
            const lastPixelPath = pixelPath[0]
            const last1PixelPath = pixelPath[1]
    
            const addNewLastPath = {x: lastPixelPath.x + (lastPixelPath.x - last1PixelPath.x), y: lastPixelPath.y + (lastPixelPath.y - last1PixelPath.y)}
            pixelPath = [addNewLastPath, ...pixelPath]
        }

        const longlatPath = pathToCoordinate(pixelPath, processedImage, TileSize, savedBoundaries)

        const startIndex = pixelPath[pixelPath.length-1]
        //console.log("XXXUPDATE aPath pixelBoatPosition")
        useStore.setState({
            aPath: longlatPath,
            pixelBoatPosition: startIndex,
        })
    }, [useStore.getState().activateAstar])

    // useMemo(async () => {
    //     //console.log("Update radar curPos === Trigger activeAstar")
    //     let processedImage = useStore.getState().processedImage
    //     let Tiles = useStore.getState().Tiles
    //     //let isCurrentlyProgressing = useStore.getState().processingRadar
    //     if (processedImage && Tiles) {
    //         //console.log("Access allowed")
    //         //updateProcessing(true)
    //         //useStore.setState({
    //         //    processingRadar: true
    //         //})
    //         map.removeLayer(markerLayer)
    //         map.removeLayer(routeLayer)
    //         leafletImage(map, async (err, canvas) => {
    //             var ctx = lowerMap.current.getContext('2d')
    //             var ctxLegends = legends.current.getContext('2d')
                
    //             startPos = useStore.getState().currentPosition
    //             destPos = useStore.getState().destinationPosition
                
    //             //Make lat lan coord to pixel
    //             //let northEast = map.getBounds()._northEast
    //             //let southWest = map.getBounds()._southWest
    //             let mapStartPos = {lat: 0, lng: 0}
    //             let mapDestPos = {lat: 0, lng: 0}
    //             mapStartPos.lat = (startPos.lat - northEast.lat) / (southWest.lat - northEast.lat) * processedImage.height
    //             mapStartPos.lng = (startPos.lng - southWest.lng) / (northEast.lng - southWest.lng) * processedImage.width
                
    //             mapDestPos.lat = (destPos.lat - northEast.lat) / (southWest.lat - northEast.lat) * processedImage.height
    //             mapDestPos.lng = (destPos.lng - southWest.lng) / (northEast.lng - southWest.lng) * processedImage.width
                
    //             //await cv.load()

    //             //Make image red and calculate weight
    //             //console.log(mapStartPos)
    //             //console.log(mapDestPos)
    //             const getImg = await cv.singleAStar([Tiles, mapStartPos, mapDestPos, TileSize, processedImage])
    //             let aPath = getImg.data.payload[0]
    //             let TileStartPos = getImg.data.payload[1]
    //             let TileEndPos = getImg.data.payload[2]
    //             let startIndex = getImg.data.payload[3]
    //             let radarApath = getImg.data.payload[4]
                
    //             //Print lines and weight
    //             const imageWidth = processedImage.width
    //             const imageHeight = processedImage.height
    //             let iIdx = 0

    //             ctx.clearRect(0,0,canvas.width,canvas.height)
    //             ctx.putImageData(processedImage, 0, 0)
                
    //             //clear saved path
    //             let savedPath = []
    //             //aPath[0] = [mapStartPos.lng, mapStartPos.lat]
    //             //aPath[aPath.length-1] = [mapDestPos.lng, mapDestPos.lat]
    //             for (let i = 0; i < aPath.length; i++){
    //                 if(!aPath[i]){
    //                     continue
    //                 }
    //                 let realPos = {lat: (aPath[i].y * TileSize) + TileSize/2, lng: (aPath[i].x * TileSize) + TileSize/2}
    //                 realPos.lat = ((realPos.lat) / (processedImage.height) * (southWest.lat - northEast.lat)) + northEast.lat
    //                 realPos.lng = ((realPos.lng) / (processedImage.width) * (northEast.lng - southWest.lng)) + southWest.lng
    //                 savedPath.push([realPos.lat, realPos.lng])
    //             }

    //             for (let i = 0; i < radarApath.length; i++){
    //                 if(!radarApath[i]){
    //                     continue
    //                 }
    //                 ctx.beginPath();
    //                 ctx.lineWidth = "1";
    //                 ctx.strokeStyle = "blue";
    //                 ctx.rect(radarApath[i].x * TileSize, radarApath[i].y * TileSize, TileSize, TileSize);  
    //                 ctx.stroke();
    //             }

    //             let rectSize = TileSize
    //             let rectOffset = rectSize / 2

    //             let fowardDir = useStore.getState().fowardDirection
    //             ctx.beginPath();
    //             ctx.lineWidth = "1";
    //             ctx.fillStyle = "red";
    //             ctx.fillRect(TileStartPos.x + (TileSize * fowardDir.x ), TileStartPos.y + (TileSize * fowardDir.y ), rectSize, rectSize);  
    //             ctx.stroke();

    //             let leftDir = useStore.getState().leftDirection
    //             ctx.beginPath();
    //             ctx.lineWidth = "1";
    //             ctx.fillStyle = "yellow";
    //             ctx.fillRect(TileStartPos.x + (TileSize * leftDir.x ), TileStartPos.y + (TileSize * leftDir.y ), rectSize, rectSize);  
    //             ctx.stroke();

    //             let rightDir = useStore.getState().rightDirection
    //             ctx.beginPath();
    //             ctx.lineWidth = "1";
    //             ctx.fillStyle = "brown";
    //             ctx.fillRect(TileStartPos.x + (TileSize * rightDir.x ), TileStartPos.y + (TileSize * rightDir.y ), rectSize, rectSize);  
    //             ctx.stroke();

    //             ctx.beginPath();
    //             ctx.lineWidth = "1";
    //             ctx.fillStyle = "blue";
    //             ctx.fillRect(TileStartPos.x, TileStartPos.y , rectSize, rectSize);  
    //             ctx.stroke();

    //             ctx.beginPath();
    //             ctx.lineWidth = "1";
    //             ctx.fillStyle = "green";
    //             ctx.fillRect(TileEndPos.x, TileEndPos.y, rectSize, rectSize);  
    //             ctx.stroke();
                
    //             //console.log("XXXUPDATE aPath pixelBoatPosition")
    //             useStore.setState({
    //                 aPath: savedPath,
    //                 pixelBoatPosition: startIndex,
    //             })
    //             //console.log(savedPath[1])
    //             //console.log('image processing is done');
    //         })
    //         map.addLayer(markerLayer)
    //         map.addLayer(routeLayer)
    //     }
    // }, [useStore.getState().activateAstar])

    return (
    <div className="h-full w-full relative overflow-hidden">
        <motion.div style={{top: -50}} className="absolute shadow-xl rounded-br left-0 bg-white flex p-2 items-center" 
            animate={_status == Status.finish ? { top: -50 } : { top: 0 }}
            transition={{ duration: 0.5 }}>
            <FiSettings className="mr-3 animate-spin" /><span className="text-sm">{_status.text}</span>
        </motion.div>
        {/* <RedMap map={map} layers={[markerLayer,
            routeLayer,
            shipsLayer]} /> */}
        {/* <canvas ref={lowerMap} {...autoSize}></canvas> */}
        {/* <canvas ref={legends} {...autoSize}></canvas> */}
    </div>
    )
}

export default FilterMap;