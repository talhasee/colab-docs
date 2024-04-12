import mongoose from 'mongoose';
import { Document } from './models/document.models.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from "dotenv";
import express from "express";
import cookieParser from 'cookie-parser';
import cors from "cors";

const DB_NAME = "documents"

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
const userSocketMapping = {};

io.on('connection', socket => {
    socket.on('get-document', async ({documentId, email}) => {

        if(email){
            userSocketMapping[socket.id] = email;
        }

        if (!activeUsers[documentId]) {
            activeUsers[documentId] = {};
        }

        if (!documentColors[documentId]) {
            documentColors[documentId] = {};
        }

        const color = getRandomColor();
        documentColors[documentId][socket.id] = color;

        activeUsers[documentId][socket.id] = true;


        socket.on('disconnect', () => {
            delete activeUsers[documentId][socket.id];
            delete documentColors[documentId][socket.id]; // Remove the color mapping for this socket

            const removedCursor = cursorPositions[documentId][socket.id]; // Store the cursor position and color before deleting

            const emailMapped = userSocketMapping[socket.id] ? userSocketMapping[socket.id] : undefined;
            delete userSocketMapping[socket.id];

            io.to(documentId).emit('cursor-removed', { 
                email: emailMapped,
                userId: socket.id,
                range: removedCursor?.range,
                color: removedCursor?.color,
            }); //For DOM to remove that cursor

        });


        const document = await findOrCreateDocument(documentId);
        socket.join(documentId);

        socket.emit('load-document', document.data);

        cursorColors[socket.id] = getRandomColor();
        if (!cursorPositions[documentId]) {
            cursorPositions[documentId] = {};
        }

        socket.on('cursor-position', ({ range, source }) => {

            if (!cursorPositions.hasOwnProperty(documentId)) {
                cursorPositions[documentId] = {};
            }
        
            // Check if cursorPositions[documentId][socket.id] exists
            if (!cursorPositions[documentId].hasOwnProperty(socket.id)) {
                // If it doesn't exist, store the cursor position and color for this user and document
                cursorPositions[documentId][socket.id] = { range, color: cursorColors[socket.id] };
            } else {
                // If it exists, update the range but keep the existing color
                cursorPositions[documentId][socket.id].range = range;
            }
      
            const emailMapped = userSocketMapping[socket.id] ? userSocketMapping[socket.id] : undefined;

            // Broadcast the cursor position to other clients in the same document
            socket.broadcast.to(documentId).emit('cursor-update', {
                email: emailMapped,
                userId: socket.id,
                range: cursorPositions[documentId][socket.id].range,
                color: cursorPositions[documentId][socket.id].color,
            });
        });

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
    console.log(`Server running on port ${process.env.PORT || PORT}`);
});
