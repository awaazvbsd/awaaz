import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;

if (!apiKey) {
    console.error('No API key found in .env.local');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    console.log('--- Listing Models (v1beta) ---');
    try {
        // We can't easily list models via the SDK in node sometimes, causing issues.
        // Let's rely on a direct fetch if possible, or just try generating with known candidates.

        // Actually, let's try to fetch the list directly using the REST API to be absolutely sure.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Available Models:', JSON.stringify(data, null, 2));

        // Write to file for the agent to read
        fs.writeFileSync('available_models.json', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
