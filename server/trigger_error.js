const axios = require('axios');

async function run() {
    try {
        const url = 'http://localhost:5000/api/metricool/instagram?from=2025-11-17T00%3A00%3A00&to=2025-12-16T23:59:59&userId=4145269&blogId=5604084';
        console.log(`Hitting ${url}`);
        const res = await axios.get(url);
        console.log('Success:', res.status, res.data);
    } catch (e) {
        console.log('Error:', e.response ? e.response.status : e.message);
        if (e.response) console.log('Data:', e.response.data);
    }
}
run();
