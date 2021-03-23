export interface ProgramInfo {
  program: WebGLProgram;
  attribLocations: {
    [index: string]: number;
  };
  uniformLocations: {
    [index: string]: WebGLUniformLocation | null;
  };
}
