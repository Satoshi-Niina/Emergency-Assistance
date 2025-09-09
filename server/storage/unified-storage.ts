// Unified storage facade (future consolidation)
// Prefer BlobStorageDriver; wrap AzureStorageService for backward compatibility if needed.
import { BlobStorageDriver } from '../blob-storage.js';
import { azureStorage } from '../azure-storage.js';

export interface UnifiedStorage {
  read(key: string): Promise<Buffer>;
  write(key: string, data: string | Buffer): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  delete(key: string): Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class AzureAdapter implements UnifiedStorage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private svc: any) {}
  async read(key: string) { return Buffer.from(await this.svc.readFileAsString(key)); }
  async write(key: string, data: string | Buffer) { await this.svc.writeStringToFile(key, typeof data === 'string' ? data : data.toString('utf-8')); }
  async list(prefix?: string) { return this.svc.listFiles(prefix); }
  async delete(key: string) { return this.svc.deleteFile(key); }
}

let singleton: UnifiedStorage | null = null;
export function getStorage(): UnifiedStorage {
  if (singleton) return singleton;
  try {
    if (azureStorage) {
      singleton = new AzureAdapter(azureStorage);
    } else {
      const driver = new BlobStorageDriver();
      driver.initialize().catch(e => console.warn('Blob driver init warn', e));
      singleton = {
        read: (k) => driver.read(k),
        write: (k, d) => driver.write(k, d),
        list: (p) => driver.list(p),
        delete: (k) => driver.delete(k)
      } as UnifiedStorage;
    }
  } catch (e) {
    console.error('Storage init error:', e);
    throw e;
  }
  return singleton!;
}
