import { connectDB } from './db/index.js';
import dotenv from 'dotenv'
import { app } from './app.js';



dotenv.config({
    path : "./env"
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`app is listening on ${process.env.PORT}`);
        
    })
})
.catch((e)=>{
    console.log("MONGODB connection failed!!!", e);
    
});


















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