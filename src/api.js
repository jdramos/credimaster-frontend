// src/api.js
import axios from 'axios';


const token = process.env.REACT_APP_API_TOKEN;
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000'; // Default to localhost if not set


const API = axios.create({
    baseURL: baseURL, // Adjust if needed
    headers: {
        'Content-Type': 'application/json',
        'Authorization': token, // Uncomment if using token-based auth
        // Add other headers if needed
    },
});

;

export default API;
