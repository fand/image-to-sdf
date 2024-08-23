import { App, DrawCall, PicoGL, UniformBuffer, VertexArray } from "picogl";
import { createDrawCall, createPlaneGeometry } from "./utils";
import { SDFOpts, validateOpts } from "./SDFGenerator";

import outlineFs from "./OutlineRenderer.frag";

export type OutlineOpts = {
  imageAlpha: number;
  outlineWidth: number;
  outlineSoftness: number;
  outlineColor: [number, number, number, number];
  shadowOffset: [number, number];
  shadowWidth: number;
  shadowSoftness: number;
  shadowColor: [number, number, number, number];
};

function validateOutlineOpts(opts: Partial<OutlineOpts>): OutlineOpts {
  const imageAlpha = opts.imageAlpha ?? 1;
  const outlineWidth = opts.outlineWidth ?? 10;
  const outlineSoftness = opts.outlineSoftness ?? 0.5;
  const outlineColor = opts.outlineColor ?? [1, 0, 0, 1];
  const shadowOffset = opts.shadowOffset ?? [10, 10];
  const shadowWidth = opts.shadowWidth ?? 30;
  const shadowSoftness = opts.shadowSoftness ?? 0.5;
  const shadowColor = opts.shadowColor ?? [1, 0, 0, 1];

  return {
    imageAlpha,
    outlineWidth,
    outlineSoftness,
    outlineColor,
    shadowOffset,
    shadowWidth,
    shadowSoftness,
    shadowColor,
  };
}

export class OutlineRenderer {
  readonly canvas: HTMLCanvasElement;
  #app: App;
  #plane: VertexArray;
  #drawCall: DrawCall | undefined;
  #uniformBuffer: UniformBuffer | undefined;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.#app = PicoGL.createApp(this.canvas).clearColor(0.0, 0.0, 0.0, 1.0);
    this.#plane = createPlaneGeometry(this.#app);
  }

  async render(
    image: HTMLImageElement,
    sdf: Float32Array,
    sdfOpts_: Partial<SDFOpts> = {},
    outlineOpts_: Partial<OutlineOpts> = {},
  ) {
    const sdfOpts = validateOpts(sdfOpts_);
    const outlineOpts = validateOutlineOpts(outlineOpts_);

    // Resize canvas
    this.canvas.width = image.width * sdfOpts.pixelRatio;
    this.canvas.height = image.height * sdfOpts.pixelRatio;
    this.canvas.style.width = `${image.width}px`;
    this.canvas.style.height = `${image.height}px`;
    this.#app.resize(this.canvas.width, this.canvas.height);

    const uniformBuffer = this.#createUniformBuffer(outlineOpts);
    const drawCall = await this.#createDrawCall();

    drawCall
      .uniformBlock("OutlineOpts", uniformBuffer)
      .uniform("resolution", [image.width, image.height] as any)
      .uniform("padding", sdfOpts.padding)
      .uniform("spread", sdfOpts.spread)
      .uniform("isSigned", sdfOpts.signed);

    // Textures
    const texSrc = this.#app.createTexture2D(image, {
      flipY: true,
      wrapS: PicoGL.CLAMP_TO_EDGE,
      wrapT: PicoGL.CLAMP_TO_EDGE,
    });

    const sdfW = (image.width + sdfOpts.padding * 2) * sdfOpts.pixelRatio;
    const sdfH = (image.height + sdfOpts.padding * 2) * sdfOpts.pixelRatio;
    const texSdf = this.#app.createTexture2D(sdf, sdfW, sdfH, {
      // flipY: true,
      wrapS: PicoGL.CLAMP_TO_EDGE,
      wrapT: PicoGL.CLAMP_TO_EDGE,
      internalFormat: PicoGL.RGBA32F,
    });

    drawCall.texture("src", texSrc).texture("sdf", texSdf);

    // Draw
    this.#app.clear();
    drawCall.draw();

    texSrc.delete();
    texSdf.delete();
  }

  clear() {
    this.canvas.remove();
    this.#app.loseContext();
  }

  #createUniformBuffer(outlineOpts: OutlineOpts): UniformBuffer {
    const uniformBuffer =
      this.#uniformBuffer ??
      this.#app.createUniformBuffer([
        PicoGL.FLOAT,
        PicoGL.FLOAT,
        PicoGL.FLOAT,
        PicoGL.FLOAT_VEC4,
        PicoGL.FLOAT_VEC2,
        PicoGL.FLOAT,
        PicoGL.FLOAT,
        PicoGL.FLOAT_VEC4,
      ]);

    uniformBuffer
      .set(0, outlineOpts.imageAlpha as any)
      .set(1, outlineOpts.outlineWidth as any)
      .set(2, outlineOpts.outlineSoftness as any)
      .set(3, outlineOpts.outlineColor as any)
      .set(4, outlineOpts.shadowOffset as any)
      .set(5, outlineOpts.shadowWidth as any)
      .set(6, outlineOpts.shadowSoftness as any)
      .set(7, outlineOpts.shadowColor as any)
      .update();

    this.#uniformBuffer = uniformBuffer;
    return uniformBuffer;
  }

  async #createDrawCall(): Promise<DrawCall> {
    const drawCall =
      this.#drawCall ??
      (await createDrawCall(this.#app, outlineFs, this.#plane));

    this.#drawCall = drawCall;
    return drawCall;
  }
}
