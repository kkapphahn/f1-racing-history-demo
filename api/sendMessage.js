const { app } = require('@azure/functions');
const { sendMessage, pollForCompletion } = require('./lib/genie-client');

app.http('sendMessage', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Sending message to existing conversation');

        try {
            const body = await request.json();
            const { conversationId, message } = body;

            if (!conversationId || !message) {
                return {
                    status: 400,
                    jsonBody: { error: 'conversationId and message are required' }
                };
            }

            if (typeof message !== 'string' || message.trim().length === 0) {
                return {
                    status: 400,
                    jsonBody: { error: 'Message must be a non-empty string' }
                };
            }

            // Send the message
            const { messageId } = await sendMessage(conversationId, message);

            // Poll for completion
            const result = await pollForCompletion(conversationId, messageId);

            return {
                status: 200,
                jsonBody: {
                    conversationId,
                    messageId,
                    response: result.response
                }
            };

        } catch (error) {
            context.log.error('Error in sendMessage:', error);
            return {
                status: 500,
                jsonBody: { error: error.message || 'Internal server error' }
            };
        }
    }
});
