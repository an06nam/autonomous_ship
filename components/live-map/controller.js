export class Controller {

    constructor({speed,
        angle,
        multiplier,
        auto_drive,
        start,
        callback
    }) {
            this.speed = speed
            this.angle = angle
            this.multiplier = multiplier
            this.auto_drive = auto_drive
            this.start = start
            this.callback = callback
    }
    
    calcSpeed = (kmphSpeed) => {
        let travelDist = kmphSpeed / timeFrame // travel distance during time frame in km/sec 
        perSecMove.lat = travelDist / latDivider
        perSecMove.lng = travelDist / lngDivider //still need 1/cos(lat)
    }

    calcAngle = (angle) =>{
        let originalPosition = {x: 0, y: 1} //Set original angle to north
        angleMove = {x: (Math.cos(angle * Math.PI / 180) * originalPosition.x - Math.sin(angle * Math.PI / 180) * originalPosition.y),
                    y: (Math.sin(angle * Math.PI / 180) * originalPosition.x + Math.cos(angle * Math.PI / 180) * originalPosition.y)}
        calculateSideAngle()
    }

    
    calculateAutoDrive = () => {
        let aPath = useStore.getState().aPath
        if(aPath.length > 2){
            const nextPos = aPath.length - 2
            let selectedNode = {lat:aPath[nextPos].lat, lng:aPath[nextPos].lng}
            if(!selectedNode) return
            var angleDeg = (Math.atan2(selectedNode.lng - curPos.lng, selectedNode.lat - curPos.lat) * 180 / Math.PI) * -1;
            console.log("Angle = " + angleDeg)
            calcAngle(angleDeg)
        }else{
            stopNavigation()
            //console.log("NAV CANCELED!! No path found!")
        }
    }

    calculateSideAngle = () => {
        console.log(angleMove)
        let Tiles = useStore.getState().Tiles
        let boatPixelPos = useStore.getState().pixelBoatPosition
        if(!Tiles || !boatPixelPos) return
        let fowardPos = {x: Math.round(angleMove.x) , y: Math.round(angleMove.y) * -1 } 
        let rightPos = {x: fowardPos.y * -1 , y:fowardPos.x  } 
        let leftPos = {x: fowardPos.y , y: fowardPos.x * -1 } 
        let weightLeft = Tiles[boatPixelPos.x + leftPos.x][boatPixelPos.y + leftPos.y].weight
        let weightRight = Tiles[boatPixelPos.x + rightPos.x][boatPixelPos.y + rightPos.y].weight
        // useStore.setState({
        //     forwardDirection: fowardPos,
        //     rightDirection: rightPos,
        //     leftDirection: leftPos,
        //     shipLeftWeight: weightLeft,
        //     shipRightWight: weightRight,
        // })
        this.callback({
            forwardDirection: fowardPos,
            rightDirection: rightPos,
            leftDirection: leftPos,
            shipLeftWeight: weightLeft,
            shipRightWeight: weightRight,
        })
        console.log("Left weight is = " + weightLeft + ", Right weight is = " + weightRight)
    }

    applyNavigation = () => {
        //console.log("XXXUPDATE allowMovement")
        useStore.setState({
            allowMovement: true
        })
        calcSpeed(inpSpeed)
        if(inpAutoDrive){
            calculateAutoDrive()
        }else{
            calcAngle(inpAngle)
        }
        //console.log("XXXUPDATE boatspeed?")
        boatSpeed.lat = perSecMove.lat * angleMove.y * inpTimeMultiplier
        boatSpeed.lng = perSecMove.lng * angleMove.x * inpTimeMultiplier
        //console.log("Speed is set")
        //console.log(boatSpeed)
    }

    stopNavigation = () => {
        boatSpeed.lat = 0
        boatSpeed.lng = 0
        //console.log("XXXUPDATE allowMovement")
        useStore.setState({
            allowMovement: false
        })
        //console.log("Speed is 0")
        //console.log(boatSpeed)
    }

    updatePosition = (curPosition) => {
        //console.log("Boat control use effect activate! === aPath Trigger")
        //console.log(autoDrive)
        //console.log(useStore.getState().aPath)
        if(this.auto_drive){
            // console.log("AYYY TURN THE STEEER!!!")
            const nextPos = aPath.length - 2
            if(aPath.length < 3) stopNavigation() 
            console.log(nextPos)
            let selectedNode = {lat:aPath[nextPos].lat, lng:aPath[nextPos].lng}
            if(!selectedNode) return
            //var angleDeg = (Math.atan2(selectedNode.lng - curPos.lng, selectedNode.lat - curPos.lat) * 180 / Math.PI) * -1;
            //console.log("Angle = " + angleDeg)
            // let curPosition = useStore.getState().currentPosition
            //console.log(selectedNode)
            //console.log(" X ")
            //console.log(curPosition)
            
            calcSpeed(inpSpeed)
            angleMove.x = selectedNode.lng - curPosition.lng
            angleMove.y = selectedNode.lat - curPosition.lat
            console.log("Curpos is " + curPos.lat + " X " + curPos.lng)
            while(Math.abs(angleMove.x) < 0.09 && Math.abs(angleMove.y) < 0.09){
                angleMove.x = angleMove.x * 10
                angleMove.y = angleMove.y * 10
            }
            while(Math.abs(angleMove.x) < 0.5 && Math.abs(angleMove.y) < 0.5){
                angleMove.x = angleMove.x * 2
                angleMove.y = angleMove.y * 2
            }
            calculateSideAngle()
            boatSpeed.lat = perSecMove.lat * angleMove.y * inpTimeMultiplier
            boatSpeed.lng = perSecMove.lng * angleMove.x * inpTimeMultiplier
        }
    }
}