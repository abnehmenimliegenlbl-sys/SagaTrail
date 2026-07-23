import { Readable } from "stream";
import { randomUUID } from "crypto";
import { S3Object, S3Bucket, s3Client, objectStorageClient } from "./s3";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

// Re-export fuer narrationCache.ts und andere Importeure
export { objectStorageClient };

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

function getBucketName(): string {
  return process.env.R2_BUCKET_NAME ?? "sagatrail";
}

/** Praefix fuer private (Auth-geschuetzte) Uploads */
const PRIVATE_PREFIX = "private";
/** Praefix fuer oeffentliche Assets */
const PUBLIC_PREFIX = "public";

export class ObjectStorageService {
  private bucket(): string {
    return getBucketName();
  }

  /** Gibt alle konfigurierten Suchpfade fuer oeffentliche Objekte zurueck. */
  getPublicObjectSearchPaths(): string[] {
    // Mit R2: Suchpfade koennen als kommaseparierte Key-Praefixe konfiguriert
    // werden. Fallback auf "public" wenn nicht gesetzt.
    const envPaths = process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? "";
    const r2Paths = process.env.R2_PUBLIC_PREFIXES ?? "";
    const raw = r2Paths || envPaths;
    if (!raw) return [PUBLIC_PREFIX];
    return raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  }

  async searchPublicObject(filePath: string): Promise<S3Object | null> {
    for (const prefix of this.getPublicObjectSearchPaths()) {
      const key = `${prefix}/${filePath}`;
      const obj = new S3Object(this.bucket(), key);
      const [exists] = await obj.exists();
      if (exists) return obj;
    }
    return null;
  }

  async downloadObject(
    file: S3Object,
    cacheTtlSec: number = 3600,
  ): Promise<Response> {
    const [meta] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === "public";

    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": meta.contentType ?? "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (meta.size != null) {
      headers["Content-Length"] = String(meta.size);
    }
    return new Response(webStream, { headers });
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const objectKey = `${PRIVATE_PREFIX}/uploads/${randomUUID()}`;
    const obj = new S3Object(this.bucket(), objectKey);
    return obj.getSignedUrl("PUT", 900);
  }

  async getObjectEntityFile(objectPath: string): Promise<S3Object> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const entityId = objectPath.slice("/objects/".length);
    const key = `${PRIVATE_PREFIX}/${entityId}`;
    const obj = new S3Object(this.bucket(), key);
    const [exists] = await obj.exists();
    if (!exists) throw new ObjectNotFoundError();
    return obj;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    // R2-URLs: https://<accountId>.r2.cloudflarestorage.com/<bucket>/private/...
    const r2Base = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${this.bucket()}/${PRIVATE_PREFIX}/`;
    if (rawPath.startsWith(r2Base)) {
      return `/objects/${rawPath.slice(r2Base.length)}`;
    }
    // Legacy GCS-URLs
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      // Alte Objekte: Pfad unveraendert durchreichen — werden als not-found behandelt
      return rawPath;
    }
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) return normalizedPath;
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async uploadBuffer(
    buffer: Buffer,
    contentType: string,
    subPath: string,
  ): Promise<string> {
    const key = `${PRIVATE_PREFIX}/${subPath}`;
    const obj = new S3Object(this.bucket(), key);
    await obj.save(buffer, { contentType });
    return `/objects/${subPath}`;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: S3Object;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

// Nicht mehr benoetigt (Sidecar-basiert), aber als leere Implementierung
// erhalten, damit es keinen Import-Fehler gibt falls noch referenziert.
export { S3Object as StorageFile };
