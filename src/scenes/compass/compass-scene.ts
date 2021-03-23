import { GltfAsset } from 'gltf-loader-ts';
import { GlMatrix } from '../../core/gl-matrix';
import { initShaderProgram } from '../../core/gl-shader';
import { GlVector } from '../../core/gl-vector';
import { Buffers, GltfArrayConstructor, GltfArray, Buffer } from '../../types/gltf';
import { ProgramInfo } from '../../types/program-info';
import { CompassModel } from './compass-load-model';

const COMPONENT_TYPE_MAP: { [key: number]: GltfArrayConstructor } = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array
};

const COMPONENTS_MAP: { [key: string]: number } = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16
};

export class CompassScene {
  private vsSource: string = `
    attribute vec3 aVertexPosition;
    attribute vec4 aVertexColor;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    varying lowp vec4 vColor;
    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);
      vColor = aVertexColor;
    }
  `;
  private fsSource: string = `
  varying lowp vec4 vColor;
    void main(void) {
      gl_FragColor = vColor;
    }
  `;
  private positions: GltfArray = new Float32Array([
    0.5, -0.25, 0.25, // 1
    0.0, 0.25, 0.00, // 2
    -0.5, -0.25, 0.25, // 3

    -0.5, -0.25, 0.25, // 3
    0.0, 0.25, 0.00, // 2
    0.0, -0.25, -0.50, // 4

    0.0, -0.25, -0.50, // 4
    0.0, 0.25, 0.00, // 2
    0.5, -0.25, 0.25, // 1

    0.0, -0.25, -0.50, // 4
    0.5, -0.25, 0.25,  // 1
    -0.5, -0.25, 0.25 // 3
  ]);
  private colors: GltfArray = new Float32Array([
    0.3, 0.0, 0.3, 1.0,    // purple
    0.3, 0.0, 0.3, 1.0,    // purple
    0.3, 0.0, 0.3, 1.0,    // purple
    1.0, 0.0, 0.0, 1.0,    // red
    1.0, 0.0, 0.0, 1.0,    // red
    1.0, 0.0, 0.0, 1.0,    // red
    0.0, 0.5, 0.0, 1.0,    // green
    0.0, 0.5, 0.0, 1.0,    // green
    0.0, 0.5, 0.0, 1.0,    // green
    0.0, 0.0, 1.0, 1.0,    // blue
    0.0, 0.0, 1.0, 1.0,    // blue
    0.0, 0.0, 1.0, 1.0    // blue
  ]);
  private tranformation: GlMatrix = new GlMatrix();

  private programInfo: ProgramInfo | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private colorBuffer: WebGLBuffer | null = null;

  constructor(public gl: WebGLRenderingContext) {
    const program = initShaderProgram(gl, this.vsSource, this.fsSource);
    if (!program) {
      return;
    }
    this.programInfo = {
      program,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(program, 'aVertexPosition'),
        vertexColor: gl.getAttribLocation(program, 'aVertexColor'),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program, 'uModelViewMatrix'),
      }
    }
  }

  public initBuffers() {
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.positions, this.gl.STATIC_DRAW);

    this.colorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.colors, this.gl.STATIC_DRAW);
  }

  public async loadModel() {
    const model: CompassModel = new CompassModel();
    await model.loadModel();

    if (!model.asset) {
      throw new Error('Data has not been loaded');
    }
    const buffers = await this.parseBufferViews(model.asset);
    const flattenArrays: { [key: string]: GltfArray } = {};

    if (buffers.indices) {
      for (const attrKey in buffers.attributes) {
        const buffer = buffers.attributes[attrKey];
        if (!buffer) {
          continue;
        }
        flattenArrays[attrKey] = new buffer.ctor(buffers.indices.length * buffer.components);
      }
      for (let i = 0; i < buffers.indices.length; i++) {
        const index = buffers.indices[i];
        for (const attrKey in buffers.attributes) {
          const buffer = buffers.attributes[attrKey];
          if (!buffer) {
            continue;
          }
          const vector = buffer?.buffer.subarray(index * buffer.components, index * buffer.components + buffer.components);
          flattenArrays[attrKey].set(vector, i * buffer.components);
        }
      }
    } else {
      for (const attrKey in buffers.attributes) {
        const buffer = buffers.attributes[attrKey];
        if (!buffer) {
          continue;
        }
        flattenArrays[attrKey] = buffer.buffer;
      }
    }

    if (!flattenArrays.COLOR_0 || !flattenArrays.POSITION) {
      throw new Error('Model doesn\'t contain necessary attributes');
    }
    this.positions = flattenArrays.POSITION;
    this.colors = flattenArrays.COLOR_0;

    this.tranformation = this.calcNodeTransformations(model.asset);

    return model.asset?.gltf;
  }

  private async parseBufferViews(asset: GltfAsset): Promise<{ attributes: Buffers, indices?: GltfArray }> {
    const gltf = asset.gltf;
    const binaryChunk = asset.glbData?.binaryChunk;
    if (!binaryChunk) {
      throw new Error('The gltf doesn\'t contain binary chunk');
    }
    const bufferViews = gltf.bufferViews || [];
    const buffers = [];
    for (let index = 0; index < bufferViews.length; index++) {
      buffers.push(await asset.bufferViewData(index));
    }

    if (buffers.length < 5) {
      throw new Error('Wrong set of buffers');
    }

    const accessors = gltf.accessors || [];
    const attributes = gltf.meshes && gltf.meshes[0] && gltf.meshes[0].primitives[0].attributes || {};
    const result: { attributes: Buffers, indices?: GltfArray } = { attributes: {} };
    for (const attrKey in attributes) {
      const accessor = accessors[attributes[attrKey]];
      if (accessor === undefined) {
        throw new Error('An accessor has not been found');
      }
      const bufferViewIndex = accessor.bufferView;
      if (bufferViewIndex === undefined) {
        throw new Error('An accessor doesn\'t contain bufferView');
      }
      const TypedArrayConstructor = COMPONENT_TYPE_MAP[accessor.componentType] || Uint8Array;
      const buffer = buffers[bufferViewIndex];
      result.attributes[attrKey] = {
        ctor: TypedArrayConstructor,
        components: COMPONENTS_MAP[accessor.type],
        buffer: new TypedArrayConstructor(buffer.buffer, buffer.byteOffset, buffer.byteLength / TypedArrayConstructor.BYTES_PER_ELEMENT)
      };
    }

    const indices = gltf.meshes && gltf.meshes[0] && gltf.meshes[0].primitives[0].indices || -1;
    if (indices >= 0) {
      const accessor = accessors[indices];
      const bufferViewIndex = accessor.bufferView;
      if (bufferViewIndex === undefined) {
        throw new Error('An accessor has not been found');
      }
      const TypedArrayConstructor = COMPONENT_TYPE_MAP[accessor.componentType] || Uint8Array;
      const buffer = buffers[bufferViewIndex];
      result['indices'] = new TypedArrayConstructor(binaryChunk.buffer, buffer.byteOffset, buffer.byteLength / TypedArrayConstructor.BYTES_PER_ELEMENT);
    }

    return result;
  }

  private calcNodeTransformations(asset: GltfAsset): GlMatrix {
    const gltf = asset.gltf;
    const node = gltf.nodes && gltf.nodes[0] || {};
    const result = new GlMatrix();
    if (node.rotation) {
      result.rotateWithQuaternion(node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3]);
    }
    return result;
  }

  public prepareScene() {
    this.initBuffers();

    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clearDepth(1.0);                 // Clear everything
    this.gl.enable(this.gl.DEPTH_TEST);           // Enable depth testing
    this.gl.depthFunc(this.gl.LEQUAL);            // Near things obscure far things

    if (!this.programInfo) {
      throw Error('Shaders haven\'t been compiled correctly');
    }

    // Tell WebGL to use our program when drawing
    this.gl.useProgram(this.programInfo.program);

    const fieldOfView = 45;
    const aspect = this.gl.canvas.width / this.gl.canvas.height;
    const zNear = 0.5;
    const zFar = 100.0;
    const projectionMatrix = new GlMatrix().perspective(fieldOfView, aspect, zNear, zFar);
    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix.m);
  }

  public drawScene(eyeX: number = 0, eyeY: number = 0, eyeZ: number = 0) {
    // Clear the canvas before we start drawing on it.
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    if (!this.programInfo) {
      throw Error('Shaders haven\'t been compiled correctly');
    }

    const eye = new GlVector(eyeX, eyeY, eyeZ);
    const center = new GlVector(0, 0, 0);
    const up = new GlVector(0, 1, 0);
    const modelViewMatrix = new GlMatrix()
      .multiplyRight(this.tranformation.m)
      .lookAt(eye, center, up);

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute
    {
      const numComponents = 3;
      const type = this.gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
      this.gl.vertexAttribPointer(
        this.programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
      this.gl.enableVertexAttribArray(
        this.programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    {
      const numComponents = 4;
      const type = this.gl.UNSIGNED_SHORT;
      const normalize = true;
      const stride = 0;
      const offset = 0;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
      this.gl.vertexAttribPointer(
        this.programInfo.attribLocations.vertexColor,
        numComponents,
        type,
        normalize,
        stride,
        offset);
      this.gl.enableVertexAttribArray(
        this.programInfo.attribLocations.vertexColor);
    }

    // Set the shader uniforms
    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix.m);

    {
      const offset = 0;
      const vertexCount = this.positions.length / 3;
      this.gl.drawArrays(this.gl.TRIANGLES, offset, vertexCount);
    }
  }

}