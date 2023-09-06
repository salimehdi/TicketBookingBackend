import express from 'express';
import cors from 'cors'
import {db,connectToDB} from './db.js'
import 'dotenv/config'
import fs from 'fs'
import admin from 'firebase-admin'

const credentials = JSON.parse(
  fs.readFileSync('./credentials.json')                     
)
admin.initializeApp({
  credential:admin.credential.cert(credentials)            
})

const app = express();
app.use(express.json())
app.use(cors())

app.use(async (req,res,next)=>{
  const { authtoken } = req.headers

  if(authtoken){
      try {
          req.user = await admin.auth().verifyIdToken(authtoken)    
      } catch (e) {
          return res.sendStatus(400)
      }
  }
  req.user = req.user || {}
  next();                                                        
})

app.get('/api/info', async(req,res)=>{
  
  const { email , uid } = req.user
  if (email){
    res.send({email})
  }else{
    res.sendStatus(404)
  }
})

app.get('/api/addtocart/:name', async (req, res) => {
  try {
    const { uid } = req.user;
    const { name } = req.params;
    const cartItems = await db.collection('user').findOne({ uid });
    if (!cartItems) {
      await db.collection('user').insertOne({ uid : uid, item: [name] });
    } else {
      const itemNames = cartItems.item;
      if (!itemNames.includes(name)) {
        itemNames.push(name);
        await db.collection('user').updateOne({ uid : uid }, { $set: { item: itemNames } });
      }
    }
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
})

app.get('/api/cart', async (req, res) => {
  try {
    const { uid } = req.user;
    const cartItems = await db.collection('user').findOne({ uid: uid });
    
    if (!cartItems || !cartItems.item) {
      return res.sendStatus(404);
    }

    const itemNames = cartItems.item;
    const arr = await Promise.all(itemNames.map(async (itemName) => {
      const item = await db.collection('eventList').findOne({ name: itemName });
      return item;
    }));

    res.send(arr);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});


app.get('/api/allEvents', async (req, res) => {
    try {
        const result = await db.collection('eventList').distinct('name');
        const eventList = []
        for (const event of result) {
            const eventDetails = await db.collection('eventList').findOne({ name: event });
            eventList.push(eventDetails);
        }
        res.json(eventList)
        
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
})
app.get('/api/category', async (req, res) => {
    try {
        const result = await db.collection('eventList').distinct('category');
        res.json(result)
        
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
})
app.get('/api/name/:name', async (req, res) => {
    const {name} = req.params
    try {
        const eventDetails = await db.collection('eventList').find({  name });
        res.json(eventDetails)
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
})
app.get('/api/category/:names', async (req, res) => {
    const {names} = req.params
    try {
        const eventDetails = await db.collection('eventList').find({  category: names }).toArray();
        res.json(eventDetails)
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
})

const PORT = process.env.PORT || 8000

connectToDB( ()=>{
    console.log(`Successfully connected to DB`);
app.listen(PORT, ()=>{
    console.log(`Server is Listening on http://localhost:${PORT}`);
})}
)



/**
 * git clone https-----.git
 * cd toThatFile
 * git log --oneline
 * git submodule add https-----.git
 * git add .
 * git commit -m "Adding files"
 * git push origin */ 