import { deflateSync, inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const TILE_SIZE = 256;
const ZOOM = 13;
const CACHE_TTL_MS = 10 * 60_000;
const MAX_CACHE_ENTRIES = 20;
const MAX_ACTIVE_GENERATIONS = 2;
const MAX_QUEUED_GENERATIONS = 8;
const MAX_TILE_CONCURRENCY = 6;
const MAX_TILE_BYTES = 1_000_000;
const TILE_TIMEOUT_MS = 8_000;

type DecodedPng = { width: number; height: number; rgba: Buffer };
type CacheEntry = { expiresAt: number; png: Buffer };

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<Buffer>>();
const generationWaiters: Array<() => void> = [];
let activeGenerations = 0;

async function withGenerationPermit<T>(work: () => Promise<T>): Promise<T> {
  if (activeGenerations >= MAX_ACTIVE_GENERATIONS) {
    if (generationWaiters.length >= MAX_QUEUED_GENERATIONS) {
      throw new Error("OpenTopoMap generation queue is full");
    }
    await new Promise<void>((resolve) => generationWaiters.push(resolve));
  }
  activeGenerations += 1;
  try {
    return await work();
  } finally {
    activeGenerations -= 1;
    generationWaiters.shift()?.();
  }
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodeIndexedPng(png: Buffer): DecodedPng {
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("OpenTopoMap tile is not a PNG");
  }
  let width = 0;
  let height = 0;
  let palette: Buffer | null = null;
  let transparency: Buffer | null = null;
  const idat: Buffer[] = [];

  for (let offset = 8; offset + 12 <= png.length; ) {
    const length = png.readUInt32BE(offset);
    if (length > MAX_TILE_BYTES || offset + 12 + length > png.length) {
      throw new Error("Invalid OpenTopoMap PNG chunk length");
    }
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      if (length !== 13) throw new Error("Invalid OpenTopoMap PNG header");
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (
        width !== TILE_SIZE ||
        height !== TILE_SIZE ||
        data[8] !== 8 ||
        data[9] !== 3 ||
        data[10] !== 0 ||
        data[11] !== 0 ||
        data[12] !== 0
      ) {
        throw new Error("Unsupported OpenTopoMap PNG format");
      }
    } else if (type === "PLTE") {
      palette = Buffer.from(data);
    } else if (type === "tRNS") {
      transparency = Buffer.from(data);
    } else if (type === "IDAT") {
      idat.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  if (
    width !== TILE_SIZE ||
    height !== TILE_SIZE ||
    !palette ||
    palette.length === 0 ||
    palette.length > 256 * 3 ||
    palette.length % 3 !== 0 ||
    (transparency?.length ?? 0) > palette.length / 3 ||
    idat.length === 0
  ) {
    throw new Error("Incomplete OpenTopoMap PNG tile");
  }
  const expectedPackedBytes = height * (width + 1);
  const packed = inflateSync(Buffer.concat(idat), {
    maxOutputLength: expectedPackedBytes,
  });
  if (packed.length !== expectedPackedBytes) {
    throw new Error("Invalid OpenTopoMap PNG scanline size");
  }
  const stride = width;
  const indices = Buffer.alloc(width * height);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = packed[sourceOffset++];
    const rowOffset = y * stride;
    const previousOffset = (y - 1) * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = packed[sourceOffset++];
      const left = x > 0 ? indices[rowOffset + x - 1] : 0;
      const up = y > 0 ? indices[previousOffset + x] : 0;
      const upperLeft = x > 0 && y > 0 ? indices[previousOffset + x - 1] : 0;
      const value =
        filter === 0
          ? raw
          : filter === 1
            ? raw + left
            : filter === 2
              ? raw + up
              : filter === 3
                ? raw + Math.floor((left + up) / 2)
                : filter === 4
                  ? raw + paeth(left, up, upperLeft)
                  : Number.NaN;
      if (!Number.isFinite(value)) throw new Error("Unsupported PNG row filter");
      indices[rowOffset + x] = value & 0xff;
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let index = 0; index < indices.length; index += 1) {
    const paletteIndex = indices[index];
    if (paletteIndex >= palette.length / 3) {
      throw new Error("OpenTopoMap PNG references an invalid palette color");
    }
    rgba[index * 4] = palette[paletteIndex * 3];
    rgba[index * 4 + 1] = palette[paletteIndex * 3 + 1];
    rgba[index * 4 + 2] = palette[paletteIndex * 3 + 2];
    rgba[index * 4 + 3] = transparency?.[paletteIndex] ?? 255;
  }
  return { width, height, rgba };
}

function encodeRgbaPng(width: number, height: number, rgba: Buffer): Buffer {
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const targetOffset = y * (width * 4 + 1);
    rows[targetOffset] = 0;
    rgba.copy(rows, targetOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(rows, { level: 6 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function longitudeToWorldX(longitude: number): number {
  return ((longitude + 180) / 360) * 2 ** ZOOM * TILE_SIZE;
}

function latitudeToWorldY(latitude: number): number {
  const radians = (latitude * Math.PI) / 180;
  return (
    (1 - Math.asinh(Math.tan(radians)) / Math.PI) /
    2 *
    2 ** ZOOM *
    TILE_SIZE
  );
}

async function fetchTile(x: number, y: number): Promise<DecodedPng> {
  const subdomain = ["a", "b", "c"][Math.abs(x + y) % 3];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TILE_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://${subdomain}.tile.opentopomap.org/${ZOOM}/${x}/${y}.png`,
      {
        headers: { "User-Agent": "SagaTrail/1.0 (panorama map texture)" },
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      throw new Error(`OpenTopoMap tile ${ZOOM}/${x}/${y} returned ${response.status}`);
    }
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_TILE_BYTES) {
      throw new Error("OpenTopoMap tile exceeds size limit");
    }
    if (!response.body) throw new Error("OpenTopoMap tile has no body");
    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_TILE_BYTES) {
        await reader.cancel();
        throw new Error("OpenTopoMap tile exceeds size limit");
      }
      chunks.push(Buffer.from(value));
    }
    return decodeIndexedPng(Buffer.concat(chunks, totalBytes));
  } finally {
    clearTimeout(timeout);
  }
}

async function generateOpenTopoPanoramaMap(
  latitude: number,
  longitude: number,
  radiusM: number,
): Promise<Buffer> {
  const centerLat = Number(latitude.toFixed(4));
  const centerLng = Number(longitude.toFixed(4));
  const cacheKey = `${centerLat}:${centerLng}:${Math.round(radiusM)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.png;

  const latitudeRadius = radiusM / 111_320;
  const longitudeRadius =
    radiusM /
    Math.max(1, 111_320 * Math.cos((centerLat * Math.PI) / 180));
  const leftPx = longitudeToWorldX(centerLng - longitudeRadius);
  const rightPx = longitudeToWorldX(centerLng + longitudeRadius);
  const topPx = latitudeToWorldY(centerLat + latitudeRadius);
  const bottomPx = latitudeToWorldY(centerLat - latitudeRadius);
  const minTileX = Math.floor(leftPx / TILE_SIZE);
  const maxTileX = Math.ceil(rightPx / TILE_SIZE) - 1;
  const minTileY = Math.floor(topPx / TILE_SIZE);
  const maxTileY = Math.ceil(bottomPx / TILE_SIZE) - 1;
  const tileColumns = maxTileX - minTileX + 1;
  const tileRows = maxTileY - minTileY + 1;

  const coordinates: Array<{ x: number; y: number }> = [];
  for (let y = minTileY; y <= maxTileY; y += 1) {
    for (let x = minTileX; x <= maxTileX; x += 1) {
      coordinates.push({ x, y });
    }
  }
  const tiles: Array<{ x: number; y: number; tile: DecodedPng }> = [];
  let nextCoordinate = 0;
  await Promise.all(
    Array.from(
      { length: Math.min(MAX_TILE_CONCURRENCY, coordinates.length) },
      async () => {
        for (;;) {
          const coordinateIndex = nextCoordinate;
          nextCoordinate += 1;
          const coordinate = coordinates[coordinateIndex];
          if (!coordinate) return;
          tiles[coordinateIndex] = {
            ...coordinate,
            tile: await fetchTile(coordinate.x, coordinate.y),
          };
        }
      },
    ),
  );
  const mosaicWidth = tileColumns * TILE_SIZE;
  const mosaicHeight = tileRows * TILE_SIZE;
  const mosaic = Buffer.alloc(mosaicWidth * mosaicHeight * 4);
  for (const { x, y, tile } of tiles) {
    if (tile.width !== TILE_SIZE || tile.height !== TILE_SIZE) {
      throw new Error("Unexpected OpenTopoMap tile dimensions");
    }
    const targetX = (x - minTileX) * TILE_SIZE;
    const targetY = (y - minTileY) * TILE_SIZE;
    for (let row = 0; row < TILE_SIZE; row += 1) {
      const sourceStart = row * TILE_SIZE * 4;
      const targetStart = ((targetY + row) * mosaicWidth + targetX) * 4;
      tile.rgba.copy(mosaic, targetStart, sourceStart, sourceStart + TILE_SIZE * 4);
    }
  }

  const cropLeft = Math.max(0, Math.floor(leftPx - minTileX * TILE_SIZE));
  const cropTop = Math.max(0, Math.floor(topPx - minTileY * TILE_SIZE));
  const cropRight = Math.min(mosaicWidth, Math.ceil(rightPx - minTileX * TILE_SIZE));
  const cropBottom = Math.min(mosaicHeight, Math.ceil(bottomPx - minTileY * TILE_SIZE));
  const width = cropRight - cropLeft;
  const height = cropBottom - cropTop;
  const cropped = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const sourceStart = ((cropTop + row) * mosaicWidth + cropLeft) * 4;
    mosaic.copy(cropped, row * width * 4, sourceStart, sourceStart + width * 4);
  }

  const png = encodeRgbaPng(width, height, cropped);
  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, png });
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
  return png;
}

export function createOpenTopoPanoramaMap(
  latitude: number,
  longitude: number,
  radiusM: number,
): Promise<Buffer> {
  const cacheKey = `${latitude.toFixed(4)}:${longitude.toFixed(4)}:${Math.round(radiusM)}`;
  const existing = inFlight.get(cacheKey);
  if (existing) return existing;
  const generation = withGenerationPermit(() =>
    generateOpenTopoPanoramaMap(latitude, longitude, radiusM),
  ).finally(() => {
    inFlight.delete(cacheKey);
  });
  inFlight.set(cacheKey, generation);
  return generation;
}