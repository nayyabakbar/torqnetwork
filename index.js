require('dotenv').config();
var express = require('express');
var http = require('http');
var path = require("path");
const passport = require('passport');
const session = require('express-session');
const secretKey = require('./config/secret');
const db = require('./config/db');
const cors = require("cors");
require('./config/passport');
const app = express();
var server = http.createServer(app);
db.mongoConnection();

const userRouter = require("./src/routers/userRouter");
const marketsRouter = require("./src/routers/marketsRouter.js");

app.use(session({secret: secretKey, resave: false,saveUninitialized: false}));
  
app.use(cors())
app.use(express.json());
app.use(express.static('public'));
app.use(passport.initialize())
app.use(passport.session())
app.use(userRouter);
app.use(marketsRouter);

app.use('/badges', express.static(path.join(__dirname, 'public/badges')));
app.use('/uploads', express.static(path.join(__dirname, 'public/photoUploads')));
//app.use('/qrCodes', express.static(path.join(__dirname, 'public/qrCodes')));

app.get('/', (req,res)=>{
    res.send("Welcome to Torqnetwork!");
});

app.get('/home', (req,res)=>{
    res.send("Home!");
});

server.listen(3000,(req,res)=>{
    console.log("Server Running")
})