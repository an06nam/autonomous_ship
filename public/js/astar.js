const aStarGenerator = (player, destination, Tiles) => {
    const tile = (x, y) => x < Tiles.length && y < Tiles[x].length ? Tiles[x][y] : null
    // setup first time
    let currentTile = tile(player.x, player.y)
    currentTile.prevTile = 'Start'
    currentTile.hCost = 0
    currentTile.gCost = 0

    const destinationTile = tile(destination.x, destination.y)
    // handle out of length tiles
    if (!currentTile || !destinationTile) return []

    let openTiles = []
        closeTiles = []

    // [0, 0] is player position
    const neighbours = [
        [-1,-1], [0,-1], [1,-1], 
        [-1, 0], /*[0, 0],*/ [1, 0],
        [-1, 1], [0, 1], [1, 1]
    ]
    const neighbourTile = (neighbour) => {
        return tile(currentTile.index.x + neighbour[0], currentTile.index.y + neighbour[1]) ?? null
    }

    const doCost = (tile) => {
        // console.log(currentTile.gCost)
        return {gCost: tile.calculateGCost(currentTile.index) + currentTile.gCost, hCost: tile.calculateHCost(destinationTile.index)}
    }

    const updateCost = (tile, cost) => {
        // console.log(tile.weight)
        tile.gCost = cost.gCost
        tile.hCost = cost.hCost
        tile.fCost = cost.gCost + cost.hCost + (tile.weight * cost.hCost)
        tile.prevTile = currentTile.index
    }
    
    // tools to comparen both tile
    const isSameIndex = (tile1, tile2) => 
        tile1.index.x == tile2.index.x && 
        tile1.index.y == tile2.index.y

    // start node with current player position
    openTiles.push(currentTile)
    // console.log(isSameIndex(currentTile, destinationTile))
    while(!isSameIndex(currentTile, destinationTile) && openTiles.length > 0) {
        // get the lowest fcost in open tiles
        // console.log(openTiles)
        currentTile = openTiles.sort((a, b) => {
            return a.fCost !== b.fCost ? (a.fCost - b.fCost) : (a.hCost - b.hCost)
        }).splice(0, 1)[0]
        // console.log(currentTile)
        // add current to close
        closeTiles.push(currentTile)
        // find available neigbours and not in the closeTiles and calculate them
        neighbours.map(n => neighbourTile(n))
            .filter(n => n !== null &&
                closeTiles.filter(f => isSameIndex(f, n)) <= 0
            )
            .forEach(n => {
                // find the same neighbour in open tiles to be updated the cost if fCost less than before
                const sameTileIndex = openTiles.findIndex(o => isSameIndex(o, n))
                // if found the same neighbour in the open tiles recalculate the cost if not add to open tiles
                if (sameTileIndex > -1) {
                    const sameTile = openTiles[sameTileIndex]

                    const cost = doCost(n)
                    const neighbourFCost = cost.gCost + cost.hCost + (sameTile.weight * cost.hCost)
                    // console.log(sameTile.weight)
                    // update the cost when neighbour get the lowest fCost or hCost
                    if (sameTile.fCost > neighbourFCost || sameTile.hCost > cost.hCost) {
                        // console.log(sameTile.weight)
                        // assign same neighbour with new cost
                        updateCost(sameTile, cost)
                    }
                } else {
                    // set the cost for the neighbour
                    // console.log(n)
                    const cost = doCost(n)
                    updateCost(n, cost)
                    // add tile to open tiles
                    openTiles.push(n)
                }
            })
    }

    // console.log(isSameIndex(currentTile, destinationTile))
    // console.log({currentTile, destinationTile})

    //no way out
    if (currentTile.prevTile == 'Start') return []

    // save path using prevtile
    const {x, y} = currentTile.prevTile
    let tail = tile(x, y)
    // console.log(tail.weight)
    let recordTile = [tail]
    while(tail.prevTile !== 'Start') {
        const {x, y} = tail.prevTile
        tail = tile(x, y)
        // console.log(tail.fCost)
        recordTile = [...recordTile, tail]
    }
    
    // return a path 
    return recordTile
}   