import {
  PicoGL,
  App,
  DrawCall,
  Framebuffer,
  Texture,
  VertexArray,
} from "picogl";
import {
  createDrawCall,
  createPlaneGeometry,
  createRenderTarget,
} from "./utils";

import sdfFs from "./SDFGeneratorMain.frag";
import mergeFs from "./SDFGeneratorMerge.frag";

export type SDFOpts = {
  /** Number of pixels to spread edges. */
  spread: number;

  /** Padding size to avoid SDF clipping at the image edges. */
  padding: number;

  /**
   * Pixel ratio to control the SDF resolution.
   * If 1, SDF will be the same size as the input (+ padding).
   * If 0.5, SDF will be half size.
   */
  pixelRatio: number;
  signed: boolean;
};

export function validateOpts(opts: Partial<SDFOpts>): SDFOpts {
  const spread = opts.spread ?? 10;
  const padding = opts.padding ?? 0;
  const pixelRatio = opts.pixelRatio ?? 1;
  const signed = opts.signed ?? false;

  if (spread < 1) {
    throw "Invalid argument: spread must be >= 1";
  }
  if (padding < 0) {
    throw "Invalid argument: padding must be >= 0";
  }
  if (pixelRatio < 0) {
    throw "Invalid argument: pixelRatio must be > 0";
  }

  return {
    spread,
    padding,
    pixelRatio,
    signed,
  };
}

/**
 * Generate an SDF for the given image using jump flooding algorithm.
 */
export class SDFGenerator {
  readonly canvas: HTMLCanvasElement;
  #app: App;
  #plane: VertexArray;
  #drawCall: DrawCall | undefined;
  #mergeDrawCall: DrawCall | undefined;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.#app = PicoGL.createApp(this.canvas).clearColor(0.0, 0.0, 0.0, 1.0);
    this.#plane = createPlaneGeometry(this.#app);
  }

  async render(
    src: HTMLImageElement | HTMLCanvasElement,
    opts: Partial<SDFOpts> = {},
    float: boolean,
  ): Promise<Float32Array | HTMLImageElement> {
    const { spread, padding, pixelRatio, signed } = validateOpts(opts);

    const viewportWidth = (src.width + padding * 2) * pixelRatio;
    const viewportHeight = (src.height + padding * 2) * pixelRatio;

    this.canvas.width = viewportWidth;
    this.canvas.height = viewportHeight;
    this.#app.resize(this.canvas.width, this.canvas.height);

    // Setup textures
    const texture = this.#app.createTexture2D(
      src as HTMLImageElement /** FIXME! */,
      {
        flipY: true,
        wrapS: PicoGL.CLAMP_TO_EDGE,
        wrapT: PicoGL.CLAMP_TO_EDGE,
      },
    );

    // Setup draw call
    const drawCall = await this.#getSDFDrawCall();
    drawCall.texture("src", texture);
    drawCall.uniform("padding", padding);
    drawCall.uniform("spread", spread);
    drawCall.uniform("resolution", [src.width, src.height]);

    if (signed) {
      const rt1 = await drawSDF(this.#app, drawCall, texture, spread, true);
      const rt2 = await drawSDF(this.#app, drawCall, texture, spread, false);

      const rt3 = createRenderTarget(this.#app);
      const mergeDrawCall = await this.#getMergeDrawCall();
      mergeDrawCall.uniform("resolution", [src.width, src.height]);
      mergeDrawCall.texture("tex1", rt1.colorAttachments[0]);
      mergeDrawCall.texture("tex2", rt2.colorAttachments[0]);

      this.#app.drawFramebuffer(rt3).clear();
      mergeDrawCall.draw();

      if (float) {
        return this.#getFloat32Array(rt3, viewportWidth, viewportHeight);
      } else {
        return this.#getImage(mergeDrawCall);
      }
    } else {
      const outRt = await drawSDF(this.#app, drawCall, texture, spread, true);
      if (float) {
        return this.#getFloat32Array(outRt, viewportWidth, viewportHeight);
      } else {
        return this.#getImage(drawCall);
      }
    }
  }

  async getSDF(
    src: HTMLImageElement | HTMLCanvasElement,
    opts: Partial<SDFOpts>,
  ): Promise<Float32Array> {
    return this.render(src, opts, true) as Promise<Float32Array>;
  }

  async getSDFImage(
    src: HTMLImageElement | HTMLCanvasElement,
    opts: Partial<SDFOpts>,
  ): Promise<HTMLImageElement> {
    return this.render(src, opts, false) as Promise<HTMLImageElement>;
  }

  dispose() {
    this.#app.loseContext();
    this.canvas.remove();
  }

  async #getSDFDrawCall(): Promise<DrawCall> {
    if (this.#drawCall === undefined) {
      this.#drawCall = await createDrawCall(this.#app, sdfFs, this.#plane);
    }
    return this.#drawCall;
  }

  async #getMergeDrawCall(): Promise<DrawCall> {
    if (this.#mergeDrawCall === undefined) {
      this.#mergeDrawCall = await createDrawCall(
        this.#app,
        mergeFs,
        this.#plane,
      );
    }
    return this.#mergeDrawCall;
  }

  /** Extract framebuffer content to Float32Array */
  #getFloat32Array(
    buf: Framebuffer,
    viewportWidth: number,
    viewportHeight: number,
  ) {
    const pixels = new Float32Array(viewportWidth * viewportHeight * 4);

    this.#app.readFramebuffer(buf);
    this.#app.gl.readPixels(
      0,
      0,
      viewportWidth,
      viewportHeight,
      this.#app.gl.RGBA,
      this.#app.gl.FLOAT,
      pixels,
    );

    return pixels;
  }

  /** Rerender the drawcall and convert to HTMLImageElement */
  #getImage(drawCall: DrawCall): HTMLImageElement {
    this.#app.defaultDrawFramebuffer().clear();
    drawCall.uniform("useUnsignedFormat", true);
    drawCall.draw();

    const newImage = new Image();
    newImage.src = this.canvas.toDataURL();
    return newImage;
  }
}

function drawSDF(
  app: App,
  drawCall: DrawCall,
  texture: Texture,
  spread: number,
  isPositive: boolean,
): Promise<Framebuffer> {
  // TODO: optimize / reuse RT
  let [rt1, rt2] = [createRenderTarget(app), createRenderTarget(app)];

  // Variables that change over the loop
  let power = Math.ceil(Math.log2(spread));
  let phase = 0; // 0: scale, 1: jump
  let isFirstJump = true;

  drawCall.uniform("isPositive", isPositive);

  return new Promise(function (resolve) {
    function draw() {
      drawCall.uniform("phase", phase);

      if (phase === 0) {
        // Render to RT
        app.drawFramebuffer(rt1).clear();
        drawCall.texture("tex", texture).draw();

        phase++;
      } else {
        const jump = 2 ** power;

        drawCall.uniform("jump", jump);
        drawCall.uniform("isFirstJump", isFirstJump);
        isFirstJump = false;

        // Render to RT
        app.drawFramebuffer(rt2).clear();
        drawCall.texture("tex", rt1.colorAttachments[0]).draw();

        [rt1, rt2] = [rt2, rt1];
        power--;

        if (power < 0) {
          rt2.delete();
          resolve(rt1);
          return;
        }
      }

      requestAnimationFrame(draw);
    }
    draw();
  });
}
