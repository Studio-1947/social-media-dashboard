import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api/metricool',
});

export const fetchSettings = async (userId: string) => {
    const response = await api.get(`/settings?userId=${userId}`);
    return response.data;
};

// Add more API methods as we implement features
export const fetchInstagramData = async (userId: string, blogId: string, from: string, to: string) => {
    // instagram?from=...&to=...&userId=...&blogId=...
    const url = `/instagram?from=${from}&to=${to}&userId=${userId}&blogId=${blogId}`;
    const response = await api.get(url);
    return response.data;
};

export const fetchTimelines = async (userId: string, blogId: string, from: string, to: string) => {
    const url = `/timelines?from=${from}&to=${to}&userId=${userId}&blogId=${blogId}`;
    const response = await api.get(url);
    return response.data;
}

export const fetchDistribution = async (userId: string, blogId: string, from: string, to: string) => {
    const url = `/distribution?from=${from}&to=${to}&userId=${userId}&blogId=${blogId}`;
    const response = await api.get(url);
    return response.data;
}

export default api;
