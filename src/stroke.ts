import { PicoGL } from "picogl";
import { createDrawCall, createPlaneGeometry } from "./utils";
import { GetSDFOptions, validateOptions } from "./getSDF";

import strokeFs from "./stroke.frag";

export type DrawOutlinesOptions = {
  imageAlpha: number;
  strokeWidth: number;
  strokeColor: [number, number, number, number];
  shadowOffset: [number, number];
  shadowWidth: number;
  shadowColor: [number, number, number, number];
};

function validateOutlineOptions(
  opts: Partial<DrawOutlinesOptions>,
): DrawOutlinesOptions {
  const imageAlpha = opts.imageAlpha ?? 1;
  const strokeWidth = opts.strokeWidth ?? 10;
  const strokeColor = opts.strokeColor ?? [1, 0, 0, 1];
  const shadowOffset = opts.shadowOffset ?? [10, 10];
  const shadowWidth = opts.shadowWidth ?? 30;
  const shadowColor = opts.shadowColor ?? [1, 0, 0, 1];

  return {
    imageAlpha,
    strokeWidth,
    strokeColor,
    shadowOffset,
    shadowWidth,
    shadowColor,
  };
}

export async function drawOutlines(
  image: HTMLImageElement,
  sdf: Float32Array,
  opts: Partial<GetSDFOptions & DrawOutlinesOptions> = {},
) {
  const { spread, padding, pixelRatio, width, height, signed } =
    validateOptions(opts, image.width, image.height);
  const outlineOpts = validateOutlineOptions(opts);

  // Setup Canvas
  const canvas = document.createElement("canvas");
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  document.body.appendChild(canvas);

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
    PicoGL.FLOAT_VEC4,
    PicoGL.FLOAT_VEC2,
    PicoGL.FLOAT,
    PicoGL.FLOAT_VEC4,
  ]);
  outlineUniformBuffer
    .set(0, outlineOpts.imageAlpha as any)
    .set(1, outlineOpts.strokeWidth as any)
    .set(2, outlineOpts.strokeColor as any)
    .set(3, outlineOpts.shadowOffset as any)
    .set(4, outlineOpts.shadowWidth as any)
    .set(5, outlineOpts.shadowColor as any)
    .update();

  // Setup draw call
  const planeArray = createPlaneGeometry(app);
  const drawCall = await createDrawCall(
    app,
    strokeFs,
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
}
