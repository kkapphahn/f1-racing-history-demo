const axios = require('axios');

/**
 * Get authenticated axios instance for Databricks API calls using PAT
 */
async function getAuthenticatedClient() {
    const host = process.env.DATABRICKS_HOST;
    const token = process.env.DATABRICKS_TOKEN;

    if (!host || !token) {
        throw new Error('Missing Databricks configuration. Set DATABRICKS_HOST and DATABRICKS_TOKEN.');
    }

    return axios.create({
        baseURL: host,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        timeout: 30000
    });
}

module.exports = {
    getAuthenticatedClient
};
