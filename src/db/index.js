import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

export const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`);
        console.log(`\n mongodb connected!! DB Host : ${connectionInstance.connection.host}`);
        console.log(`DB Name: ${connectionInstance.connection.name}`);
        
    } catch (error) {
        console.log("mongodb connection error : ",error);
        process.exit(1)
        
    }
}