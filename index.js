const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const path = require("path");
const app = express();
const port = 3000;
var apiRouter = require("./router/api_router");
const bodyParser = require("body-parser");

const cors = require("cors");

const mongodb_database = "mongodb://localhost:27017/AppThatCan";
mongoose.connect(mongodb_database, { useNewUrlParser: true });

mongoose.connection.on("connected", () => {
  console.log("Connected to database " + mongodb_database);
});

mongoose.connection.on("error", (err) => {
  console.log("Database error: " + err);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors({ origin: (origin, callback) => callback(null, true), credentials: true }));

var staticPath = path.resolve(__dirname, "assets");

app.use(express.static(staticPath));

app.use("/api", apiRouter);

http.createServer(app).listen(port, function () {
  console.log(`Example app listening at http://localhost:${port}`);
});
