import cv from '../../services/cv'

export const longLatToPixel = ({lat, lng}, imageData, {northEast, southWest}) => {
    let pixel = {y: 0, x: 0}
    pixel.y = (lat - northEast.lat) / (southWest.lat - northEast.lat) * imageData.height
    pixel.x = (lng - southWest.lng) / (northEast.lng - southWest.lng) * imageData.width
    return pixel
}

export const coordinateToPixel = (from, to, imageData, boundaries) => {
    return {
        from: longLatToPixel(from, imageData, boundaries),
        to: longLatToPixel(to, imageData, boundaries),
    }
}

export const drawTiles = (ctx, imageData, tileSize, Tiles) => {
    let iIdx = 0
    for (let i = 0; i < imageData.width; i+= tileSize){
        let jIdx = 0
        for (let j = 0; j < imageData.height; j+= tileSize){
            ctx.beginPath();
            ctx.lineWidth = "1";
            ctx.strokeStyle = "white";
            ctx.rect(i, j, tileSize, tileSize);  
            ctx.stroke();

            ctx.font = "5px Arial";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            let iWeight = Tiles[iIdx][jIdx].weight
            // console.log(iWeight)
            ctx.fillText(iWeight, (i+(tileSize/2)-1), (j+(tileSize/2)-1));
            jIdx++
        }
        iIdx++
    }
}

export const drawPath = (ctx, paths, tileSize) => paths.forEach(p => {
    ctx.beginPath();
    ctx.lineWidth = "1";
    ctx.strokeStyle = "blue";
    ctx.rect(p.index.x * tileSize, p.index.y * tileSize, tileSize, tileSize);  
    ctx.stroke();
})

export const drawRadar = (ctx, image) => {
    drawCircle(ctx, image, "gray", 1, 0.5)
    drawCircle(ctx, image, "white", 3, 1)
    drawCircle(ctx, image, "gray", 1, 1.5)
}
  
export const drawCircle = (ctx, {width, height}, color, circleWidth, radiusMultiplier ) => {
    ctx.beginPath();
    ctx.lineWidth = circleWidth.toString();
    ctx.strokeStyle = color;
    ctx.arc(width/2, height/2, ((height/2) - circleWidth) * radiusMultiplier, 0, 2 * Math.PI);
    ctx.stroke();
}

export const pixelToLongLat = ({x, y}, image, tileSize, {southWest, northEast}) => {
    let tilePos = {y: (y * tileSize) + tileSize/2, x: (x * tileSize) + tileSize/2}

    const realPos = {lat: 0, lng: 0}
    realPos.lat = ((tilePos.y) / (image.height) * (southWest.lat - northEast.lat)) + northEast.lat
    realPos.lng = ((tilePos.x) / (image.width) * (northEast.lng - southWest.lng)) + southWest.lng

    return realPos
}

export const getMoveVector = (pos1, pos2) =>{
    return {x: pos1.x - pos2.x, y: pos1.y - pos2.y}
}

export const trimRoute = (path) => {
    if(path[0] == null || path[path.length - 1] == null) return path
    let newPath = [path[0]]
    for(let i = 1; i < path.length - 1; i++){
        let checkPrev = getMoveVector(path[i-1], path[i])
        let checkNext = getMoveVector(path[i+1], path[i])
        if(checkPrev.x != 0) checkPrev.x *= -1
        if(checkPrev.y != 0) checkPrev.y *= -1
        if(!(checkPrev.x == checkNext.x && checkPrev.y == checkNext.y)){
            newPath.push(path[i])
        }
    }
    newPath.push(path[path.length - 1])
    return newPath
}

export const pathToCoordinate = (path, image, tileSize, boundaries) => {   
    let trimmedPath = trimRoute(path)
    let savedPath = trimmedPath.map(p => pixelToLongLat(p, image, tileSize, boundaries))
    return savedPath
}

export const drawRadarIndicator = (ctx, start, end, tileSize, {forward, left, right}) => {  
    let rectSize = tileSize
    let rectOffset = rectSize / 2

    ctx.beginPath();
    ctx.lineWidth = "1";
    ctx.fillStyle = "red";
    ctx.fillRect(start.x + (tileSize * forward.x ), start.y + (tileSize * forward.y ), rectSize, rectSize);  
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = "1";
    ctx.fillStyle = "yellow";
    ctx.fillRect(start.x + (tileSize * left.x ), start.y + (tileSize * left.y ), rectSize, rectSize);  
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = "1";
    ctx.fillStyle = "brown";
    ctx.fillRect(start.x + (tileSize * right.x ), start.y + (tileSize * right.y ), rectSize, rectSize);  
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = "1";
    ctx.fillStyle = "blue";
    ctx.fillRect(start.x, start.y , rectSize, rectSize);  
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = "1";
    ctx.fillStyle = "green";
    ctx.fillRect(end.x, end.y, rectSize, rectSize);  
    ctx.stroke();
}

export const turnRedMap = async (ctx, imageData) => {    
    await cv.load()
    const {data: {payload}} = await cv.turnRed(imageData)//, TileSize, mapStartPos, mapDestPos])
    console.log(payload)
    ctx.clearRect(0,0,canvas.width,canvas.height)
    ctx.putImageData(payload, 0, 0)
}

export const generatePathData = async (startPos, destPos, tileSize, map, imageData) => {
    const northEast = map.getBounds()._northEast
    const southWest = map.getBounds()._southWest
    
    const boundaries = {northEast: northEast, southWest: southWest}

    const {from, to} = coordinateToPixel(startPos, destPos, imageData, boundaries)
    //Make image red and calculate weight
    // console.log({map: imageData, from: from, to: to, tileSize: TileSize})
    await cv.load()

    const {data: {payload: {result, tilePath, tiles}}} = await cv.imageProcessing({map: imageData, from: from, to: to, tileSize: tileSize})//, TileSize, mapStartPos, mapDestPos])

    const pixelPath = tilePath.map(tile => tile.index)
    const longlatPath = pathToCoordinate(pixelPath, result, tileSize, boundaries)

    return {imageData: result, path: longlatPath, tiles: tiles, boundaries: boundaries}
}

