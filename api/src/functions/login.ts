import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

// Test users for authentication
const testUsers = [
    { username: 'admin', password: 'admin123', role: 'administrator' },
    { username: 'user', password: 'user123', role: 'user' }
];

// User sessions (in production, use proper session storage)
const sessions = new Map();

export async function loginHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Login request received');

    // Handle CORS
    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        };
    }

    if (request.method !== 'POST') {
        return {
            status: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const body = await request.text();
        const { username, password } = JSON.parse(body);

        context.log(`Login attempt for user: ${username}`);

        // Find user
        const user = testUsers.find(u => u.username === username && u.password === password);

        if (!user) {
            return {
                status: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Invalid credentials' })
            };
        }

        // Create session
        const sessionId = Math.random().toString(36).substring(2, 15);
        sessions.set(sessionId, { 
            userId: user.username, 
            role: user.role, 
            loginTime: new Date().toISOString() 
        });

        context.log(`Login successful for user: ${username}`);

        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
                'Set-Cookie': `sessionId=${sessionId}; HttpOnly; Path=/; SameSite=Strict`
            },
            body: JSON.stringify({
                success: true,
                user: {
                    username: user.username,
                    role: user.role
                },
                sessionId
            })
        };

    } catch (error) {
        context.log('Login error:', error);
        return {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
}

app.http('login', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'auth/login',
    handler: loginHandler
});