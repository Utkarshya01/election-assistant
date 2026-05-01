require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { OpenAI } = require('openai');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const compression = require('compression');

// Initialize in-memory cache to save API quotas (TTL: 1 hour)
const apiCache = new NodeCache({ stdTTL: 3600 });

const app = express();
const PORT = process.env.PORT || 3000;

// Compress responses for faster load times and less bandwidth
app.use(compression());

// Secure HTTP headers
app.use(helmet());

// Note: In production, configure CORS with specific domains instead of '*'
app.use(cors({ origin: '*' }));
app.use(express.json());

// Apply rate limiting to prevent API abuse (DDoS / cost-overrun protection)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', apiLimiter);

// Endpoint to expose Maps API Key to frontend (Required for Maps JS to load)
app.get('/api/config', (req, res) => {
    const cacheKey = 'maps_config';
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);
    
    const config = { mapsApiKey: process.env.GOOGLE_MAPS_API_KEY };
    apiCache.set(cacheKey, config);
    res.json(config);
});

// Civic Information Endpoint
app.post('/api/civic', async (req, res) => {
    try {
        const { address } = req.body;
        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }
        
        // Check if we already fetched data for this exact address recently
        const cacheKey = `civic_${address.toLowerCase().trim()}`;
        const cachedData = apiCache.get(cacheKey);
        if (cachedData) {
            console.log("Serving Civic API from cache for:", address);
            return res.json(cachedData);
        }

        const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
        const response = await axios.get('https://www.googleapis.com/civicinfo/v2/voterinfo', {
            params: {
                address: address,
                key: apiKey,
                electionId: 2000 // VIP Test Election
            }
        });

        console.log("Civic API Response keys:", Object.keys(response.data));
        if (response.data.pollingLocations) {
            console.log("Polling locations:", response.data.pollingLocations.length);
        } else {
            console.log("No pollingLocations key found.");
        }
        
        // Cache the successful response
        apiCache.set(cacheKey, response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching civic info:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch voter information' });
    }
});

// Chat Endpoint with ChatGPT
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [], userContext = "" } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        const openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENAI_API_KEY
        });
        
        let prompt = `You are a helpful and concise Election Assistant chatbot. Answer the user's question about elections concisely (2-4 sentences max). If they ask about something unrelated to elections or voting, gently steer them back.`;
        
        if (userContext) {
            prompt += `\n\nUSER CONTEXT: ${userContext}\nUse this context to personalize your answers if the user asks where to vote or what their polling location is.`;
        }
        
        const messages = [
            { role: "system", content: prompt },
            ...history,
            { role: "user", content: message }
        ];

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages
        });
        
        const text = response.choices[0].message.content;
        
        res.json({ reply: text });
    } catch (error) {
        console.error('Error with OpenAI API:', error.message);
        res.status(500).json({ error: 'Failed to process chat message' });
    }
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
