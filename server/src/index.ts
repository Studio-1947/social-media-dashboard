import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import cors from 'cors';
import axios, { AxiosError } from 'axios';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const METRICOOL_BASE_URL = 'https://app.metricool.com/api';
const API_KEY = process.env.METRICOOL_API_KEY || 'LMMEBCYTIHSXHCIWOQKNNZOYSXCIRACWWMQQZEVFCMRYVHQXVSRWZDWYGXIOVMFU';

const metricoolClient = axios.create({
    baseURL: METRICOOL_BASE_URL,
    headers: {
        'X-Mc-Auth': API_KEY,
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
    },
    validateStatus: () => true
});

app.use('/api/metricool', async (req: Request, res: Response) => {
    const endpoint = req.url;
    const method = req.method;

    console.log(`[Proxy] ${method} ${endpoint}`);

    try {
        let targetUrl = endpoint;

        // UPDATED ROUTING - Use working endpoints discovered through testing
        if (endpoint.includes('/instagram')) {
            // Use the posts endpoint which we know returns 200
            targetUrl = endpoint.replace('/instagram', '/v2/analytics/posts/instagram');
        }

        if (endpoint.includes('/distribution')) {
            targetUrl = endpoint.replace('/distribution', '/v2/analytics/distribution');
            if (!targetUrl.includes('subject=')) {
                targetUrl += `&subject=instagram`;
            }
        }

        if (endpoint.includes('/timelines')) {
            targetUrl = endpoint.replace('/timelines', '/v2/analytics/timelines');
            if (!targetUrl.includes('subject=')) {
                targetUrl += `&subject=instagram`;
            }
        }

        // New endpoint for profile data
        if (endpoint.includes('/profile')) {
            targetUrl = endpoint.replace('/profile', '/admin/simpleProfiles');
        }

        console.log(`[Proxy] Forwarding to: ${METRICOOL_BASE_URL}${targetUrl}`);

        const response = await metricoolClient.request({
            url: targetUrl,
            method: method,
            data: req.body
        });

        const contentType = response.headers['content-type'];
        const isHtml = typeof response.data === 'string' && response.data.trim().startsWith('<');

        if (response.status === 200 && !isHtml) {
            console.log(`[Proxy] ✅ Success - returned ${JSON.stringify(response.data).length} bytes`);
            res.status(200).json(response.data);
        } else if (response.status === 500) {
            console.log(`[Proxy] ⚠️  Metricool returned 500 - endpoint may not be available for your plan`);
            res.status(200).json({ data: [], error: "Endpoint not available" });
        } else {
            console.log(`[Proxy] API returned status: ${response.status}`);
            res.status(response.status).json({
                error: "Metricool API Error",
                upstreamStatus: response.status
            });
        }

    } catch (error) {
        const err = error as AxiosError;
        console.error(`[Proxy Error] ${err.message}`);

        if (err.response) {
            console.error('Status:', err.response.status);
            res.status(err.response.status).json({
                error: "Upstream API Error",
                details: err.response.data
            });
        } else {
            res.status(500).json({ error: "Network Error", details: err.message });
        }
    }
});

app.get('/', (req, res) => {
    res.send('Social Media Dashboard API (TypeScript) - Ready');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
