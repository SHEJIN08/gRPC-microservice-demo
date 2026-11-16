const express = require("express");
const { PrismaClient } = require("@prisma/client");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
require("dotenv").config();

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Load proto file
const packageDefinition = protoLoader.loadSync(
  path.join(__dirname, "../shared/protos/user.proto")
);

const proto = grpc.loadPackageDefinition(packageDefinition).user;

// Create gRPC client
const userClient = new proto.UserService(
  process.env.USER_SERVICE_GRPC_URL,
  grpc.credentials.createInsecure()
);

// Convert gRPC callback into Promise
function getUser(userId) {
  return new Promise((resolve, reject) => {
    userClient.GetUser(
      { id: userId },
      {
        waitForReady: true,
        deadline: new Date(Date.now() + 5000),
      },
      (error, user) => {
        if (error) reject(error);
        else resolve(user);
      }
    );
  });
}


// Create order
app.post("/orders", async (req, res) => {
  try {
    const { userId, product, amount } = req.body;

    // Communicate with User Service
    const user = await getUser(userId);

    // Save order only if user exists
    const order = await prisma.order.create({
      data: {
        userId,
        product,
        amount,
      },
    });

    res.json({
      message: "Order created successfully",
      user,
      order,
    });
  } catch (error) {
    if (error.code === grpc.status.NOT_FOUND) {
      return res.status(404).json({
        message: "User does not exist ",
      });
    }

    console.error(error);

    res.status(503).json({
      message: "Unable to communicate with User Service",
    });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const orders = await prisma.order.findMany();
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to fetch orders" });
  }
});

app.listen(5002, () => {
  console.log("Order Service running on 5002");
});