import mongoose from 'mongoose';
import { Document } from './models/document.models.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from "dotenv";
import express from "express";
import cookieParser from 'cookie-parser';
import cors from "cors";

dotenv.config({
    path: './.env'
});

const app = express();

app.use(
    cors({
        origin: ['http://localhost:3000', 'http://192.168.29.182:3000'],
        credentials: true
    })
);

app.use(express.json());

//to encode incoming url
app.use(
    express.urlencoded({
      extended: true,
      limit: "60mb",
    })
  );

app.use(cookieParser());

import userRouter from "./routes/user.routes.js";

app.use("/api/user", userRouter);


const defaultValue = "";

const connectDB = async () => {
    try {
        console.log(`Connecting to MongoDB`);
        const connectionInstance = await mongoose.connect("mongodb://localhost:27017/canvasDB");
        console.log(`\nMongoDB connected to ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB Connection failed", error);
        process.exit(1);
    }
};

connectDB();

// Create an HTTP server
const httpServer = createServer(app);

// Attach the socket.io server to the HTTP server
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:3000', 'http://192.168.29.182:3000'],
        // origin: '*',
        methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 10 * 1024 * 1024, // Set the maximum payload size to 10MB (adjust as needed)
});

// Initialize active users object
const activeUsers = {};
const cursorPositions = {};
const cursorColors = {};
const documentColors = {};

io.on('connection', socket => {
    socket.on('get-document', async documentId => {

        if (!activeUsers[documentId]) {
            activeUsers[documentId] = {};
        }

        if (!documentColors[documentId]) {
            documentColors[documentId] = {};
        }

        const color = getRandomColor();
        documentColors[documentId][socket.id] = color;

        activeUsers[documentId][socket.id] = true;

        // // Handle user disconnect
        // socket.on('disconnect', () => {
        //     delete activeUsers[documentId][socket.id];
        //     io.to(documentId).emit('active-users', Object.keys(activeUsers[documentId]));
        // });
        // Your existing logic for handling disconnects...
        socket.on('disconnect', () => {
            delete activeUsers[documentId][socket.id];
            delete documentColors[documentId][socket.id]; // Remove the color mapping for this socket

            const removedCursor = cursorPositions[documentId][socket.id]; // Store the cursor position and color before deleting

            // delete cursorPositions[documentId][socket.id]; //remove that cursor and now send that info to frontend

            io.to(documentId).emit('cursor-removed', { 
                userId: socket.id,
                range: removedCursor?.range,
                color: removedCursor?.color,
            }); //For DOM to remove that cursor

            io.to(documentId).emit('active-users', Object.keys(activeUsers[documentId]).map(userId => ({
                userId,
                color: documentColors[documentId][userId] // Update the active users data
            })));
        });

        // Emit the active users data to clients, including the color
        io.to(documentId).emit('active-users', Object.keys(activeUsers[documentId]).map(userId => ({
            userId,
            color: documentColors[documentId][userId] // Retrieve the color for this user
        })));

        // Emit active users data to clients
        // io.to(documentId).emit('active-users', Object.keys(activeUsers[documentId]));

        const document = await findOrCreateDocument(documentId);
        socket.join(documentId);

        socket.emit('load-document', document.data);

        cursorColors[socket.id] = getRandomColor();
        if (!cursorPositions[documentId]) {
            cursorPositions[documentId] = {};
        }

        socket.on('cursor-position', ({ range, source }) => {
            // Store the cursor position and color for this user and document
            cursorPositions[documentId][socket.id] = { range, color: cursorColors[socket.id] };
      
            // Broadcast the cursor position to other clients in the same document
            socket.broadcast.to(documentId).emit('cursor-update', {
              userId: socket.id,
              range: cursorPositions[documentId][socket.id].range,
              color: cursorPositions[documentId][socket.id].color,
            });
        });

        // // Handle cursor position updates
        // socket.on('cursor-position', ({ range, source }) => {
        //     // Broadcast cursor position to other clients in the same room
        //     socket.broadcast.to(documentId).emit('cursor-update', { userId: socket.id, range });
        // });

        socket.on("send-changes", delta => {
            socket.broadcast.to(documentId).emit('receive-changes', delta);
        });

        socket.on('save-document', async data => {
            const savedDocument = await Document.findOne(
                {
                    canvasId: documentId
                }
            );

            const savedDocumentId = savedDocument._id;

            await Document.findByIdAndUpdate(
                savedDocumentId,
                {
                    data
                }
            )
        })
    })
});

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

async function findOrCreateDocument(id) {
    if (!id) return;

    // Try to find a document with the given canvasId
    try {
        console.log(`DOCUMENT ID - ${id}`);

        const document = await Document.findOne({ canvasId: id });
        if (!document) {
            const newDocument = await Document.create({
                canvasId: id,
                data: defaultValue
            });
            return newDocument;
        }
    
        return document;
    } catch (error) {
        console.log(`ERROR IN FINONE - ${error}`);
    }
    
}


// Start the server
const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
