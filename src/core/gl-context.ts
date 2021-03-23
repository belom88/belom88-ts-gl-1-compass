export class GlContext {
  gl: WebGLRenderingContext | null = null;
  constructor(selector: string) {
    const canvasElements: NodeListOf<Element> = document.querySelectorAll(selector);
    if (canvasElements.length) {
      const canvas = canvasElements[0] as HTMLCanvasElement;
      this.gl = canvas.getContext('webgl');
    }
  }
}