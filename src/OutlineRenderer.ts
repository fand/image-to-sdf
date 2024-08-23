import { PicoGL } from "picogl";
import { createDrawCall, createPlaneGeometry } from "./utils";
import { GetSDFOptions, validateOptions } from "./SDFGenerator";

import outlineFs from "./OutlineRenderer.frag";

export type DrawOutlinesOptions = {
  imageAlpha: number;
  outlineWidth: number;
  outlineSoftness: number;
  outlineColor: [number, number, number, number];
  shadowOffset: [number, number];
  shadowWidth: number;
  shadowSoftness: number;
  shadowColor: [number, number, number, number];
};

function validateOutlineOptions(
  opts: Partial<DrawOutlinesOptions>,
): DrawOutlinesOptions {
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

type OutlineRenderer = {
  canvas: HTMLCanvasElement;
  clear: () => void;
  redraw: (opts: Partial<GetSDFOptions & DrawOutlinesOptions>) => void;
};

export async function drawOutlines(
  image: HTMLImageElement,
  sdf: Float32Array,
  sdfOpts: Partial<GetSDFOptions> = {},
  outlineOpts_: Partial<DrawOutlinesOptions> = {},
): Promise<OutlineRenderer> {
  const { spread, padding, pixelRatio, width, height, signed } =
    validateOptions(sdfOpts, image.width, image.height);
  const outlineOpts = validateOutlineOptions(outlineOpts_);

  // Setup Canvas
  const canvas = document.createElement("canvas");
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  // document.body.appendChild(canvas);

  // Setup App
  const app = PicoGL.createApp(canvas).clearColor(0.0, 0.0, 0.0, 1.0);

  // Textures
  const texSrc = app.createTexture2D(image, {
    flipY: true,
    wrapS: PicoGL.CLAMP_TO_EDGE,
    wrapT: PicoGL.CLAMP_TO_EDGE,
  });

  const sdfW = (width + padding * 2) * pixelRatio;
  const sdfH = (height + padding * 2) * pixelRatio;
  const texSdf = app.createTexture2D(sdf, sdfW, sdfH, {
    // flipY: true,
    wrapS: PicoGL.CLAMP_TO_EDGE,
    wrapT: PicoGL.CLAMP_TO_EDGE,
    internalFormat: PicoGL.RGBA32F,
  });

  // UniformBuffer
  const outlineUniformBuffer = app.createUniformBuffer([
    PicoGL.FLOAT,
    PicoGL.FLOAT,
    PicoGL.FLOAT,
    PicoGL.FLOAT_VEC4,
    PicoGL.FLOAT_VEC2,
    PicoGL.FLOAT,
    PicoGL.FLOAT,
    PicoGL.FLOAT_VEC4,
  ]);
  outlineUniformBuffer
    .set(0, outlineOpts.imageAlpha as any)
    .set(1, outlineOpts.outlineWidth as any)
    .set(2, outlineOpts.outlineSoftness as any)
    .set(3, outlineOpts.outlineColor as any)
    .set(4, outlineOpts.shadowOffset as any)
    .set(5, outlineOpts.shadowWidth as any)
    .set(6, outlineOpts.shadowSoftness as any)
    .set(7, outlineOpts.shadowColor as any)
    .update();

  // Setup draw call
  const planeArray = createPlaneGeometry(app);
  const drawCall = await createDrawCall(
    app,
    outlineFs,
    planeArray,
    width,
    height,
  );

  drawCall
    .uniformBlock("OutlineOpts", outlineUniformBuffer)
    .uniform("resolution", [width, height] as any)
    .uniform("padding", padding)
    .uniform("spread", spread)
    .uniform("isSigned", signed)
    .texture("src", texSrc)
    .texture("sdf", texSdf);

  function draw() {
    app.clear();
    drawCall.draw();
    // requestAnimationFrame(draw);
  }
  draw();

  return {
    canvas,
    clear: () => {
      canvas.remove();
      app.loseContext();
    },
    redraw: (newOpts) => {
      outlineUniformBuffer
        .set(0, newOpts.imageAlpha as any)
        .set(1, newOpts.outlineWidth as any)
        .set(2, newOpts.outlineSoftness as any)
        .set(3, newOpts.outlineColor as any)
        .set(4, newOpts.shadowOffset as any)
        .set(5, newOpts.shadowWidth as any)
        .set(6, newOpts.shadowSoftness as any)
        .set(7, newOpts.shadowColor as any)
        .update();

      app.clear();
      drawCall.draw();
    },
  };
}
