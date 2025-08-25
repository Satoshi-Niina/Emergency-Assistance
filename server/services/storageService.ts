import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

// Azure Blob Storage髢｢騾｣・域悽逡ｪ迺ｰ蠅・畑・・
interface AzureBlobConfig {
  accountName: string;
  accountKey: string;
  containerName: string;
  connectionString?: string;
}

export interface StorageConfig {
  type: 'local' | 'azure';
  localPath?: string;
  azure?: AzureBlobConfig;
}

export interface UploadResult {
  url: string;
  path: string;
  filename: string;
  size: number;
}

export class StorageService {
  private config: StorageConfig;
  private isProduction: boolean;

  constructor(config: StorageConfig) {
    this.config = config;
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // 繝ｭ繝ｼ繧ｫ繝ｫ繧ｹ繝医Ξ繝ｼ繧ｸ縺ｮ繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｽ懈・
    if (config.type === 'local' && config.localPath) {
      this.ensureDirectoryExists(config.localPath);
    }
  }

  /**
   * 繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`笨・繝・ぅ繝ｬ繧ｯ繝医Μ菴懈・: ${dirPath}`);
    }
  }

  /**
   * Base64逕ｻ蜒上ｒ繝輔ぃ繧､繝ｫ縺ｨ縺励※菫晏ｭ・
   */
  async saveBase64Image(base64Data: string, filename?: string): Promise<UploadResult> {
    try {
      // Base64繝・・繧ｿ縺九ｉ繝倥ャ繝繝ｼ繧帝勁蜴ｻ
      const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Image, 'base64');
      
      // 繝輔ぃ繧､繝ｫ蜷阪ｒ逕滓・
      const fileExtension = this.getFileExtensionFromBase64(base64Data);
      const finalFilename = filename || `${uuidv4()}.${fileExtension}`;
      
      if (this.config.type === 'local') {
        return await this.saveToLocal(buffer, finalFilename);
      } else if (this.config.type === 'azure') {
        return await this.saveToAzure(buffer, finalFilename);
      } else {
        throw new Error('繧ｹ繝医Ξ繝ｼ繧ｸ繧ｿ繧､繝励′險ｭ螳壹＆繧後※縺・∪縺帙ｓ');
      }
    } catch (error) {
      console.error('笶・逕ｻ蜒丈ｿ晏ｭ倥お繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 繝ｭ繝ｼ繧ｫ繝ｫ繧ｹ繝医Ξ繝ｼ繧ｸ縺ｫ菫晏ｭ・
   */
  private async saveToLocal(buffer: Buffer, filename: string): Promise<UploadResult> {
    if (!this.config.localPath) {
      throw new Error('繝ｭ繝ｼ繧ｫ繝ｫ繧ｹ繝医Ξ繝ｼ繧ｸ繝代せ縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ');
    }

    const filePath = path.join(this.config.localPath, filename);
    
    // 繝輔ぃ繧､繝ｫ繧剃ｿ晏ｭ・
    fs.writeFileSync(filePath, buffer);
    
    const stats = fs.statSync(filePath);
    const url = `/uploads/images/${filename}`; // Web繧ｵ繝ｼ繝舌・縺九ｉ縺ｮ逶ｸ蟇ｾ繝代せ
    
    console.log(`笨・繝ｭ繝ｼ繧ｫ繝ｫ菫晏ｭ伜ｮ御ｺ・ ${filePath}`);
    
    return {
      url,
      path: filePath,
      filename,
      size: stats.size
    };
  }

  /**
   * Azure Blob Storage縺ｫ菫晏ｭ・
   */
  private async saveToAzure(buffer: Buffer, filename: string): Promise<UploadResult> {
    if (!this.config.azure) {
      throw new Error('Azure險ｭ螳壹′縺ゅｊ縺ｾ縺帙ｓ');
    }

    try {
      // Azure Blob Storage SDK繧貞虚逧・う繝ｳ繝昴・繝・
      const { BlobServiceClient } = await import('@azure/storage-blob');
      
      const { accountName, accountKey, containerName } = this.config.azure;
      const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
      
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(filename);
      
      // 繝輔ぃ繧､繝ｫ繧偵い繝・・繝ｭ繝ｼ繝・
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: this.getContentTypeFromFilename(filename)
        }
      });
      
      const url = blockBlobClient.url;
      
      console.log(`笨・Azure Blob菫晏ｭ伜ｮ御ｺ・ ${url}`);
      
      return {
        url,
        path: url,
        filename,
        size: buffer.length
      };
    } catch (error) {
      console.error('笶・Azure Blob菫晏ｭ倥お繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 繝輔ぃ繧､繝ｫ繧貞炎髯､
   */
  async deleteFile(filename: string): Promise<boolean> {
    try {
      if (this.config.type === 'local') {
        return await this.deleteFromLocal(filename);
      } else if (this.config.type === 'azure') {
        return await this.deleteFromAzure(filename);
      }
      return false;
    } catch (error) {
      console.error('笶・繝輔ぃ繧､繝ｫ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
      return false;
    }
  }

  /**
   * 繝ｭ繝ｼ繧ｫ繝ｫ繝輔ぃ繧､繝ｫ繧貞炎髯､
   */
  private async deleteFromLocal(filename: string): Promise<boolean> {
    if (!this.config.localPath) {
      return false;
    }

    const filePath = path.join(this.config.localPath, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`笨・繝ｭ繝ｼ繧ｫ繝ｫ繝輔ぃ繧､繝ｫ蜑企勁: ${filePath}`);
      return true;
    }
    
    return false;
  }

  /**
   * Azure Blob繝輔ぃ繧､繝ｫ繧貞炎髯､
   */
  private async deleteFromAzure(filename: string): Promise<boolean> {
    if (!this.config.azure) {
      return false;
    }

    try {
      const { BlobServiceClient } = await import('@azure/storage-blob');
      
      const { accountName, accountKey, containerName } = this.config.azure;
      const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
      
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(filename);
      
      await blockBlobClient.delete();
      console.log(`笨・Azure Blob蜑企勁: ${filename}`);
      return true;
    } catch (error) {
      console.error('笶・Azure Blob蜑企勁繧ｨ繝ｩ繝ｼ:', error);
      return false;
    }
  }

  /**
   * Base64繝・・繧ｿ縺九ｉ繝輔ぃ繧､繝ｫ諡｡蠑ｵ蟄舌ｒ蜿門ｾ・
   */
  private getFileExtensionFromBase64(base64Data: string): string {
    const match = base64Data.match(/^data:image\/([a-z]+);base64,/);
    if (match) {
      const extension = match[1];
      return extension === 'jpeg' ? 'jpg' : extension;
    }
    return 'png'; // 繝・ヵ繧ｩ繝ｫ繝・
  }

  /**
   * 繝輔ぃ繧､繝ｫ蜷阪°繧韻ontent-Type繧貞叙蠕・
   */
  private getContentTypeFromFilename(filename: string): string {
    const extension = path.extname(filename).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    
    return contentTypes[extension] || 'application/octet-stream';
  }

  /**
   * 繝輔ぃ繧､繝ｫ縺ｮ蟄伜惠遒ｺ隱・
   */
  async fileExists(filename: string): Promise<boolean> {
    try {
      if (this.config.type === 'local') {
        if (!this.config.localPath) return false;
        const filePath = path.join(this.config.localPath, filename);
        return fs.existsSync(filePath);
      } else if (this.config.type === 'azure') {
        // Azure Blob縺ｮ蟄伜惠遒ｺ隱・
        const { BlobServiceClient } = await import('@azure/storage-blob');
        
        const { accountName, accountKey, containerName } = this.config.azure!;
        const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
        
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(filename);
        
        const exists = await blockBlobClient.exists();
        return exists;
      }
      return false;
    } catch (error) {
      console.error('笶・繝輔ぃ繧､繝ｫ蟄伜惠遒ｺ隱阪お繝ｩ繝ｼ:', error);
      return false;
    }
  }

  /**
   * 繧ｹ繝医Ξ繝ｼ繧ｸ諠・ｱ繧貞叙蠕・
   */
  getStorageInfo(): { type: string; path?: string; isProduction: boolean } {
    return {
      type: this.config.type,
      path: this.config.localPath,
      isProduction: this.isProduction
    };
  }
}

// ES繝｢繧ｸ繝･繝ｼ繝ｫ逕ｨ縺ｮ__dirname莉｣譖ｿ
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 繝・ヵ繧ｩ繝ｫ繝郁ｨｭ螳・
const defaultConfig: StorageConfig = {
  type: process.env.NODE_ENV === 'production' ? 'azure' : 'local',
  localPath: process.env.LOCAL_STORAGE_PATH || path.join(__dirname, '../uploads/images'),
  azure: process.env.NODE_ENV === 'production' ? {
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
    accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || '',
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'emergency-assistance-images'
  } : undefined
};

// 繧ｷ繝ｳ繧ｰ繝ｫ繝医Φ繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ
export const storageService = new StorageService(defaultConfig); 