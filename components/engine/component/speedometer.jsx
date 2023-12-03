import Image from 'next/image'

const Speedometer = (props) => {

    return (
        <span className="relative flex-1 flex items-center" style={{backgroundImage: 'url(speedometer.svg)', backgroundRepeat: 'no-repeat', backgroundSize: 'auto', backgroundPositionY: 'center'}}>
            {/* <img className="absolute z-0 block w-full" src="/speedometer.svg" /> */}
            <img className="absolute z-0 block w-full" style={{'transform': `rotate(${props?.rotate ?? 0}deg)`}} src="/needle.svg" />
            <span className="absolute z-0 block text-center text-xs font-bold" style={{width: '36px', margin: '97% 38% auto', position: 'sticky'}}>{props?.speed ?? 0}</span>
        </span>
    )
}
export default Speedometer