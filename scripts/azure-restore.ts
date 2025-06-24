#!/usr/bin/env tsx

import { knowledgeBaseAzure } from '../server/lib/knowledge-base-azure.js';

async function main() {
  const backupName = process.argv[2];
  
  if (!backupName) {
    console.error('❌ Please provide a backup name');
    console.log('Usage: npm run azure:restore <backup-name>');
    process.exit(1);
  }
  
  try {
    console.log(`🚀 Restoring from Azure Storage backup: ${backupName}`);
    
    await knowledgeBaseAzure.restoreFromBackup(backupName);
    
    console.log('✅ Azure Storage restore completed successfully');
  } catch (error) {
    console.error('❌ Azure Storage restore failed:', error);
    process.exit(1);
  }
}

main(); 