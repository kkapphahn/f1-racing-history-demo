const axios = require('axios');

// In-memory token cache
let cachedToken = null;
let tokenExpiry = null;

/**
 * Get OAuth M2M token for Databricks service principal
 */
async function getAccessToken() {
    const host = process.env.DATABRICKS_HOST;
    const clientId = process.env.DATABRICKS_CLIENT_ID;
    const clientSecret = process.env.DATABRICKS_CLIENT_SECRET;

    if (!host || !clientId || !clientSecret) {
        throw new Error('Missing Databricks configuration. Set DATABRICKS_HOST, DATABRICKS_CLIENT_ID, and DATABRICKS_CLIENT_SECRET.');
    }

    // Return cached token if still valid (with 5 min buffer)
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 300000) {
        return cachedToken;
    }

    try {
        const tokenUrl = `${host}/oidc/v1/token`;
        const response = await axios.post(
            tokenUrl,
            new URLSearchParams({
                grant_type: 'client_credentials',
                scope: 'all-apis'
            }),
            {
                auth: {
                    username: clientId,
                    password: clientSecret
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        cachedToken = response.data.access_token;
        // Tokens typically expire in 1 hour (3600 seconds)
        tokenExpiry = Date.now() + (response.data.expires_in || 3600) * 1000;

        return cachedToken;
    } catch (error) {
        console.error('Failed to get Databricks access token:', error.response?.data || error.message);
        throw new Error('Authentication failed');
    }
}

/**
 * Get authenticated axios instance for Databricks API calls
 */
async function getAuthenticatedClient() {
    const token = await getAccessToken();
    const host = process.env.DATABRICKS_HOST;

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
    getAccessToken,
    getAuthenticatedClient
};
