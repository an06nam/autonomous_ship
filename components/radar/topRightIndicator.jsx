import useStore from '../../helpers/store';
import React, { useEffect, useRef } from "react";
import { BiInfoCircle } from 'react-icons/bi';



const TopRightIndicator = ({boatManager, serialControl,}) => {
    //console.log("==Live map re render")
    const [localCurPos, setCurPos] = React.useState({lat: 0, lng: 0})
    const [distance, setDistance] = React.useState(0)
    const [departure, setDeparture] = React.useState(0)
    const [arrival, setArrival] = React.useState(0)
    const [fontSize, setFontSize] = React.useState("text-sm")

    const toggleDrawwer = useRef()

    let latLngMaxNumb = 10

    useEffect(() => {
        setBoatManagerTriggers()
        setSocketDataReceiver()
        toggleDrawwer.current.checked = true
        if(boatManager.activateDataListener){
            boatManager.requestSyncronize("TopRightIndicator")
        }else{
            boatManager.localSyncronize("TopRightIndicator")
        }
        if(boatManager.maximized) setFontSize("text-2xl")
    }, [])

    function setBoatManagerTriggers(){
        boatManager.on('updateTopRightIndicatorValues', (data) => {
            const {curPos, distance, departureTime, arrivalTime} = data
            setCurPos(curPos)
            setDistance(distance)
            setDeparture(departureTime)
            setArrival(arrivalTime)
        })
    }

    const setSocketDataReceiver = () =>{
        serialControl.on('data', (data) => {
            const {command} = data
            if(command == null || !boatManager.activateDataListener) return
            switch(command){
                case "TopRightIndicator":
                    const {distance, departureTime, arrivalTime} = data
                    if(distance == null || departure == null || arrivalTime == null) return
                    setDistance(distance)
                    setDeparture(departureTime)
                    setArrival(arrivalTime)
                    break
                case "move" :
                    const {curPos} = data
                    setCurPos(curPos)
                    break
            }
        })
    }

    function cutNumber(number, maxLength){
        let str = number.toString()
        if(str.length <= maxLength) return str
        return str.substring(0, maxLength)
    }

    const NumberIndicator = ({indicator, value, unit}) => (
        <p key={indicator} className={`font-sans font-light text-center ${fontSize} text-white ...`}>
            {indicator} {value} {unit}
        </p>
    )

    const IndicatorContainer = ({title, bars,}) => (
        <div className="pb-0.5">
            <p className={`font-sans text-center font-bold ${fontSize} text-gray-200 ...`}>
                {title}
            </p>
            <div>
                {bars.map((e) => 
                    NumberIndicator(e)
                )}
            </div>
        </div>
    )

    function makeTimeReadable(time){
        return new Date(time).toTimeString().split(' ')[0]
    }

    function timeSubtract(time1, time2){
        let result = Math.abs(time1 - time2)
        let returnDate = new Date(result).toTimeString().split(' ')[0]
        let dateArray = Array.from(returnDate)
        let hours = parseInt((dateArray[0] + dateArray[1]))-7
        let hoursArray = Array.from(hours)
        if(hoursArray.length > 1){
            dateArray[0] = hoursArray[0]
            dateArray[1] = hoursArray[1]
        }else{
            dateArray[0] = '0'
            dateArray[1] = hoursArray[0]
        }
        return dateArray.join("")
    }

    const ETA = () => IndicatorContainer({
        title: 'ETA', 
        bars: [
            {indicator: null, value: makeTimeReadable(arrival), unit: null},
    ]})

    const ETD = () => IndicatorContainer({
        title: 'ETD', 
        bars: [
            {indicator: null, value: makeTimeReadable(departure), unit: null},
    ]})

    const JarakRute = () => IndicatorContainer({
        title: 'Distance', 
        bars: [
            {indicator: distance.toFixed(2) + "Km", value: "|", unit: timeSubtract(arrival, departure)},
    ]})

    const Koodrinat = () => IndicatorContainer({
        title: 'Coordinate', 
        bars: [
            {indicator: "Lat: ", value: cutNumber(localCurPos.lat, latLngMaxNumb), unit: null},
            {indicator: "Lng: ", value: cutNumber(localCurPos.lng, latLngMaxNumb), unit: null},
    ]})

    const infoItems = [
            <div key="logo-stp" className="p-1 w-full h-1/6">
                <div style={{
                    backgroundImage: "url('./Logo-STP Martitim - ITS.jpeg')", 
                    backgroundPositionY: 'center',
                    backgroundPositionX: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'contain',
                    }} className="w-full h-full bg-white" />
            </div>,
            <div key="indicator" className="flex flex-col flex-1 justify-center items-center">
                <ETA />
                <ETD />
                <JarakRute />
                <Koodrinat />
            </div>,
            <div key="logo-nasdec" className="p-1 w-full h-1/6">
                <div 
                style={{
                    backgroundImage: "url('./Logo-NASDEC.jpeg')", 
                    backgroundPositionY: 'center',
                    backgroundPositionX: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'contain'}} className="w-full h-full bg-white" />
            </div>
    ]

    return (
        <>
        <div className={`drawer drawer-end absolute z-50 top-0 w-full h-full`}>
            {/* open drawer */}
            <input ref={toggleDrawwer} id="my-info" type="checkbox" className="drawer-toggle" /> 
            <div className={`drawer-side overflow-hidden h-full`}>
                <label htmlFor="my-info" className="drawer-overlay"></label> 
                <div className="w-1/4 flex flex-col overflow-y-auto justify-center items-center bg-black opacity-80 text-base-content">
                    {infoItems}
                </div>
            </div>
        </div>
        <label className={`absolute z-50`} htmlFor="my-info" className="absolute z-50 bottom-0 right-0 btn btn-xs drawer-button"><BiInfoCircle /></label>
        </>
    )
}
export default TopRightIndicator;