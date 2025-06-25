#!/usr/bin/env tsx

import { knowledgeBaseAzure } from '../server/lib/knowledge-base-azure.js';

async function main() {
  try {
    console.log('🚀 Starting Azure Storage upload...');
    
    await knowledgeBaseAzure.syncToAzure();
    
    console.log('✅ Azure Storage upload completed successfully');
  } catch (error) {
    console.error('❌ Azure Storage upload failed:', error);
    process.exit(1);
  }
}

main(); 