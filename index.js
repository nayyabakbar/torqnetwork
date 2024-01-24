require('dotenv').config();
var express = require('express');
var http = require('http');
const passport = require('passport');
const session = require('express-session');
const secretKey = require('./config/secret');
const db = require('./config/db')
require('./config/passport');
const app = express();
var server = http.createServer(app);
db.mongoConnection();

const userRouter = require("./src/routers/userRouter");

app.use(
    session({
      secret: secretKey, 
      resave: false,
      saveUninitialized: false
    })
  );
  

app.use(express.json());
app.use(express.static('public'));
app.use(passport.initialize())
app.use(passport.session())
app.use(userRouter);

app.get('/', (req,res)=>{
    res.send("Welcome to Torqnetwork!");
});

app.get('/home', (req,res)=>{
    res.send("Home!");
});

server.listen(3000,(req,res)=>{
    console.log("Server Running")
})