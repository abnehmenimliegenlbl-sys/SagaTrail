import { Storage } from "@google-cloud/storage";

/**
 * GCS-Client fuer Replit App Storage, authentifiziert ueber den Replit
 * Sidecar. Bewusst schlank gehalten: dieses Projekt nutzt Object Storage
 * ausschliesslich fuer den serverseitig erzeugten Narration-Audio-Cache
 * (siehe narrationCache.ts), nicht fuer Nutzer-Uploads. Daher entfaellt die
 * ACL-/Presigned-Upload-Maschinerie des vollen object-storage-Templates.
 */

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
