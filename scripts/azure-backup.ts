#!/usr/bin/env tsx

import { knowledgeBaseAzure } from '../server/lib/knowledge-base-azure.js';

async function main() {
  try {
    console.log('🚀 Creating Azure Storage backup...');
    
    await knowledgeBaseAzure.createBackup();
    
    console.log('✅ Azure Storage backup created successfully');
  } catch (error) {
    console.error('❌ Azure Storage backup failed:', error);
    process.exit(1);
  }
}

main(); 