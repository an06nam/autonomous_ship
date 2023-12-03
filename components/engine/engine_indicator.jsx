import { range } from "lodash"
import React from "react";
import { useEffect } from "react"
import useStore from '../../helpers/store';
import { motion } from "framer-motion";

const EngineIndicator = ({boatManager, serialControl,}) => {
    const [engineSpeed, setEngineSpeed] = React.useState(0)
    const [engineFuel, setEngineFuel] = React.useState(100)
    const [engineLubOil, setEngineLubOil] = React.useState(100)

    const [engineOilPressure, setEngineOilPressure] = React.useState({previous: [0, 0], current:[0, 0]})
    const [engineTrim, setEngineTrim] = React.useState({previous: [0 , 0], current: [0 , 0]})
    const [engineRPM, setEngineRPM] = React.useState({previous: [0 , 0], current: [0 , 0]})
    const [engineTemperature, setEngineTemperature] = React.useState({previous: [0 , 0], current: [0 , 0]})

    const [engineTitleFontSize, setEngineTitleFontSize] = React.useState("text-sm") //text-sm
    const [indicatorTitleFontSize, setIndicatorTitleFontSize] = React.useState("text-xs") //xs
    const [indicatorMetersFontSize, setIndicatorMetersFontSize] = React.useState("text-xs")//xs
    const [voltageFontSize, setVoltageFontSize] = React.useState("text-xs")//xs
    const [roundIndicatorTitleFontSize, setRoundIndicatorTitleFontSize] = React.useState("text-xs") //xs
    const [roundPercentageFontSize, setRoundPercentageFontSize] = React.useState("text-2xs") //xs
    const [lowerTitleFontSize, setLowerTitleFontSize] = React.useState("text-xs")//xs

    let triggerSpeedChange = useStore(state => state.currentBoatspeed)
    
    const [visibility, setVisibility] = React.useState(true)
    function checkInvisible(){
        if(visibility){
            return `visible`
        }else{
            return `invisible`
        }
    }

    useEffect(() => {
        boatManager.on('changeIndicator', (data) => {
            const {rpm, oilPressure, trim, temperature, speed, fuel, oil} = data
            if(rpm == null || oilPressure == null || trim == null || 
                temperature == null || speed == null || fuel == null || 
                oil  == null ) return
                // console.log("Indicator change from boat manager")
            setEngineRPM(rpm)
            setEngineOilPressure(oilPressure)
            setEngineTrim(trim)
            setEngineTemperature(temperature)
            setEngineSpeed(speed)
            setEngineFuel(fuel)
            setEngineLubOil(oil)
        })

        serialControl.on('data', (data) => {
            const {command, rpm, oilPressure, trim, temperature, speed, fuel, oil} = data
            if(command != "changeIndicator" || !boatManager.activateDataListener ) return
            if(speed == null) return
            setEngineRPM(rpm)
            setEngineOilPressure(oilPressure)
            setEngineTrim(trim)
            setEngineTemperature(temperature)
            setEngineSpeed(speed)
            setEngineFuel(fuel)
            setEngineLubOil(oil)
        })


        boatManager.on('refuel', () => {
            setEngineFuel(100) // refuel to 100%
        })

        if(boatManager.activateDataListener){
            boatManager.requestSyncronize("EngineIndicator")
        }else{
            boatManager.localSyncronize("EngineIndicator")
        }

        if(boatManager.maximized){
            setEngineTitleFontSize("text-lg")
            setIndicatorTitleFontSize("text-sm")
            setIndicatorMetersFontSize("text-base")
            setVoltageFontSize("text-lg")
            setRoundIndicatorTitleFontSize("text-base")
            setRoundPercentageFontSize("text-base")
            setLowerTitleFontSize("text-base")
        }

        return () => {
            boatManager.cleanup()
        }
    }, []);

    const YCoordinate = (max, interval, reverse) => {
        const el = (value) => (
            <div key={value} 
            className={`flex items-center justify-end ${reverse ? 'flex-row-reverse': ''}`} >
            <span className={`block ${indicatorMetersFontSize} text-right`}>{value}</span>&nbsp;
            <span className="flex-1"><hr /></span>
        </div>)

        const strLength = max.toString().length
        const render = range(0, max+interval, interval).reverse()
                        .map(e => {
                            const indexY = e.toString().length < strLength ? 
                                range(0, strLength - e.toString().length).map(() => '_').join('')+e.toString() :
                                e.toString()
                            return el(indexY)
                        })
        return ([...render])
    }

    function barTemplate({percentage}) {
        return `${percentage}%`
    }

    const BarIndicator = ({startPercentage, percentage, index, color}) => (
    <div key={index} className="flex flex-col justify-end items-center h-full w-1/2 px-2.5">
        <div className="bar relative h-full w-full">
            <motion.div 
                transformTemplate={barTemplate}
                initial={{height: startPercentage + '%'}}
                style={{height: startPercentage + '%'}} 
                transition={{ duration: 0 }}
                animate={{
                    height: percentage + '%'
                }}
                className={`absolute bottom-0 ${color} mr-1 w-full`}>
            </motion.div>
            <div className="bg-gray-800 mr-1 w-full h-full"></div>
            {/* <script>{console.log("Start percentage = " + startPercentage.toString() + "%, End Percentage = " + percentage.toString() + "%")}</script> */}
        </div>
        <span>{index}</span>
    </div>)

    const ContainerBarIndicator = ({title, unit, max, interval, bars, reverse=false}) => (
    <div className="px-1">
        <div className="flex flex-col container rounded-md bg-gray-600 h-full">
            <div className="flex justify-between font-bold p-2">
                <span className={indicatorTitleFontSize}>{title}</span>
                <span className={indicatorTitleFontSize}>{unit}</span>
            </div>
            <div className="overflow-hidden flex flex-col items-end h-full border border-black rounded-md relative bg-gradient-to-b from-gray-500 to-gray-600">
                {/* y coordinate */}
                <div className="flex-1 p-2 flex flex-col w-full justify-between relative">
                    {YCoordinate(max, interval, reverse)}
                    {/* bar */}
                    <div className={`absolute flex z-40 bottom-0 h-full w-full ${reverse ? 'pr-8 pl-3':'pr-3 pl-4'} pt-2.5`}>
                        {bars.map(e => BarIndicator(e))}
                    </div>
                </div>
            </div>
        </div>
    </div>)

    const RPM = () => ContainerBarIndicator({
        title: 'RPM', 
        unit: '(1x100)', 
        max: 60, 
        interval: 20, 
        bars: [
            {startPercentage: engineRPM.previous[0], percentage: engineRPM.current[0], index: 1, color: 'bg-blue-500'},
            {startPercentage: engineRPM.previous[1], percentage: engineRPM.current[1], index: 2, color: 'bg-red-500'}
    ]})

    const OilPressure = () => ContainerBarIndicator({
        title: 'Oil Pressure', 
        unit: '(kPa)',
        max: 600, 
        interval: 100, 
        bars: [
            {startPercentage: engineOilPressure.previous[0], percentage: engineOilPressure.current[0], index: 1, color: 'bg-blue-500'},
            {startPercentage: engineOilPressure.previous[1], percentage: engineOilPressure.current[1], index: 2, color: 'bg-blue-500'}
    ]})

    const Trim = () => ContainerBarIndicator({title: 'Trim', 
        unit: '', 
        max: 100, 
        interval: 20,
        reverse: true, 
        bars: [
            {startPercentage: engineTrim.previous[0], percentage: engineTrim.current[0], index: 1, color: 'bg-blue-500'},
            {startPercentage: engineTrim.previous[1], percentage: engineTrim.current[1], index: 2, color: 'bg-blue-500'}
    ]})

    const EngTemp = () => ContainerBarIndicator({
        title: 'Eng Temp',
        unit: '(°C)',
        max: 90, 
        interval: 30, 
        reverse: true, 
        bars: [
            {startPercentage: engineTemperature.previous[0], percentage: engineTemperature.current[0], index: 1, color: 'bg-blue-500'},
            {startPercentage: engineTemperature.previous[1], percentage: engineTemperature.current[1], index: 2, color: 'bg-blue-500'}
    ]})

    const clamp = (num, min, max) => {
        return Math.min(Math.max(num, min), max)
    }
    const speedNeedleAngleConverter = () => engineSpeed * 4.6
    const fuelNeedleAngleConverter = () => 45 + (1.84 * clamp(engineFuel, 0, 100))
    const oilNeedleAngleConverter = () => 45 + (1.84 * clamp(engineLubOil, 0, 100))
    function needleTemplate({rotate}) {
        return `rotate(${rotate})`
    }

    return (
        <div 
            style={{backgroundImage: 'url(./bg_engine.png)', backgroundRepeat: 'repeat'}} 
            className={`grid grid-cols-4 gap-1 text-white text-xs bg-gray-900 h-full ${checkInvisible()}`}
            >
            {/* first cols */}
            {/* nasdec logo */}
            <div className="">
                <div style={{
                    backgroundImage: "url('./Logo Nasdec-STP-ITS.svg')", 
                    backgroundPositionY: 'center',
                    backgroundPositionX: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'contain'}} className="rounded bg-white w-full h-full " />
            </div>
            <div className="col-span-2 text-center align-middle m-auto font-bold"><span className={engineTitleFontSize}>ENGINE</span></div>
            {/* voltage */}
            <div className="flex flex-col justify-center container rounded-md bg-gray-600 text-center">
                <span className={`font-bold ${voltageFontSize}`}>Voltage</span>
                <span className="flex">
                    <span className={`flex-1 ${voltageFontSize}`}>12.5V</span>
                    <span className={`flex-1 ${voltageFontSize}`}>12.5V</span>
                </span>
            </div>
            {/* end first cols */}
            {/* second cols */}

            {/* rpm indicator */}
            <OilPressure />

            {/* speedometer */}
            <div className="col-span-2 row-span-2 text-center text-xs align-middle font-bold">
                <div className="grid grid-cols-4 gap-1 h-full">
                    {/* engine 1&2 gps speed  */}
                    {range(0, 2).map(e => <div key={e} className="col-span-2">
                        <div style={{
                        backgroundImage: "url('./speedmeter.svg')", 
                        backgroundPositionX: 'center',
                        backgroundPositionY: 'center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: 'contain'}} className="relative flex items-center">
                            <div className="absolute w-full top-1/3">
                                <span className={`block ${roundIndicatorTitleFontSize}`}>AVG SPEED</span>
                            </div>
                            <div className="absolute w-full bottom-1/5 mb-">
                                <span className={`block ${roundPercentageFontSize}`}>{engineSpeed.toFixed(0)}</span>
                            </div>
                            <motion.img 
                                transformTemplate={needleTemplate}
                                transition={{ duration: 0 }}
                                style={{rotate: 0}} 
                                animate={{rotate: speedNeedleAngleConverter()}}
                                className="z-30" 
                                src="./needle.svg" 
                                alt="needle"
                            />
                            {/* <img style={{margin: '0 auto', transform: `rotate(${speedNeedleAngleConverter()}deg)`}} className="z-10" src="./needle.svg" alt="needle" /> */}
                        </div>
                    </div>)}
                    {/* engine 1&2 fuel&oil meter */}
                    {range(0, 4).map((e, i) => <div key={e} style={{
                        backgroundImage: "url('./fuelmeter.svg')", 
                        backgroundPositionX: 'center',
                        backgroundPositionY: 'center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: 'contain'}} className="relative flex items-center">
                            <div className="absolute w-full top-1/4">
                                <span className={`block ${roundIndicatorTitleFontSize}`}>{i % 2 === 0 ? 'FUEL' : 'LUB-OIL'}</span>
                            </div>
                            <div className="absolute w-full bottom-1/5 mb-">
                                <span className={`block ${roundPercentageFontSize}`}>{e % 2 == 0 ? clamp(engineFuel, 0, 100).toFixed(0) : clamp(engineLubOil, 0, 100).toFixed(0)}%</span>
                            </div>
                            <motion.img 
                                transformTemplate={needleTemplate}
                                transition={{ duration: 0 }}
                                style={{rotate: 0}} 
                                animate={{rotate: e % 2 == 0 ? fuelNeedleAngleConverter() : oilNeedleAngleConverter()}}
                                className="z-30" 
                                src="./needle.svg" 
                                alt="needle" 
                            />
                        </div>
                    )}
                    {/* engine 1&2 running hour */}
                    {range(0, 2).map((e, i) => <div key={e} className="col-span-2 m-auto">
                        <div className="flex flex-col">
                            <span className={lowerTitleFontSize}>ENGINE {i+1}</span>
                            <span className={lowerTitleFontSize}>{'00'}.{'00'}h</span>
                        </div>
                    </div>)}
                </div>
            </div>
            
            {/* trim indicator */}
            <Trim  />

            {/* oil pressure indicator */}
            <RPM />

            {/* eng temp indicator */}
            <EngTemp />
        </div>
    )
}
export default EngineIndicator;