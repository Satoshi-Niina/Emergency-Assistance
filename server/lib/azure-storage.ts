import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import * as fs from 'fs-extra';
import * as path from 'path';

export class AzureStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private containerName: string;
  private blobPrefix: string;
  private sharedKeyCredential?: StorageSharedKeyCredential;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    this.containerName =
      process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';

    // 環境変数のログ出力（デバッグ用）
    console.log('🔍 BLOB Storage Environment Variables:');
    console.log('   AZURE_STORAGE_CONNECTION_STRING:', connectionString ? `[SET] (length: ${connectionString.length})` : '[NOT SET]');
    console.log('   AZURE_STORAGE_CONTAINER_NAME:', this.containerName);
    console.log('   AZURE_STORAGE_ACCOUNT_NAME:', accountName ? '[SET]' : '[NOT SET]');
    console.log('   AZURE_STORAGE_ACCOUNT_KEY:', accountKey ? '[SET]' : '[NOT SET]');
    console.log('   BLOB_PREFIX:', process.env.BLOB_PREFIX || '[NOT SET]');

    // BLOB_PREFIXの正規化（末尾スラッシュ付与、空文字はそのまま）
    // 空文字列やundefinedの場合は空文字列として扱う
    let prefix = (process.env.BLOB_PREFIX && process.env.BLOB_PREFIX.trim()) || '';
    if (prefix && !prefix.endsWith('/')) {
      prefix += '/';
    }
    this.blobPrefix = prefix;

    // 接続文字列が存在し、空文字列でない場合
    if (connectionString && connectionString.trim()) {
      // 接続文字列の基本的な検証（警告のみ、エラーはthrowしない）
      if (connectionString.length < 50 || !connectionString.includes('AccountName=') || !connectionString.includes('AccountKey=')) {
        console.warn('⚠️ AZURE_STORAGE_CONNECTION_STRING appears to be invalid');
        console.warn('⚠️ Expected format: AccountName=...;AccountKey=...;EndpointSuffix=...');
        console.warn('⚠️ Attempting to initialize anyway...');
      }
      try {
        const parsed = this.parseConnectionString(connectionString);

        if (parsed.accountName && parsed.accountKey) {
          this.sharedKeyCredential = new StorageSharedKeyCredential(
            parsed.accountName,
            parsed.accountKey
          );
          this.blobServiceClient = new BlobServiceClient(
            `https://${parsed.accountName}.blob.core.windows.net`,
            this.sharedKeyCredential
          );
          console.log('✅ BLOB service client initialized with connection string (shared key)');
        } else {
          this.blobServiceClient =
            BlobServiceClient.fromConnectionString(connectionString);
          const credential = this.blobServiceClient.credential;
          if (credential instanceof StorageSharedKeyCredential) {
            this.sharedKeyCredential = credential;
          } else {
            console.warn('⚠️ Unable to derive shared key credential from connection string; SAS generation disabled');
          }
          console.log('✅ BLOB service client initialized with connection string');
        }
      } catch (error) {
        console.error('❌ Failed to initialize BLOB service client:', error);
        throw new Error(`Failed to initialize Azure Blob Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (accountName && accountKey && accountName.trim() && accountKey.trim()) {
      const credential = new StorageSharedKeyCredential(
        accountName.trim(),
        accountKey.trim()
      );
      this.sharedKeyCredential = credential;
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName.trim()}.blob.core.windows.net`,
        credential
      );
    } else if (accountName && accountName.trim()) {
      // Managed Identityを使用（Azure App Service上で動作）
      // connectionStringがない場合のみaccountNameが必要
      try {
        const credential = new DefaultAzureCredential();
        this.blobServiceClient = new BlobServiceClient(
          `https://${accountName.trim()}.blob.core.windows.net`,
          credential
        );
        console.log('✅ BLOB service client initialized with Managed Identity');
      } catch (error) {
        console.error('❌ Failed to initialize BLOB service client with Managed Identity:', error);
        throw new Error(`Failed to initialize Azure Blob Storage with Managed Identity: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // すべての接続方法が失敗した場合
      console.error('❌ No valid BLOB storage configuration found');
      console.error('❌ Required: AZURE_STORAGE_CONNECTION_STRING or (AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY) or AZURE_STORAGE_ACCOUNT_NAME (for Managed Identity)');
      throw new Error('AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME is required for Azure Blob Storage connection');
    }

    this.containerClient = this.blobServiceClient.getContainerClient(
      this.containerName
    );
  }

  private parseConnectionString(connectionString: string): {
    accountName?: string;
    accountKey?: string;
  } {
    return connectionString
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .reduce(
        (acc, part) => {
          const [key, ...rest] = part.split('=');
          if (!key || rest.length === 0) {
            return acc;
          }
          const value = rest.join('=');
          if (key === 'AccountName') {
            acc.accountName = value;
          } else if (key === 'AccountKey') {
            acc.accountKey = value;
          }
          return acc;
        },
        {} as { accountName?: string; accountKey?: string }
      );
  }

  private getFullBlobName(blobName: string): string {
    // blobName から先頭のスラッシュを削除
    const cleanBlobName = blobName.replace(/^\/+/u, '');
    
    // BLOB_PREFIX が設定されている場合は使用、なければ 'knowledge-base/' を使用
    const prefix = this.blobPrefix || 'knowledge-base/';
    
    // 既に knowledge-base/ で始まっている場合は prefix を追加しない
    if (cleanBlobName.startsWith('knowledge-base/')) {
      return cleanBlobName;
    }
    
    return prefix + cleanBlobName;
  }

  // コンテナの初期化
  async initializeContainer(): Promise<void> {
    try {
      await this.containerClient.createIfNotExists();
      console.log(
        `✅ Azure Storage container '${this.containerName}' initialized`
      );
    } catch (error) {
      console.error('❌ Failed to initialize Azure Storage container:', error);
      throw error;
    }
  }

  // ファイルをアップロード
  async uploadFile(localPath: string, blobName: string): Promise<string> {
    try {
      const fullBlobName = this.getFullBlobName(blobName);
      const blockBlobClient =
        this.containerClient.getBlockBlobClient(fullBlobName);
      const fileBuffer = await fs.readFile(localPath);

      await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
        blobHTTPHeaders: {
          blobContentType: this.getContentType(blobName),
        },
      });

      const url = blockBlobClient.url;
      console.log(`✅ File uploaded: ${fullBlobName} -> ${url}`);
      return url;
    } catch (error) {
      console.error(`❌ Failed to upload file ${blobName}:`, error);
      throw error;
    }
  }

  // ファイルをダウンロード（ローカルファイルに保存）
  async downloadFile(blobName: string, localPath: string): Promise<void> {
    try {
      const fullBlobName = this.getFullBlobName(blobName);
      const blockBlobClient =
        this.containerClient.getBlockBlobClient(fullBlobName);
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
    } catch (error) {
      console.error(`❌ Failed to download file ${blobName}:`, error);
      throw error;
    }
  }

  // ファイルを文字列として取得
  async downloadFileAsString(blobName: string): Promise<string> {
    try {
      const fullBlobName = this.getFullBlobName(blobName);
      const blockBlobClient =
        this.containerClient.getBlockBlobClient(fullBlobName);
      const downloadResponse = await blockBlobClient.download();
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error('No readable stream body in download response');
      }

      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk));
      }
      
      return Buffer.concat(chunks).toString('utf8');
    } catch (error) {
      console.error(`❌ Failed to download file as string ${blobName}:`, error);
      throw error;
    }
  }

  // ファイルの存在確認
  async fileExists(blobName: string): Promise<boolean> {
    try {
      const fullBlobName = this.getFullBlobName(blobName);
      const blockBlobClient =
        this.containerClient.getBlockBlobClient(fullBlobName);
      await blockBlobClient.getProperties();
      return true;
    } catch (error) {
      return false;
    }
  }

  // ファイルを削除
  async deleteFile(blobName: string): Promise<void> {
    try {
      const fullBlobName = this.getFullBlobName(blobName);
      const blockBlobClient =
        this.containerClient.getBlockBlobClient(fullBlobName);
      await blockBlobClient.delete();
      console.log(`✅ File deleted: ${fullBlobName}`);
    } catch (error) {
      console.error(`❌ Failed to delete file ${blobName}:`, error);
      throw error;
    }
  }

  // ディレクトリ内のファイル一覧を取得（ファイル名のみ）
  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const files: string[] = [];
      let fullPrefix = this.blobPrefix;
      if (prefix) {
        fullPrefix += prefix.replace(/^\/+/, '');
      }
      const listOptions = fullPrefix ? { prefix: fullPrefix } : {};

      for await (const blob of this.containerClient.listBlobsFlat(
        listOptions
      )) {
        files.push(blob.name);
      }

      return files;
    } catch (error) {
      console.error('❌ Failed to list files:', error);
      throw error;
    }
  }

  // ディレクトリ内のファイル一覧を詳細情報付きで取得
  async listFilesWithDetails(prefix?: string): Promise<Array<{
    name: string;
    properties: {
      lastModified: Date;
      contentLength: number;
      contentType?: string;
    };
  }>> {
    try {
      const files: Array<{
        name: string;
        properties: {
          lastModified: Date;
          contentLength: number;
          contentType?: string;
        };
      }> = [];
      
      let fullPrefix = this.blobPrefix;
      if (prefix) {
        fullPrefix += prefix.replace(/^\/+/, '');
      }
      const listOptions = fullPrefix ? { prefix: fullPrefix } : {};

      for await (const blob of this.containerClient.listBlobsFlat(
        listOptions
      )) {
        files.push({
          name: blob.name,
          properties: {
            lastModified: blob.properties.lastModified || new Date(),
            contentLength: blob.properties.contentLength || 0,
            contentType: blob.properties.contentType,
          },
        });
      }

      return files;
    } catch (error) {
      console.error('❌ Failed to list files with details:', error);
      throw error;
    }
  }

  // ファイルのURLを取得
  getFileUrl(blobName: string): string {
    const fullBlobName = this.getFullBlobName(blobName);
    const blockBlobClient =
      this.containerClient.getBlockBlobClient(fullBlobName);
    return blockBlobClient.url;
  }

  generateBlobSasUrl(
    blobName: string,
    expiresInMs: number = 60 * 60 * 1000
  ): string {
    if (!this.sharedKeyCredential) {
      throw new Error(
        'Shared key credential is required to generate SAS URLs. Ensure AccountName and AccountKey are configured.'
      );
    }

    const fullBlobName = this.getFullBlobName(blobName);
    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiresInMs);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: fullBlobName,
        permissions: BlobSASPermissions.parse('r'),
        startsOn,
        expiresOn,
      },
      this.sharedKeyCredential
    ).toString();

    const blockBlobClient =
      this.containerClient.getBlockBlobClient(fullBlobName);

    return `${blockBlobClient.url}?${sasToken}`;
  }

  // ローカルディレクトリ全体をアップロード
  async uploadDirectory(
    localDir: string,
    remotePrefix: string = ''
  ): Promise<void> {
    try {
      const files = await this.getAllFiles(localDir);

      for (const file of files) {
        const relativePath = path.relative(localDir, file);
        // remotePrefixは不要、blobPrefixで一元管理
        await this.uploadFile(file, relativePath);
      }

      console.log(`✅ Directory uploaded: ${localDir} -> ${this.blobPrefix}`);
    } catch (error) {
      console.error(`❌ Failed to upload directory ${localDir}:`, error);
      throw error;
    }
  }

  // ディレクトリ全体をダウンロード
  async downloadDirectory(
    remotePrefix: string,
    localDir: string
  ): Promise<void> {
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
    } catch (error) {
      console.error(
        `❌ Failed to download directory ${this.blobPrefix}:`,
        error
      );
      throw error;
    }
  }

  // 再帰的にファイル一覧を取得
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        files.push(...(await this.getAllFiles(fullPath)));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  // コンテンツタイプを取得
  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };

    return contentTypes[ext] || 'application/octet-stream';
  }
}

// シングルトンインスタンス
export const azureStorage = new AzureStorageService();
