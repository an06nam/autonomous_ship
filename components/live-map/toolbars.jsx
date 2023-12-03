import { useEffect, useRef, useState } from "react"
import {BiCog, BiHide, BiPlay, BiRefresh, BiShow, BiStop} from 'react-icons/bi'
import {MdClear, MdDirectionsBoatFilled, MdLocationOn, MdWarning} from 'react-icons/md'
import {RiSteeringFill} from 'react-icons/ri'

const Toolbars = ({enabled, triggerAlert, onChange, boatManager, ...props}) => {
    const maximumSpeed = 25

    const[mapShow, setMapShow] = useState(true)
    const[animBoatShow, setAnimBoatShow] = useState(true)
    const[show, setShow] = useState('')
    const[play, setPlay] = useState(false)
    const[autoDrive, setAutoDrive] = useState(false)
    const[triggerRender, setTriggerRender] = useState(0)
    const[showDrawer, setShowDrawer] = useState(false)

    const speedInp = useRef()
    const toggleDrawer = useRef()

    const[data, setData] = useState({
        mapClass: 'absolute z-0 opacity-100'
    })

    useEffect(() => {
        const mapClass = mapShow ? 'absolute z-0 opacity-100' : 'absolute z-0 opacity-0'

        setData({
            mapClass: mapClass, 
            play: play, 
            autoDrive: autoDrive,
            triggerRenderCount: triggerRender,
            speed: speedInp.current.value,
            animBoatShow: animBoatShow
        })
    }, [mapShow, animBoatShow, play, autoDrive, triggerRender])

    useEffect(() => {
        onChange(data)
    }, [data])

    useEffect(() => {
        speedInp.current.value = 25;
    }, [])

    const reRendering = () => {
        toggleDrawer.current.checked = false
        setShowDrawer(toggleDrawer.current.checked)
        setTriggerRender(triggerRender+1)
    }

    const tools = <div className="flex flex-col">
        <div className="tools">
            <label htmlFor="tools" className="label text-sm">Tools</label>
            <div className="px-4 flex flex-wrap w-full">
                {/* {start button} */}
                <div data-tip={play ? 'Stop' : 'Play'} className="tooltip">
                    <button className={`btn btn-xs hover:opacity-100 opacity-50`}
                        onClick={() => {
                        setPlay(prefix => !prefix)
                    }}
                    >
                        { play ? <BiStop /> : <BiPlay />}
                    </button>
                </div>

                {/* {Auto Drive Button} */}
                <div data-tip="Auto Drive" className="tooltip">
                    <button className={`btn btn-xs hover:opacity-100 ${autoDrive ? 'opacity-100': 'opacity-50'}`}
                        onClick={() => {
                            setAutoDrive(prefix => !prefix)}}
                    >
                        <RiSteeringFill />
                    </button>
                </div>

                <div data-tip="Generate Path" className="tooltip">
                    <button className="btn btn-xs opacity-50 hover:opacity-100"
                        onClick={reRendering}
                    >
                        <BiRefresh />
                    </button>
                </div>

                {/* show map */}
                <div data-tip={(mapShow ? "Hide":"Show")+ ' Map'} className="tooltip">
                    <button className="btn btn-xs opacity-50 hover:opacity-100"
                        onClick={() => setMapShow(prefix => !prefix)}
                    >
                        {mapShow ? <BiHide /> : <BiShow />}
                    </button>
                </div>

                {/* set departure position */}
                <div data-tip="Departure" className="tooltip">
                    <button className={`btn btn-xs hover:opacity-100 ${show == 'Start' ? 'opacity-100': 'opacity-50'}`}
                        onClick={() => {
                            setShow('Start')
                            boatManager.clickControl = 'Start'
                        }}
                    >
                        <MdDirectionsBoatFilled />
                    </button>
                </div>

                <div data-tip="Destination" className="tooltip">
                    <button className={`btn btn-xs hover:opacity-100 ${show == 'End' ? 'opacity-100': 'opacity-50'}`} 
                        onClick={() => {
                            setShow('End')
                            boatManager.clickControl = 'End'}}
                    >
                        <MdLocationOn />
                    </button>
                </div>

                <div data-tip="Obstacle" className="tooltip">
                    <button className={`btn btn-xs hover:opacity-100 ${show == 'Boat' ? 'opacity-100': 'opacity-50'}`}
                        onClick={() => {
                            setShow('Boat')
                            boatManager.clickControl = 'Boat'}}
                    >
                        <MdDirectionsBoatFilled className="text-yellow-400"/>
                    </button>
                </div>

                {/* show animated boats */}
                <div data-tip={(animBoatShow ? "Hide":"Show")+ ' Animated Boats'} className="tooltip">
                    <button className="btn btn-xs opacity-50 hover:opacity-100"
                        onClick={() => setAnimBoatShow(prefix => !prefix)}
                    >
                        {animBoatShow ? <BiHide className="text-yellow-400"/> : <BiShow className="text-yellow-400" />}
                    </button>
                </div>

                <div data-tip="Clear Selection" className="tooltip">
                    <button className={`btn btn-xs hover:opacity-100 ${show == 'Boat' ? 'opacity-100': 'opacity-50'}`}
                        onClick={() => {
                            setShow('')
                            boatManager.clickControl = ''
                            boatManager.clearObstacles()}}
                    >
                        <MdClear/>
                    </button>
                </div>
            </div>
        </div>
        <div className="form-control">
            <label htmlFor="speed" className="label">
                <span className="text-sm">Speed (kt)</span> 
            </label> 
            <input ref={speedInp} onKeyUp={(e) => {
                const value = e.target.value
                if (value > maximumSpeed) {
                    triggerAlert({description: 'Boat reach the maximum speed', icon: <MdWarning />, apply: null})
                    setTimeout(() => {
                        speedInp.current.value = maximumSpeed
                    }, 2000)
                }
            }} id="speed" type="number" min="0" max="25" className="input input-bordered input-xs"/>
        </div>
        {/* <div className="form-control">
            <label htmlFor="speed" className="label">
                <span className="text-sm">Animated Boats</span> 
            </label> 
            <div className="flex flex-wrap w-full">
                <div data-tip="Animated Boat Start" className="tooltip">
                    <button className={`btn btn-xs hover:opacity-100 ${show == 'AnimatedBoatStart-0' ? 'opacity-100': 'opacity-50'}`}
                        onClick={() => {
                            setShow('AnimatedBoatStart-0')
                            boatManager.clickControl = 'AnimatedBoatStart-0'}}
                    >
                        <MdDirectionsBoatFilled className="text-red-400"/>
                    </button>
                </div>

                <div data-tip="Animated Boat Destination" className="tooltip">
                    <button className={`btn btn-xs hover:opacity-100 ${show == 'AnimatedBoatDest-0' ? 'opacity-100': 'opacity-50'}`}
                        onClick={() => {
                            setShow('AnimatedBoatDest-0')
                            boatManager.clickControl = 'AnimatedBoatDest-0'}}
                    >
                        <MdLocationOn className="text-red-400"/>
                    </button>
                </div>
            </div>
        </div> */}
    </div>

    const handleDrawer = (drawer) => {
        if (enabled) setShowDrawer(drawer.target.checked)
    }

    return (
        <>
        <div className={`absolute z-50 top-0 w-full h-full ${showDrawer ? '': 'pointer-events-none'}`}>
            {/* open drawer */}
            <input onChange={handleDrawer} ref={toggleDrawer} id="my-drawer" type="checkbox" className="drawer-toggle" /> 
            <div className={`drawer-side h-full ${showDrawer ? '': 'pointer-events-none'}`}>
                <label htmlFor="my-drawer" className="drawer-overlay"></label> 
                <ul className="menu w-1/4 p-4 overflow-y-auto bg-black opacity-90 text-base-content">
                    <li>
                        {tools}
                    </li>
                </ul>
            </div>
        </div>
        <label className={`absolute z-50`} htmlFor={enabled ? 'my-drawer': ''} className="absolute z-50 bottom-0 btn btn-xs drawer-button"><BiCog /></label>
        </>
    )
}

export default Toolbars