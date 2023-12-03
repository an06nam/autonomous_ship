const express = require('express')
// const next = require('next')
    
// const dev = process.env.NODE_ENV !== 'production'
const app = express()
const router = express.Router()
const http = require('http').createServer(app)
const open = require('open')
const { Server } = require('socket.io')
const io = new Server(http)
const serialport = require('serialport')
const { default: next } = require('next')
let isLoggedIn = false

app.use(express.json({
    extended: false
}))

// global port
let port = null;

// handle socket.io to be called in test html for debug
app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io-client/dist/'))
app.use('/test', express.static(__dirname + '/test/'))
app.get('/test', async (req, res) => {
    res.sendFile(__dirname+'/test/test.html')
})

// handle base route to redirect to login page if not logged in or directly to the app
app.get('/', (req, res) => {
    if (isLoggedIn) {
        return res.redirect('/app')
    }
    return res.redirect('/login')
})

// handle /app base route, if not logged in directly throw to login page
router.use('/', (req, res, next) => { 
    console.log(isLoggedIn)
    if (isLoggedIn) {
        next()
        return
    }
    
    return res.redirect('/login')
})

// serve app asset 
router.use(express.static(__dirname + '/out/'))
// assign /app router to handle app page
app.use('/app', router)

// serve login asset
app.use('/login', express.static(__dirname + '/login/'))
// handle auth
app.post('/login/auth', (req, res) => {
    const {username, password} = req.body
    if (username === 'nasdec' && password === 'admin') {
        isLoggedIn = true
        // res.status(200).json({msg: 'login success', ok: true})
        // res.end()
        res.json({msg: 'login success', ok: true})
    } else {
        res.status(400).json({msg: 'login failed, wrong username/password!', ok: false}).end()
    }
})
    
//const portPath = 'ttyACM0';
const selectPort = async () => {
    const ports = await serialport.list()
    if (ports.length <= 0) return null

    const portInfo = ports.find(p => p.path === portPath)
    let selected = null;
    if (portInfo) {
        selected = new serialport(portInfo.path, {baudRate: 38400, autoOpen: true})
    }

    return selected
}

const sendCode = async (code) => {
    try {
        if (!port) port = await selectPort()

        port.write(`\n${code}\n`, (err, res) => {
            console.log([err, res])
        })
    } catch (e) {
        console.log(`Port Not Found Or Not Working`)
    }
}

http.listen(3000, async () => {
    console.log('listening on *: 3000')
    // open('http://localhost:3000')
    // port = await selectPort()
    // console.log(port.readable)

    // starting socket to listening changes code
    io.on('connection', (socket) => {
        console.log('app is connected')

        // listening changes code here
        socket.on('change', (code) => {
            console.log(code)
            switch(code) {
                case 'INIT': {
                    sendCode('ZR')
                    sendCode('STP')
                    break
                }
                default: sendCode(code)
            }
        })

        socket.on('data', (data) => {
            socket.local.emit('data', data)
        })

        // handle board listener
        if (port) {
            console.log('set board listener')
            const parser = new serialport.parsers.Readline
            port.pipe(parser)

            // listening board
            parser.on('data', data => {
                console.log('from board: '+data)
                socket.emit('message', data)
            })
        }
    })

    // setTimeout(() => {
    //     // set zero position steering and throttle
    //     sendCode('ZR')
    //     sendCode('STP')
    //     console.log('set zero')
    // }, 5000)
});

// app.prepare()
// .then(() => {
//   const server = express()
    
//   server.get('*', (req, res) => {
//     res.sendFile(__dirname + '/out/index.html')
//   })
    
//   server.listen(3000, (err) => {
//     if (err) throw err
//     console.log('> Ready on http://localhost:3000')
//   })
// })
// .catch((ex) => {
//   console.error(ex.stack)
//   process.exit(1)
// })
