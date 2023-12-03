importScripts('./helper.js')
importScripts('./tile.js')
importScripts('./astar.js')

/**
 * With OpenCV we have to work the images as cv.Mat (matrices),
 * so the first thing we have to do is to transform the
 * ImageData to a type that openCV can recognize.
 */
function imageProcessing({ msg, payload: {map, from, to, tileSize} }) {
  // console.log("Start Image Processing")

  // filter map to be red for the land and black for ocean
  const redMap = turnToRed(map)
  const imageData = imageDataFromMat(redMap)

  //Payload[0] = image data
  //Payload[1] = start location x
  //Payload[2] = start location y
  //Payload[3] = cut size

  let startTile = getCoordinateInTile(from, tileSize)
  let endTile = getCoordinateInTile(to, tileSize)
  let idxStart = getIndexInTile(from, tileSize)
  let idxEnd = getIndexInTile(to, tileSize)

  let Tiles = SetTilesWeight(imageData, redMap, idxStart, idxEnd, tileSize)
  //console.log("Assign H Cost and duplicate tile for return")
  //console.log("Assign H Cost and duplicate tile for return")
  let TileDuplicateBeforeBlur = duplicateTiles(Tiles)

  //weight blur
  // Tiles = Tiles.map(x => x.map(y => y.weightBlur(TileDuplicateBeforeBlur)))
  for(let i = 0; i < Tiles.length; i++){
    for(let j = 0; j < Tiles[i].length; j++){
      Tiles[i][j].weightBlur(TileDuplicateBeforeBlur)
    }
  }

  const recordTile = aStarGenerator(idxStart, idxEnd, Tiles)

  // let TileDuplicate = []
  // for(let i = 0; i < Tiles.length; i++){
  //   let assignTile = []
  //   for(let j = 0; j < Tiles[i].length; j++){
  //     Tiles[i][j].calculateWeightedHCost(Tiles, idxEnd)
  //     //if(i == 50 && j == 50){
  //     //  Tiles[i][j].calculateWithNN(Tiles[i][j].index, idxEnd, Tiles)
  //     //}
  //     let dupeTile = new Tile(
  //       {x: 0, y:0}, 
  //       {x: 0, y:0}, 
  //       0, 
  //       2, 
  //       {x: 0, y:0}, 
  //       {x: 0, y:0})  
  //     dupeTile.copyTileData(Tiles[i][j])
  //     assignTile.push(dupeTile)
  //   }
  //   TileDuplicate.push(assignTile)
  // }
  // console.log("Image Processing Done")
  postMessage({ msg, payload: {result: imageData, tilePath: recordTile, tiles: Tiles}})//, TileDuplicate, startTile, endTile, aPath, redMapReturn, idxStart, radarAPath] })
}

function checkInException(array, idxStart, idxEnd){
  for(let i=0; i < array.length ;i++){
    if(array[i][0].x == idxStart.x && 
      array[i][0].y == idxStart.y &&
      array[i][1].x == idxEnd.x && 
      array[i][1].y == idxEnd.y){
      return true
    }
  }
  return false
}

function checkPosInArray(array, idxStart){
  for(let i=0; i < array.length ;i++){
    if(array[i].x == idxStart.x && 
      array[i].y == idxStart.y ){
      return true
    }
  }
  return false
}


function getIdx(array, Index) {
  let getArray = array[Index.x]
  let getArray2 = getArray[Index.y]
  return getArray2
}

function checkTileBlock(Tiles, idxStart, idxEnd){
  let xDiff = Math.abs(idxStart.x - idxEnd.x)
  let yDiff = Math.abs(idxStart.y - idxEnd.y)
  let currentTile = {x: idxStart.x, y:idxStart.y}
  let replacementRoute = []
  let maxLoop = 99999
  while(xDiff != 0 || yDiff != 0){
    if (xDiff != 0 && yDiff != 0){
      xDiff--
      yDiff--
      if(currentTile.x > idxEnd.x){
        currentTile.x--
      }else if(currentTile.x < idxEnd.x){
        currentTile.x++
      }

      if(currentTile.y > idxEnd.y){
        currentTile.y--
      }else if(currentTile.y < idxEnd.y){
        currentTile.y++
      }
    }
    else if(xDiff != 0){
      xDiff--
      if(currentTile.x > idxEnd.x){
        currentTile.x--
      }else if(currentTile.x < idxEnd.x){
        currentTile.x++
      }
    }
    else if(yDiff != 0){
      yDiff--
      if(currentTile.y > idxEnd.y){
        currentTile.y--
      }else if(currentTile.y < idxEnd.y){
        currentTile.y++
      }
    }
    replacementRoute.push({x: currentTile.x, y:currentTile.y})
    if(Tiles[currentTile.x][currentTile.y].weight != 0){
      return [true, replacementRoute]
    }
    maxLoop--
    if(maxLoop <= 0){
      console.log("MAX LOOP BREAK!")
      break
    }
  }
  return [false, replacementRoute]
}

function checkAvaliabe(array, index) {
  for(let i=0; i < array.length ;i++){
    if(array[i].x == index.x && array[i].y == index.y){
      return true
    }
  }
  return false
}

function recalculatePath ({msg, payload: {tiles, from, to, tileSize, imageData}}) {
  // console.log('Recalculate Path')

  // assign as Tile Class
  tiles = tiles.map(tx => tx.map(ty => new Tile(ty.index, ty.position, ty.weight)))
  // console.log({tiles, from, to, tileSize, imageData})
  let idxStart = getIndexInTile(from, tileSize)
  let idxEnd = getIndexInTile(to, tileSize)
  // const redMap = cv.matFromImageData(imageData)
  const recordTile = aStarGenerator(idxStart, idxEnd, tiles)
  // console.log(recordTile)
  // console.log('Recalculate Path Done')
  postMessage({ msg, payload: {aPath: recordTile} })
}


function singleAStar({ msg, payload }) {
  console.log("Run A* Calculations")
  let scannedTilesPosition = []
  let getTiles = payload[0]
  let searchStart = payload[1]
  let searchEnd = payload[2]
  let redMap = cv.matFromImageData(payload[4])

  //console.log("Duplicate Tiles")
  let Tiles = []
  for(let i = 0; i < getTiles.length; i++){
    let assignTile = []
    for(let j = 0; j < getTiles[i].length; j++){
      let dupeTile = new Tile(
        {x: 0, y:0}, 
        {x: 0, y:0}, 
        0, 
        2, 
        {x: 0, y:0}, 
        {x: 0, y:0})
      dupeTile.copyTileData(getTiles[i][j])
      assignTile.push(dupeTile)
    }
    Tiles.push(assignTile)
  }

  let idxStart = {x:0, y:0}
  let idxEnd = {x:0, y:0}

  //console.log("Search start-end tiles")
  let startTile = {x: 0, y:0}
  let endTile = {x: 0, y:0}
  let idxSearch = {x:0, y:0}
  idxSearch.x = 0
  for (let i = 0; i < redMap.cols; i+= this.TileSize){
    idxSearch.y = 0
    for (let j = 0; j < redMap.rows; j+= this.TileSize){
      //check if start-end 
      if (i <= searchStart.lng && j <= searchStart.lat && (i+this.TileSize) > searchStart.lng && (j+this.TileSize) > searchStart.lat  ){
        startTile.x = i
        startTile.y = j
        idxStart.x = idxSearch.x
        idxStart.y = idxSearch.y
        if (searchEnd != payload[2]){
          break;
        }
      }

      if (i <= searchEnd.lng && j <= searchEnd.lat && (i+this.TileSize) > searchEnd.lng && (j+this.TileSize) > searchEnd.lat  ){
        endTile.x = i
        endTile.y = j
        idxEnd.x = idxSearch.x
        idxEnd.y = idxSearch.y
        if (searchStart != payload[1]){
          break;
        }
      }
      idxSearch.y++
    }
    idxSearch.x++
  }

  let openNodesPositions = []
  let closedNodesPositions = []
  Tiles[idxStart.x][idxStart.y].prevTile = "Start"
  openNodesPositions.push({x: idxStart.x, y: idxStart.y})

  //console.log("A* Path calculation")
  //A* Pathfinding
  let pathFound = false
  let weightTreshold = 0.3
  let smallestFcost = 10000000
  let smallestFcostIndex = 0
  let finalNode = {x: idxEnd.x, y: idxEnd.y}
  let finishCountdown = 100
  let maxLoop = 9999
  while(finishCountdown > 0){
    for (let i = 0; i < openNodesPositions.length; i++){
      //Scan for smallest fCost
      let pos = {x: openNodesPositions[i].x, y: openNodesPositions[i].y}
      let itemFCost = Tiles[pos.x][pos.y].fCost
      let itemHCost = Tiles[pos.x][pos.y].hCost
      if(i == 0 ){
        smallestFcost = itemFCost
        smallestFcostIndex = i
      }
      // || (smallestFcost == itemFCost && smallestHcost > itemHCost)
      if(smallestFcost > itemFCost ){
        smallestFcost = itemFCost
        smallestFcostIndex = i
      }
    }
    //Set selected as A* index to search around
    let TileIndex = {x: openNodesPositions[smallestFcostIndex].x, y: openNodesPositions[smallestFcostIndex].y}  
    let currentTileGcost = Tiles[TileIndex.x][TileIndex.y].gCost
    closedNodesPositions.push({x: openNodesPositions[smallestFcostIndex].x, y:openNodesPositions[smallestFcostIndex].y})
    openNodesPositions.splice(smallestFcostIndex, 1)

    //Add gcost
    for(let i = -1; i < 2; i++){
      //Prevent x out of bounds
      if((TileIndex.x + i) < 0 || (TileIndex.x + i) >= Tiles.length){
        continue
      }
      for(let j = -1; j < 2; j++){
        //Prevent y out of bounds
        if((TileIndex.y + j) < 0 || (TileIndex.y + j) >= Tiles[TileIndex.y].length){
          continue
        }

        //Skip if current tile
        if(i == 0 && j ==0){
          continue
        }

        //Process selected tile
        let scanTile = {x: (TileIndex.x + i), y: (TileIndex.y + j)}

        //if red unwalakable or in closed
        if(Tiles[scanTile.x][scanTile.y].weight > (this.TileSize * weightTreshold) || 
          checkAvaliabe(closedNodesPositions, scanTile)){
          continue
        }
        
        
        let newPath = Tiles[TileIndex.x][TileIndex.y].gCost + Tiles[TileIndex.x][TileIndex.y].calculateCost(scanTile) + (Tiles[scanTile.x][scanTile.y].weight * this.weightMultiplier)
        if(newPath < Tiles[scanTile.x][scanTile.y].gCost || !checkAvaliabe(openNodesPositions, scanTile)){
          Tiles[scanTile.x][scanTile.y].gCost = newPath
          Tiles[scanTile.x][scanTile.y].calculateHCost(idxEnd)
          Tiles[scanTile.x][scanTile.y].calculateFCost()
          Tiles[scanTile.x][scanTile.y].prevTile = TileIndex

          if(!checkAvaliabe(openNodesPositions, scanTile)){
            openNodesPositions.push({x:scanTile.x, y:scanTile.y})
          }
        }
        
        //Check if end tile
        if(scanTile.x == idxEnd.x && scanTile.y == idxEnd.y){
          pathFound = true
          finalNode = scanTile
        }
      }
    }

    if(pathFound){
      finishCountdown--
    }

    //Remove smallestFcost
    if(openNodesPositions.length == 0){
      console.log("MISSION FAIL! ABORT")
      break
    }
    maxLoop--
    if(maxLoop <= 0){
      console.log("MAX LOOP BREAK!")
      break
    }
  }

  //console.log("Path building")
  let aPath = []
  let loopPath = true
  let currentBackTrack = finalNode
  
  maxLoop = 9999
  if(currentBackTrack){
    while (loopPath) {
      aPath.push(currentBackTrack)
      if(Tiles[currentBackTrack.x][currentBackTrack.y].prevTile != "Start" ){
        currentBackTrack = Tiles[currentBackTrack.x][currentBackTrack.y].prevTile
      }else{
        loopPath = false
      }
      maxLoop--
      if(maxLoop <= 0){
        console.log("MAX LOOP HIT")
        break
      }
    }
  }
  
  aPath = aPath.reverse()
  let radarAPath = []
  for(let i = 0; i < aPath.length;i++){
    radarAPath[i] = aPath[i]
  }

  //console.log("Zig zag remover")

  for(let i = 0; i < aPath.length-2; i++){
    let diff1 = {x: Math.abs(aPath[i].x - aPath[i+1].x), y: Math.abs(aPath[i].y - aPath[i+1].y)}
    let diff2 = {x: Math.abs(aPath[i].x - aPath[i+2].x), y: Math.abs(aPath[i].y - aPath[i+2].y)}
    if(diff2.x == 0 || diff2.y == 0){
      if(diff2.x == 0 && diff1.x != 0){
        aPath[i+1].x=aPath[i].x
      }
      if(diff2.y == 0 && diff1.y != 0){
        aPath[i+1].y=aPath[i].y
      }
    }
  }

  //let turningPoint = []
  for(let i = 1; i < aPath.length-1; i++){
    let diff1 = {x: Math.abs(aPath[i].x - aPath[i-1].x), y: Math.abs(aPath[i].y - aPath[i-1].y)}
    let diff2 = {x: Math.abs(aPath[i].x - aPath[i+1].x), y: Math.abs(aPath[i].y - aPath[i+1].y)}
    if(diff1.x != diff2.x || diff1.y != diff2.y){
      aPath.splice(i, 1)
    }
  }
  console.log("A* Calculations Done")
  postMessage({ msg, payload: [aPath, startTile, endTile, idxStart, radarAPath] })
}

function cutImage({ msg, payload }) {
  //Payload[0] = image data
  //Payload[1] = start location x
  //Payload[2] = start location y
  //Payload[3] = cut size
  const img = cv.matFromImageData(payload[0])
  let result = new cv.Mat()
  let Weights = []
  for (let i = 0; i < img.cols; i+= this.TileSize){
    let addWeight = []
    for (let j = 0; j < img.rows; j+= this.TileSize){
      //for if the tile reach the edge
      let width = this.TileSize
      if ((i + this.TileSize) > img.cols){ width = img.cols - i}
      //290 + 20 > 300; width = 300 - 290

      //for if the tile height reach the edge
      let height = this.TileSize
      if ((j + this.TileSize) > img.rows){ height = img.rows - j}

      let rect = new cv.Rect(i, j, width, height);
      let cutImg = img.roi(rect);
      let weight = 1
      let additionalWeight = 2
      //If not black, add weight
      for (let l = 0; l < cutImg.rows; l++){
        for (let m = 0; m < cutImg.cols; m++){
          if (cutImg.ucharPtr(l, m)[0] != 0){
            weight += additionalWeight
          }
        }
      }
      addWeight.push(weight)
    }
    Weights.push(addWeight)
  }
  postMessage({ msg, payload: Weights })
}


/**
 * This function is to convert again from cv.Mat to ImageData
 */
function imageDataFromMat(mat) {
  // convert the mat type to cv.CV_8U
  const img = new cv.Mat()
  const depth = mat.type() % 8
  const scale =
    depth <= cv.CV_8S ? 1.0 : depth <= cv.CV_32S ? 1.0 / 256.0 : 255.0
  const shift = depth === cv.CV_8S || depth === cv.CV_16S ? 128.0 : 0.0
  mat.convertTo(img, cv.CV_8U, scale, shift)

  // convert the img type to cv.CV_8UC4
  switch (img.type()) {
    case cv.CV_8UC1:
      cv.cvtColor(img, img, cv.COLOR_GRAY2RGBA)
      break
    case cv.CV_8UC3:
      cv.cvtColor(img, img, cv.COLOR_RGB2RGBA)
      break
    case cv.CV_8UC4:
      break
    default:
      throw new Error(
        'Bad number of channels (Source image must have 1, 3 or 4 channels)'
      )
  }
  const clampedArray = new ImageData(
    new Uint8ClampedArray(img.data),
    img.cols,
    img.rows
  )
  img.delete()
  return clampedArray
}

/**
 *  Here we will check from time to time if we can access the OpenCV
 *  functions. We will return in a callback if it has been resolved
 *  well (true) or if there has been a timeout (false).
 */
function waitForOpencv(callbackFn, waitTimeMs = 30000, stepTimeMs = 100) {
  if (cv.Mat) callbackFn(true)

  let timeSpentMs = 0
  const interval = setInterval(() => {
    const limitReached = timeSpentMs > waitTimeMs
    if (cv.Mat || limitReached) {
      clearInterval(interval)
      return callbackFn(!limitReached)
    } else {
      timeSpentMs += stepTimeMs
    }
  }, stepTimeMs)
}

/**
 * This exists to capture all the events that are thrown out of the worker
 * into the worker. Without this, there would be no communication possible
 * with our project.
 */
onmessage = function (e) {
  switch (e.data.msg) {
    case 'load': {
      // Import Webassembly script
      self.importScripts('./opencv_3_4_custom_O3.js')
      waitForOpencv(function (success) {
        if (success) postMessage({ msg: e.data.msg })
        else throw new Error('Error on loading OpenCV')
      })
      break
    }
    case 'imageProcessing':
      return imageProcessing(e.data)
    case 'turnRed':
      // console.log(e.data)
      const redMap = turnToRed(e.data.payload)
      const imageData = imageDataFromMat(redMap)
      // console.log(imageData)
      return postMessage({msg: e.data.msg, payload: imageData})
    case 'recalculatePath':
      return recalculatePath(e.data)
    case 'singleAStar':
      return singleAStar(e.data)
    case 'simpleReddenMap':
      return simpleReddenMap(e.data)
    default:
      break
  }
}
