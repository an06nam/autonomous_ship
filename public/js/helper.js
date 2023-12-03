const turnToRed = (imageData) => {
    //Make map red
    const img = cv.matFromImageData(imageData)
    let redMap = new cv.Mat()
    cv.cvtColor(img, redMap, cv.COLOR_RGB2RGBA)
    cv.cvtColor(img, img, cv.COLOR_RGB2HSV)

    let lowerH = 80
    let upperH = 139
    let lowerS = 49
    let upperS = 255
    let lowerV = 152
    let upperV = 255
    //Make blue into black, otherwise, red
    for (let i = 0; i < img.rows; i++){
        for (let j = 0; j < img.cols; j++){
            //0 = red, 1 = green, 2 = blue, 
            //Check if blue is highest value
            if (
                ((img.ucharPtr(i, j)[0] >= lowerH) && (img.ucharPtr(i, j)[1] <= upperH)) 
                && ((img.ucharPtr(i, j)[1] >= lowerS) && (img.ucharPtr(i, j)[1] <= upperS))
                && ((img.ucharPtr(i, j)[2] >= lowerV) && (img.ucharPtr(i, j)[2] <= upperV))
                ){
                redMap.ucharPtr(i, j)[0] = 0 
            }else{
                redMap.ucharPtr(i, j)[0] = 200 
            }
            redMap.ucharPtr(i, j)[1] = 0 
            redMap.ucharPtr(i, j)[2] = 0 
        }
    }

    return redMap
}

function coordToLatLang(targetCoord){
  return {lat: targetCoord.y, lng: targetCoord.x}
}

function getCoordinateInTile(targetCoord, size){
  if(targetCoord.lat == undefined && targetCoord.lng == undefined){
    targetCoord = coordToLatLang(targetCoord)
  }
  let xPos =  Math.floor(targetCoord.lng / size) * size
  let yPos =  Math.floor(targetCoord.lat / size) * size
  return {x: xPos, y: yPos}
}

function getIndexInTile(targetCoord, size){
  if(targetCoord.lat == undefined && targetCoord.lng == undefined){
    targetCoord = coordToLatLang(targetCoord)
  }
  let coord = getCoordinateInTile(targetCoord, size)
  let xPos = coord.x / size
  let yPos = coord.y / size
  return {x: xPos, y: yPos}
}

function checkSizeOutOffBounds(offset, maxSize, size){
  if ((offset + size) > maxSize){ 
    return maxSize - offset
  }
  return size
}

function SetTilesWeight(finalMap, redMap, idxStart, idxEnd, size){
  let Tiles = []
  //console.log("Assign weight and tiles")
  for (let i = 0; i < finalMap.width; i+= size){
    let addTile = []
    for (let j = 0; j < finalMap.height; j+= size){
      //for if the tile reach the edge
      //290 + 20 > 300; width = 300 - 290
      let width = checkSizeOutOffBounds(i, finalMap.width, size)

      //for if the tile height reach the edge
      let height = checkSizeOutOffBounds(j, finalMap.height, size)
      let rect = new cv.Rect(i, j, width, height);
      let cutRedMap = redMap.roi(rect);
      let weight = 0
      let additionalWeight = 1
      //If not black, add weight
      for (let l = 0; l < cutRedMap.rows; l++){
        for (let m = 0; m < cutRedMap.cols; m++){
          if (cutRedMap.ucharPtr(l, m)[0] != 0){
            weight += additionalWeight
          }
        }
      }
      let currentTile = new Tile(
        getIndexInTile({x: i, y: j}, size), 
        {x: i, y: j}, 
        weight, 
        (cutRedMap.rows * cutRedMap.cols))
      addTile.push(currentTile)
    }
    Tiles.push(addTile)
  }
  return Tiles
}

function makeEmptyTile(){
  return new Tile(
    {x: 0, y:0}, 
    {x: 0, y:0}, 
    0, 
    2, 
    {x: 0, y:0}, 
    {x: 0, y:0})
}

function duplicateTiles(Tiles){
  let TargetDuplicate = []
  for(let i = 0; i < Tiles.length; i++){
    let assignTile = []
    for(let j = 0; j < Tiles[i].length; j++){
      let dupeTile = makeEmptyTile()
      dupeTile.copyTileData(Tiles[i][j])
      assignTile.push(dupeTile)
    }
    TargetDuplicate.push(assignTile)
  }
  return TargetDuplicate
}