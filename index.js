const express = require('express')
const mongoose = require('mongoose')
const http = require('http')
const path = require('path')
const app = express()
const port = process.env.PORT || 80
var apiRouter = require('./router/api_router')
const bodyParser = require('body-parser')

const cors = require('cors')

mongoose.connect(
    'mongodb+srv://najluigi:skembe31@cluster0.v3ptohh.mongodb.net/AppThatCan?retryWrites=true&w=majority',
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
)

const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error: '))
db.once('open', function () {
    console.log('Connected successfully')
})

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(cors({ origin: (origin, callback) => callback(null, true), credentials: true }))

var staticPath = path.resolve(__dirname, 'assets')

app.use(express.static(staticPath))

app.use('/api', apiRouter)

http.createServer(app).listen(port, function () {
    console.log(`Example app listening at http://localhost:${port}`)
})
