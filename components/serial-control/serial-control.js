import { io } from "socket.io-client";
import {EventEmitter} from 'events'

export default class SerialControl extends EventEmitter {

    constructor() {
        super()
        this.socket = io()
        this.socket.connect()

        // // receive data from change code success or not
        this.socket.on('message', (msg) => {
            // if message success it means code sucessfully sent
            if(msg == null || msg == "") return
            this.emit('message', msg)
        })

        this.socket.on('data', (data) => {
            this.emit('data', data)
        })
    }

    sendCode = (code) => {
        // send code to throttle or steer wheel
        // console.log(code)
        this.socket.emit('change', code.toString().toUpperCase())
    }

    sendData = (data) => {
        this.socket.emit('data', data)
    }
}