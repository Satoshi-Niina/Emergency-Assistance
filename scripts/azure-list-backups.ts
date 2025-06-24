#!/usr/bin/env tsx

import { knowledgeBaseAzure } from '../server/lib/knowledge-base-azure.js';

async function main() {
  try {
    console.log('📋 Listing Azure Storage backups...');
    
    const backups = await knowledgeBaseAzure.listBackups();
    
    if (backups.length === 0) {
      console.log('📭 No backups found');
    } else {
      console.log('📋 Available backups:');
      backups.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup}`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to list Azure Storage backups:', error);
    process.exit(1);
  }
}

main(); 