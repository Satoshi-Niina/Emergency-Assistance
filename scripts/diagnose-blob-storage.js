/**
 * Blob Storage接続診断スクリプト
 * Azure Storage Account接続確認
 */

const { BlobServiceClient } = require("@azure/storage-blob");

async function diagnoseBlobStorage() {
    console.log('🔍 Blob Storage接続診断開始...');
    
    try {
        // 環境変数確認
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
            console.log('❌ AZURE_STORAGE_CONNECTION_STRING環境変数が設定されていません');
            return;
        }
        
        console.log('✅ 環境変数確認完了');
        
        // Blob Service Client作成
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        console.log('✅ BlobServiceClient作成成功');

        // コンテナ一覧取得テスト
        console.log('\n📋 コンテナ一覧取得テスト...');
        try {
            const containers = [];
            for await (const container of blobServiceClient.listContainers()) {
                containers.push(container);
            }
            console.log(`📊 コンテナ数: ${containers.length}`);
            containers.forEach(container => {
                console.log(`  📦 ${container.name} (最終更新: ${container.properties.lastModified})`);
            });
        } catch (error) {
            console.log('❌ コンテナ一覧取得失敗:', error.message);
        }

        // 各コンテナのファイル確認
        const containerNames = ['documents', 'images', 'uploads'];
        
        for (const containerName of containerNames) {
            console.log(`\n📁 コンテナ「${containerName}」のファイル確認...`);
            try {
                const containerClient = blobServiceClient.getContainerClient(containerName);
                
                // コンテナ存在確認
                const exists = await containerClient.exists();
                if (!exists) {
                    console.log(`⚠️  コンテナ「${containerName}」が存在しません`);
                    
                    // コンテナ作成試行
                    try {
                        await containerClient.create({
                            access: 'blob' // パブリックアクセス
                        });
                        console.log(`✅ コンテナ「${containerName}」を作成しました`);
                    } catch (createError) {
                        console.log(`❌ コンテナ「${containerName}」の作成に失敗:`, createError.message);
                    }
                    continue;
                }
                
                console.log(`✅ コンテナ「${containerName}」存在確認`);
                
                // ファイル一覧取得
                const blobs = [];
                for await (const blob of containerClient.listBlobsFlat()) {
                    blobs.push(blob);
                }
                
                console.log(`  📊 ファイル数: ${blobs.length}`);
                if (blobs.length > 0) {
                    console.log('  📄 ファイル一覧:');
                    blobs.slice(0, 5).forEach(blob => {
                        const sizeKB = (blob.properties.contentLength / 1024).toFixed(2);
                        console.log(`    - ${blob.name} (${sizeKB} KB, ${blob.properties.lastModified})`);
                    });
                    if (blobs.length > 5) {
                        console.log(`    ... 他 ${blobs.length - 5} 件`);
                    }
                } else {
                    console.log('  📄 ファイルが存在しません');
                }
                
            } catch (error) {
                console.log(`❌ コンテナ「${containerName}」エラー:`, error.message);
            }
        }

        // テストファイルアップロード
        console.log('\n🧪 テストファイルアップロード...');
        try {
            const testContainerClient = blobServiceClient.getContainerClient('uploads');
            const testFileName = `test-${Date.now()}.txt`;
            const testContent = `テストファイル - ${new Date().toISOString()}`;
            
            const blockBlobClient = testContainerClient.getBlockBlobClient(testFileName);
            await blockBlobClient.upload(testContent, Buffer.byteLength(testContent));
            
            console.log(`✅ テストファイル「${testFileName}」アップロード成功`);
            
            // テストファイル削除
            await blockBlobClient.delete();
            console.log(`✅ テストファイル削除完了`);
            
        } catch (error) {
            console.log('❌ テストアップロード失敗:', error.message);
        }

        console.log('\n🎉 Blob Storage診断完了!');

    } catch (error) {
        console.error('❌ Blob Storage診断エラー:', error.message);
        console.error('詳細:', error.stack);
    }
}

diagnoseBlobStorage().catch(console.error);
