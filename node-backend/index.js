const axios = require('axios');
const express = require('express');
const { MongoClient, Long } = require('mongodb');
const app = express();
const port = 3000;

const goURL = "http://go-backend:5000/attack";

let mongoClient;
let attacksCollection;
let isActive;

async function recordAttack() {
    const now = process.hrtime();
    const timestampNs = BigInt(Date.now()) * 1_000_000n + BigInt(now[1]);

    try {
        await attacksCollection.insertOne({
            timestamp: Long.fromBigInt(timestampNs),
            server: 'node'
        });
    } catch (err) {
        console.log("MongoDB error:", err);
    }
}

app.get('/start', async (req, res) => {
    isActive = true
    try {
        await axios.get(goURL);
    } catch (err) {
        console.error(`Error attacking Go server:`, err.message);
    }
    res.status(204).end();
});

app.get('/attack', async (req, res) => {
    if (isActive) {
        await recordAttack();
        try {
            await axios.get(goURL);
        } catch (err) {
            console.error(`Error attacking Go server:`, err.message);
        }
    }
    res.status(204).end();
});


app.get('/stop', async (req, res) => {
    isActive = false
    res.status(204).end();
});

async function startServer() {
    try {
        mongoClient = new MongoClient('mongodb://mongodb:27017');
        await mongoClient.connect();
        attacksCollection = mongoClient.db('backendbrawl').collection('attacks');
        
        app.listen(port, () => {
            console.log(`Node server listening on port ${port}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();