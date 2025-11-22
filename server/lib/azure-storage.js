import { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters, } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import * as fs from 'fs-extra';
import * as path from 'path';
export class AzureStorageService {
    constructor() {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        this.containerName =
            process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';
        // BLOB_PREFIXの正規化（末尾スラッシュ付与、空文字はそのまま）
        let prefix = (process.env.BLOB_PREFIX && process.env.BLOB_PREFIX.trim()) || '';
        if (prefix && !prefix.endsWith('/')) {
            prefix += '/';
        }
        this.blobPrefix = prefix;
        this.sharedKeyCredential = undefined;
        if (connectionString && connectionString.trim()) {
            const parsed = this.parseConnectionString(connectionString);
            if ((parsed === null || parsed === void 0 ? void 0 : parsed.accountName) && (parsed === null || parsed === void 0 ? void 0 : parsed.accountKey)) {
                this.sharedKeyCredential = new StorageSharedKeyCredential(parsed.accountName, parsed.accountKey);
                this.blobServiceClient = new BlobServiceClient(`https://${parsed.accountName}.blob.core.windows.net`, this.sharedKeyCredential);
            }
            else {
                this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
                const credential = this.blobServiceClient.credential;
                if (credential instanceof StorageSharedKeyCredential) {
                    this.sharedKeyCredential = credential;
                }
            }
        }
        else if (accountName && accountKey && accountName.trim() && accountKey.trim()) {
            const credential = new StorageSharedKeyCredential(accountName.trim(), accountKey.trim());
            this.sharedKeyCredential = credential;
            this.blobServiceClient = new BlobServiceClient(`https://${accountName.trim()}.blob.core.windows.net`, credential);
        }
        else if (accountName && accountName.trim()) {
            // Managed Identityを使用（Azure App Service上で動作）
            const credential = new DefaultAzureCredential();
            this.blobServiceClient = new BlobServiceClient(`https://${accountName.trim()}.blob.core.windows.net`, credential);
        }
        else {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME is required for Azure Blob Storage connection');
        }
        this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    }
    parseConnectionString(connectionString) {
        return connectionString
            .split(';')
            .map(part => part.trim())
            .filter(Boolean)
            .reduce((acc, part) => {
                const [key, ...rest] = part.split('=');
                if (!key || rest.length === 0) {
                    return acc;
                }
                const value = rest.join('=');
                if (key === 'AccountName') {
                    acc.accountName = value;
                }
                else if (key === 'AccountKey') {
                    acc.accountKey = value;
                }
                return acc;
            }, {});
    }
    getFullBlobName(blobName) {
        return this.blobPrefix + blobName.replace(/^\/+/u, '');
    }
    // コンテナの初期化
    async initializeContainer() {
        try {
            await this.containerClient.createIfNotExists();
            console.log(`✅ Azure Storage container '${this.containerName}' initialized`);
        }
        catch (error) {
            console.error('❌ Failed to initialize Azure Storage container:', error);
            throw error;
        }
    }
    // ファイルをアップロード
    async uploadFile(localPath, blobName) {
        try {
            const fullBlobName = this.getFullBlobName(blobName);
            const blockBlobClient = this.containerClient.getBlockBlobClient(fullBlobName);
            const fileBuffer = await fs.readFile(localPath);
            await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
                blobHTTPHeaders: {
                    blobContentType: this.getContentType(blobName),
                },
            });
            const url = blockBlobClient.url;
            console.log(`✅ File uploaded: ${fullBlobName} -> ${url}`);
            return url;
        }
        catch (error) {
            console.error(`❌ Failed to upload file ${blobName}:`, error);
            throw error;
        }
    }
    // ファイルをダウンロード
    async downloadFile(blobName, localPath) {
        try {
            const fullBlobName = this.getFullBlobName(blobName);
            const blockBlobClient = this.containerClient.getBlockBlobClient(fullBlobName);
            const downloadResponse = await blockBlobClient.download();
            // ディレクトリを作成
            await fs.ensureDir(path.dirname(localPath));
            // ファイルに書き込み
            const writeStream = fs.createWriteStream(localPath);
            downloadResponse.readableStreamBody?.pipe(writeStream);
            return new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });
        }
        catch (error) {
            console.error(`❌ Failed to download file ${blobName}:`, error);
            throw error;
        }
    }
    // ファイルの存在確認
    async fileExists(blobName) {
        try {
            const fullBlobName = this.getFullBlobName(blobName);
            const blockBlobClient = this.containerClient.getBlockBlobClient(fullBlobName);
            await blockBlobClient.getProperties();
            return true;
        }
        catch (error) {
            return false;
        }
    }
    // ファイルを削除
    async deleteFile(blobName) {
        try {
            const fullBlobName = this.getFullBlobName(blobName);
            const blockBlobClient = this.containerClient.getBlockBlobClient(fullBlobName);
            await blockBlobClient.delete();
            console.log(`✅ File deleted: ${fullBlobName}`);
        }
        catch (error) {
            console.error(`❌ Failed to delete file ${blobName}:`, error);
            throw error;
        }
    }
    // ディレクトリ内のファイル一覧を取得
    async listFiles(prefix) {
        try {
            const files = [];
            // BLOB_PREFIX + prefix（prefixが空ならBLOB_PREFIXのみ）
            let fullPrefix = this.blobPrefix;
            if (prefix) {
                fullPrefix += prefix.replace(/^\/+/, '');
            }
            const listOptions = fullPrefix ? { prefix: fullPrefix } : {};
            for await (const blob of this.containerClient.listBlobsFlat(listOptions)) {
                files.push(blob.name);
            }
            return files;
        }
        catch (error) {
            console.error('❌ Failed to list files:', error);
            throw error;
        }
    }
    // ファイルのURLを取得
    getFileUrl(blobName) {
        const fullBlobName = this.getFullBlobName(blobName);
        const blockBlobClient = this.containerClient.getBlockBlobClient(fullBlobName);
        return blockBlobClient.url;
    }
    generateBlobSasUrl(blobName, expiresInMs = 60 * 60 * 1000) {
        if (!this.sharedKeyCredential) {
            throw new Error('Shared key credential is required to generate SAS URLs. Ensure AccountName and AccountKey are configured.');
        }
        const fullBlobName = this.getFullBlobName(blobName);
        const startsOn = new Date();
        const expiresOn = new Date(startsOn.getTime() + expiresInMs);
        const sasToken = generateBlobSASQueryParameters({
            containerName: this.containerName,
            blobName: fullBlobName,
            permissions: BlobSASPermissions.parse('r'),
            startsOn,
            expiresOn,
        }, this.sharedKeyCredential).toString();
        const blockBlobClient = this.containerClient.getBlockBlobClient(fullBlobName);
        return `${blockBlobClient.url}?${sasToken}`;
    }
    // ローカルディレクトリ全体をアップロード
    async uploadDirectory(localDir, remotePrefix = '') {
        try {
            const files = await this.getAllFiles(localDir);
            for (const file of files) {
                const relativePath = path.relative(localDir, file);
                // remotePrefixは不要、blobPrefixで一元管理
                await this.uploadFile(file, relativePath);
            }
            console.log(`✅ Directory uploaded: ${localDir} -> ${this.blobPrefix}`);
        }
        catch (error) {
            console.error(`❌ Failed to upload directory ${localDir}:`, error);
            throw error;
        }
    }
    // ディレクトリ全体をダウンロード
    async downloadDirectory(remotePrefix, localDir) {
        try {
            const files = await this.listFiles();
            for (const blobName of files) {
                // blobNameからBLOB_PREFIXを除去して相対パス化
                const relativePath = blobName.startsWith(this.blobPrefix)
                    ? blobName.slice(this.blobPrefix.length)
                    : blobName;
                const localPath = path.join(localDir, relativePath);
                await this.downloadFile(relativePath, localPath);
            }
            console.log(`✅ Directory downloaded: ${this.blobPrefix} -> ${localDir}`);
        }
        catch (error) {
            console.error(`❌ Failed to download directory ${this.blobPrefix}:`, error);
            throw error;
        }
    }
    // 再帰的にファイル一覧を取得
    async getAllFiles(dir) {
        const files = [];
        const items = await fs.readdir(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
                files.push(...(await this.getAllFiles(fullPath)));
            }
            else {
                files.push(fullPath);
            }
        }
        return files;
    }
    // コンテンツタイプを取得
    getContentType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const contentTypes = {
            '.json': 'application/json',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        };
        return contentTypes[ext] || 'application/octet-stream';
    }
}
// シングルトンインスタンス
export const azureStorage = new AzureStorageService();
