import { connectDB } from './db/index.js';
import dotenv from 'dotenv'

import { DB_NAME } from './constants.js';



dotenv.config({
    path : "./env"
})

connectDB();


















/*
import express from 'express'
const app = express();

( async () => {
    try {
        await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("error : ",error);
            
        })
        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`);
            
        })
    } catch (error) {
        console.error()
    }
})()
*/