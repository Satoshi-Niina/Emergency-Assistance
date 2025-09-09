#!/usr/bin/env node
/**
 * ユーザー作成ユーティリティ
 */
const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function createUser() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Check if user exists
        const existingUser = await client.query('SELECT username FROM users WHERE username = $1', ['niina']);
        
        if (existingUser.rows.length > 0) {
            console.log('User niina already exists, updating password...');
            const hashedPassword = await bcrypt.hash('G&896845', 12);
            const result = await client.query(
                'UPDATE users SET password = $1 WHERE username = $2 RETURNING username, role',
                [hashedPassword, 'niina']
            );
            console.log('Password updated:', result.rows[0]);
        } else {
            console.log('Creating new user niina...');
            const hashedPassword = await bcrypt.hash('G&896845', 12);
            const result = await client.query(
                'INSERT INTO users (username, password, display_name, role) VALUES ($1, $2, $3, $4) RETURNING username, role',
                ['niina', hashedPassword, 'Niina', 'system_admin']
            );
            console.log('User created:', result.rows[0]);
        }
    } catch (err) {
        console.error('Error:', err.message);
        throw err;
    } finally {
        await client.end();
    }
}

createUser().catch(err => {
    console.error('Failed to create user:', err);
    process.exit(1);
});
