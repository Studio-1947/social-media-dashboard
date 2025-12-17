const axios = require('axios');

const apiKey = 'LMMEBCYTIHSXHCIWOQKNNZOYSXCIRACWWMQQZEVFCMRYVHQXVSRWZDWYGXIOVMFU';
const userId = '4145269';
const blogId = '5604084';

const endpoints = [
    // Try simpler endpoints that might work
    `/admin/simpleProfiles?userId=${userId}&blogId=${blogId}`,
    `/v2/settings/brands/connections/instagram/media-feed?userId=${userId}&blogId=${blogId}`,
    // Instagram posts (we verified this works earlier)
    `/v2/analytics/posts/instagram?userId=${userId}&blogId=${blogId}&from=2025-11-17T00:00:00&to=2025-12-16T23:59:59`
];

async function test() {
    for (const endpoint of endpoints) {
        try {
            const url = `https://app.metricool.com/api${endpoint}`;
            console.log(`\n\nTesting: ${url}`);
            const res = await axios.get(url, {
                headers: {
                    'X-Mc-Auth': apiKey,
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                }
            });

            const isJson = res.headers['content-type']?.includes('json');
            const isHtml = typeof res.data === 'string' && res.data.trim().startsWith('<');

            if (res.status === 200 && isJson && !isHtml) {
                console.log('✅ SUCCESS! Status:', res.status);
                console.log('Data sample:', JSON.stringify(res.data).substring(0, 200));
            } else {
                console.log('❌ Failed - Status:', res.status, 'Is HTML:', isHtml);
            }
        } catch (e) {
            console.log('❌ Error:', e.message);
        }
    }
}

test();
