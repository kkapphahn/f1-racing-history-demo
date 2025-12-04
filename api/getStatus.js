const { app } = require('@azure/functions');
const { getMessageStatus } = require('../lib/genie-client');

app.http('getStatus', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Getting message status');

        try {
            const conversationId = request.query.get('conversationId');
            const messageId = request.query.get('messageId');

            if (!conversationId || !messageId) {
                return {
                    status: 400,
                    jsonBody: { error: 'conversationId and messageId query parameters are required' }
                };
            }

            const result = await getMessageStatus(conversationId, messageId);

            return {
                status: 200,
                jsonBody: result
            };

        } catch (error) {
            context.log.error('Error in getStatus:', error);
            return {
                status: 500,
                jsonBody: { error: error.message || 'Internal server error' }
            };
        }
    }
});
