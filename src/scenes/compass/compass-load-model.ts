import { GltfAsset, GltfLoader } from 'gltf-loader-ts';
let loader = new GltfLoader();
let uri = 'http://localhost:8080/compass.glb'
export class CompassModel {
  asset: GltfAsset | null = null;

  async loadModel() {
    const asset: GltfAsset = await loader.load(uri);
    this.asset = asset;
  }
}
