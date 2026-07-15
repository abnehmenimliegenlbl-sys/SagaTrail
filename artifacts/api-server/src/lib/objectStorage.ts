import { Storage, File } from "@google-cloud/storage";
import { Readable } from "stream";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set.");
    return dir;
  }

  getPublicObjectSearchPaths(): string[] {
    const raw = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    return Array.from(
      new Set(raw.split(",").map((p) => p.trim()).filter(Boolean))
    );
  }

  /** Erzeugt eine presigned PUT-URL fuer den direkten Foto-Upload nach GCS. */
  async getObjectEntityUploadURL(): Promise<string> {
    const dir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const { bucketName, objectName } = parseObjectPath(`${dir}/uploads/${objectId}`);
    return signObjectURL({ bucketName, objectName, method: "PUT", ttlSec: 900 });
  }

  /**
   * Normalisiert eine rohe GCS-URL oder einen Pfad auf den lokalen
   * /objects/<id>-Pfad, den die Serve-Route verwendet.
   */
  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) return rawPath;
    const url = new URL(rawPath);
    let dir = this.getPrivateObjectDir();
    if (!dir.endsWith("/")) dir += "/";
    const objectPath = url.pathname;
    if (!objectPath.startsWith(dir)) return objectPath;
    return `/objects/${objectPath.slice(dir.length)}`;
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) throw new ObjectNotFoundError();
    const entityId = parts.slice(1).join("/");
    let dir = this.getPrivateObjectDir();
    if (!dir.endsWith("/")) dir += "/";
    const { bucketName, objectName } = parseObjectPath(`${dir}${entityId}`);
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError();
    return file;
  }

  async downloadObject(file: File, cacheTtlSec = 3600): Promise<Response> {
    const [meta] = await file.getMetadata();
    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    const headers: Record<string, string> = {
      "Content-Type": (meta.contentType as string) || "application/octet-stream",
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    };
    if (meta.size) headers["Content-Length"] = String(meta.size);
    return new Response(webStream, { headers });
  }

  /**
   * Laedt einen Buffer direkt nach GCS hoch (kein Presigned-URL-Umweg).
   * Gibt den objectPath zurueck, den die GET /storage/objects/*-Route versteht.
   */
  async uploadBuffer(
    buffer: Buffer,
    contentType: string,
    subPath: string,
  ): Promise<string> {
    const dir = this.getPrivateObjectDir();
    const fullPath = dir.endsWith("/") ? `${dir}${subPath}` : `${dir}/${subPath}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    await file.save(buffer, { contentType, resumable: false });
    return `/objects/${subPath}`;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const { bucketName, objectName } = parseObjectPath(`${searchPath}/${filePath}`);
      const file = objectStorageClient.bucket(bucketName).file(objectName);
      const [exists] = await file.exists();
      if (exists) return file;
    }
    return null;
  }
}

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  if (parts.length < 3) throw new Error("Invalid GCS path");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const res = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Presigned URL fehlgeschlagen: ${res.status}`);
  const body = await res.json() as { signed_url: string };
  return body.signed_url;
}
