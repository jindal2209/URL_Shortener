const express = require('express');
const path = require('path');
const mongoose = require('mongoose')
const axios = require('axios');
const mongo_url = 'mongodb+srv://user_express:Ax9fBUJb6Hw0JcEB@cluster0.gfo4h.mongodb.net/url_shortener?retryWrites=true&w=majority'

mongoose.connect(mongo_url)
    .then(() => console.log('connected to mongodb'))
    .catch((error) => console.log(error))

const dataSchema = new mongoose.Schema({
    url: String,
    url_hash: String,
    date: { type: Date, default: Date.now() },
});
const dbobject = mongoose.model('URLs', dataSchema)  // first argument is the singular name of collection second argument is the name of schema


const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile((path.join(__dirname + '/index.html')))
});

async function getHash(url) {
    var encoded_url = Buffer.from(url).toString('base64');
    var last6 = encoded_url.slice(-6);

    const res = await dbobject.findOne({ url_hash: last6 })
    if (!res)
        return last6;

    return await getHash(last6)
}

app.post('/shorturl', async (req, res) => {
    var url = req.body.url;
    if (!url || url.length < 5) {
        res.status(400).send({ 'error': 'Bad request' })
    }

    axios.get(url)
        .then(() => {
            // find in db if url already exist
            dbobject.findOne({ url: url }, async (err, doc) => {
                if (doc === null) { // we can create new hash
                    var ans = await getHash(url)
                    if (ans) {
                        const obj = new dbobject({
                            url: url,
                            url_hash: ans
                        })
                        obj.save()
                            .then(() => {
                                res.status(200).json({ shortened_url: ans })
                            })
                    }
                    else {
                        res.status(400).send({ 'error': 'Unable to generate URL. Try again!!!' })
                    }
                }
                else {
                    res.status(200).json({ shortened_url: doc.url_hash })
                }
            })
        })
        .catch(err => {
            console.log(err)
            res.status(400).send({ 'error': 'Invalid URL' })
        })
});

app.get('/:hash', async (req, res) => {
    let hash = req.params.hash;
    const fdata = await dbobject.find({ url_hash: hash })
    try {
        res.redirect(fdata[0].url);
    }
    catch {
        res.sendFile((path.join(__dirname + '/error.html')))
    }
})

app.listen(5000, () => console.log("\x1b[32m%s\x1b[0m", "Listening on PORT:5000"));