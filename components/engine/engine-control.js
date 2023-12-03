import { current } from 'daisyui/colors'
import {EventEmitter} from 'events'

export default class EngineControl extends EventEmitter {

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
        this.speedFromStore = 0
        this.engineSpeed = 0
        this.engineFuel = 10
        this.engineLubOil = 100
        this.engineOilPressure = {previous: [0, 0], current: [0, 0]}
        this.engineTrim = {previous: [0, 0], current: [0, 0]}
        this.engineRPM = {previous: [0, 0], current: [0, 0]}
        this.engineTemperature = {previous: [0, 0], current: [0, 0]}
        this.fuelConsumtionPerHour = 15
        this.engineLubOilConsumtionPerHour = 5
        this.distance = 0

        this.allowMovement = false
        this.previousDate = Date.now()

        this.startTimer()
    }

    startTimer = () =>{
        this.interval = setInterval(() => {
            // calculation engine consumption update
            if(this.allowMovement && this.distance > 0){
                let delta = Date.now() - this.previousDate

                this.engineFuel = this.engineFuel - (this.fuelConsumtionPerHour / 60 * (delta/1000))
                this.engineLubOil = this.engineLubOil - (this.engineLubOilConsumtionPerHour / 60 * (delta/1000))

                if(this.engineFuel <= 0){
                    this.allowMovement = false
                    this.emit('fuel', {fuel: this.engineFuel, msg: 'Fuel is empty'})
                }

                let estimateSpeed = 25 * 1.852
                let sailFuel = this.distance / estimateSpeed * this.fuelConsumtionPerHour
                if(this.engineFuel < sailFuel){
                    this.allowMovement = false
                    console.log("Need " + sailFuel.toFixed(2) +", While only have " + this.engineFuel.toFixed(2))
                    this.emit('fuel', {fuel: this.engineFuel, msg: "Need more fuel " + sailFuel.toFixed(2)+"%, While only have fuel " + Math.abs(this.engineFuel.toFixed(2))+"%"})
                }

                this.previousDate = Date.now()
            }
        }, 0);
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

    setUpdateData (currentSpeed, distance, allowMovement) {
        let index = this.searchIndicatorValues(currentSpeed)
        let currentValues = this.indicatorValues[index]
        let maxValues = this.indicatorValues[this.indicatorValues.length-1]
        this.setRPM([currentValues[0] / maxValues[0] * 100, currentValues[0] / maxValues[0] * 100])
        this.setOilPressure([currentValues[2] / maxValues[2] * 100, currentValues[1] / maxValues[1] * 100])
        this.setTrim([currentValues[3] / maxValues[3] * 100, currentValues[3] / maxValues[3] * 100])
        this.setTemperature([currentValues[4] / maxValues[4] * 100, currentValues[4] / maxValues[4] * 100])
        this.engineSpeed = currentSpeed
        this.distance = distance
        this.allowMovement = allowMovement

        this.emit('change', {
            fuel: this.engineFuel,
            oil: this.engineLubOil,
            rpm: this.engineRPM,
            oilPressure: this.engineOilPressure,
            trim: this.engineTrim,
            temperature: this.engineTemperature,
            speed: this.engineSpeed,
        })
    }

    refuel = () => {
        this.emit('refuel')
        this.engineFuel = 100
    }

    cleanup = () => {
        clearInterval(this.interval)
    }
}