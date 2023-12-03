import {EventEmitter} from 'events'
import EngineControl from '../../components/engine/engine-control'
import { convertToPositiveAngle, clamp } from '../../components/engine/mathHelper'

const speedAdjuster = 60/169
const timeMultiplier = 3600
const latDivider = 110574
const lngDivider = 111320
const knotToKmph = 1.852

export default class BoatManager extends EventEmitter {
    indicatorValues = [
        [0,     0,  0,      0,      0],
        [300,   1,  21,     5,      4.5],
        [600,   3,	42,	    10,	    9],
        [900,   4,  63,     15,     13.5],
        [1200,  5,  84,     20,     18],
        [1500,  6,  105,    25,	    22.5],
        [1800,  8,  126,    30,	    27],
        [2100,  9,  147,    35,	    31.5],
        [2400,  10, 168,    40,	    36],
        [2700,  11, 189,    45,	    40.5],
        [3000,  13, 210,    50,	    45],
        [3300,  14, 231,    55,	    49.5],
        [3600,  15, 252,    60,	    54],
        [3900,  16, 273,    65,	    58.5],
        [4200,  18, 294,    70,	    63],
        [4500,  19, 315,    75,	    67.5],
        [4800,  20, 336,    80,	    72],
        [5100,  21, 357,    85,	    76.5],
        [5400,  23, 378,    90,	    90],
        [5700,  24, 399,    95,     85.5],
        [6000,  25, 420,    100,    90],
    ]

    constructor() {
        super()
        this.boatAngle = 0
        this.boatMove = {lat: 0, lng: 0}
        this.angleMove = this.calcAngle(this.boatAngle)
        this.manualBoatAngle = 0
        this.manualBoatSpeedMultiplier = 0
        
        this.autoDrive = false

        this.targetBoatSpeed = 0
        this.currentBoatSpeed = 0

        // this.curPos = {lat: -7.1150, lng: 112.6504}
        this.curPos = {lat: -7.110957167609007, lng: 112.65547490931478}
        this.destPos = {lat: -7.1150, lng: 112.6300}

        this.mainInterval = null
        this.accelTimeout = null

        this.allowMovement = false
        this.previousLoopTime = Date.now()
        this.previousAccelerationTime = Date.now()
        this.acceleration = 0
        
        this.engineFuel = 100
        this.engineLubOil = 100

        this.engineOilPressure = {previous: [0, 0], current: [0, 0]}
        this.engineTrim = {previous: [0, 0], current: [0, 0]}
        this.engineRPM = {previous: [0, 0], current: [0, 0]}
        this.engineTemperature = {previous: [0, 0], current: [0, 0]}

        this.fuelConsumtionPerHour = 15
        this.engineLubOilConsumtionPerHour = 5

        this.distance = 0
        this.arrivalTime = Date.now()
        this.departureTime = Date.now()

        this.npcShipLocations = []

        this.forwardDirection = {x: 0, y:0}
        this.rightDirection = {x: 0, y:0}
        this.leftDirection = {x: 0, y:0}
        this.shipLeftWeight = 0
        this.shipRightWeight = 0
        this.shipAverageWeight = 0
        this.boatPixelPos = {x: 0, y:0}

        this.previousIntervalDate = Date.now()

        this.serialControl = null
        this._tileSize = 4
        this.clickControl = ''
        this.tresholdDistance = 0.005
        this._aPath = []
        this.activateDataListener = false
        this.smallGradualTurnSpeed = 5
        this.largeGradualTurnSpeed = 10
        this.maxBoatSpeed = 25
        this.mapStaticObstacle = []
        this.radarStaticObstacle = []
        this.activateSplitScreenTimeout = null
        this.maximized = false
        this.radarListeners = []
        this.mapListeners = []
        this.engineListeners = []
        this.echoListeners = []
    }

    activateMaximizeMinimize(){
        this.maximized = !this.maximized
    }

    addMapObstacle(data){
        this.mapStaticObstacle.push(data)
    }

    resetMapObstacle(){
        this.mapStaticObstacle = []
    }

    addRadarObstacle(data){
        this.radarStaticObstacle.push(data)
    }

    resetRadarObstacle(){
        this.radarStaticObstacle = []
    }

    initialize ({tileSize, tiles, boundaries, imageData, aPath,}) {
        if(tiles != null) this._tiles = tiles
        if(boundaries != null) this._boundaries = boundaries
        if(imageData != null) this._processedImage = imageData
        if(aPath != null) this._aPath = aPath
    }

    setBoatAutoDrive(status){
        this.autoDrive = status
    }

    getAngleFromVectorDirection (angle) {
        var angle = (Math.atan2(angle.x, angle.y) * 180 / Math.PI) 
        return angle;
    }

    getDistanceFromLatLonInKm (lat1,lon1,lat2,lon2) {
        var R = 6371; // Radius of the earth in km
        var dLat = this.deg2rad(lat2-lat1);  // deg2rad below
        var dLon = this.deg2rad(lon2-lon1); 
        var a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
          Math.sin(dLon/2) * Math.sin(dLon/2)
          ; 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c; // Distance in km
        return d;
    }

    deg2rad (deg) {
        return deg * (Math.PI/180)
    }

    calculatePathDistance (path){
        let totalDistance = 0
        // console.log("Path lenght = " + path.length.toString())
        if(path.length > 2){
            for (let i = 0; i < path.length-2;i++){
                let firstPos = path[i]
                let secondPos = path[i+1]
                let distance = this.getDistanceFromLatLonInKm(firstPos.lat, firstPos.lng, secondPos.lat, secondPos.lng)
                totalDistance += distance
                // console.log("Dist is " + totalDistance)
            }
        }else{
            let firstPos = path[0]
            let secondPos = path[1]
            let distance = this.getDistanceFromLatLonInKm(firstPos.lat, firstPos.lng, secondPos.lat, secondPos.lng)
            // console.log({i: i, distance: distance})
            totalDistance += distance
        }
        return totalDistance
    }

    manualSteer(angle, throttle){
        if(!this.allowMovement) return
        // console.log("Steer = " + angle +", Throttle = " + throttle)

        switch(throttle){
            case "STP":
                this.manualBoatSpeedMultiplier = 0
                // console.log("STP SELECTED")
                break
            case "DSH":
                this.manualBoatSpeedMultiplier = 0.25
                // console.log("DSH SELECTED")
                break
            case "SLH":
                this.manualBoatSpeedMultiplier = 0.5
                // console.log("SLH SELECTED")
                break
            case "HLH":
                this.manualBoatSpeedMultiplier = 0.75
                // console.log("HLH SELECTED")
                break
            case "FLH":
                this.manualBoatSpeedMultiplier = 1
                // console.log("FLH SELECTED")
                break
        }

        //P kiri S kanan
        if(angle == "ZR"){
            this.manualBoatAngle = 0
            // console.log("STEER ZERO")
        }else{
            let number = angle.substring(1, angle.length)
            let direction = angle.substring(0, 1)
            // console.log("Dir = " + direction +", Number = " + number)
            this.manualBoatAngle = parseInt(number) / 2
            if(direction == "S"){
                this.manualBoatAngle = this.manualBoatAngle * -1
            }
        }

        if(this.accelTimeout != null) clearTimeout(this.accelTimeout)
        let newManualSpeed = this.maxBoatSpeed * this.manualBoatSpeedMultiplier
        if(this.targetBoatSpeed > newManualSpeed){
            this.acceleration = this.maxBoatSpeed / 10 * -1
        }else{
            this.acceleration = this.maxBoatSpeed / 10
        }
        this.targetBoatSpeed = newManualSpeed
        this.accelLoop(this.acceleration)
        
    }

    calculateEstimatedArrival (distance){
        let knotSpeed = this.targetBoatSpeed
        if(knotSpeed <= 0) return 0
        let knotToKmph = 1.852
        let speed = knotSpeed * knotToKmph 
        let travelTime = distance / speed
        return travelTime
    }

    timeToDate (travelTime){
        this.departureTime = Date.now()
        return this.departureTime + (travelTime * 60 * 60 * 1000)
    }

    handleAutoDrive = () => {
        if (this._aPath.length > 0) {
            // const this._aPath = this._aPath
            let nextPos = this._aPath.length - 2
            let selectNode = {lat: 0, lng: 0}
            if(this._aPath.length >= 3) {
                nextPos = this._aPath.length - 2
                selectNode = {lat:this._aPath[nextPos].lat, lng:this._aPath[nextPos].lng}
            }else if(this._aPath.length == 2){
                nextPos = 0
                selectNode = {lat:this._aPath[nextPos].lat, lng:this._aPath[nextPos].lng}
            }else if(this._aPath.length == 1){
                let lastDest = this.destPos
                selectNode = {lat: lastDest.lat, lng: lastDest.lng}
            }else{
                this.stop()  
                return
            }

            this._aPath[this._aPath.length-1] = this.curPos
            let distanceInKm = this.getDistanceFromLatLonInKm(this.curPos.lat, this.curPos.lng, selectNode.lat, selectNode.lng)
            if (distanceInKm <= this.tresholdDistance) {
                // console.log("Under Distance")
                if (this._aPath.length <= 2) {
                    // console.log("STOP!!!!")
                    this.stop()  
                    return
                }else{
                    // console.log("SPLICE!!!")
                    this._aPath.splice(nextPos, 1)
                }
            }else{
                // console.log("Distance = " + distanceInKm + ", Path lenght is " + this._aPath.length)
                let tempAngle = {x: 0, y: 0}
                tempAngle.x = selectNode.lng - this.curPos.lng
                tempAngle.y = selectNode.lat - this.curPos.lat
    
                // console.log("Temp angle ")
                let temporaryAnglePlaceHolder = this.boatAngle
                this.boatAngle = this.getAngleFromVectorDirection(tempAngle) * -1
                // console.log("Lower boat angle " + this.boatAngle)
                this.getAngleDiffrence(temporaryAnglePlaceHolder, this.boatAngle)
                this.angleMove = this.calcAngle(this.boatAngle)
                this.boatMove = this.calcSpeed(this.currentBoatSpeed, this.angleMove)
            }
        }
    }

    handleManualDrive = (deltaTime) => {
        this.boatAngle += this.manualBoatAngle * deltaTime
        this.boatAngle = this.boatAngle % 360
        this.angleMove = this.calcAngle(this.boatAngle)
        this.boatMove = this.calcSpeed(this.currentBoatSpeed, this.angleMove)
    }

    //90=40 
    getAngleDiffrence = (boatAngleRN, targetAngle) =>{
        if(this.allowMovement){
            let adjustedBoatAngle = convertToPositiveAngle(boatAngleRN)
            let adjustedTargetAngle = convertToPositiveAngle(targetAngle)
            let diff = adjustedTargetAngle - adjustedBoatAngle
            // console.log("Angel Diffrence is " + diff)
            if(Math.abs(diff) <= 10){
                // console.log("Go Straight")
                if(this.autoDrive) this.serialControl.sendCode('ZR')
                return
            }
            if(diff > 180 || diff < 0){
                // console.log("Turn Left")
                let roundedDiff = clamp(Math.round((diff) / 10) * 10, 10, 80) / 2
                if(this.autoDrive) this.serialControl.sendCode('P' + roundedDiff)
            }else{
                // console.log("Turn Right")
                let roundedDiff = clamp(Math.round(this.makeBetween180(diff) / 10) * 10, 10, 80) / 2
            }
        }
    }

    makeBetween180 = (diff) => {
        if(diff > 180){
            diff = 360 - 180
        }else if(diff < 0){
            diff = Math.abs(diff)
        }
        return diff
    }

    startTimer = () => {
        if(this.mainInterval == null) {
            this.mainInterval = setInterval(() => {
                const deltaTime = (Date.now() - this.previousLoopTime) / 1000
                if ((this.boatMove.lat != 0 || this.boatMove.lng != 0) && this.allowMovement) {
                    // console.log("Current speed is " + this.currentBoatSpeed.toString())
                    if (this.autoDrive){
                        this.handleAutoDrive()
                    }else{
                        this.handleManualDrive(deltaTime)
                    }
                    // console.log("We movin")

                    this.curPos.lat += this.boatMove.lat * deltaTime
                    this.curPos.lng += (this.boatMove.lng / (Math.cos(this.curPos.lat * Math.PI / 180))) * deltaTime

                    if(this._boundaries.northEast == null) return
                    let northEast = this._boundaries.northEast
                    let southWest = this._boundaries.southWest
    
                    let mapStartPos = {lat: 0, lng: 0}
                    mapStartPos.lat = (this.curPos.lat - northEast.lat) / (southWest.lat - northEast.lat) * this._processedImage.height
                    mapStartPos.lng = (this.curPos.lng - southWest.lng) / (northEast.lng - southWest.lng) * this._processedImage.width
                    
                    let searchStart = mapStartPos
                    let idxStart = {x:0, y:0}
                    let idxSearch = {x:0, y:0}
                    let startTile = {x:0, y:0}
                    for (let i = 0; i < this._processedImage.width; i+= this._tileSize){
                        idxSearch.y = 0
                        for (let j = 0; j < this._processedImage.height; j+= this._tileSize){
                            //check if start-end 
                            if (i <= searchStart.lng && j <= searchStart.lat && (i+this._tileSize) > searchStart.lng && (j+this._tileSize) > searchStart.lat  ){
                                startTile.x = i
                                startTile.y = j
                                idxStart.x = idxSearch.x
                                idxStart.y = idxSearch.y
                                //break;
                            }
                            idxSearch.y++
                        }
                        idxSearch.x++
                    }
    
                    this.boatPixelPos = idxStart
                    
                    this.calculateSideAngle(idxStart)
                    
                    this.emit('move', {
                        curPos: this.curPos, 
                        boatAngle: this.boatAngle,  
                        shipLeftWeight: this.shipLeftWeight, 
                        shipRightWeight: this.shipRightWeight, 
                        shipAverageWeight: this.shipAverageWeight})
                    this.serialControl.sendData({
                        command: 'move', 
                        curPos: this.curPos, 
                        boatAngle: this.boatAngle,  
                        shipLeftWeight: this.shipLeftWeight, 
                        shipRightWeight: this.shipRightWeight, 
                        shipAverageWeight: this.shipAverageWeight})
    
                    this.engineFuel = this.engineFuel - (this.fuelConsumtionPerHour / timeMultiplier * (deltaTime/1000))
                    this.engineLubOil = this.engineLubOil - (this.engineLubOilConsumtionPerHour / timeMultiplier * (deltaTime/1000))
    
                    if(this.engineFuel <= 0){
                        this.stop()
                        this.emit('fuel', {fuel: this.engineFuel, msg: 'Fuel is empty'})
                    }
                }
                this.previousLoopTime = Date.now()
            }, 0);
        }
    }

    calcAngle = (angle) =>{
        let originalPosition = {x: 0, y: 1} //Set original angle to north
        let TempAngleMove = {x: (Math.cos(angle * Math.PI / 180) * originalPosition.x - Math.sin(angle * Math.PI / 180) * originalPosition.y),
                    y: (Math.sin(angle * Math.PI / 180) * originalPosition.x + Math.cos(angle * Math.PI / 180) * originalPosition.y)}
        return TempAngleMove
    }

    calcSpeed = (kmphSpeed, angleVector) => {
        let travelDist = knotToKmph * kmphSpeed * speedAdjuster // travel distance during time frame in km/sec 
        let tempPersec = {lat: travelDist / latDivider, lng: travelDist / lngDivider}
        let boatSpeed = {lat: 0, lng: 0}
        boatSpeed.lat = tempPersec.lat * angleVector.y// * this.timeMultiplier
        boatSpeed.lng = tempPersec.lng * angleVector.x// * this.timeMultiplier
        return boatSpeed
    }

    accelLoop = (acceleration) => {        
        const accelerationDelta = Date.now() - this.previousAccelerationTime
        const predictedSpeed = this.currentBoatSpeed + ((accelerationDelta/1000) * acceleration)
        // console.log("Accel is = " + acceleration)
        if(acceleration == 0) return
        if((acceleration > 0 && predictedSpeed >= this.targetBoatSpeed) || (acceleration < 0 && predictedSpeed <= this.targetBoatSpeed)) {
            this.currentBoatSpeed = this.targetBoatSpeed
            this.setUpdateData (this.currentBoatSpeed )
            this.boatMove = this.calcSpeed(this.currentBoatSpeed, this.angleMove)
            if(this.accelTimeout != null) clearTimeout(this.accelTimeout)
            return
        }

        this.accelTimeout = setTimeout(() => {     
            this.currentBoatSpeed += (accelerationDelta/1000) * acceleration
            this.setUpdateData (this.currentBoatSpeed )
            this.boatMove = this.calcSpeed(this.currentBoatSpeed, this.angleMove)
            this.accelLoop(acceleration)

            return () => {
                if(this.accelTimeout != null) clearTimeout(this.accelTimeout);
            };
        }, 0);
        this.previousAccelerationTime = Date.now()
    }

    checkSpeed = () =>{
        if(this.allowMovement){
            let speedCode = this.checkSpeedCode()
            if(this.autoDrive)  this.serialControl.sendCode(speedCode);
        }
    }

    calculateFuelRequirement(MaxSpeed){
        let estimateSpeed = MaxSpeed * 1.852
        let sailFuel = this.distance / estimateSpeed * this.fuelConsumtionPerHour
        if(this.engineFuel < sailFuel){
            this.stop()
            console.log("Need " + sailFuel.toFixed(2) +", While only have " + this.engineFuel.toFixed(2))
            this.emit('fuel', {fuel: this.engineFuel, msg: "Need more fuel " + sailFuel.toFixed(2)+"%, While only have fuel " + Math.abs(this.engineFuel.toFixed(2))+"%"})
        }
    }

    stop() {
        this.allowMovement = false
        this.targetBoatSpeed = 0
        
        // setup acceleration
        if(this.accelTimeout != null) clearTimeout(this.accelTimeout)
        this.acceleration = this.maxBoatSpeed/10 * -1
        this.resetIntervalsDeltaTime()
        this.accelLoop(this.acceleration)
        this.emit('change', this)
    }

    start(targetBoatSpeed, isAutoDrive = false) {
        // set is auto drive
        this.autoDrive = isAutoDrive

        // control boat speed and movement
        this.allowMovement = true
        this.maxBoatSpeed = targetBoatSpeed
        if(this.autoDrive){
            this.targetBoatSpeed = this.maxBoatSpeed
        }else{
            this.targetBoatSpeed = this.maxBoatSpeed * this.manualBoatSpeedMultiplier
        }

        // setup path to destination
        let tempDist = this.calculatePathDistance(this._aPath)
        // console.log("Temp distance " + tempDist)
        let travelTime = this.calculateEstimatedArrival(tempDist)
        this.distance = tempDist
        this.arrivalTime = this.timeToDate(travelTime)
        this.calculateFuelRequirement(targetBoatSpeed)

        // setup acceleration
        this.resetIntervalsDeltaTime()
        this.acceleration = (this.maxBoatSpeed)/10
        if(this.accelTimeout != null) clearTimeout(this.accelTimeout)
        this.accelLoop(this.acceleration)

        // broadcast to others
        this.emit('updateTopRightIndicatorValues', {
            curPos: this.curPos, 
            distance: this.distance, 
            departureTime: this.departureTime, 
            arrivalTime: this.arrivalTime})
        this.serialControl.sendData({
            command: 'TopRightIndicator',
            arrivalTime: this.arrivalTime,
            departureTime: this.departureTime,
            distance: this.distance,
        })

        this.startTimer()
    }

    resetIntervalsDeltaTime(){
        this.previousAccelerationTime = Date.now()
        this.previousLoopTime = Date.now()
    }

    cleanup = () => {
        clearInterval(this.mainInterval)
    }

    searchIndicatorValues(GPS_Speed){
        for(let i=0; i<this.indicatorValues.length;i++){
            if(this.indicatorValues[i][1] >= GPS_Speed.toFixed(0)){
                return i
            }
        }
        return 0
    }

    setTrim(trim){
        this.engineTrim = {previous: this.engineTrim.current, current: trim}
    }

    setTemperature(temperature){
        this.engineTemperature = {previous: this.engineTemperature.current, current: temperature}
    }

    setRPM(RPM){
        this.engineRPM = {previous: this.engineRPM.current, current: RPM}
    }

    setOilPressure(oilPressure){
        this.engineOilPressure = {previous: this.engineOilPressure.current, current: oilPressure}
    }

    setUpdateData (currentSpeed) {
        let index = this.searchIndicatorValues(currentSpeed)
        let currentValues = this.indicatorValues[index]
        let maxValues = this.indicatorValues[this.indicatorValues.length-1]
        this.setRPM([currentValues[0] / maxValues[0] * 100, currentValues[0] / maxValues[0] * 100])
        this.setOilPressure([currentValues[2] / maxValues[2] * 100, currentValues[1] / maxValues[1] * 100])
        this.setTrim([currentValues[3] / maxValues[3] * 100, currentValues[3] / maxValues[3] * 100])
        this.setTemperature([currentValues[4] / maxValues[4] * 100, currentValues[4] / maxValues[4] * 100])
        this.engineSpeed = currentSpeed

        this.checkSpeed()

        this.emit('changeIndicator', {
            fuel: this.engineFuel,
            oil: this.engineLubOil,
            rpm: this.engineRPM,
            oilPressure: this.engineOilPressure,
            trim: this.engineTrim,
            temperature: this.engineTemperature,
            speed: this.engineSpeed,
        })

        this.serialControl.sendData({
            command: 'changeIndicator',
            fuel: this.engineFuel,
            oil: this.engineLubOil,
            rpm: this.engineRPM,
            oilPressure: this.engineOilPressure,
            trim: this.engineTrim,
            temperature: this.engineTemperature,
            speed: this.engineSpeed,
        })
    }

    refuel (){
        this.emit('refuel')
        this.engineFuel = 100
    }

    getSurroundingAverageWeight(boatPixelPos, Tiles, range){
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

    clamp (num, min, max){
        return Math.min(Math.max(num, min), max)
    }

    calculateSideAngle (boatPixelPos){
        let Tiles = this._tiles
        if(Tiles == null || boatPixelPos == null) return
        let fowardPos = {x: this.clamp(Math.round(this.angleMove.x), -1, 1) , y: this.clamp(Math.round(this.angleMove.y) * -1, -1, 1) }   
        let rightPos = {x: fowardPos.y * -1 , y: fowardPos.x  } 
        let leftPos = {x: fowardPos.y , y: fowardPos.x * -1 } 
        // console.log("Get Right " + (this.boatPixelPos.x + leftPos.x) +" X " +(this.boatPixelPos.y + leftPos.y))
        // console.log("Get lEFT " + (this.boatPixelPos.x + rightPos.x) +" X " +(this.boatPixelPos.y + rightPos.y))
        let weightLeft = Tiles[this.boatPixelPos.x + leftPos.x][this.boatPixelPos.y + leftPos.y].weight
        let weightRight = Tiles[this.boatPixelPos.x + rightPos.x][this.boatPixelPos.y + rightPos.y].weight
        let surroundingAverage = this.getSurroundingAverageWeight(this.boatPixelPos, Tiles, 3)
        this.forwardDirection = fowardPos
        this.rightDirection = rightPos
        this.leftDirection = leftPos
        this.shipRightWeight = weightRight
        this.shipLeftWeight = weightLeft
        this.shipAverageWeight = surroundingAverage
        this.serialControl.sendData({
            command: "echoSounder",
            shipRightWeight: weightRight, 
            shipLeftWeight: weightLeft, 
            shipAverageWeight: surroundingAverage})
    }

    setBoatPosChange(newPos){
        this.curPos = newPos
        this.emit('recalculate')
        this.emit('move', {
            curPos : newPos, 
            angle: this.boatAngle, 
            shipLeftWeight: this.shipLeftWeight, 
            shipRightWeight: this.shipRightWeight, 
            shipAverageWeight: this.shipAverageWeight})
        this.serialControl.sendData({
            command: 'move', 
            curPos: this.curPos, 
            boatAngle: this.boatAngle,
            shipLeftWeight: this.shipLeftWeight, 
            shipRightWeight: this.shipRightWeight, 
            shipAverageWeight: this.shipAverageWeight})
    }

    setDestPosChange(newPos){
        this.destPos = newPos
        this.emit('recalculate')
    }

    setAddShipChange(newPos){
        this.stop()
        this.npcShipLocations.push(newPos)
        this.emit('addObstacle', {npcShipLocations: this.npcShipLocations})
        this.serialControl.sendData({
            command: 'addObstacle', 
            npcShipLocations: this.npcShipLocations, })
    }

    clearObstacles(){
        this.stop()
        this.npcShipLocations = []
        this.emit('removeObstacle')
        this.serialControl.sendData({
            command: 'removeObstacle' })
    }

    returnSpeedBasedOnTrim = (trim) => {
        for(let i=0; i<this.indicatorValues.length;i++){
            if(this.indicatorValues[i][3] >= trim){
                return this.indicatorValues[i][1]
            }
        }
    }  
    
    checkSpeedCode = () =>{
        // console.log(this.currentBoatSpeed)
        if(this.currentBoatSpeed == 0) return 'STP'
        if(this.currentBoatSpeed >= this.returnSpeedBasedOnTrim(100)){
            return 'FLH'
        }else if (this.currentBoatSpeed >= this.returnSpeedBasedOnTrim(75)){
            return 'HLH'
        }
        else if (this.currentBoatSpeed >= this.returnSpeedBasedOnTrim(50)){
            return 'SLH'
        }
        else {
            return 'DSH'
        }
    }

    setupDataListener = () =>{
        // console.log("Data listener activated!!!")
        this.activateSplitScreenTimeout = setTimeout(() => {     
            this.activateDataListener = true
            this.requestSyncronize()
            console.log("Activate split screen")
        }, 1000);
    }

    cancelDataListener = () =>{
        if(this.activateSplitScreenTimeout) clearTimeout(this.activateSplitScreenTimeout)
        console.log("No, wait. Cancel splitscreen.")
    }

    requestSyncronize = () =>{
        // console.log("Do syncronize")
        this.serialControl.sendData({command: "syncronizeScreen"})
    }

    localSyncronize = (componentName) =>{
        // console.log(componentName + " syncro send")
        switch(componentName){
            case "EngineIndicator":
                console.log("Engine Syncro")
                this.setUpdateData(this.currentBoatSpeed)
                break
            case "EchoSounder":
                // console.log("Echo Syncro")
                this.emit('move', {
                    curPos: this.curPos, 
                    boatAngle: this.boatAngle,  
                    shipLeftWeight: this.shipLeftWeight, 
                    shipRightWeight: this.shipRightWeight, 
                    shipAverageWeight: this.shipAverageWeight})
                break
            case "Radar":
                // console.log("Radar Syncro")
                this.emit('move', {
                    curPos: this.curPos, 
                    boatAngle: this.boatAngle,  
                    shipLeftWeight: this.shipLeftWeight, 
                    shipRightWeight: this.shipRightWeight, 
                    shipAverageWeight: this.shipAverageWeight})
                this.emit('addObstacle', {npcShipLocations: this.npcShipLocations})
                break
            case "TopRightIndicator":
                // console.log("TopRight Syncro")
                this.emit('move', {
                    curPos: this.curPos, 
                    boatAngle: this.boatAngle,  
                    shipLeftWeight: this.shipLeftWeight, 
                    shipRightWeight: this.shipRightWeight, 
                    shipAverageWeight: this.shipAverageWeight})
                this.serialControl.sendData({
                    command: 'TopRightIndicator',
                    arrivalTime: this.arrivalTime,
                    departureTime: this.departureTime,
                    distance: this.distance,
                })
                break
                case "All":
                    // console.log("All Syncro")
                    this.setUpdateData(this.currentBoatSpeed)
                    this.serialControl.sendData({
                        command: 'move', 
                        curPos: this.curPos, 
                        boatAngle: this.boatAngle,
                        shipLeftWeight: this.shipLeftWeight, 
                        shipRightWeight: this.shipRightWeight, 
                        shipAverageWeight: this.shipAverageWeight,
                    })
                    this.serialControl.sendData({
                        command: 'syncObstacle', 
                        npcShipLocations: this.npcShipLocations, })
                    this.serialControl.sendData({
                        command: 'TopRightIndicator',
                        arrivalTime: this.arrivalTime,
                        departureTime: this.departureTime,
                        distance: this.distance,
                    })
                    this.serialControl.sendData({
                        command: "echoSounder",
                        shipRightWeight: this.shipRightWeight, 
                        shipLeftWeight: this.shipLeftWeight, 
                        shipAverageWeight: this.shipAverageWeight})
                    break
        }
    }

    emitSynchronizeData = (componentName) =>{
        // console.log(componentName + " syncro send")
        switch(componentName){
            case "EngineIndicator":
                console.log("Engine Syncro")
                this.setUpdateData(this.currentBoatSpeed)
                break
            case "EchoSounder":
                // console.log("Echo Syncro")
                this.emit('move', {
                    curPos: this.curPos, 
                    boatAngle: this.boatAngle,  
                    shipLeftWeight: this.shipLeftWeight, 
                    shipRightWeight: this.shipRightWeight, 
                    shipAverageWeight: this.shipAverageWeight})
                this.serialControl.sendData({
                    command: "echoSounder",
                    shipRightWeight: this.shipRightWeight, 
                    shipLeftWeight: this.shipLeftWeight, 
                    shipAverageWeight: this.shipAverageWeight})
                break
            case "Radar":
                // console.log("Radar Syncro")
                this.emit('move', {
                    curPos: this.curPos, 
                    boatAngle: this.boatAngle,  
                    shipLeftWeight: this.shipLeftWeight, 
                    shipRightWeight: this.shipRightWeight, 
                    shipAverageWeight: this.shipAverageWeight})
                this.serialControl.sendData({
                    command: 'move', 
                    curPos: this.curPos, 
                    boatAngle: this.boatAngle,
                    shipLeftWeight: this.shipLeftWeight, 
                    shipRightWeight: this.shipRightWeight, 
                    shipAverageWeight: this.shipAverageWeight})
                this.serialControl.sendData({
                    command: 'addObstacle', 
                    npcShipLocations: this.npcShipLocations, })
                this.serialControl.sendData({
                    command: 'removeObstacle', 
                    npcShipLocations: this.npcShipLocations, })
                break
            case "TopRightIndicator":
                // console.log("TopRight Syncro")
                this.serialControl.sendData({
                    command: 'move', 
                    curPos: this.curPos, 
                    boatAngle: this.boatAngle,
                    shipLeftWeight: this.shipLeftWeight, 
                    shipRightWeight: this.shipRightWeight, 
                    shipAverageWeight: this.shipAverageWeight,
                })
                this.serialControl.sendData({
                    command: 'TopRightIndicator',
                    arrivalTime: this.arrivalTime,
                    departureTime: this.departureTime,
                    distance: this.distance,
                })
                break
                case "All":
                    // console.log("All Syncro")
                    this.setUpdateData(this.currentBoatSpeed)
                    this.serialControl.sendData({
                        command: 'move', 
                        curPos: this.curPos, 
                        boatAngle: this.boatAngle,
                        shipLeftWeight: this.shipLeftWeight, 
                        shipRightWeight: this.shipRightWeight, 
                        shipAverageWeight: this.shipAverageWeight,
                    })
                    this.serialControl.sendData({
                        command: 'syncObstacle', 
                        npcShipLocations: this.npcShipLocations, })
                    this.serialControl.sendData({
                        command: 'TopRightIndicator',
                        arrivalTime: this.arrivalTime,
                        departureTime: this.departureTime,
                        distance: this.distance,
                    })
                    this.serialControl.sendData({
                        command: "echoSounder",
                        shipRightWeight: this.shipRightWeight, 
                        shipLeftWeight: this.shipLeftWeight, 
                        shipAverageWeight: this.shipAverageWeight})
                    break
        }
    }
}