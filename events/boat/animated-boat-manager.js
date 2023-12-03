import {EventEmitter} from 'events'
import BoatManager from './boat-manager'

export default class AnimatedBoatManager extends EventEmitter {
    constructor() {
        super()
        this.previousDate = Date.now()
        this.tresholdDistance = 0.005
        this.timeout = null
        this.npcMovingShipLocations = []
        this.autoNPCBoatRoute = [
            [
                {lat: -7.116652110745536, lng: 112.6274469651097},
                {lat: -7.118554967628608, lng: 112.65959193976296},
                {lat: -7.1257216009978706, lng: 112.6564991923791},
                {lat: -7.126660080405161, lng: 112.63811452737511},
                {lat: -7.129987400997364, lng: 112.62969538171906},
            ],
            [
                {lat: -7.098223034818282, lng: 112.68449097241191},
                {lat: -7.0733084812893905, lng: 112.66971451268905},
            ],
            [
                {lat: -7.042326035348398, lng: 112.66636782648813},
                {lat: -7.124237331100666, lng: 112.6656805492917},
                {lat: -7.1808840927732005, lng: 112.70004440911232},
                {lat: -7.187708528676055, lng: 112.77014668314636},
            ],
            [
                {lat: -7.133715410125386, lng: 112.67143270568006},
                {lat: -7.121771167247097, lng: 112.66043627053749},
                {lat: -7.108461501586182, lng: 112.66559084951058},
                {lat: -7.118358469259482, lng: 112.68139822502805},
            ],
            [
                {lat: -7.104152989915479, lng: 112.62963750325109},
                {lat: -7.102105295610021, lng: 112.6576440490049},
                {lat: -7.106200675100201, lng: 112.67740326840176},
                {lat: -7.096815376457493, lng: 112.6969906684995},
            ],
            [
                {lat: -7.162679052610708, lng: 112.77912029347075},
                {lat: -7.193730651544236, lng: 112.76159472496225},
            ],
            [
                {lat: -7.1563212212230685, lng: 112.66553336584798},
                {lat: -7.156662463850766, lng: 112.69113444141435},
            ],
            [
                {lat: -7.199914977383742, lng: 112.77418064654368},
                {lat: -7.1842190433281, lng: 112.77521156233831},
                {lat: -7.182854153865604, lng: 112.69858015493836},
                {lat: -7.152484304847236, lng: 112.6783054776442},
                {lat: -7.1292790134062045, lng: 112.67658728465317},
                {lat: -7.0992468917527765, lng: 112.70270381811682},
            ],
            [
                {lat: -7.21868114198483, lng: 112.69892379353654},
                {lat: -7.195138011422208, lng: 112.69480013035809},
                {lat: -7.1842190433281, lng: 112.71370025325943},
                {lat: -7.174323501918634, lng: 112.74119134111592},
            ],
            [
                {lat: -7.075356303582838, lng: 112.64497253361819},
                {lat: -7.059997415125088, lng: 112.65493805296617},
                {lat: -7.037811454080696, lng: 112.65871807754644},
                {lat: -7.007090680818292, lng: 112.65528169156438},
                {lat: -7.0149417380381, lng: 112.69239466017066},
                {lat: -7.035763465694574, lng: 112.67349453726932},
                {lat: -7.078086719175569, lng: 112.667996319698},
                {lat: -7.0784280199887535, lng: 112.65184530558234},
            ],
        ]
        this.BoatManager = null
        this.show = true
        this.RadarMarkers = []
    }

    resetRadarMarker = () =>{
        this.RadarMarkers = []
    }

    setRadarMarker = (markerLoc) =>{
        this.RadarMarkers = markerLoc
    }

    showHideAnimatedBoat = (status) => {
        this.show = status
        this.emit('showHideAnimatedBoat', {show: status})
        this.BoatManager.serialControl.sendData({
            command: 'showHideAnimatedBoat', 
            show: status, 
        })
    }
    
    startTimer = () => {
        console.log(this.timeout)
        if(this.timeout == null) this.checkMovingBoat()
        // this.interval = setInterval(() => {
        //     const deltaTime = (Date.now() - this.previousLoopTime) / 1000
        //     this.checkMovingBoat(deltaTime)
        //     this.previousLoopTime = Date.now()
        // }, 0);
    }

    stop() {
        clearTimeout(this.accelTimeout)
        this.emit('change', this)
    }

    start() {
        this.previousLoopTime = Date.now()
        this.startTimer()
    }

    cleanup = () => {
        clearTimeout(this.timeout)
        // clearInterval(this.timeout)
    }

    addMovingNPCShip(idx, pos, dest){
        let savedInfo = {pos: pos, dest: dest, currentTarget: 1, routeType: "Forward"}
        if(!Array.isArray(dest)){
            let tempPos = pos
            savedInfo = {pos: pos, dest: [tempPos, dest], currentTarget: 1, routeType: "Forward"}
        }

        if(this.npcMovingShipLocations.length < idx + 1){
            this.npcMovingShipLocations.push(savedInfo)
        }else{
            this.npcMovingShipLocations[idx] = savedInfo
        }
        // setTimeout(() => {
        //     this.emit('addMovingShip', {index: idx, curPos: pos})
        //     // console.log("Emit add moving npc ship")
        // }, 10)
    }

    changeMovingShipStart(idx, pos){
        this.npcMovingShipLocations[idx].pos = pos
        this.emit('moveNPCMarker', {index: idx, curPos: pos})
    }

    changeMovingShipDest(idx, dest){
        this.npcMovingShipLocations[idx].dest = dest
    }

    checkMovingBoat = () => {
        const deltaTime = (Date.now() - this.previousLoopTime) / 1000
        if(this.BoatManager.activateDataListener == true){
            if(this.timeout != null) clearTimeout(this.timeout)
            return
        }
        // else{
            // console.log(this.BoatManager.activateDataListener)
            // console.log(this.timeout)
        // }
        let movingBoats = []
        for(let i = 0; i < this.npcMovingShipLocations.length; i++){
            let currentBoatSpeed = 25
            let pos = {lat: this.npcMovingShipLocations[i].pos.lat, lng: this.npcMovingShipLocations[i].pos.lng}
            let positions = this.npcMovingShipLocations[i].dest
            let selectedNodeIdx = this.npcMovingShipLocations[i].currentTarget
            let selectedNode = positions[selectedNodeIdx]

            let tempAngle = {x: 0, y: 0}
            tempAngle.x = selectedNode.lng - pos.lng
            tempAngle.y = selectedNode.lat - pos.lat

            let NPCBoatAngle = this.BoatManager.getAngleFromVectorDirection(tempAngle) * -1
            let NPCAngleMove = this.BoatManager.calcAngle(NPCBoatAngle)
            let NPCBoatMove = this.BoatManager.calcSpeed(currentBoatSpeed, NPCAngleMove)

            pos.lat += NPCBoatMove.lat * deltaTime
            pos.lng += (NPCBoatMove.lng / (Math.cos(NPCBoatMove.lat * Math.PI / 180))) * deltaTime
            this.npcMovingShipLocations[i].pos = pos
            let distanceInKm = this.BoatManager.getDistanceFromLatLonInKm(pos.lat, pos.lng, selectedNode.lat, selectedNode.lng)
            // if(i==1) console.log("SHIP " + i + "Distance is " + distanceInKm)
            if(distanceInKm < this.tresholdDistance){
                switch(this.npcMovingShipLocations[i].routeType){
                    case "Forward":
                        if(selectedNodeIdx == positions.length - 1){
                            this.npcMovingShipLocations[i].currentTarget = positions.length - 2
                            this.npcMovingShipLocations[i].routeType = "Backward"
                        }else{
                            this.npcMovingShipLocations[i].currentTarget++
                        }
                        break
                    case "Backward":
                        if(selectedNodeIdx == 0){
                            this.npcMovingShipLocations[i].currentTarget = 1
                            this.npcMovingShipLocations[i].routeType = "Forward"
                        }else{
                            this.npcMovingShipLocations[i].currentTarget--
                        }
                        break
                }
            }
            movingBoats.push({curPos: pos, angle: NPCBoatAngle})
        }
        // console.log("Emit data")
        // console.log(movingBoats)
        this.emit('moveNPCMarker', {movingBoats: movingBoats,})
        this.BoatManager.serialControl.sendData({
            command: 'moveNPCMarker', 
            movingBoats: movingBoats,
        })
        this.previousLoopTime = Date.now()
        setTimeout(() => {
            this.checkMovingBoat()
        }, 0)
    }
}