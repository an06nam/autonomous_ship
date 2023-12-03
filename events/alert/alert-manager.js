import Alert from './alert'
import {EventEmitter} from 'events'

export default class AlertManager extends EventEmitter {

    constructor() {
        super()
        this._alert = []
        // this._callback = listener
        this._callback = this.callback.bind(this)
    }

    callback = (data) => {
        const {id, status} = data
        const index = this._alert.findIndex(a => a.props.id == id)
        console.log('index remove: '+index)
        this._alert.splice(index, 1)
        this.emit("change", {...data, remain: this._alert})
    }

    generateAlert = (alertData) => <Alert key={alertData.id} 
                                    {...alertData}
                                    callback={this._callback} />

    create = (alertData) => {
        const alert = this.generateAlert(alertData)
        this._alert.push(alert)

        console.log(this._alert)
        return alert
    }

    show = () => this._alert

    cleanup = () => {
        this._alert.length = 0
    }
}