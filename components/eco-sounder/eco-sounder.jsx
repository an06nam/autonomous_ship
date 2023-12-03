import { motion } from "framer-motion";
import { range } from "lodash";
import useStore from '../../helpers/store';
import React, { useEffect } from "react";


const EcoSounder = ({boatManager, serialControl,}) => {
    let leftRange = {min: 60, max: 100}
    let rightRange = {min: 60, max: 100}
    // let heightRange = {min: -60, max: 60} if range 0 - 100
    let heightRange = {min: 30, max: 60}
    

    const [weightLeft, setWeightLeft] = React.useState(leftRange.max)
    const [weightRight, setWeightRight] = React.useState(rightRange.max)
    const [heightMeter, setHeightMeter] = React.useState(0)
    const [depth, setDepth] = React.useState(17)
    const [minDepth, setMinDepth] = React.useState(3)
    const [maxDepth, setMaxDepth] = React.useState(17)
    const [depthNumberFontSize, setDepthNumberFontSize] = React.useState("text-11xl")
    const [depthFontSize, setDepthFontSize] = React.useState("text-8xl")


    useEffect(() => {
        setBoatManagerTriggers()
        if(boatManager.activateDataListener){
            boatManager.requestSyncronize("EchoSounder")
        }
        if(boatManager.maximized){
            setDepthNumberFontSize("text-12xl")
            setDepthFontSize("text-9xl")
        }
    }, [])

    function setBoatManagerTriggers(){
        boatManager.on('move', (data) => {
            const {shipLeftWeight, shipRightWeight, shipAverageWeight} = data
            // console.log("Echo sounder Ship left weight = " + shipLeftWeight + "Ship right weight = " + shipRightWeight + "Ship average weight = " + shipAverageWeight)
            calculateEcho(shipLeftWeight, shipRightWeight)
            calculateDepth(shipAverageWeight)
        })

        serialControl.on('data', (data) => {
            const {command, shipLeftWeight, shipRightWeight, shipAverageWeight} = data
            if(command != "echoSounder" || !boatManager.activateDataListener) return
            if(shipAverageWeight == null) return
            // console.log("Echo sounder Ship left weight = " + shipLeftWeight + "Ship right weight = " + shipRightWeight + "Ship average weight = " + shipAverageWeight)
            calculateEcho(shipLeftWeight, shipRightWeight)
            calculateDepth(shipAverageWeight)
        })
    }

    const clamp = (num, min, max) => {
        return Math.min(Math.max(num, min), max)
    }

    function calculateEcho(triggerLeftChange, triggerRightChange){
        let TileSize = boatManager._tileSize
        let maxWeight = Math.pow(TileSize, 2)
        // let maxWeight = 32
        let multiplier = 1
        let currentLeft = leftRange.max - (triggerRightChange * multiplier) / maxWeight * (leftRange.max - leftRange.min)
        let currentRight = rightRange.max - (triggerLeftChange * multiplier) / maxWeight * (rightRange.max - rightRange.min)
        setWeightLeft(currentLeft)
        setWeightRight(currentRight)
        let highestOfTwo = triggerLeftChange > triggerRightChange ? triggerLeftChange : triggerRightChange
        // console.log("Echo level = " + highestOfTwo + " / " + maxWeight + " = " + highestOfTwo/maxWeight)
        let meterLevel = (Math.min(highestOfTwo, maxWeight) / maxWeight * (heightRange.max - heightRange.min)) + heightRange.min
        // console.log(meterLevel)
        setHeightMeter(meterLevel)
    }

    function calculateDepth(shipAverageWeight){
        let TileSize = boatManager._tileSize
        let maxWeight = Math.pow(TileSize, 2)
        // console.log("Depth level " + shipAverageWeight + " / " + maxWeight + " = " + (maxWeight - shipAverageWeight)/maxWeight)
        let calcDepth = (maxWeight - shipAverageWeight) / maxWeight * maxDepth

        setDepth(clamp(calcDepth, 0, 17))
    }

    return (
        <div className="w-full h-full overflow-auto" style={{backgroundColor:'#2c3d96'}}>
            {/* less is move to left, more move to right*/}
            <motion.div 
                className="absolute w-full bottom-0" 
                transition={{ duration: 0.5 }}
                style={{left: leftRange.max +'%'}}
                animate={{left: clamp(weightLeft, leftRange.min, leftRange.max) +'%'}}
                >
                <img className="h-full" src="./eco_r.svg" alt="eco sounder right" />
            </motion.div>

             {/* less is move to right, more move to left*/}
            <motion.div 
                className="absolute w-full bottom-0" 
                transition={{ duration: 0.5 }}
                style={{right: rightRange.max +'%'}}
                animate={{right: clamp(weightRight, rightRange.min, rightRange.max) +'%'}}
                >
                <img className="h-full" src="./eco_l.svg" alt="eco sounder left" />
            </motion.div>

            {/* 0 at 60%, 50 at 0 , 100 at -60%*/}
            <motion.div className="text-white h-full absolute right-0 flex flex-col"
                transition={{ duration: 0.5 }}
                style={{top: 0 +'%'}}
                animate={{top: heightMeter +'%'}}
            >
                {range(0, 150, 50).map(l => {
                    return (<span key={l} className="pb-36 text-right font-bold">{l}</span>)
                })}
            </motion.div>

            <div className="text-white font-bold absolute left-0 top-0 flex flex-col">
                <span className={`${depthNumberFontSize} p-0 m-0`}>{depth.toFixed(0)}m</span>
                <span className={`${depthFontSize} p-0 m-0`}>Depth</span>
                {/* <span className="text-xl">{12}v</span> */}
            </div>
        </div>
    )
}

export default EcoSounder