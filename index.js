const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

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

// middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "https://go-book-hotel.web.app",
      "https://go-book-hotel.firebaseapp.com",
    ],
    credentials: true,
  })
);

const logger = async (req, res, next) => {
  console.log("called:", req.host, req.originalUrl);
  next();
};

const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  console.log("token:", token);

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

// ----------main functionality----------------
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
    const reviewCollection = client.db("GoBookHotelDB").collection("reviews");

    // ---------------JWT----------------
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
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

    app.get("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await Rooms.findOne(query);
      res.send(result);
    });
    // ------------------bookings----------------
    app.get("/bookings", async (req, res) => {
      const queryEmail = req.query.email;
      // const tokenEmail = req.user?.email;

      // if (tokenEmail !== queryEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }

      let query = {};
      if (queryEmail) {
        query.email = queryEmail;
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      try {
        const bookingItem = req.body;
        console.log(bookingItem);

        const result = await bookingCollection.insertOne(bookingItem);
        res.send(result);
      } catch (error) {
        console.log(error);
        res.send(error);
      }
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      console.log("delete this ", id);
      const query = { _id: id };
      console.log("present ", query);
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // --------------Revirws---------------------------
    app.post("/reviews", async (req, res) => {
      try {
        const review = req.body;
        console.log(review);

        const result = await bookingCollection.insertOne(review);
        res.send(result);
      } catch (error) {
        console.log(error);
        res.send(error);
      }
    });

    app.get("/review", async (req, res) => {
      const queryId = req.query.id;
      // const tokenEmail = req.user?.email;

      // if (tokenEmail !== queryEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }

      let query = {};
      if (queryId) {
        query.id = queryId;
      }
      const result = await reviewCollection.find(query).toArray();
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
