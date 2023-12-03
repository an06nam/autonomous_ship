import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, LayerGroup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import "leaflet-defaulticon-compatibility";
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import L from "leaflet"
import useStore from '../../helpers/store';
import React from "react";
import DriftMarker from "leaflet-drift-marker";
import RedMap from '../red-map/red-map';
import { motion } from 'framer-motion';
import { drawRadar } from './map-helper';
import TopRightIndicator from './topRightIndicator';


let marker = null

const RadarMap = ({serialControl, boatManager, animatedBoatManager, ...props}) => {
    //console.log("==Live map re render")
    const [localCurPos, setCurPos] = React.useState({lat: 0, lng: 0})
    const [boatAngle, setBoatAngle] = React.useState(0)
    // const [localNpcShipLoc, setNpcShipLoc] = React.useState({lat: 0, lng: 0})
    
    let shipsLayer = React.useRef();
    let animatedShipsLayer = React.useRef();
    let zoomPower = 14
    const radarCanvas = React.useRef(null)
    const frame = React.useRef(null)

    // const [currentNpcShips, setCurrentNpcShips] = React.useState([])
    // const [currentMovingNpcShips, setCurrentMovingNpcShips] = React.useState([])
    
    const NPCBoatIcon = new L.icon({
        iconUrl: "./markerIcons/otherBoat-icon.png",
        iconSize: new L.Point(10, 20)
    });

    let mapRef = React.useRef();
    const [map, setMap] = React.useState(null)
    const [autoSize, setSize] = React.useState({height: '100%', width: '100%'})

    useEffect(() =>{
        // console.log("Run on radar use effect")
        setBoatManagerTriggers()
        addListenerMovingNPCBoat()
        addListenerNPCBoatMovement()
        addListenerMovingBoatShowHide()
        handleDataBoatMove()
        
        if(!boatManager.activateDataListener){
            setCurPos(boatManager.curPos)
            setBoatAngle(0)
            // boatManager.localSyncronize("EngineIndicator")
        }else{
            boatManager.requestSyncronize("Radar")
        }
        
    }, [])

    const setMapReference = (map) => {
        mapRef.current = map
        mapRef.current.addLayer(shipsLayer.current)
        mapRef.current.addLayer(animatedShipsLayer.current)
        setMap(map)
        animatedBoatManager.resetRadarMarker()
        instInitLoc(animatedBoatManager.autoNPCBoatRoute)
        boatManager.resetRadarObstacle()

        if(marker) return
        map.setView([localCurPos.lat, localCurPos.lng])
        map.eachLayer(l => console.log(l.options.pane))
        
    }

    const instInitLoc = (data) =>{
        // console.log("Init radar animated marker")
        let markers = []
        for(let i = 0; i < data.length; i++){
            // console.log(i)
            let curPos = data[i][0]
            // console.log(curPos)
            let tempMarker = new DriftMarker([curPos.lat, curPos.lng], {
                icon: NPCBoatIcon,
                draggable: false,
            });    
            animatedShipsLayer.current.addLayer(tempMarker);
            markers.push(tempMarker)
        }
        animatedBoatManager.setRadarMarker(markers)
    }

    
    function setBoatManagerTriggers(){
        boatManager.on('move', (data) => {
            moveBoat(data)
        })

        boatManager.on('addObstacle', (data) => {
            // console.log("Add obstacle from emit")
            addObstacle(data)
        })

        boatManager.on('removeObstacle', (data) => {
            removeObstacle(data)
        })
    }

    const addListenerMovingBoatShowHide = () => {
        animatedBoatManager.on('showHideAnimatedBoat', (data) => {
            handleMovingBoatShowHide(data)
        })
    }
    
    const addListenerNPCBoatMovement = () => {
        animatedBoatManager.on('moveNPCMarker', (data) => {
            if(boatManager.activateDataListener) return
            // console.log("Emit from animatedboat")
            handleNPCBoatMovement(data)
        })
    }

    const addListenerMovingNPCBoat = () => {
        animatedBoatManager.on('addMovingShip', (data) => {
            // addMovingNPCBoat(data)
        })
    }

    const handleDataBoatMove = () => {
        serialControl.on('data', (data) => {
            const {command} = data
            if(command == null || !boatManager.activateDataListener) return
            switch(command){
                case "move":
                    moveBoat(data)
                    break
                case "addObstacle":
                    addObstacle(data)
                    break
                case "removeObstacle":
                    removeObstacle()
                    break
                case "showHideAnimatedBoat":
                    handleMovingBoatShowHide(data)
                    break
                case "moveNPCMarker":
                    // console.log("Emit from data")
                    handleNPCBoatMovement(data)
                    break
                case "addMovingShip":
                    // addMovingNPCBoat(data)
                    break
                case "syncObstacle":
                    syncObstacle(data)
                    break
            }
        })
    }

    const moveBoat = (data) =>{
        const {curPos, boatAngle} = data
        if (mapRef.current) {
            mapRef.current.setView(curPos)
        }
        setBoatAngle(boatAngle)
    }

    const addObstacle = (data) =>{
        const {npcShipLocations} = data
            if(npcShipLocations == null || boatManager.radarStaticObstacle.length == npcShipLocations.length || shipsLayer.current == null) return     
            if(boatManager.radarStaticObstacle.length < npcShipLocations.length){
                //Add one stuff
                let newPos = npcShipLocations[npcShipLocations.length - 1]
                let tempMarker = new DriftMarker([newPos.lat, newPos.lng], {
                    icon: NPCBoatIcon,
                    draggable: false,
                });
                shipsLayer.current.addLayer(tempMarker);
                boatManager.addRadarObstacle(tempMarker)
            }
    }

    const syncObstacle = (data) =>{
        // console.log("Sync obstacle called")
        const {npcShipLocations} = data
        if(npcShipLocations == null || shipsLayer.current == null) return    
        for(let i = 0; i < npcShipLocations.length; i++){
            let newPos = npcShipLocations[i]
            let tempMarker = new DriftMarker([newPos.lat, newPos.lng], {
                icon: NPCBoatIcon,
                draggable: false,
            });
            shipsLayer.current.addLayer(tempMarker);
            boatManager.addRadarObstacle(tempMarker)
        }
    }

    const removeObstacle = () =>{
        if(shipsLayer.current == null) return
        for(let i = 0; i < boatManager.radarStaticObstacle.length ;i++){
            shipsLayer.current.removeLayer(boatManager.radarStaticObstacle[i])
        }
        boatManager.resetRadarObstacle()
    }

    const handleMovingBoatShowHide = (data) => {
        const {show} = data
        if(show == null || mapRef.current == null || animatedShipsLayer.current == null) return
        if(show){
            mapRef.current.addLayer(animatedShipsLayer.current)
        }else{
            mapRef.current.removeLayer(animatedShipsLayer.current)
        }
    }

    const handleNPCBoatMovement = (data) =>{
        const {movingBoats} = data
        if(movingBoats == null || movingBoats.length != 10 ) return
        let markers = animatedBoatManager.RadarMarkers
        // console.log(markers.length)
        if(markers.length != movingBoats.length){
            initializeMovingNpcBoat(movingBoats)
        }else{
            setPosMovingNpcBoat(movingBoats)
        }
    }

    const initializeMovingNpcBoat = (movingBoats) =>{
        let NPCMovingBoats = []
        console.log("Init moving npc boat.")
        console.log(movingBoats)
        for(let i=0; i < movingBoats.length; i++){
            console.log("Loop " + (i+1))
            const {curPos, angle} = movingBoats[i]
            let tempMarker = new DriftMarker([curPos.lat, curPos.lng], {
                icon: NPCBoatIcon,
                draggable: false,
            });    
            animatedShipsLayer.current.addLayer(tempMarker);
            if(angle != null) tempMarker.setRotationAngle(-angle)
            NPCMovingBoats.push(tempMarker)
        }
        console.log(NPCMovingBoats)
        animatedBoatManager.setRadarMarker(NPCMovingBoats)
    }

    const setPosMovingNpcBoat = (movingBoats) =>{
        for(let i=0; i < movingBoats.length; i++){
            const {curPos, angle} = movingBoats[i]
            let markers = animatedBoatManager.RadarMarkers
            let tempNPCShip = markers[i]
            tempNPCShip.slideTo([(curPos.lat), (curPos.lng)], {
                duration: 1,
            });
            if(angle != null) tempNPCShip.setRotationAngle(-angle)
        }
    }


    const addMovingNPCBoat = (data) => {
        console.log("Add moving boat run")
        const {index, curPos} = data
        if(index == null || curPos == null || animatedShipsLayer.current == null || animatedBoatManager.RadarMarkers.length > 10) return
        console.log(index)
        let tempCurrentMovingShips = animatedBoatManager.RadarMarkers
        let tempMarker = new DriftMarker([curPos.lat, curPos.lng], {
            icon: NPCBoatIcon,
            draggable: false,
        });    
        animatedShipsLayer.current.addLayer(tempMarker);
        tempCurrentMovingShips.push(tempMarker)
        animatedBoatManager.setRadarMarker(tempCurrentMovingShips)
    }

    useEffect(() => {
        const ctx = radarCanvas.current.getContext('2d')
        // draw radar indicator
        const frameHeight = frame.current.clientHeight
        const frameWidth = frame.current.clientWidth
        
        setSize({height: frameHeight, width: frameWidth})
        const imageData = ctx.getImageData(0, 0, frameWidth, frameHeight)
        ctx.clearRect(0,0, frameWidth, frameHeight)

        drawRadar(ctx, imageData)

        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.fillStyle = 'purple'
        ctx.arc(imageData.width/2, imageData.height/2, 5, 0, 2 * Math.PI);
        ctx.fill()

        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'white'
        ctx.moveTo(imageData.width/2, imageData.height/2)
        ctx.lineTo(imageData.width/2, -imageData.height);
        ctx.stroke()

        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'purple'
        ctx.moveTo(imageData.width/2, imageData.height/2)
        ctx.lineTo(imageData.width/2, imageData.height/2 - (imageData.height/4));
        ctx.stroke()
    }, [radarCanvas.current])

    return (
        <div ref={frame} className="w-full h-full relative">
            {/* <RedMap className="absolute z-50" map={map} layers={layers} /> */}
            <motion.div className="absolute" style={{transform: `rotate(0deg)`, width: '300%', height: '300%', top: '-100%', left: '-100%'}}
                animate={{ transform: `rotate(${boatAngle}deg)`}}
                transition={{ duration: 0.001 }}>
                <MapContainer zoomControl={false} attributionControl={false} whenCreated={setMapReference} renderer={L.canvas()} preferCanvas={true} dragging={false} center={localCurPos} zoom={zoomPower} scrollWheelZoom={false} style={{height: "100%", width: "100%"}}>
                    <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="Base Map">
                            <TileLayer
                                // attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                        </LayersControl.BaseLayer>
                    </LayersControl>

                    <LayersControl.Overlay name="Ships" >
                        <LayerGroup ref={shipsLayer}>
                        </LayerGroup>
                    </LayersControl.Overlay>

                    <LayersControl.Overlay name="AnimatedShips" >
                        <LayerGroup ref={animatedShipsLayer}>
                        </LayerGroup>
                    </LayersControl.Overlay>
                </MapContainer>
            </motion.div>
            <canvas ref={radarCanvas} {...autoSize} className="absolute z-40"></canvas>
            <TopRightIndicator boatManager={boatManager} serialControl={serialControl}/>
        </div>
    )
}
export default RadarMap;