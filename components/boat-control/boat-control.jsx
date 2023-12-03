import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import "leaflet-defaulticon-compatibility";
import { useEffect, useState } from 'react';
import useStore from '../../helpers/store';
import React from "react";
import {checkSpeedCode} from "../engine/boatSpecHelper"
import {convertToPositiveAngle} from "../engine/mathHelper"

let timeFrame = 60/100//second
// 67340/84584
let timeMultiplier = 3600

let latDivider = 110574
let lngDivider = 111320
let knotToKmph = 1.852

const BoatControl = ({serialControl, play, autoDrive, targetBoatSpeed, boatManager, engineControl, ...props}) => {
    //console.log("==Boat control re render")
    let boatSpeedVector = useStore(state => state.boatSpeed)
    let boatMarkerAngle = useStore(state => state.boatAngle)
    // let autoDrive = useStore(state => state.autoDrive)
    let curPos = useStore(state => state.currentPosition)
    let aPath = useStore(state => state.aPath)
    
    const [perSecMove, setPerSecMove] = useState({lat: 0.0, lng: 0.0});
    const [angleMove, setAngleMove] = useState({x: 0.0, y: 0.0});
    const [inpAngle, setInputAngle] = useState(-45);
    const [inpTimeMultiplier, setInputMultiplier] = useState(1);
    const [inpAutoDrive, setInputAutoDrive] = useState(false);
    const [clickInteractMode, setClickInteractMode] = useState(null);

    let [path, setPath] = useState([])
    const [onRender, setOnRender] = useState(true)
    let previousAccelerationDelta = Date.now()
    const [acceleration, setAcceleration] = useState(0);
    const [inpSpeed, setInputSpeed] = useState(25);
    const [currentBoatspeed, setCurrentBoatSpeed] = useState(0);
    // const [targetBoatSpeed, setTargetBoatSpeed] = useState(0);

    const [currentBoatAngle, setCurrentBoatAngle] = useState(0);
    let accelTimer = React.useRef()

    const calcSpeed = (kmphSpeed) => {
        let travelDist = knotToKmph * kmphSpeed * timeFrame // travel distance during time frame in km/sec 
        let tempPersec = {lat: travelDist / latDivider, lng: travelDist / lngDivider}
        setPerSecMove(tempPersec)
    }

    const calcAngle = (angle) =>{
        let originalPosition = {x: 0, y: 1} //Set original angle to north
        let TempAngleMove = {x: (Math.cos(angle * Math.PI / 180) * originalPosition.x - Math.sin(angle * Math.PI / 180) * originalPosition.y),
                    y: (Math.sin(angle * Math.PI / 180) * originalPosition.x + Math.cos(angle * Math.PI / 180) * originalPosition.y)}
        setAngleMove(TempAngleMove)
    }

    const calculateAutoDrive = () => {
        let aPath = useStore.getState().aPath
        console.log(aPath)
        if(aPath.length > 1){
            const nextPos = aPath.length - 2
            if(aPath.length < 3) stopNavigation()
            let selectedNode = {lat:aPath[nextPos].lat, lng:aPath[nextPos].lng}
            if(!selectedNode) return
            var angleDeg = (Math.atan2(selectedNode.lng - curPos.lng, selectedNode.lat - curPos.lat) * 180 / Math.PI) * -1;
            console.log("Cur pos is  = " + curPos.lat + " X " + curPos.lng)
            calcAngle(angleDeg)
        }else{
            stopNavigation()
        }
    }

    const clamp = (num, min, max) => {
        return Math.min(Math.max(num, min), max)
    }
    
    useEffect(() => {
        calculateSideAngle()    
    }, [curPos])

    function getSurroundingAverageWeight(boatPixelPos, Tiles, range){
        let startX = boatPixelPos.x >= range ? boatPixelPos.x - range : 0
        let startY = boatPixelPos.y >= range ? boatPixelPos.y - range : 0
        let endX = boatPixelPos.x + range >= Tiles.length - 1 ? Tiles.length - 1 : boatPixelPos.x + range
        let endY = boatPixelPos.y + range >= Tiles[0].length - 1 ? Tiles[0].length - 1 : boatPixelPos.y + range
        let totalWeight = 0
        let totalTiles = (endX - startX) * (endY - startY)
        for(let i = startX; i <= endX; i++){
            for(let j = startY; j <= endY; j++){
                totalWeight += Tiles[i][j].weight
            }
        }
        return totalWeight / totalTiles
    }

    const calculateSideAngle = () => {
        let Tiles = useStore.getState().Tiles
        let boatPixelPos = useStore.getState().pixelBoatPosition
        if(!Tiles || !boatPixelPos) return
        let fowardPos = {x: clamp(Math.round(angleMove.x), -1, 1) , y: clamp(Math.round(angleMove.y) * -1, -1, 1) } 
        let rightPos = {x: fowardPos.y * -1 , y:fowardPos.x  } 
        let leftPos = {x: fowardPos.y , y: fowardPos.x * -1 } 
        let weightLeft = Tiles[boatPixelPos.x + leftPos.x][boatPixelPos.y + leftPos.y].weight
        let weightRight = Tiles[boatPixelPos.x + rightPos.x][boatPixelPos.y + rightPos.y].weight
        let surroundingAverage = getSurroundingAverageWeight(boatPixelPos, Tiles, 3)
        useStore.setState({
            forwardDirection: fowardPos,
            rightDirection: rightPos,
            leftDirection: leftPos,
            shipLeftWeight: weightLeft,
            shipRightWeight: weightRight,
            shipAverageWeight: surroundingAverage,
        })
        // console.log({weightLeft: weightLeft, weightRight: weightRight})
    }

    const applyNavigation = () => {
        console.log("Apply navigation called")
        accelDeccel(currentBoatspeed, targetBoatSpeed, 10)
        if(inpAutoDrive){
            setPath(useStore.getState().aPath)
            calculateAutoDrive()
            boatMarkerAngle = getAngleFromVectorDirection(angleMove)
        }else{
            calcAngle(inpAngle)
            boatMarkerAngle = -inpAngle 
        }
        useStore.setState({
            allowMovement: true,
            boatAngle: boatMarkerAngle,
            departureTime: Date.now(),
        })
    }

    const stopNavigation = () => {
        console.log("Stop navigation called")
        serialControl.sendCode('INIT')
        accelDeccel(currentBoatspeed, 0, 10)
    }

    function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2-lat1);  // deg2rad below
        var dLon = deg2rad(lon2-lon1); 
        var a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
          Math.sin(dLon/2) * Math.sin(dLon/2)
          ; 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c; // Distance in km
        return d;
    }
      
    function deg2rad(deg) {
        return deg * (Math.PI/180)
    }

    function getVectorFromLatLng(lat1, lng1, lat2, lng2){
        let dLon = lng2 - lng1
        var y = Math.sin(dLon) * Math.cos(lat2);
        var x = Math.cos(lat1)*Math.sin(lat2) -
                Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
        return {x: x, y: y}
    }

    useEffect(() => {
        // console.log("Auto path trigger")
        let currentPath = useStore.getState().aPath
        // console.log(currentPath)
        if(inpAutoDrive && currentPath.length > 0){
            let tresholdDistance = 0.02
            let nextPos = currentPath.length - 2
            let selectNode = {lat: 0, lng: 0}
            if(currentPath.length >= 3) {
                nextPos = currentPath.length - 2
                selectNode = {lat:currentPath[nextPos].lat, lng:currentPath[nextPos].lng}
            }else if(currentPath.length == 2){
                nextPos = 0
                selectNode = {lat:currentPath[nextPos].lat, lng:currentPath[nextPos].lng}
            }else if(currentPath.length == 1){
                let lastDest = useStore.getState().destinationPosition
                selectNode = {lat: lastDest.lat, lng: lastDest.lng}
            }else{
                stopNavigation()  
                return
            }
            calcSpeed(currentBoatspeed)
            let tempAngle = {x: 0, y: 0}
            tempAngle.x = selectNode.lng - curPos.lng
            tempAngle.y = selectNode.lat - curPos.lat

            while(Math.abs(tempAngle.x) < 0.09 && Math.abs(tempAngle.y) < 0.09){
                tempAngle.x = tempAngle.x * 10
                tempAngle.y = tempAngle.y * 10
            }
            while(Math.abs(tempAngle.x) < 0.5 && Math.abs(tempAngle.y) < 0.5){
                tempAngle.x = tempAngle.x * 2
                tempAngle.y = tempAngle.y * 2
            }
            boatMarkerAngle = getAngleFromVectorDirection(tempAngle)
            console.log(useStore.getState().boatAngle.toString())
            getAngleDiffrence(useStore.getState().boatAngle, boatMarkerAngle)
            setAngleMove(tempAngle)

            currentPath[currentPath.length-1] = curPos
            let distanceInKm = getDistanceFromLatLonInKm(curPos.lat, curPos.lng, selectNode.lat, selectNode.lng)
            if(distanceInKm <= tresholdDistance){
                if(currentPath.length == 1){
                    stopNavigation()  
                    return
                }else{
                    currentPath.splice(nextPos, 1)
                }
            }
            setPath(currentPath)
            useStore.setState({
                boatAngle: boatMarkerAngle,
            })
            // console.log(distanceInKm)
        }
    }, [curPos])

    function getAngleDiffrence(boatAngleRN, targetAngle){
        if(useStore.getState().allowMovement){
            let adjustedBoatAngle = convertToPositiveAngle(boatAngleRN)
            let adjustedTargetAngle = convertToPositiveAngle(targetAngle)
            let diff = adjustedTargetAngle - adjustedBoatAngle
            console.log("Angel Diffrence is " + diff)
            if(Math.abs(diff) <= 10){
                console.log("Go Straight")
                serialControl.sendCode('ZR')
                return
            }
            if(diff > 180 || diff < 0){
                console.log("Turn Left")
                let roundedDiff = clamp(Math.round((diff) / 10) * 10, 10, 80) / 2
                serialControl.sendCode('P' + roundedDiff)
            }else{
                console.log("Turn Right")
                let roundedDiff = clamp(Math.round(makeBetween180(diff) / 10) * 10, 10, 80) / 2
                serialControl.sendCode('S' + roundedDiff)
            }
        }
    }

    function makeBetween180(diff){
        if(diff > 180){
            diff = 360 - 180
        }else if(diff < 0){
            diff = Math.abs(diff)
        }
        return diff
    }

    useEffect(() => {
        // console.log("Boat speed vector updated")
        calculateSideAngle()
        boatSpeedVector.lat = perSecMove.lat * angleMove.y * inpTimeMultiplier
        boatSpeedVector.lng = perSecMove.lng * angleMove.x * inpTimeMultiplier
        
        useStore.setState({
            boatSpeed: boatSpeedVector,
        })
    }, [perSecMove, angleMove])

    useEffect(() => {
        // console.log("Speed is now = " + currentBoatspeed);
        let speedCode = checkSpeedCode(currentBoatspeed)
        calcSpeed(currentBoatspeed)
        useStore.setState({
            currentBoatspeed: currentBoatspeed,
        })
    }, [currentBoatspeed])

    useEffect(() => {
        if(accelTimer.current != null) clearTimeout(accelTimer.current);  
        accelLoop()
    }, [acceleration])

    function accelDeccel(startSpeed, duration){
        // setTargetBoatSpeed(targetSpeed)
        setAcceleration((targetBoatSpeed - startSpeed) / duration)
    }

    function accelLoop(){
        let accelerationDelta = Date.now() - previousAccelerationDelta
        let predictedSpeed = useStore.getState().currentBoatspeed + ((accelerationDelta/1000) * acceleration)
        // console.log("Accel is = " + acceleration + ", currentBoatSpeed = " + predictedSpeed+", End speed = " + endSpeed)
        if((acceleration > 0 && predictedSpeed >= targetBoatSpeed) || (acceleration < 0 && predictedSpeed <= targetBoatSpeed)) {
            setCurrentBoatSpeed(targetBoatSpeed)
            return
        }
        accelTimer.current = setTimeout(() => {
            setCurrentBoatSpeed(preState => preState + (accelerationDelta/1000) * acceleration)
            accelLoop(targetBoatSpeed)
            return () => {
                clearTimeout(accelTimer.current);
            };
        }, 500);
        previousAccelerationDelta = Date.now()
    }

    function getAngleFromVectorDirection(angle){
        var angle = (Math.atan2(angle.x, angle.y) * 180 / Math.PI) 
        return angle;
    }

    return (
        <div className="h-full overflow-auto">
            <h1> Autoboat control panel </h1>
            <h1> Speed (Knot) </h1>
            <input type="number" value={inpSpeed} onChange = {(e) => setInputSpeed(e.target.value)}  />
            <h1> Forward Angle (Counter Clockwise)</h1>
            <input type="number" value={inpAngle} onChange = {(e) => setInputAngle(e.target.value)}  />
            <h1> Time multiplier (Default = 1)</h1>
            <input type="number" value={inpTimeMultiplier} onChange = {(e) => setInputMultiplier(e.target.value)}  />
            <br />
            <input type="checkbox" name="autoDrive" value={inpAutoDrive} onChange={(e) => setInputAutoDrive(e.target.value)} />
            <label >Auto Drive</label><br />
            <div >
                <input type="radio" name="clickMode" value="Boat" onChange={(e) => {
                    useStore.setState({
                        clickControl: "Boat"
                    })
                }} /> Add Marker (Click to add) <br />
                <input type="radio"  name="clickMode" value="Start" onChange={(e) => {
                    useStore.setState({
                        clickControl: "Start"
                    })
                }} /> Move Start Marker <br />
                <input type="radio"  name="clickMode" value="End" onChange={(e) => {
                    useStore.setState({
                        clickControl: "End"
                    })
                }} /> Move End Marker <br />
            </div>
            <button onClick ={() => applyNavigation()}> Apply changes </button>
            <br />
            <button onClick ={() => stopNavigation()}> Stop Boat </button>
            <br />
        </div>
    )
}
export default BoatControl;