import { MongoClient } from "mongodb";

// Define the URI for the local MongoDB instance
const uri = "mongodb://localhost:27017"; // You can change the port if necessary

let db;

async function connectToDB(listenToServe) {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    // Connect to the MongoDB server
    await client.connect();

    // Access or create the database
    db = client.db('events');

    // Call the provided callback function
    listenToServe();
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw error;
  } finally {
    // Close the MongoDB connection when done
    await client.close();
  }
}

export { db, connectToDB };


