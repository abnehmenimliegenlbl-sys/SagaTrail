import { Asset } from "expo-asset";
import { Image } from "react-native";
import { SRGBColorSpace, Texture } from "three";

function imageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

/**
 * Loads a remote image without Three's browser-only TextureLoader.
 * Expo GL recognizes the localUri payload through EXGLImageUtils.
 */
export async function loadNativeThreeTexture(
  source: string | number,
): Promise<Texture> {
  const asset =
    typeof source === "number"
      ? Asset.fromModule(source)
      : Asset.fromURI(source);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error("Textur konnte nicht lokal gespeichert werden.");

  const { width, height } = await imageSize(uri);
  const texture = new Texture();
  texture.image = {
    data: { localUri: uri },
    width,
    height,
  };
  texture.flipY = true;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  // Forces Expo GL's native texImage2D path instead of a DOM image upload.
  (texture as Texture & { isDataTexture: boolean }).isDataTexture = true;
  return texture;
}