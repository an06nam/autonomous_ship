let indicatorValues = [
    [0,     0,  0,      0,      0],
    [300,   1,  21,     5,      4.5],
    [600,   3,	42,	    10,	    9],
    [900,   4,  63,     15,     13.5],
    [1200,  5,  84,     20,     18],
    [1500,  6,  105,    25,	    22.5],
    [1800,  8,  126,    30,	    27],
    [2100,  9,  147,    35,	    31.5],
    [2400,  10, 168,    40,	    36],
    [2700,  11, 189,    45,	    40.5],
    [3000,  13, 210,    50,	    45],
    [3300,  14, 231,    55,	    49.5],
    [3600,  15, 252,    60,	    54],
    [3900,  16, 273,    65,	    58.5],
    [4200,  18, 294,    70,	    63],
    [4500,  19, 315,    75,	    67.5],
    [4800,  20, 336,    80,	    72],
    [5100,  21, 357,    85,	    76.5],
    [5400,  23, 378,    90,	    90],
    [5700,  24, 399,    95,     85.5],
    [6000,  25, 420,    100,    90],
]

export const getIndicatorValues = (index) =>{
    return indicatorValues[index]
}

export const getIndicatorMaxValues = () => {
    return indicatorValues[indicatorValues.length-1]
}

export const searchIndicatorValues = (GPS_Speed) => {
    for(let i=0; i<indicatorValues.length;i++){
        if(indicatorValues[i][1] >= GPS_Speed.toFixed(0)){
            return i
        }
    }
    return 0
}

function returnSpeedBasedOnTrim(trim){
    for(let i=0; i<indicatorValues.length;i++){
        if(indicatorValues[i][3] >= trim){
            return indicatorValues[i][1]
        }
    }
}  

export const checkSpeedCode = (currentSpeed) =>{
    if(currentSpeed == 0) return 'STP'
    if(currentSpeed >= returnSpeedBasedOnTrim(100)){
        return 'FLH'
    }else if (currentSpeed >= returnSpeedBasedOnTrim(75)){
        return 'HLH'
    }
    else if (currentSpeed >= returnSpeedBasedOnTrim(50)){
        return 'SLH'
    }
    else {
        return 'DSH'
    }
}
