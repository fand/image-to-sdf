import PicoGL, { App, DrawCall, VertexArray } from "picogl";
import vertexShader from "./common.vert";

export function createPlane(width: number, height: number) {
  const w2 = width / 2,
    h2 = height / 2;

  let positions = new Float32Array([
    // left-top
    -w2,
    h2,
    0,
    // left-bottom
    -w2,
    -h2,
    0,
    // right-top
    w2,
    h2,
    0,
    // right-top
    w2,
    h2,
    0,
    // left-bottom
    -w2,
    -h2,
    0,
    // right-bottom
    w2,
    -h2,
    0,
  ]);

  let uvs = new Float32Array([0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0]);

  return {
    positions: positions,
    uvs: uvs,
  };
}

export async function createDrawCall(
  app: App,
  fragmentShader: string,
  vertexArray: VertexArray,
  width: number,
  height: number,
): Promise<DrawCall> {
  const [program] = await app.createPrograms([vertexShader, fragmentShader]);
  const drawCall = app
    .createDrawCall(program, vertexArray)
    .uniform("resolution", [width, height] as any);

  return drawCall;
}

export function createPlaneGeometry(app: App): VertexArray {
  const plane = createPlane(2.0, 2.0);
  const positions = app.createVertexBuffer(PicoGL.FLOAT, 3, plane.positions);
  const uv = app.createVertexBuffer(PicoGL.FLOAT, 2, plane.uvs);

  return app
    .createVertexArray()
    .vertexAttributeBuffer(0, positions)
    .vertexAttributeBuffer(1, uv);
}

export function createRenderTarget(app: App) {
  const colorTarget = app.createTexture2D(app.width, app.height, {
    internalFormat: PicoGL.RGBA32F,
    wrapS: PicoGL.CLAMP_TO_EDGE,
    wrapT: PicoGL.CLAMP_TO_EDGE,
  });
  return app.createFramebuffer().colorTarget(0, colorTarget);
}
