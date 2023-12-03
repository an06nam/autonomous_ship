import { MapContainer, TileLayer, Marker, Popup, LayersControl, LayerGroup, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import "leaflet-defaulticon-compatibility";
import { useEffect, useMemo, useState } from 'react';
import L from "leaflet"
import React from "react";
import DriftMarker from "leaflet-drift-marker";
import "leaflet-rotatedmarker";
import RedMap from '../red-map/red-map';
import BoatControl from '../boat-control/boat-control';
import Toolbars from './toolbars';
import { MdLocalGasStation } from 'react-icons/md';
import AlertManager from '../../events/alert/alert-manager';

const speed = 30 //Kmph
const direction = 0
let focusOnBoat = false

const alertManager = new AlertManager()

const LiveMap = ({serialControl, boatManager, animatedBoatManager, ...props}) => {
    //console.log("==Live map re render")
    let curPos =  boatManager.curPos
    let destPos = boatManager.destPos
    // console.log([curPos, destPos])
    let centerPoint = {lat: (curPos.lat + destPos.lat)/2, lng: (curPos.lng + destPos.lng)/2}
    let zoomPower = 12

    let mapRef = React.useRef();
    let iconsLayer = React.useRef();
    let routeLayer = React.useRef();
    let shipsLayer = React.useRef();
    let animatedShipsLayer = React.useRef();
    const routeOptions = { color: 'red' }
    let boatRotation = 0

    const [map, setMap] = useState(null)
    const [layers, setLayers] = useState([])
    const [aPath, setAPath] = useState([])
    const [animatedObstacleBoats, setAnimatedObstacleBoats] = useState([])
    const [pointMarkers, setMarkers] = useState({boat: null, dest: null})
    
    const playerBoatIcon = new L.icon({
        iconUrl: "./markerIcons/marker-icon.png",
        iconSize: new L.Point(10, 20)
    });

    const NPCBoatIcon = new L.icon({
        iconUrl: "./markerIcons/otherBoat-icon.png",
        iconSize: new L.Point(10, 20)
    });

    const setMapReference = (map) => {
        console.log("Run on map created")
        //if(boatMarker) return
        serialControl.sendCode('INIT')
        mapRef.current = map
        mapRef.current.addLayer(iconsLayer.current)
        mapRef.current.addLayer(routeLayer.current)
        mapRef.current.addLayer(shipsLayer.current)
        mapRef.current.addLayer(animatedShipsLayer.current)
        const boatMarker = new DriftMarker([curPos.lat, curPos.lng], {
            icon: playerBoatIcon,
            rotationAngle: boatRotation,
            rotationOrigin: "center",
        });
        const destMarker = new DriftMarker([destPos.lat, destPos.lng], {
            draggable: false,
        });
        iconsLayer.current.addLayer(boatMarker);
        iconsLayer.current.addLayer(destMarker);
        if(boatManager.boatAngle != null) boatMarker.setRotationAngle(-boatManager.boatAngle)
        setMarkers({boat: boatMarker, dest: destMarker})
        setMap(map)
        setLayers([
            iconsLayer.current,
            routeLayer.current,
            animatedShipsLayer.current,
        ])
        boatManager.cancelDataListener()

        // listenig boat movement
        handleBoatMovement(boatMarker, destMarker)
        handleObstacleRemoval()
        handleNPCBoatMovement()
        handleAnimatedBoatShowHide()
        handleManualSteeringControl()
        setupStartingNPCBoats(animatedBoatManager.autoNPCBoatRoute)
        boatManager.resetMapObstacle()
    }

    const setupStartingNPCBoats = (routes) => {
        for(let i = 0; i < routes.length; i++){
            addNewNPCMovingShip(i, routes[i])
        }
        // console.log(animatedObstacleBoats)
        animatedBoatManager.start()
    }

    const handleObstacleRemoval = () => {
        boatManager.on('removeObstacle', () => {
            if(mapRef.current == null) return
            for(let i = 0; i < boatManager.mapStaticObstacle.length; i++){
                mapRef.current.removeLayer(boatManager.mapStaticObstacle[i])
            }
            boatManager.resetMapObstacle()
        })
    }

    const handleNPCBoatMovement = () => {
        animatedBoatManager.on('moveNPCMarker', (data) => {
            const {movingBoats} = data
            if(movingBoats == null || movingBoats.length != 10 ) return
            for(let i = 0; i < movingBoats.length; i++){
                const {curPos, angle} = movingBoats[i]
                let tempNPCShip = animatedObstacleBoats[i]
                if(tempNPCShip == null){
                    console.log("Ship " + i + " not found in map.")
                    return
                }
                tempNPCShip.slideTo([(curPos.lat), (curPos.lng)], {
                    duration: 1,
                });
                if(angle != null) tempNPCShip.setRotationAngle(-angle)
            }
        })
        
    }

    const handleAnimatedBoatShowHide = () => {
        animatedBoatManager.on('showHideAnimatedBoat', (data) => {
            const {show} = data
            if(show == null) return
            if(show){
                mapRef.current.addLayer(animatedShipsLayer.current)
            }else{
                mapRef.current.removeLayer(animatedShipsLayer.current)
            }
        })
    }

    const handleManualSteeringControl = () => {
        serialControl.socket.on('message', (data) => {
            // console.log("Status = " + boatManager.autoDrive)
            if(!boatManager.autoDrive){
                let splitCommand = data.split(",");
                let steer = splitCommand[0].split("$")
                manualBoatSteer(steer[1], splitCommand[1])
            }
        })
    }

    const manualBoatSteer = (turnAngle, throttle) =>{
        // console.log("Steer = " + turnAngle +", Throttle = " + throttle)
        if(throttle.length > 3) {
            throttle = throttle.substring(0, 3)
        }
        // console.log("Steer = " + turnAngle +", Throttle = " + throttle)
        boatManager.manualSteer(turnAngle, throttle)
    }

    function ClickMovements() {
        let position = null
        const mapEvnt = useMapEvents({
          click(e) {
            console.log("Trigger click at ")
            let conds = boatManager.clickControl.split("-")
            let coord = e.latlng
            console.log(coord)
            let idx = conds.length > 1 ? parseInt(conds[1]) : null
            switch(conds[0]){
                case "Boat":
                    // console.log("Obstacle ship")
                    let tempMarker = new DriftMarker([coord.lat, coord.lng], {
                        icon: NPCBoatIcon,
                        draggable: false,
                    });
                    mapRef.current.addLayer(tempMarker);
                    boatManager.addMapObstacle(tempMarker)
                    boatManager.setAddShipChange(coord)
                    reRendering(trigger+1)
                    break
                case "Start":
                    // console.log("Start Move")
                    pointMarkers.boat.setLatLng([coord.lat, coord.lng])
                    position = {lat: coord.lat, lng: coord.lng}
                    boatManager.setBoatPosChange(position)
                    break
                case "End":
                    // console.log("End Move")
                    pointMarkers.dest.setLatLng([coord.lat, coord.lng])
                    position = {lat: coord.lat, lng: coord.lng}
                    boatManager.setDestPosChange(position)
                    break
            }
          },
        })
      
        return position === null ? null : (
          <Marker position={position}>
            <Popup>You are here</Popup>
          </Marker>
        )
    }
    

    function addNewNPCMovingShip(idx, coord){
        let targetCoord = coord
        if(Array.isArray(coord)){
            targetCoord = coord[0]
        }
        let movingMarker = new DriftMarker([targetCoord.lat, targetCoord.lng], {
            icon: NPCBoatIcon,
            draggable: false,
        });
        animatedShipsLayer.current.addLayer(movingMarker);
        let tempMovingShips = animatedObstacleBoats
        tempMovingShips.push(movingMarker)
        setAnimatedObstacleBoats(tempMovingShips)
        animatedBoatManager.addMovingNPCShip(idx, targetCoord, coord)
    }

    function getFinalRoute(){
        return [destPos, curPos]
    }

    const handleRedMapResult = (result) => {
        mapRef.current.addLayer(iconsLayer.current)
        mapRef.current.addLayer(routeLayer.current)
        if(animatedBoatManager.show) {
            mapRef.current.addLayer(animatedShipsLayer.current)
        }
        let selectedRoute = result.path.length == 1 ? getFinalRoute() : result.path
        let convertedRoute = objectToArray(selectedRoute)
        setAPath(convertedRoute)
        // console.log(boatManager.curPos)
        // console.log(aPath)
        // console.log(result.tiles)
        boatManager.initialize({
            boundaries: result.boundaries != null ? result.boundaries : null,
            imageData: result.imageData != null ? result.imageData : null,
            aPath: result.path != null ? selectedRoute : null,
            tiles: result.tiles != null ? result.tiles : null
        })
    }

    const objectToArray = (path) => {
        let result = []
        for(let i = 0; i < path.length ;i++){
            let arr = [path[i].lat, path[i].lng]
            result.push(arr)
        }
        return result
    }

    const handleBoatMovement = (boatMarker, destMarker) => {
        boatManager.on('move', (data) => {
            const {boatAngle, curPos,} = data
            boatMarker.setRotationAngle(-boatAngle)
            boatMarker.slideTo([(curPos.lat), (curPos.lng)], {
                duration: 1,
            });
        })
    }

    const [mapClass, setMapclass] = useState('absolute z-0 opacity-100')
    const [boatControl, setBoatControl] = useState({play: false, autoDrive: false, targetBoatSpeed: 0})
    const [trigger, setTrigger] = useState(0)

    const handleToolbarChange = (toolbarData) => {
        // console.log(toolbarData)
        // set map class
        setMapclass(toolbarData.mapClass)

        // set boat control props
        setBoatControl({play: toolbarData.play, autoDrive: toolbarData.autoDrive})

        // handle re rendering process
        if (trigger != toolbarData.triggerRenderCount && map) reRendering(toolbarData.triggerRenderCount)

        // handle change speed when stop
        if (toolbarData.play) {
            const speed = parseInt(toolbarData.speed ?? 0)
            setBoatControl({targetBoatSpeed: speed})

            // broadcast to use new speed
            boatManager.start(parseInt(speed), toolbarData.autoDrive)
        } else if (!toolbarData.play) {
            boatManager.stop()
        }

        if (toolbarData.animBoatShow != null && toolbarData.animBoatShow != animatedBoatManager.show){
            animatedBoatManager.showHideAnimatedBoat(toolbarData.animBoatShow)
        }

        if(boatManager.autoDrive != toolbarData.autoDrive) boatManager.setBoatAutoDrive(toolbarData.autoDrive)
    }

    const reRendering = (count) => {
        map.removeLayer(iconsLayer.current)
        map.removeLayer(routeLayer.current)
        map.removeLayer(animatedShipsLayer.current)

        setTrigger(count)
    }

    const[alerts, setAlert] = useState([])
    useEffect(() => {
        // handle alert manager listener
        alertManager.on("change", (data) => {
            const {id, status, remain} = data
            setAlert([...remain])

            if (status === 'ok') {
                boatManager.refuel()
                // handle status ok on alert id 
            } else if (status === 'cancel') {
                // handle status cancel on alert id
            }
        })

        boatManager.on('fuel', (data) => {
            const {fuel, msg} = data

            // showing alert fuel not enough/empty
            const alert = alertManager.create({id: alerts.length, description: msg, icon: <MdLocalGasStation/>, apply: 'refuel'})
            setAlert([...alerts, alert])
        })

        serialControl.on('data', (data) => {
            const {command} = data
            if(command != "syncronizeScreen") return
            boatManager.emitSynchronizeData("All")
        })

        // clean event after close
        return () => {
            alertManager.cleanup()
            boatManager.cleanup()
            animatedBoatManager.cleanup()
            boatManager.setupDataListener()
        }
    }, [])

    const[enabled, setEnabled] = useState(false)
    const statusChange = (status) => {
        // this state used for enable click setting drawer
        if (status.index === 2) setEnabled(true)
        else setEnabled(false)
    }

    return (
            <div className="w-full h-full relative">
                <RedMap className="absolute z-20" map={map} onStatus={statusChange} layers={layers} triggerRender={trigger} onResult={handleRedMapResult} realTimeBy={[curPos, destPos]} boatManager={boatManager} />
                <div className={`w-full h-full top-0 left-0 ${mapClass}`}>
                    <MapContainer attributionControl={false} 
                        whenCreated={setMapReference}
                        renderer={L.canvas()} 
                        preferCanvas={true} dragging={true} center={centerPoint} 
                        zoom={zoomPower} scrollWheelZoom={false} style={{height: "100%", width: "100%"}}>
                        <LayersControl position="topright">
                            <LayersControl.BaseLayer checked name="Base Map">
                                <TileLayer
                                    // attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                            </LayersControl.BaseLayer>
                            <LayersControl.Overlay name="Marker with popup" >
                                <LayerGroup ref={iconsLayer}>
                                    
                                </LayerGroup>
                            </LayersControl.Overlay>

                            <LayersControl.Overlay name="Moving Boats" >
                                <LayerGroup ref={animatedShipsLayer}>
                                </LayerGroup>
                            </LayersControl.Overlay>

                            <LayersControl.Overlay name="Route" >
                                <LayerGroup ref={routeLayer}>
                                    <Polyline pathOptions={routeOptions} positions={aPath} />
                                </LayerGroup>
                            </LayersControl.Overlay>

                            <LayersControl.Overlay name="Static Boats" >
                                <LayerGroup ref={shipsLayer}>
                                    <ClickMovements />
                                </LayerGroup>
                            </LayersControl.Overlay>
                        </LayersControl>
                    </MapContainer>
                </div>
                {/* Toolbars */}
                <Toolbars enabled={enabled} triggerAlert={(alertData) => {
                    const alert = alertManager.create({id: alerts.length, ...alertData})
                    setAlert([...alerts, alert])
                }} onChange={handleToolbarChange} 
                boatManager={boatManager} />

                <div className="absolute z-0 opacity-0 left-full">
                    <BoatControl serialControl={serialControl} {...boatControl} boatManager={boatManager} />
                </div>

                <div className="absolute flex flex-col z-50 top-0 w-full">
                    <div className="flex flex-col">
                        {alerts}
                    </div>
                    {/* <button className="absolute z-10 btn btn-primary" onClick={() => {
                        const alert = alertManager.create({id: alerts.length, description: 'test', icon: ''})
                        setAlert([...alerts, alert])
                    }}>show</button> */}
                </div>

            </div>
    )
}
export default LiveMap;