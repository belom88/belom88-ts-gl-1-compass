export interface Buffer {
  ctor: GltfArrayConstructor;
  components: number;
  buffer: GltfArray;
}

export interface Buffers {
  [key: string]: Buffer | undefined;
  POSITION?: Buffer;
  NORMAL?: Buffer;
  TEXCOORD_0?: Buffer;
  COLOR_0?: Buffer;
}

export type GltfArrayConstructor = Int8ArrayConstructor | Uint8ArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Uint32ArrayConstructor | Float32ArrayConstructor;
export type GltfArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Uint32Array | Float32Array;
