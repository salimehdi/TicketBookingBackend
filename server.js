import express from "express";
import cors from "cors";
import { db, connectToDB } from "./db.js";
import "dotenv/config";
import fs from "fs";
import admin from "firebase-admin";

const credentials = JSON.parse(fs.readFileSync("./credentials.json"));
admin.initializeApp({
  credential: admin.credential.cert(credentials),
});

const app = express();
app.use(express.json());
app.use(cors());

app.use(async (req, res, next) => {
  const { authtoken } = req.headers;

  if (authtoken) {
    try {
      req.user = await admin.auth().verifyIdToken(authtoken);
    } catch (e) {
      return res.sendStatus(400);
    }
  }
  req.user = req.user || {};
  next();
});

app.post("/api/buy", async (req, res) => {
  const { uid } = req.user;
  const { items } = req.body;
  console.log(items);
  try {
    for (const [name, quantity] of Object.entries(items)) {
      const event = await db.collection("eventList").findOne({ name });
      console.log(name);
      if (event) {
        await db.collection("eventList").updateOne(
          { name },
          {
            $inc: {
              availableTickets: -quantity,
            },
          }
        );

        const { ticketPrice } = event;

        await db.collection("user").updateOne(
          { uid },
          {
            $set: { item: [] },
            $push: {
              orders: {
                name,
                quantity,
                ticketPrice,
              },
            },
          }
        );
      } else {
        return res.sendStatus(404);
      }
    }

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});


app.get("/api/info", async (req, res) => {
  const { email } = req.user;
  if (email) {
    res.send({ email });
  } else {
    res.sendStatus(404);
  }
});

app.delete("/api/removefromcart/:name", async (req, res) => {
  try {
    const { uid } = req.user;
    const { name } = req.params;
    const cartItems = await db.collection("user").findOne({ uid });

    const itemNames = cartItems.item;

    const index = itemNames.indexOf(name);

    if (index !== -1) {
      itemNames.splice(index, 1);
    }
    await db
      .collection("user")
      .updateOne({ uid: uid }, { $set: { item: itemNames } });

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.get("/api/addtocart/:name", async (req, res) => {
  try {
    const { uid } = req.user;
    const { name } = req.params;
    const cartItems = await db.collection("user").findOne({ uid });
    {
      uid===null && res.sendStatus(400);
    }
    if (!cartItems) {
      await db.collection("user").insertOne({ uid: uid, item: [name] });
    } else if (uid === null) {
      return res.sendStatus(400);
    } else {
      const itemNames = cartItems.item;
      if (!itemNames.includes(name)) {
        itemNames.push(name);
        await db
          .collection("user")
          .updateOne({ uid: uid }, { $set: { item: itemNames } });
      }
    }
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.get("/api/cartItems", async (req, res) => {
  try {
    const { uid } = req.user;
    const cartItems = await db.collection("user").findOne({ uid: uid });

    if (!cartItems) {
      return res.send([]);
    }

    res.send(cartItems.item);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});



app.get("/api/orders", async (req, res) => {
  try {
    const { uid } = req.user;
    const cartItems = await db.collection("user").findOne({ uid: uid });

    if (!cartItems || !cartItems.orders) {
      return res.send([]);
    }

    const itemNames = cartItems.orders;
    const arr = [];

    for (const itemName of itemNames) {
      const item = await db.collection("eventList").findOne({ name: itemName.name });
      item.quantity = itemName.quantity;
      let flag = false; // Initialize flag for each itemName
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].name === item.name) {
      arr[i].quantity += item.quantity;
      flag = true;
      break; // Exit the loop after updating the quantity
    }
  }
  if (!flag) {
    arr.push(item);
  }
    }
    console.log(arr);
    res.send(arr);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});



app.get("/api/cart", async (req, res) => {
  try {
    const { uid } = req.user;
    const cartItems = await db.collection("user").findOne({ uid: uid });

    if (!cartItems || !cartItems.item) {
      return res.send([]);
    }

    const itemNames = cartItems.item;
    const arr = [];

    for (const itemName of itemNames) {
      const item = await db.collection("eventList").findOne({ name: itemName });
      arr.push(item);
    }

    res.send(arr);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.get("/api/allEvents", async (req, res) => {
  try {
    const result = await db.collection("eventList").distinct("name");
    const eventList = [];
    for (const event of result) {
      const eventDetails = await db
        .collection("eventList")
        .findOne({ name: event });
      eventList.push(eventDetails);
    }
    res.json(eventList);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/api/category", async (req, res) => {
  try {
    const result = await db.collection("eventList").distinct("category");
    res.json(result);
    console.log(result);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/api/name/:names", async (req, res) => {
  const { names } = req.params;

  try {
    const eventDetails = await db
      .collection("eventList")
      .findOne({ name: names.replace("%20", " ") });
    res.json(eventDetails);
    console.log(eventDetails);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/api/category/:names", async (req, res) => {
  const { names } = req.params;
  try {
    const eventDetails = await db
      .collection("eventList")
      .find({ category: names })
      .toArray();
    res.json(eventDetails);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Start the server
const PORT = process.env.PORT || 8000;

connectToDB(() => {
  console.log("Successfully connected to DB");
  app.listen(PORT, () => {
    console.log(`Server is Listening on http://localhost:${PORT}`);
  });
});

/**
 * git clone https-----.git
 * cd toThatFile
 * git log --oneline
 * git submodule add https-----.git
 * git add .
 * git commit -m "Adding files"
 * git push origin */
