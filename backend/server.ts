import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

interface User {
    id: string;
    username: string;
    password: string; // In production, store hashed passwords
}

interface Poem {
    id: string;
    title: string;
    authorId: string;
    authorName: string;
    content: string;
    comments: Comment[];
}

interface Comment {
    id: string;
    userId: string;
    username: string;
    text: string;
}

interface Database {
    users: User[];
    poems: Poem[];
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Load the database (in memory)
const dbPath = path.join(__dirname, 'database.json');
let db: Database = {
    users: [],
    poems: []
};

function loadDatabase() {
    if (fs.existsSync(dbPath)) {
        const raw = fs.readFileSync(dbPath, 'utf8');
        db = JSON.parse(raw);
    } else {
        saveDatabase();
    }
}

function saveDatabase() {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

loadDatabase();

// Add your routes and other logic here

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});
