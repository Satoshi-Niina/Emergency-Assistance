import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function healthHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Health check request received');

    return {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'Emergency Assistance API'
        })
    };
}

app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: healthHandler
});