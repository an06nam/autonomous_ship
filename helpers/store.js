import create from 'zustand'
import generateLayout from './layout'

const useStore = create(set => ({
  currentBreakpoint: "lg",
  compactType: "horizontal",

  mounted: false,
  layouts: { lg: generateLayout() },
  map: null,
  markerLayer: null,
  routeLayer: null,
  shipsLayer: null,
  clickControl: null,
  radarMap: null,
  radarMarkerLayer: null,
  radarRouteLayer: null,
  routePolyLine: null,

  currentPosition: {lat: -7.1150, lng: 112.6504},
  test2Position: {lat: -7.1880, lng: 112.7135},
  testPosition: {lat: -7.1300, lng: 112.6700},
  destinationPosition: {lat: -7.1150, lng: 112.6300},

  pixelBoatPosition: null,
  redMapDimensions: null,

  allowMovement: false,
  TileSize: 4,
  boatSpeed: {lat: 0, lng: 0},
  boatAngle: 0,
  targetBoatspeed: 0,
  currentBoatspeed: 0,

  aPath: [],
  aPathDistance: 0,

  departureTime: new Date,
  arrivalTime: new Date,

  processedImage: null,
  Tiles:[],

  autoDrive: false,
  processingRadar: false,

  activateAstar:false,
  npcShips: null,

  shipLeftWeight: 0,
  shipRightWeight: 0,
  shipAverageWeight: 0,

  forwardDirection: {x: 0, y:0},
  rightDirection: {x: 0, y:0},
  leftDirection: {x: 0, y:0},

  savedBoundaries: {northEast: {lat:0, lng:0}, southWest: {lat:0, lng:0}},

  mapSetup: (setMap, setMarkerLayer, setRouteLayer) => set(state => ({ 
    map: setMap, 
    markerLayer:setMarkerLayer, 
    routeLayer:setRouteLayer })),
  removeAllBears: () => set({ bears: 0 })
}))

export default useStore
