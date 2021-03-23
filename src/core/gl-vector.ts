export class GlVector {
  v: Float32Array = new Float32Array(3);

  constructor(x: number, y: number, z: number) {
    this.v.set([x, y, z]);
  }

  copy(): GlVector {
    return new GlVector(this.v[0], this.v[1], this.v[2]);
  }

  public divide(scalar: number): GlVector {
    for (let i = 0; i < this.v.length; i++) {
      this.v[i] = this.v[i] / scalar;
    }
    return this;
  }

  public subtract(v: GlVector): GlVector {
    for (let i = 0; i < this.v.length; i++) {
      this.v[i] = this.v[i] - v.v[i];
    }
    return this;
  }

  get magnitude(): number {
    return Math.sqrt(this.v[0] * this.v[0] + this.v[1] * this.v[1] + this.v[2] * this.v[2]);
  }

  public normalize(): GlVector {
    const magnitude = this.magnitude;
    if (magnitude === 0) {
      this.v.set([0, 0, 0]);
      return this;
    }
    return this.divide(magnitude);
  }

  public crossProduct(v: GlVector): GlVector {
    const result = new Float32Array(3);
    result[0] = this.v[1] * v.v[2] - this.v[2] * v.v[1];
    result[1] = this.v[2] * v.v[0] - this.v[0] * v.v[2];
    result[2] = this.v[0] * v.v[1] - this.v[1] * v.v[0];
    this.v = result;
    return this;
  }

  public dotProduct(v: GlVector): number {
    let result: number = 0;
    for (let i = 0; i < this.v.length; i++) {
      result += this.v[i] * v.v[i];
    }
    return result;
  }
}