import { MongoClient } from "mongodb";
import 'dotenv/config'
let db ;
const username = encodeURIComponent(process.env.MONGO_USERNAME);
const password = encodeURIComponent(process.env.MONGO_PASSWORD);
const uri = `mongodb+srv://${username}:${password}@cluster0.l0cnbia.mongodb.net/?retryWrites=true&w=majority`


async function connectToDB (listenToServe){
    const client = new MongoClient(uri)
    await client.connect()
    db = client.db('events')
    listenToServe()
}

export {
    db,
    connectToDB
}


