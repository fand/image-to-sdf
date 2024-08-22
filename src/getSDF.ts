import { PicoGL, App, DrawCall, Framebuffer, Texture } from "picogl";
import {
  createDrawCall,
  createPlaneGeometry,
  createRenderTarget,
} from "./utils";

import sdfFs from "./getSDF.frag";
import mergeFs from "./mergeSDF.frag";

export type GetSDFOptions = {
  /**
   * Number of pixels to spread edges.
   */
  width: number;
  height: number;
  spread: number;
  padding: number;
  pixelRatio: number;
  signed: boolean;
};

export function validateOptions(
  opts: Partial<GetSDFOptions>,
  width_: number,
  height_: number,
): GetSDFOptions {
  const width = opts.width ?? width_;
  const height = opts.height ?? height_;

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
  if (width < 1) {
    throw "Invalid argument: width must be >= 1";
  }
  if (height < 1) {
    throw "Invalid argument: width must be >= 1";
  }

  return {
    width,
    height,
    spread,
    padding,
    pixelRatio,
    signed,
  };
}

export async function getSDF(
  src: HTMLImageElement | HTMLCanvasElement,
  opts: Partial<GetSDFOptions>,
): Promise<Float32Array> {
  return getSDFInner(src, opts, true) as Promise<Float32Array>;
}

export async function getSDFImage(
  src: HTMLImageElement | HTMLCanvasElement,
  opts: Partial<GetSDFOptions>,
): Promise<HTMLImageElement> {
  return getSDFInner(src, opts, false) as Promise<HTMLImageElement>;
}

/**
 * Generate an SDF for the given image using jump flooding algorithm.
 */
async function getSDFInner(
  src: HTMLImageElement | HTMLCanvasElement,
  opts: Partial<GetSDFOptions> = {},
  float: boolean,
): Promise<Float32Array | HTMLImageElement> {
  const { spread, padding, pixelRatio, signed, width, height } =
    validateOptions(opts, src.width, src.height);

  const canvas = document.createElement("canvas");
  canvas.width = (width + padding * 2) * pixelRatio;
  canvas.height = (height + padding * 2) * pixelRatio;
  document.body.appendChild(canvas);

  const app = PicoGL.createApp(canvas).clearColor(0.0, 0.0, 0.0, 1.0);
  const plane = createPlaneGeometry(app);

  // Setup textures
  const texture = app.createTexture2D(src as HTMLImageElement /** FIXME! */, {
    flipY: true,
    wrapS: PicoGL.CLAMP_TO_EDGE,
    wrapT: PicoGL.CLAMP_TO_EDGE,
  });

  // Setup draw call
  const drawCall = await createDrawCall(app, sdfFs, plane, width, height);
  drawCall.texture("src", texture);
  drawCall.uniform("padding", padding);
  drawCall.uniform("spread", spread);

  let outRt;
  let drawCall2: DrawCall | undefined;
  if (signed) {
    const rt1 = await drawSDF(app, drawCall, texture, spread, true);
    const rt2 = await drawSDF(app, drawCall, texture, spread, false);

    const rt3 = createRenderTarget(app);
    drawCall2 = await createDrawCall(app, mergeFs, plane, width, height);
    drawCall2.texture("tex1", rt1.colorAttachments[0]);
    drawCall2.texture("tex2", rt2.colorAttachments[0]);

    app.drawFramebuffer(rt3).clear();
    drawCall2.draw();

    outRt = rt3;
  } else {
    outRt = await drawSDF(app, drawCall, texture, spread, true);
  }

  if (float) {
    // Convert to Float32Array
    const w = (width + padding * 2) * pixelRatio;
    const h = (height + padding * 2) * pixelRatio;
    const pixels = new Float32Array(w * h * 4);

    app.readFramebuffer(outRt);
    app.gl.readPixels(0, 0, w, h, app.gl.RGBA, app.gl.FLOAT, pixels);

    canvas.remove();
    return pixels;
  } else {
    // Draw again to the canvas
    app.defaultDrawFramebuffer().clear();
    if (signed) {
      drawCall2!.uniform("useUnsignedFormat", true);
      drawCall2!.draw();
    } else {
      drawCall.uniform("useUnsignedFormat", true);
      drawCall.draw();
    }

    const newImage = new Image();
    newImage.src = canvas.toDataURL();

    canvas.remove();
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
