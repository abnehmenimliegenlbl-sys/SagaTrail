/**
 * Cloudflare R2 S3-Client und S3Object-Abstraktionsschicht.
 * Alle anderen Module importieren von hier — nie direkt vom AWS SDK.
 */
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";

export const s3Client = new S3Client({
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

// ---------------------------------------------------------------------------
// S3Object — GCS-kompatibler Wrapper um ein einzelnes S3/R2-Objekt.
// Exponiert dieselbe Schnittstelle wie GCS `File`, damit objectAcl.ts
// und objectStorage.ts ohne grosse Umbauten funktionieren.
// ---------------------------------------------------------------------------
export class S3Object {
  constructor(
    public readonly bucket: string,
    public readonly key: string,
  ) {}

  /** Kompatibilitaet mit GCS File.name */
  get name(): string {
    return this.key;
  }

  async exists(): Promise<[boolean]> {
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: this.key }));
      return [true];
    } catch {
      return [false];
    }
  }

  async download(): Promise<[Buffer]> {
    const res = await s3Client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: this.key }),
    );
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return [Buffer.concat(chunks)];
  }

  async save(
    data: Buffer,
    options: { contentType?: string; resumable?: boolean } = {},
  ): Promise<void> {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.key,
        Body: data,
        ContentType: options.contentType,
      }),
    );
  }

  async getMetadata(): Promise<
    [{ contentType?: string; size?: number; metadata: Record<string, string> }]
  > {
    const res = await s3Client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: this.key }),
    );
    return [
      {
        contentType: res.ContentType,
        size: res.ContentLength,
        metadata: res.Metadata ?? {},
      },
    ];
  }

  /**
   * S3 erlaubt kein partielles Metadata-Update — wir kopieren das Objekt
   * auf sich selbst mit REPLACE-Direktive. Nur fuer kleine Objekte (Partner-
   * Fotos, ACL-Tags) verwendet; fuer Audio-Dateien nie aufgerufen.
   */
  async setMetadata(opts: { metadata: Record<string, string> }): Promise<void> {
    const [existing] = await this.getMetadata();
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${this.key}`,
        Key: this.key,
        ContentType: existing.contentType,
        Metadata: { ...existing.metadata, ...opts.metadata },
        MetadataDirective: "REPLACE",
      }),
    );
  }

  createReadStream(): Readable {
    const readable = new Readable({ read() {} });
    const { bucket, key } = this;
    void (async () => {
      try {
        const res = await s3Client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key }),
        );
        for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
          readable.push(Buffer.from(chunk));
        }
        readable.push(null);
      } catch (err) {
        readable.destroy(err as Error);
      }
    })();
    return readable;
  }

  async delete(): Promise<void> {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: this.key }),
    );
  }

  async getSignedUrl(method: "GET" | "PUT", ttlSec: number): Promise<string> {
    const command =
      method === "GET"
        ? new GetObjectCommand({ Bucket: this.bucket, Key: this.key })
        : new PutObjectCommand({ Bucket: this.bucket, Key: this.key });
    return getSignedUrl(s3Client, command, { expiresIn: ttlSec });
  }
}

// ---------------------------------------------------------------------------
// S3Bucket — Bucket-Handle; kapselt Listing und Dateizugriff.
// ---------------------------------------------------------------------------
export class S3Bucket {
  constructor(public readonly name: string) {}

  file(key: string): S3Object {
    return new S3Object(this.name, key);
  }

  async getFiles({ prefix }: { prefix: string }): Promise<[S3Object[]]> {
    const objects: S3Object[] = [];
    let continuationToken: string | undefined;
    do {
      const res = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.name,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of res.Contents ?? []) {
        if (obj.Key) objects.push(new S3Object(this.name, obj.Key));
      }
      continuationToken = res.NextContinuationToken;
    } while (continuationToken);
    return [objects];
  }
}

// ---------------------------------------------------------------------------
// Backward-Compat-Shim fuer narrationCache.ts
// ---------------------------------------------------------------------------
export const objectStorageClient = {
  bucket: (name: string) => new S3Bucket(name),
};
