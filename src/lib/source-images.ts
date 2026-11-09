export interface SourceImage {
  id: string;
  sessionId: string;
  name: string;
  dataUrl: string;
  createdAt: number;
}

export function mergeSourceImages(current: SourceImage[], incoming: SourceImage[]): SourceImage[] {
  return [...new Map([...current, ...incoming].map((image) => [image.id, image])).values()]
    .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
}

// IndexedDB can retain large images without using the small localStorage quota.
async function accessImages<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("mathvoice-source-images", 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore("images", { keyPath: "id" });
      store.createIndex("sessionId", "sessionId");
    };
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error("画像の保存先を開けません。")); };
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction("images", mode);
      const request = operation(transaction.objectStore("images"));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(transaction.error || new Error("画像の保存が中断されました。"));
      transaction.onerror = () => reject(transaction.error || new Error("画像を保存できませんでした。"));
    });
  } finally { db.close(); }
}

export async function loadSourceImages(sessionId: string): Promise<SourceImage[]> {
  const images = await accessImages<SourceImage[]>("readonly", (store) => store.index("sessionId").getAll(sessionId));
  return mergeSourceImages([], images);
}

export async function saveSourceImage(image: SourceImage): Promise<void> {
  await accessImages("readwrite", (store) => store.put(image));
}
