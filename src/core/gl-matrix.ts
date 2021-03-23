import { degreesToRadians } from "../tools/angles";
import { GlVector } from "./gl-vector";

export const EPSILON = 0.000001;

/*
  0   4   8   12
  1   5   9   13
  2   6   10  14
  3   7   11  15
*/

export class GlMatrix {
  public m: Float32Array = new Float32Array(
    [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]
  );

  setIdentity() {
    GlMatrix.staticSetIdentity(this.m);
    return this;
  }

  multiplyRight(m2: Float32Array) {
    this.m = GlMatrix.staticMultiply(this.m, m2);
    return this;
  }

  multiplyLeft(m2: Float32Array) {
    this.m = GlMatrix.staticMultiply(m2, this.m);
    return this;
  }

  perspective(fov: number, aspect: number, zNear: number, zFar: number) {
    const zRange: number = zNear - zFar;
    const tanHalfFov: number = Math.tan(degreesToRadians(fov) / 2.0);
    const perspectiveMatrix = new Float32Array(16);

    perspectiveMatrix[0] = 1.0 / (tanHalfFov * aspect);
    perspectiveMatrix[4] = 0.0;
    perspectiveMatrix[8] = 0.0;
    perspectiveMatrix[12] = 0.0;

    perspectiveMatrix[1] = 0.0;
    perspectiveMatrix[5] = 1.0 / tanHalfFov;
    perspectiveMatrix[9] = 0.0;
    perspectiveMatrix[13] = 0.0;

    perspectiveMatrix[2] = 0.0;
    perspectiveMatrix[6] = 0.0;
    perspectiveMatrix[10] = (zNear + zFar) / zRange;
    perspectiveMatrix[14] = -1;

    perspectiveMatrix[3] = 0.0;
    perspectiveMatrix[7] = 0.0;
    perspectiveMatrix[11] = 2.0 * zFar * zNear / zRange;
    perspectiveMatrix[15] = 0.0;
    this.multiplyLeft(perspectiveMatrix);
    return this;
  }

  translate(dx: number, dy: number, dz: number) {
    const translationMatrix = new Float32Array(16);
    GlMatrix.staticSetIdentity(translationMatrix);
    translationMatrix[12] = dx;
    translationMatrix[13] = dy;
    translationMatrix[14] = dz;
    this.multiplyLeft(translationMatrix);
    return this;
  }

  rotate(angle: number, xAxis: number, yAxis: number, zAxis: number) {
    const rotationMatrix = new Float32Array(16);
    angle = degreesToRadians(angle);

    let s = Math.sin(angle);
    const c = Math.cos(angle);

    if (xAxis !== 0 && yAxis === 0 && zAxis === 0) {
      // Rotation around the X axis
      if (xAxis < 0) {
        s = -s;
      }

      rotationMatrix[0] = 1; rotationMatrix[4] = 0; rotationMatrix[8] = 0; rotationMatrix[12] = 0;
      rotationMatrix[1] = 0; rotationMatrix[5] = c; rotationMatrix[9] = -s; rotationMatrix[13] = 0;
      rotationMatrix[2] = 0; rotationMatrix[6] = s; rotationMatrix[10] = c; rotationMatrix[14] = 0;
      rotationMatrix[3] = 0; rotationMatrix[7] = 0; rotationMatrix[11] = 0; rotationMatrix[15] = 1;
    } else if (xAxis === 0 && yAxis !== 0 && zAxis === 0) {
      // Rotation around Y axis
      if (yAxis < 0) {
        s = -s;
      }

      rotationMatrix[0] = c; rotationMatrix[4] = 0; rotationMatrix[8] = s; rotationMatrix[12] = 0;
      rotationMatrix[1] = 0; rotationMatrix[5] = 1; rotationMatrix[9] = 0; rotationMatrix[13] = 0;
      rotationMatrix[2] = -s; rotationMatrix[6] = 0; rotationMatrix[10] = c; rotationMatrix[14] = 0;
      rotationMatrix[3] = 0; rotationMatrix[7] = 0; rotationMatrix[11] = 0; rotationMatrix[15] = 1;
    } else if (xAxis === 0 && yAxis === 0 && zAxis !== 0) {
      // Rotation around Z axis
      if (zAxis < 0) {
        s = -s;
      }

      rotationMatrix[0] = c; rotationMatrix[4] = -s; rotationMatrix[8] = 0; rotationMatrix[12] = 0;
      rotationMatrix[1] = s; rotationMatrix[5] = c; rotationMatrix[9] = 0; rotationMatrix[13] = 0;
      rotationMatrix[2] = 0; rotationMatrix[6] = 0; rotationMatrix[10] = 1; rotationMatrix[14] = 0;
      rotationMatrix[3] = 0; rotationMatrix[7] = 0; rotationMatrix[11] = 0; rotationMatrix[15] = 1;
    } else {
      // Rotation around any arbitrary axis
      const axis = new GlVector(xAxis, yAxis, zAxis);
      axis.normalize();
      const ux = axis.v[0];
      const uy = axis.v[1];
      const uz = axis.v[2];

      const c1 = 1 - c;

      rotationMatrix[0] = c + ux * ux * c1;
      rotationMatrix[1] = uy * ux * c1 + uz * s;
      rotationMatrix[2] = uz * ux * c1 - uy * s;
      rotationMatrix[3] = 0;

      rotationMatrix[4] = ux * uy * c1 - uz * s;
      rotationMatrix[5] = c + uy * uy * c1;
      rotationMatrix[6] = uz * uy * c1 + ux * s;
      rotationMatrix[7] = 0;

      rotationMatrix[8] = ux * uz * c1 + uy * s;
      rotationMatrix[9] = uy * uz * c1 - ux * s;
      rotationMatrix[10] = c + uz * uz * c1;
      rotationMatrix[11] = 0;

      rotationMatrix[12] = 0;
      rotationMatrix[13] = 0;
      rotationMatrix[14] = 0;
      rotationMatrix[15] = 1;
    }
    this.multiplyLeft(rotationMatrix);
    return this;
  }

  public lookAt(eye: GlVector, center: GlVector, up: GlVector): GlMatrix {
    const n = eye.copy();
    n.subtract(center);

    if (n.magnitude < EPSILON) {
      return this.setIdentity();
    }

    n.normalize();

    const u = up.copy();
    u.crossProduct(n);
    u.normalize();
    

    const v = n.copy();
    v.crossProduct(u);
    v.normalize();

    const tx = -u.dotProduct(eye);
    const ty = -v.dotProduct(eye);
    const tz = -n.dotProduct(eye);

    const lookAt = new Float32Array(16);
    lookAt[0] = u.v[0]; lookAt[4] = u.v[1]; lookAt[8] = u.v[2]; lookAt[12] = tx;
    lookAt[1] = v.v[0]; lookAt[5] = v.v[1]; lookAt[9] = v.v[2]; lookAt[13] = ty;
    lookAt[2] = n.v[0]; lookAt[6] = n.v[1]; lookAt[10] = n.v[2]; lookAt[14] = tz;
    lookAt[3] = 0; lookAt[7] = 0; lookAt[11] = 0; lookAt[15] = 1;

    this.multiplyLeft(lookAt);
    return this;
  }

  public rotateWithQuaternion(x: number, y: number, z: number, w: number): GlMatrix {
    const rotationMatrix: Float32Array = new Float32Array(16);
    const sqw: number = w * w;
    const sqx: number = x * x;
    const sqy: number = y * y;
    const sqz: number = z * z;

    // invs (inverse square length) is only required if quaternion is not already normalised
    const invs: number = 1 / (sqx + sqy + sqz + sqw)
    rotationMatrix[0] = (sqx - sqy - sqz + sqw) * invs; // since sqw + sqx + sqy + sqz =1/invs*invs
    rotationMatrix[5] = (-sqx + sqy - sqz + sqw) * invs;
    rotationMatrix[10] = (-sqx - sqy + sqz + sqw) * invs;

    let tmp1: number = x * y;
    let tmp2: number = z * w;
    rotationMatrix[1] = 2.0 * (tmp1 + tmp2) * invs;
    rotationMatrix[4] = 2.0 * (tmp1 - tmp2) * invs;

    tmp1 = x * z;
    tmp2 = y * w;
    rotationMatrix[2] = 2.0 * (tmp1 - tmp2) * invs;
    rotationMatrix[8] = 2.0 * (tmp1 + tmp2) * invs;
    
    tmp1 = y * z;
    tmp2 = x * w;
    rotationMatrix[6] = 2.0 * (tmp1 + tmp2) * invs;
    rotationMatrix[9] = 2.0 * (tmp1 - tmp2) * invs;
    
    rotationMatrix[15] = 1;

    this.multiplyLeft(rotationMatrix);
    return this;
  }

  static staticMultiply(m1: Float32Array, m2: Float32Array) {
    const dest = new Float32Array(16);
    dest[0] = m2[0] * m1[0] + m2[1] * m1[4] + m2[2] * m1[8] + m2[3] * m1[12];
    dest[1] = m2[0] * m1[1] + m2[1] * m1[5] + m2[2] * m1[9] + m2[3] * m1[13];
    dest[2] = m2[0] * m1[2] + m2[1] * m1[6] + m2[2] * m1[10] + m2[3] * m1[14];
    dest[3] = m2[0] * m1[3] + m2[1] * m1[7] + m2[2] * m1[11] + m2[3] * m1[15];

    dest[4] = m2[4] * m1[0] + m2[5] * m1[4] + m2[6] * m1[8] + m2[7] * m1[12];
    dest[5] = m2[4] * m1[1] + m2[5] * m1[5] + m2[6] * m1[9] + m2[7] * m1[13];
    dest[6] = m2[4] * m1[2] + m2[5] * m1[6] + m2[6] * m1[10] + m2[7] * m1[14];
    dest[7] = m2[4] * m1[3] + m2[5] * m1[7] + m2[6] * m1[11] + m2[7] * m1[15];

    dest[8] = m2[8] * m1[0] + m2[9] * m1[4] + m2[10] * m1[8] + m2[11] * m1[12];
    dest[9] = m2[8] * m1[1] + m2[9] * m1[5] + m2[10] * m1[9] + m2[11] * m1[13];
    dest[10] = m2[8] * m1[2] + m2[9] * m1[6] + m2[10] * m1[10] + m2[11] * m1[14];
    dest[11] = m2[8] * m1[3] + m2[9] * m1[7] + m2[10] * m1[11] + m2[11] * m1[15];

    dest[12] = m2[12] * m1[0] + m2[13] * m1[4] + m2[14] * m1[8] + m2[15] * m1[12];
    dest[13] = m2[12] * m1[1] + m2[13] * m1[5] + m2[14] * m1[9] + m2[15] * m1[13];
    dest[14] = m2[12] * m1[2] + m2[13] * m1[6] + m2[14] * m1[10] + m2[15] * m1[14];
    dest[15] = m2[12] * m1[3] + m2[13] * m1[7] + m2[14] * m1[11] + m2[15] * m1[15];
    return dest;
  }

  static staticSetIdentity(m: Float32Array) {
    m[0] = 1; m[4] = 0; m[8] = 0; m[12] = 0;
    m[1] = 0; m[5] = 1; m[9] = 0; m[13] = 0;
    m[2] = 0; m[6] = 0; m[10] = 1; m[14] = 0;
    m[3] = 0; m[7] = 0; m[11] = 0; m[15] = 1;
  }
}