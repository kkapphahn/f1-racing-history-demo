const { app } = require('@azure/functions');
const { startConversation, pollForCompletion } = require('../lib/genie-client');

app.http('startChat', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Starting new Genie conversation');

        try {
            const body = await request.json();
            const userMessage = body.message;

            if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
                return {
                    status: 400,
                    jsonBody: { error: 'Message is required' }
                };
            }

            // Start the conversation
            const { conversationId, messageId } = await startConversation(userMessage);

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
            context.log.error('Error in startChat:', error);
            return {
                status: 500,
                jsonBody: { error: error.message || 'Internal server error' }
            };
        }
    }
});
