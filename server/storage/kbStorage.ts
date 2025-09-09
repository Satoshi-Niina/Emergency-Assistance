import path from 'path';
import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';

export type StorageMode = 'local' | 'blob';

export interface ImageData {
  buffer: Buffer;
  contentType: string;
}

export interface KBFlowListItem {
  id: string;
  title: string;
  description: string;
  fileName: string;
  createdAt?: string;
  category?: string;
  triggerKeywords?: string[];
}

export interface KBStorageAdapter {
  mode: StorageMode;
  // images
  getImage(fileName: string): Promise<ImageData | null>;
  saveImage(buffer: Buffer, originalName: string): Promise<{ fileName: string; isDuplicate: boolean }>
  deleteImage(fileName: string): Promise<boolean>;
  existsInChatExports(fileName: string): Promise<boolean>;
  // flows
  listFlows(): Promise<KBFlowListItem[]>;
  getFlowById(id: string): Promise<Record<string, unknown> | null>;
  saveFlowJson(obj: Record<string, unknown>): Promise<{ id: string; fileName: string }>;
  deleteFlow(id: string): Promise<boolean>;
}

type FlowStep = { description?: string; message?: string };
type FlowDoc = {
  id?: string;
  title?: string;
  description?: string;
  createdAt?: string;
  savedAt?: string;
  updatedAt?: string;
  category?: string;
  triggerKeywords?: string[];
  steps?: FlowStep[];
} & Record<string, unknown>;

function getEnv(name: string, def?: string) {
  const v = process.env[name];
  return (v === undefined || v === null || v === '') ? def : v;
}

// ---------- Local implementation ----------
class LocalStorage implements KBStorageAdapter {
  public mode: StorageMode = 'local';
  private baseDir: string;

  constructor() {
    // knowledge-base 直下
    this.baseDir = path.join(process.cwd(), '..', 'knowledge-base');
  }

  private get flowsDir() { return path.join(this.baseDir, 'troubleshooting'); }
  private get flowsImagesDir() { return path.join(this.baseDir, 'images', 'emergency-flows'); }
  private get chatExportsDir() { return path.join(this.baseDir, 'images', 'chat-exports'); }

  async getImage(fileName: string): Promise<ImageData | null> {
    const tryPaths = [
      path.join(this.flowsImagesDir, fileName),
      path.join(this.chatExportsDir, fileName)
    ];
    for (const p of tryPaths) {
      if (existsSync(p)) {
        const buf = readFileSync(p);
        const ext = path.extname(fileName).toLowerCase();
        const mime = ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' } as Record<string,string>)[ext] || 'application/octet-stream';
        return { buffer: buf, contentType: mime };
      }
    }
    return null;
  }

  async saveImage(buffer: Buffer, originalName: string): Promise<{ fileName: string; isDuplicate: boolean }> {
    if (!existsSync(this.flowsImagesDir)) mkdirSync(this.flowsImagesDir, { recursive: true });
    const md5 = crypto.createHash('md5').update(buffer).digest('hex');
    const ext = (path.extname(originalName) || '.jpg').toLowerCase();
    const fileName = `emergency-flow-step_${md5}${ext}`;
    const full = path.join(this.flowsImagesDir, fileName);
    const exists = existsSync(full);
    if (!exists) writeFileSync(full, buffer);
    return { fileName, isDuplicate: exists };
  }

  async deleteImage(fileName: string): Promise<boolean> {
    const full = path.join(this.flowsImagesDir, fileName);
    if (existsSync(full)) { unlinkSync(full); return true; }
    // chat-exports は削除しない
    return false;
  }

  async listFlows(): Promise<KBFlowListItem[]> {
    if (!existsSync(this.flowsDir)) return [];
    const files = readdirSync(this.flowsDir).filter(f => f.endsWith('.json') && !f.includes('.backup') && !f.includes('.tmp'));
    const list: KBFlowListItem[] = [];
    for (const f of files) {
      try {
        const txt = readFileSync(path.join(this.flowsDir, f), 'utf8');
        const data = JSON.parse(txt) as FlowDoc;
        const stepsArr: FlowStep[] = Array.isArray(data.steps) ? data.steps : [];
        let description = data.description || '';
        if (!description && stepsArr.length > 0) {
          const first = stepsArr[0];
          description = String(first?.description || first?.message || '');
        }
        list.push({
          id: String(data.id || f.replace('.json','')),
          title: data.title || 'タイトルなし',
          description,
          fileName: f,
          createdAt: data.createdAt || data.savedAt || data.updatedAt,
          category: data.category || '',
          triggerKeywords: data.triggerKeywords || []
        });
      } catch { /* ignore broken file */ }
    }
    return list;
  }

  async getFlowById(id: string): Promise<Record<string, unknown> | null> {
    const candidate = path.join(this.flowsDir, `${id}.json`);
    if (existsSync(candidate)) {
      const txt = readFileSync(candidate, 'utf8');
      return JSON.parse(txt) as Record<string, unknown>;
    }
    // fallback scan
    if (!existsSync(this.flowsDir)) return null;
    const files = readdirSync(this.flowsDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      try {
        const txt = readFileSync(path.join(this.flowsDir, f), 'utf8');
  const data = JSON.parse(txt) as FlowDoc;
  const fileId = typeof data.id === 'string' ? data.id.trim() : '';
        if (fileId === id || f.replace('.json','') === id) return data;
      } catch { /* ignore */ }
    }
    return null;
  }

  async saveFlowJson(obj: Record<string, unknown>): Promise<{ id: string; fileName: string }> {
    if (!existsSync(this.flowsDir)) mkdirSync(this.flowsDir, { recursive: true });
  const o = obj as Partial<FlowDoc>;
  const maybeId = typeof o.id === 'string' ? o.id.trim() : '';
  const id = maybeId || `flow_${Date.now()}`;
  const now = new Date().toISOString();
  const saved = { ...obj, id, updatedAt: now, createdAt: o.createdAt || now };
    const fileName = `${id}.json`;
    writeFileSync(path.join(this.flowsDir, fileName), JSON.stringify(saved, null, 2), 'utf8');
    return { id, fileName };
  }

  async existsInChatExports(fileName: string): Promise<boolean> {
    const p = path.join(this.chatExportsDir, fileName);
    return existsSync(p);
  }

  async deleteFlow(id: string): Promise<boolean> {
    const full = path.join(this.flowsDir, `${id}.json`);
    if (existsSync(full)) {
      unlinkSync(full);
      return true;
    }
    return false;
  }
}

// ---------- Azure Blob implementation ----------
class AzureBlobStorage implements KBStorageAdapter {
  public mode: StorageMode = 'blob';
  private container: ContainerClient;
  private prefix: string; // optional virtual directory prefix inside container

  constructor(container: ContainerClient, prefix = '') {
    this.container = container;
    this.prefix = prefix ? prefix.replace(/^[\/]+|[\/]+$/g, '') + '/' : '';
  }

  private blobName(...parts: string[]) {
    return this.prefix + parts.map(p => p.replace(/^\/+|\/+$/g,'')).join('/');
  }

  private async getBlobBuffer(name: string): Promise<Buffer | null> {
    const blob = this.container.getBlobClient(name);
    const exists = await blob.exists();
    if (!exists) return null;
    const res = await blob.download();
    const chunks: Buffer[] = [];
    const readable = res.readableStreamBody;
    if (!readable) return Buffer.alloc(0);
    await new Promise<void>((resolve, reject) => {
      readable.on('data', d => chunks.push(Buffer.from(d)));
      readable.on('end', () => resolve());
      readable.on('error', reject);
    });
    return Buffer.concat(chunks);
  }

  async getImage(fileName: string): Promise<ImageData | null> {
    const flowsName = this.blobName('images','emergency-flows', fileName);
    const chatName = this.blobName('images','chat-exports', fileName);
    const tryNames = [flowsName, chatName];
    for (const name of tryNames) {
      const buf = await this.getBlobBuffer(name);
      if (buf) {
        const ext = path.extname(fileName).toLowerCase();
        const mime = ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' } as Record<string,string>)[ext] || 'application/octet-stream';
        return { buffer: buf, contentType: mime };
      }
    }
    return null;
  }

  async saveImage(buffer: Buffer, originalName: string): Promise<{ fileName: string; isDuplicate: boolean }> {
    const md5 = crypto.createHash('md5').update(buffer).digest('hex');
    const ext = (path.extname(originalName) || '.jpg').toLowerCase();
    const fileName = `emergency-flow-step_${md5}${ext}`;
    const blobName = this.blobName('images','emergency-flows', fileName);
    const blob = this.container.getBlockBlobClient(blobName);
    const exists = await blob.exists();
    if (!exists) {
      await blob.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' } as Record<string,string>)[ext] || 'application/octet-stream' }
      });
    }
    return { fileName, isDuplicate: exists };
  }

  async deleteImage(fileName: string): Promise<boolean> {
    const blobName = this.blobName('images','emergency-flows', fileName);
    const blob = this.container.getBlockBlobClient(blobName);
    const exists = await blob.exists();
    if (!exists) return false;
    await blob.delete();
    return true;
  }

  async listFlows(): Promise<KBFlowListItem[]> {
    const base = this.blobName('troubleshooting');
    const list: KBFlowListItem[] = [];
    for await (const item of this.container.listBlobsFlat({ prefix: base })) {
      if (!item.name.toLowerCase().endsWith('.json')) continue;
      try {
        const buf = await this.getBlobBuffer(item.name);
        if (!buf) continue;
        const data = JSON.parse(buf.toString('utf8')) as FlowDoc;
        const stepsArr: FlowStep[] = Array.isArray(data.steps) ? data.steps : [];
        let description = data.description || '';
        if (!description && stepsArr.length > 0) {
          const first = stepsArr[0];
          description = String(first?.description || first?.message || '');
        }
        const fileName = path.basename(item.name);
        list.push({
          id: String(data.id || fileName.replace('.json','')),
          title: data.title || 'タイトルなし',
          description,
          fileName,
          createdAt: data.createdAt || data.savedAt || data.updatedAt,
          category: data.category || '',
          triggerKeywords: data.triggerKeywords || []
        });
      } catch { /* ignore */ }
    }
    return list;
  }

  async getFlowById(id: string): Promise<Record<string, unknown> | null> {
    const name = this.blobName('troubleshooting', `${id}.json`);
    const blob = this.container.getBlobClient(name);
    if (await blob.exists()) {
      const buf = await this.getBlobBuffer(name);
      if (!buf) return null;
      return JSON.parse(buf.toString('utf8')) as Record<string, unknown>;
    }
    // fallback: scan
    const base = this.blobName('troubleshooting');
    for await (const item of this.container.listBlobsFlat({ prefix: base })) {
      if (!item.name.toLowerCase().endsWith('.json')) continue;
      const buf = await this.getBlobBuffer(item.name);
      if (!buf) continue;
      try {
        const data = JSON.parse(buf.toString('utf8')) as FlowDoc;
        const fileId = typeof data.id === 'string' ? data.id.trim() : '';
        if (fileId === id || path.basename(item.name).replace('.json','') === id) return data;
      } catch { /* ignore */ }
    }
    return null;
  }

  async saveFlowJson(obj: Record<string, unknown>): Promise<{ id: string; fileName: string }> {
  const o = obj as Partial<FlowDoc>;
  const maybeId = typeof o.id === 'string' ? o.id.trim() : '';
  const id = maybeId || `flow_${Date.now()}`;
  const now = new Date().toISOString();
  const saved = { ...obj, id, updatedAt: now, createdAt: o.createdAt || now };
    const name = this.blobName('troubleshooting', `${id}.json`);
    const blob = this.container.getBlockBlobClient(name);
    const body = Buffer.from(JSON.stringify(saved, null, 2), 'utf8');
    await blob.uploadData(body, { blobHTTPHeaders: { blobContentType: 'application/json' } });
    return { id, fileName: `${id}.json` };
  }

  async existsInChatExports(fileName: string): Promise<boolean> {
    const name = this.blobName('images','chat-exports', fileName);
    const blob = this.container.getBlobClient(name);
    return blob.exists();
  }

  async deleteFlow(id: string): Promise<boolean> {
    const name = this.blobName('troubleshooting', `${id}.json`);
    const blob = this.container.getBlobClient(name);
    if (!(await blob.exists())) return false;
    await blob.delete();
    return true;
  }
}

// ---------- Factory ----------
export function createKBStorage(): KBStorageAdapter {
  const modeEnv = getEnv('STORAGE_MODE');
  const connStr = getEnv('AZURE_STORAGE_CONNECTION_STRING');
  const accountUrl = getEnv('AZURE_STORAGE_ACCOUNT_URL');
  const containerName = getEnv('AZURE_BLOB_CONTAINER', 'knowledge')!;
  const prefix = getEnv('AZURE_KB_PREFIX', '');

  const wantBlob = (modeEnv === 'blob') || (!!connStr || !!accountUrl);
  if (!wantBlob) return new LocalStorage();

  let service: BlobServiceClient;
  if (connStr) {
    service = BlobServiceClient.fromConnectionString(connStr);
  } else if (accountUrl) {
    // Prefer Managed Identity/DefaultAzureCredential when hosted in Azure
    service = new BlobServiceClient(accountUrl, new DefaultAzureCredential());
  } else {
    // Fallback to local
    return new LocalStorage();
  }

  const container = service.getContainerClient(containerName);
  return new AzureBlobStorage(container, prefix);
}
