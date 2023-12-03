import React, { useEffect, useState } from "react"
import useStore from '../helpers/store'
import _, { filter } from "lodash";
import dynamic from 'next/dynamic'
import "rc-dock/dist/rc-dock.css";
import EngineControl from "../components/engine/engine-control";
import BoatManager from "../events/boat/boat-manager";
import SerialControl from "../components/serial-control/serial-control"
import AnimatedBoatManager from "../events/boat/animated-boat-manager";

const LiveMap = dynamic(() => import('../components/live-map/map'), {
  loading: () => <p> Map is loading....</p>,
  ssr: false,
})

const RadarMap = dynamic(() => import('../components/radar/radar-map'), {
  loading: () => <p> Radar Map is loading....</p>,
  ssr: false,
})

const  EcoSounder = dynamic(() => import('../components/eco-sounder/eco-sounder'), {
  loading: () => <p> Eco Sounder is loading....</p>,
  ssr: false,
})

const  EngineIndicator = dynamic(() => import('../components/engine/engine_indicator'), {
  loading: () => <p> Engine is loading....</p>,
  ssr: false,
})

// useStore.setState({map_ss: <LiveMap />});

const DockLayout = dynamic(() => import('rc-dock'), {
  loading: () => <p>loading....</p>,
  ssr: false,
})


const boatManager = new BoatManager() 
const animatedBoatManager = new AnimatedBoatManager() 
animatedBoatManager.BoatManager = boatManager
// initiate serial controller
const serialControl = new SerialControl()
boatManager.serialControl = serialControl

let groups = {
  allowWindow: {
    floatable: false,
    newWindow: false,
    maximizable: true,
    closable: true,
    panelExtra: (panelData, context) => (
      <div className="flex flex-row">
        <span className='my-panel-extra-btn block px-1 m-auto'
              onClick={() => {
                boatManager.activateMaximizeMinimize()
                context.dockMove(panelData, null, 'maximize')
                }
              }>
          {panelData.parent.mode === 'maximize' ? '▬' : '▣'}
        </span>
        {/* <span className='my-panel-extra-btn'
              onClick={() => context.dockMove(panelData, null, 'new-window')}>
            ❏
        </span> */}
        <span className='my-panel-extra-btn block px-1 text-xs m-auto'
              onClick={() => context.dockMove(panelData, null, 'remove')}>
          ✖
        </span>
      </div>
    )
  }
};

export default function Home() {
  const dockRef = React.useRef(null)
  const [width, setWidth] = useState(200/2);
  const [height, setHeight] = useState(200/2);
  let xPos = 0
  let yPos = 0
  let xMargin = 5
  let yMargin = 5
  let offSet = xMargin * 4

  
useEffect(() => {
  setWidth(window.innerWidth/2 - offSet)
  setHeight(window.innerHeight/2 - offSet)
  // console.log(dockRef)
}, [])

  const handleOut = () =>{
    //
  }

  const generateLayout = () => {
    return {
      dockbox: {
        mode: 'vertical',
        children: [
          {
            mode: 'horizontal',
            children: [
              {
                tabs: [{
                  id: 'live_map', group: 'allowWindow', title: 'Autonomous', content: <LiveMap serialControl={serialControl} boatManager={boatManager} animatedBoatManager={animatedBoatManager} out={handleOut}/>,
                }]
              },
              {
                tabs: [{
                  id: 'radar', group: 'allowWindow', title: 'Radar', content: <RadarMap serialControl={serialControl} boatManager={boatManager} animatedBoatManager={animatedBoatManager}/>,
                }]
              },
            ]
          },
          {
            mode: 'horizontal',
            children: [
              {
                tabs: [{
                  id: 'eco', group: 'allowWindow', title: 'Echo Sounder', content: <EcoSounder serialControl={serialControl} boatManager={boatManager} />,
                }]
              },
              {
                tabs: [{
                  id: 'engine', group: 'allowWindow', title: 'Engine Indicator', 
                          content: <EngineIndicator serialControl={serialControl}
                                        boatManager={boatManager}
                                        engine1={{rotate: 30, speed: 20}} 
                                        engine2={{rotate: 60, speed: 30}} />
                }]
              }
            ]
          }
        ]
      },
    }
  }

  return (
    <>
      <DockLayout
        ref={dockRef}
        defaultLayout={generateLayout()}
        groups={groups}
        style={{
          position: "absolute",
          left: 10,
          top: 10,
          right: 10,
          bottom: 10,
        }}
      />
    </>
  )
}
