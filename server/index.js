require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - Dynamic and Robust
const FRONTEND_URLS = process.env.FRONTEND_URLS
    ? process.env.FRONTEND_URLS.split(',').map(url => url.trim())
    : ['http://localhost:5173', 'http://localhost:3000', ' https://social-media-dashboard-frontend-rosy.vercel.app'];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (FRONTEND_URLS.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log(`[CORS] Blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());

const METRICOOL_BASE_URL = 'https://app.metricool.com/api';
// Fallback key if env is missing
const API_KEY = process.env.METRICOOL_API_KEY || 'LMMEBCYTIHSXHCIWOQKNNZOYSXCIRACWWMQQZEVFCMRYVHQXVSRWZDWYGXIOVMFU';

const metricoolClient = axios.create({
    baseURL: METRICOOL_BASE_URL,
    headers: {
        'X-Mc-Auth': API_KEY,
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
    },
    validateStatus: () => true // Don't throw on 4xx/5xx
});

// Mock Data Generators
const getMockInstagramData = () => ({
    "evolution": [
        { "date": "2025-11-17", "followers": 12400 },
        { "date": "2025-11-21", "followers": 12450 },
        { "date": "2025-11-25", "followers": 12480 },
        { "date": "2025-11-29", "followers": 12510 },
        { "date": "2025-12-03", "followers": 12550 },
        { "date": "2025-12-07", "followers": 12590 },
        { "date": "2025-12-11", "followers": 12600 },
        { "date": "2025-12-15", "followers": 12650 }
    ]
});

const getMockSettings = () => ({
    "brand": {
        "name": "My Awesome Brand",
        "avatar": "https://via.placeholder.com/150"
    }
});

app.use('/api/metricool', async (req, res) => {
    const endpoint = req.url;
    const method = req.method;

    console.log(`[Proxy] ${method} ${endpoint}`);

    try {
        let targetUrl = endpoint;

        // Rewrite /instagram to the verified follower growth endpoint
        if (endpoint.includes('/instagram')) {
            // Using the endpoint that returned valid JSON (even if empty)
            targetUrl = endpoint.replace('/instagram', '/stats/timeline/followers');

            // Note: The params userId/blogId/from/to are already in the query string from frontend
        }

        // Rewrite /distribution to verified endpoint
        if (endpoint.includes('/distribution')) {
            targetUrl = endpoint.replace('/distribution', '/v2/analytics/distribution');
            if (!targetUrl.includes('subject=')) {
                targetUrl += `&subject=instagram`;
            }
        }

        // Rewrite /timelines to verified posts endpoint if requested specifically
        if (endpoint.includes('/timelines')) {
            targetUrl = endpoint.replace('/timelines', '/v2/analytics/timelines');
            if (!targetUrl.includes('subject=')) {
                targetUrl += `&subject=instagram`;
            }
        }

        const response = await metricoolClient.request({
            url: targetUrl,
            method: method,
            data: req.body
        });

        // CHECK: Is the response actual JSON or the HTML fallback?
        const contentType = response.headers['content-type'];
        const isHtml = typeof response.data === 'string' && response.data.trim().startsWith('<');

        if (response.status === 200 && !isHtml) {
            console.log('[Proxy] Success (Real API)');
            res.status(200).json(response.data);
        } else {
            console.log(`[Proxy] API Failed (Status: ${response.status}). NOT serving Mock Data (User Request).`);
            res.status(response.status).json({ error: "API Request Failed" });
        }

    } catch (error) {
        console.error(`[Proxy Error] ${error.message} on ${endpoint}`);
        if (error.response) {
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error setup:', error.message);
        }
        res.status(500).json({ error: "Network Error", details: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Social Media Dashboard API is running.');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
