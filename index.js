const express = require("express");
const app = express();
const path = require("path");

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Content-Type", "application/json");
    next();
});

app.get("/manifest.json", (req, res) => {
    res.sendFile(path.join(__dirname, "manifest.json"));
});

app.listen(process.env.PORT || 3000);
