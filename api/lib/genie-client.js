const { getAuthenticatedClient } = require('./databricks-auth');

const GENIE_SPACE_ID = process.env.DATABRICKS_GENIE_SPACE_ID;
const MAX_POLL_ATTEMPTS = 60; // 2 minutes with 2-second intervals
const POLL_INTERVAL_MS = 2000;

/**
 * Start a new conversation with Genie
 */
async function startConversation(userMessage) {
    if (!GENIE_SPACE_ID) {
        throw new Error('DATABRICKS_GENIE_SPACE_ID not configured');
    }

    try {
        const client = await getAuthenticatedClient();
        const response = await client.post(
            `/api/2.0/genie/spaces/${GENIE_SPACE_ID}/start-conversation`,
            { content: userMessage }
        );

        return {
            conversationId: response.data.conversation.id,
            messageId: response.data.message.id,
            status: response.data.message.status
        };
    } catch (error) {
        console.error('Failed to start conversation:', error.response?.data || error.message);
        throw new Error('Failed to start conversation with Genie');
    }
}

/**
 * Send a follow-up message in an existing conversation
 */
async function sendMessage(conversationId, userMessage) {
    if (!GENIE_SPACE_ID) {
        throw new Error('DATABRICKS_GENIE_SPACE_ID not configured');
    }

    try {
        const client = await getAuthenticatedClient();
        const response = await client.post(
            `/api/2.0/genie/spaces/${GENIE_SPACE_ID}/conversations/${conversationId}/messages`,
            { content: userMessage }
        );

        return {
            messageId: response.data.id,
            status: response.data.status
        };
    } catch (error) {
        console.error('Failed to send message:', error.response?.data || error.message);
        throw new Error('Failed to send message to Genie');
    }
}

/**
 * Get the status and result of a message
 */
async function getMessageStatus(conversationId, messageId) {
    if (!GENIE_SPACE_ID) {
        throw new Error('DATABRICKS_GENIE_SPACE_ID not configured');
    }

    try {
        const client = await getAuthenticatedClient();
        const response = await client.get(
            `/api/2.0/genie/spaces/${GENIE_SPACE_ID}/conversations/${conversationId}/messages/${messageId}`
        );

        const message = response.data;
        const result = {
            status: message.status,
            messageId: message.id
        };

        // If completed, extract the response
        if (message.status === 'COMPLETED' && message.attachments && message.attachments.length > 0) {
            const attachment = message.attachments[0];
            result.response = {
                text: attachment.text?.value || '',
                query: attachment.query?.query || null,
                data: null
            };

            // If there's query result data, fetch it
            if (attachment.query?.result_id) {
                try {
                    const dataResponse = await client.get(
                        `/api/2.0/genie/spaces/${GENIE_SPACE_ID}/conversations/${conversationId}/messages/${messageId}/query-result/${attachment.query.result_id}`
                    );
                    result.response.data = dataResponse.data;
                } catch (dataError) {
                    console.warn('Failed to fetch query result data:', dataError.message);
                }
            }
        } else if (message.status === 'FAILED') {
            result.error = message.error || 'Query failed';
        }

        return result;
    } catch (error) {
        console.error('Failed to get message status:', error.response?.data || error.message);
        throw new Error('Failed to get message status from Genie');
    }
}

/**
 * Poll for message completion with exponential backoff
 */
async function pollForCompletion(conversationId, messageId) {
    let attempts = 0;
    
    while (attempts < MAX_POLL_ATTEMPTS) {
        const status = await getMessageStatus(conversationId, messageId);
        
        if (status.status === 'COMPLETED') {
            return status;
        } else if (status.status === 'FAILED' || status.status === 'CANCELLED') {
            throw new Error(status.error || `Query ${status.status.toLowerCase()}`);
        }
        
        // Wait before next poll (exponential backoff: 2s, 2s, 4s, 4s, 6s, 6s, ...)
        const waitTime = Math.min(POLL_INTERVAL_MS * Math.floor(attempts / 2 + 1), 10000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempts++;
    }
    
    throw new Error('Query timeout - taking too long to complete');
}

/**
 * Delete a conversation to free up space
 */
async function deleteConversation(conversationId) {
    if (!GENIE_SPACE_ID) {
        throw new Error('DATABRICKS_GENIE_SPACE_ID not configured');
    }

    try {
        const client = await getAuthenticatedClient();
        await client.delete(
            `/api/2.0/genie/spaces/${GENIE_SPACE_ID}/conversations/${conversationId}`
        );
        return { success: true };
    } catch (error) {
        console.error('Failed to delete conversation:', error.response?.data || error.message);
        throw new Error('Failed to delete conversation');
    }
}

module.exports = {
    startConversation,
    sendMessage,
    getMessageStatus,
    pollForCompletion,
    deleteConversation
};
