
const express = require("express");
const mongoose = require("mongoose");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());

const User = mongoose.model("User", new mongoose.Schema({
    name: String,
    email: String
}));

// Load proto file
const packageDefinition = protoLoader.loadSync(
  path.join(__dirname, "../shared/protos/user.proto")
);

const proto = grpc.loadPackageDefinition(packageDefinition).user;

app.post("/users", async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// HTTP: Get all users
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// HTTP: Get user by ID
app.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// gRPC method implementation
async function getUser(call, callback) {
  try {
    const user = await User.findById(call.request.id);

    if (!user) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: "User not found",
      });
    }

    callback(null, {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: "Something went wrong",
    });
  }
}

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB connected");

    // Start HTTP server
    app.listen(5001, () => {
      console.log("User HTTP server running on port 5001");
    });

    // Start gRPC server
    const grpcServer = new grpc.Server();

    grpcServer.addService(proto.UserService.service, {
      GetUser: getUser,
    });

    grpcServer.bindAsync(
      "0.0.0.0:50051",
      grpc.ServerCredentials.createInsecure(),
      (error) => {
        if (error) throw error;
        console.log("User gRPC server running on port 50051");
      }
    );
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();