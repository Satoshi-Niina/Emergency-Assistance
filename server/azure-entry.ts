#!/usr/bin/env node

// Azure App Service 確実起動用エントリポイント
import 'dotenv/config';
import app from './azure-minimal-server.js';

const port = process.env.PORT || 80;
