const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const logger = async (req, res, next) => {
  console.log("called:", req.host, req.originalUrl);
  next();
};

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log("token: ", token);

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    console.log("decoded", decoded);
    req.decoded = decoded;
    next();
  });
};

// DB_USER  DB_PASS

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ivv8ial.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const Rooms = client.db("GoBookHotelDB").collection("roomCollection");
    const bookingCollection = client.db("GoBookHotelDB").collection("bookings");
    // const CartTable = client.db("CarverseDB").collection("Cart");

    // ---------------JWT----------------
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    // ---------------- Getting All Rooms from Collection----------------------
    app.get("/rooms", async (req, res) => {
      try {
        let cursor;
    
        const sortType = req.query.sort;
    
        if (sortType === "asc") {
          cursor = Rooms.find().sort({ price_per_night: 1 });
        } else if (sortType === "desc") {
          cursor = Rooms.find().sort({ price_per_night: -1 });
        } else {
          cursor = Rooms.find();
        }
    
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "An error occurred while adding" });
      }
    });
    

    app.post("/create-booking", verifyToken, async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.get("/bookings", verifyToken, async (req, res) => {
      const queryEmail = req.query.email;
      const tokenEmail = req.user.email;

      if (queryEmail !== tokenEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};
      if (queryEmail) {
        query.email = queryEmail;
      }
      const result = await bookingCollection.findOne({ email: queryEmail });
      res.send(result);
    });

    app.delete("cancel-booking/:bookingId", verifyToken, async (req, res) => {
      const id = req.params.bookingId;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("running...");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
