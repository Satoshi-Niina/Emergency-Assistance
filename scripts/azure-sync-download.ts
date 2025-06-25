#!/usr/bin/env tsx

import { knowledgeBaseAzure } from '../server/lib/knowledge-base-azure.js';

async function main() {
  try {
    console.log('🚀 Starting Azure Storage download...');
    
    await knowledgeBaseAzure.syncFromAzure();
    
    console.log('✅ Azure Storage download completed successfully');
  } catch (error) {
    console.error('❌ Azure Storage download failed:', error);
    process.exit(1);
  }
}

main(); 