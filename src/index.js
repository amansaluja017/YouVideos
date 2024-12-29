import dotenv from 'dotenv'

import mongoose from 'mongoose';
import {DB_name} from './constants.js';
import connectDB from './db/index.js';

import express from 'express';
const app = express();

dotenv.config({
    path: './env'
})

const port = process.env.PORT || 3000;

connectDB()

// ( async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_name}`)
//         app.on('error', (error) => {
//             console.log('Error: ', error);
//             throw error
//         })

//         app.listen(port, () => {
//             console.log(`Server is listening on ${port}`);
//         });

//     }catch (error) {
//         console.log('Error: ', error);
//         throw error
//     }
// })

