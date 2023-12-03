//Global var
let TileSize = 0
let weightMultiplier = 10

class Position {
  constructor(x,y) {
    this.x = x;
    this.y = y;
  }
}

class Tile {
  constructor(index, position, weight) {
    this.index = {x: index.x, y: index.y}
    this.position = position;
    this.weight = weight;
    this.gCost = 0;
    this.hCost = 0;
    this.fCost = 0;
    this.prevTile = null
  }

  copyTileData(copyTile) {
    this.index = copyTile.index
    this.position = copyTile.position;
    this.weight = copyTile.weight;
    this.gCost = copyTile.gCost;
    this.hCost = copyTile.hCost;
    this.fCost = copyTile.fCost;
    this.prevTile = copyTile.prevTile
  }

  weightBlur(Tiles){
    let totalWeight = 0
    for(let i = -1; i < 2; i++){
      for(let j = -1; j < 2; j++){
        let target = {x:this.index.x + i , y:this.index.y + j}
        if(i == 0 && j == 0) continue
        //Prevent x out of bounds
        if((target.x) < 0){
          target.x= 0
        }else if(target.x >= Tiles.length){
          target.x = Tiles.length-1
        }
        //Prevent y out of bounds
        if((target.y) < 0){
          target.y = 0
        }else if(target.y >= Tiles[target.x].length){
          target.y = Tiles[target.x].length -1
        }
        totalWeight += Tiles[target.x][target.y].weight
      }
    }
    if(totalWeight > 0){
      this.weight = (this.weight * (1))  + ((totalWeight/8) * (1))
    }
  }

  calculateFCost(){
    this.fCost = this.gCost + this.hCost
  }

  calculateGCost(startIdx){
    return this.calculateCost(startIdx)
  }

  calculateHCost(idxEnd){
    return this.calculateCost(idxEnd)
  }

  calculateWeightedHCost(Tiles, idxEnd){
    this.hCost = this.calculateWeightedCost(Tiles, idxEnd)
  }

  calculateWithNN(idxStart, idxTarget, Tiles){
    let landWeightTreshold = 0.5
    let weightTreshold = 1
    let NNweightMultipiler = 1
    let openList = []
    let closedList = []
    openList.push(idxStart)
    let currentPos = idxStart
    let testBreaker = 5
    console.log("Target is = " + idxTarget.x + " X " + idxTarget.y)
    while(currentPos.x != idxTarget.x && currentPos.y != idxTarget.y){
      console.log("======Reset")
      let currentPos = {x: openList[0].x, y: openList[0].y}
      if(currentPos.x == idxTarget.x && currentPos.y == idxTarget.y) break

      closedList.push(currentPos)
      openList.splice(0, 1)
      let foundNeighborsList = this.getNeighbor(currentPos)
      let neighborsList = foundNeighborsList.filter(detectOutOfBound => 
        detectOutOfBound.x >= 0 && detectOutOfBound.y >= 0 && detectOutOfBound.x < Tiles.length && detectOutOfBound.y < Tiles[0].length
      )

      
      // Tiles[detectTraverseable.x][detectTraverseable.y].weight < TileSize * weightTreshold &&
      // console.log(avaliableNeigborsList)
      // let neighborsList = avaliableNeigborsList.filter(detectTraverseable => 
      //   closedList.findIndex(checkInClosed => checkInClosed.x == currentPos.x && checkInClosed.y == currentPos.y) == -1
      // )
      console.log(neighborsList)
      neighborsList.map(neighbor => {
        let cost = Tiles[currentPos.x][currentPos.y].gCost + Tiles[currentPos.x][currentPos.y].calculateCost(neighbor) + (Tiles[neighbor.x][neighbor.y].weight * NNweightMultipiler)
        let neighborHcost = Tiles[neighbor.x][neighbor.y].hCost
        let neighborFcost = Tiles[neighbor.x][neighbor.y].fCost
        let checkInClosed = closedList.findIndex(item => item.x == neighbor.x && item.y == neighbor.y)
        let checkInOpen = openList.findIndex(item => item.x == neighbor.x && item.y == neighbor.y)
 
        // if( (cost + neighborHcost) < neighborFcost  || checkInOpen == -1){
        //   Tiles[neighbor.x][neighbor.y].gCost = cost
        //   Tiles[neighbor.x][neighbor.y].calculateFCost()
        //   Tiles[neighbor.x][neighbor.y].prevTile = currentPos
        //   if(checkInOpen == -1){
        //     openList.push(neighbor)
        //   }
        // }


        if(checkInOpen != -1 && Tiles[neighbor.x][neighbor.y].gCost > cost){
          let removeIndex = openList.findIndex(toBeRemovedIndex => toBeRemovedIndex.x == currentPos.x && toBeRemovedIndex.y == currentPos.y )
          openList.splice(removeIndex, 1)
        }
         if(checkInClosed != -1 && Tiles[neighbor.x][neighbor.y].gCost > cost){
        //   //console.log("Remove from closed")
           let removeIndex = closedList.findIndex(toBeRemovedIndex => toBeRemovedIndex.x == currentPos.x && toBeRemovedIndex.y == currentPos.y )
        //   let openListUsedAsParent = openList.filter(x => Tiles[x.x][x.y].prevTile.x == neighbor.x && Tiles[x.x][x.y].prevTile.y == neighbor.y)
        //   console.log(openListUsedAsParent)
        //   openListUsedAsParent.map(x => Tiles[x.x][x.y].prevTile = {x: currentPos.x, y: currentPos.y})
        //   //let closedListUsedAsParent = closedList.filter(x => Tiles[x.x][x.y].prevTile.x == currentPos.x && Tiles[x.x][x.y].prevTile.y == currentPos.y)
        //   //console.log(closedListUsedAsParent)
           closedList.splice(removeIndex,1)
         }
        if(checkInOpen == -1 && checkInClosed == -1){
          //console.log("Added to open")
          Tiles[neighbor.x][neighbor.y].gCost = cost
          openList.push(neighbor)
          Tiles[neighbor.x][neighbor.y].fCost = Tiles[neighbor.x][neighbor.y].calculateFCost()
          Tiles[neighbor.x][neighbor.y].prevTile = {x: currentPos.x, y: currentPos.y}
        }
      })
      console.log(openList)
      console.log(closedList)
      openList.sort((a, b) => (Tiles[a.x][a.y].fCost + Tiles[a.x][a.y].weight) - Tiles[b.x][b.y].fCost + Tiles[b.x][b.y].weight)
      if(openList.length == 0) {
        console.log("Open list is empty break")
        break
      } 
    }
    console.log(Tiles[idxTarget.x][idxTarget.y])
    console.log("NN Done successfully")
  }

  getNeighbor(currentTile){
    return [
      {x: currentTile.x - 1, y: currentTile.y-1},
      {x: currentTile.x, y: currentTile.y-1},
      {x: currentTile.x + 1, y: currentTile.y-1},
      {x: currentTile.x - 1, y: currentTile.y},
      {x: currentTile.x + 1, y: currentTile.y},
      {x: currentTile.x - 1, y: currentTile.y + 1},
      {x: currentTile.x, y: currentTile.y + 1},
      {x: currentTile.x + 1, y: currentTile.y + 1},
    ]
  }

  calculateCost(targetIdx) {
    let diagCost = 14
    let straightCost = 10
    let weightMultiplier = 10
    let xDiff = Math.abs(this.index.x - targetIdx.x);
    let yDiff = Math.abs(this.index.y - targetIdx.y);
    let tempCost = 0
    if(xDiff == yDiff){
      tempCost = diagCost * xDiff
    }else if(xDiff > yDiff){
      tempCost = (diagCost * yDiff) + (straightCost * (xDiff - yDiff))
    }else{
      tempCost = (diagCost * xDiff) + (straightCost * (yDiff - xDiff))
    }
    return tempCost;
  }

  calculateWeightedCost(Tiles, idxEnd) {
    let diagCost = 14
    let straightCost = 10
    let weightMultiplier = 10
    let xDiff = Math.abs(this.index.x - idxEnd.x);
    let yDiff = Math.abs(this.index.y - idxEnd.y);
    let currentTile = {x:this.index.x , y:this.index.y}
    let tempCost = 0;
    while(xDiff != 0 && yDiff != 0){
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
        tempCost += (diagCost + Tiles[currentTile.x][currentTile.y].weight * weightMultiplier)
      }
      else 
      if(xDiff != 0){
        xDiff--
        if(currentTile.x > idxEnd.x){
          currentTile.x--
        }else if(currentTile.x < idxEnd.x){
          currentTile.x++
        }
        tempCost += (straightCost + Tiles[currentTile.x][currentTile.y].weight * weightMultiplier)
      }
      else if(yDiff != 0){
        yDiff--
        if(currentTile.y > idxEnd.y){
          currentTile.y--
        }else if(currentTile.y < idxEnd.y){
          currentTile.y++
        }
        tempCost += (straightCost + Tiles[currentTile.x][currentTile.y].weight * weightMultiplier)
      }
    }
    return tempCost;
  }
}