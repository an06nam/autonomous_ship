const Alert = ({id, callback, ...props}) => {

    const handleCallback = (status) => {
        callback({id: id, status})
    }

    return (
        <div className="alert">
            <i className="text-3xl text-red-700">{props.icon}</i>
            <div className="flex-1">
                <label className="mx-3 text-white text-sm">{props.description}</label>
            </div> 
            <div className="flex-none">
                <button className="btn btn-sm btn-ghost mr-2 text-red-700 font-bold"  onClick={() => handleCallback('cancel')}>Cancel</button> 
                {
                    props.apply && <button className="btn btn-sm btn-success" onClick={() => handleCallback('ok')}>{props.apply ? props.apply : 'Apply'}</button>}
            </div>
        </div>
    )
}

export default Alert