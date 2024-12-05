import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

export const connectDB = async () => {
    try {
        console.log("Connecting to MongoDB...");
        console.log("DB_NAME:", DB_NAME);
        console.log("MONGO_URL:", process.env.MONGO_URL);

        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URL}${DB_NAME}`);

        console.log(`\nMongoDB connected! DB Host: ${connectionInstance.connection.host}`);
        console.log(`DB Name: ${connectionInstance.connection.name}`);
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        process.exit(1);
    }
};