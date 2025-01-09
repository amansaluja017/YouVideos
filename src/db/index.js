import mongoose from "mongoose";
import { DB_name } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_name}`
    );
    console.log(`MongoDB connected to ${connectionInstance.connection.host}`);
  } catch (error) {
    console.log("MONGODB CONNECTION FAILED ", error);
    process.exit(1);
  }
};

export default connectDB;
