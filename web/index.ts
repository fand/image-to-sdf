import { getSDF, drawOutlines, getSDFImage } from "../src";
import { Pane } from "tweakpane";
import { DrawOutlinesOptions } from "../src/stroke";
import { GetSDFOptions } from "../src/getSDF";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = url;
  });
}

function drawImageOnCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas")!;
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0);

  return canvas;
}

function drawTextOnCanvas(
  text: string,
  width: number,
  height: number,
  fontSize: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas")!;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillText(text, width / 2, height / 2);

  return canvas;
}

type DrawOutlineBindings = {
  imageAlpha: number;
  strokeWidth: number;
  strokeSoftness: number;
  strokeColor: string;
  strokeAlpha: number;
  shadowWidth: number;
  shadowSoftness: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowColor: string;
  shadowAlpha: number;
};

function createOutlineParams(
  outlineOptsBindings: DrawOutlineBindings,
): DrawOutlinesOptions {
  return {
    ...outlineOptsBindings,
    strokeColor: hexToRgba(
      outlineOptsBindings.strokeColor,
      outlineOptsBindings.strokeAlpha,
    ),
    shadowColor: hexToRgba(
      outlineOptsBindings.shadowColor,
      outlineOptsBindings.shadowAlpha,
    ),
    shadowOffset: [
      outlineOptsBindings.shadowOffsetX,
      outlineOptsBindings.shadowOffsetY,
    ],
  };
}

function hexToRgba(
  hex: string,
  alpha: number,
): [number, number, number, number] {
  if (hex.length != 7) {
    throw "hex string must have 7 characters";
  }
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, alpha];
}

(async function () {
  const [width, height] = [500, 500];
  // const [width, height] = [1024, 512];

  // let image = await loadImage("./github.svg");
  let image = await loadImage("./text1.png");
  // let image = await loadImage("./vfxjs.png");
  // image.width = width;
  // image.height = height;

  // const canvas = drawImageOnCanvas(image) as any;
  // const canvas = drawTextOnCanvas("hey", width, height, 200) as any;
  // image = canvas;

  const opts: Partial<GetSDFOptions> = {
    width,
    height,
    spread: 100,
    padding: 100,
    pixelRatio: 2,
    signed: false,
  };

  const sdfImg = await getSDFImage(image, opts);
  sdfImg.style.width = `${width}px`;
  sdfImg.style.height = `${height}px`;
  sdfImg.style.marginRight = `10px`;
  document.body.appendChild(sdfImg);

  const sdf = await getSDF(image, opts);

  const outlineParamsBinding = {
    imageAlpha: 1,
    strokeWidth: 10,
    strokeSoftness: 0.2,
    strokeColor: "#FF9900",
    strokeAlpha: 1.0,
    shadowWidth: 20,
    shadowSoftness: 0.5,
    shadowOffsetX: 10,
    shadowOffsetY: -10,
    shadowColor: "#000000",
    shadowAlpha: 1.0,
  };

  const outlineParams = createOutlineParams(outlineParamsBinding);
  let outlineRenderer = await drawOutlines(image, sdf, opts, outlineParams);

  const pane = new Pane();

  const f1 = pane.addFolder({
    title: "Basic",
  });
  f1.addBinding(opts, "signed");
  f1.addBinding(opts, "spread", { min: 1.0, max: 300.0 });
  f1.addBinding(opts, "padding", { min: 1.0, max: 300.0 });
  f1.on("change", async () => {
    outlineRenderer.clear();

    const sdf = await getSDF(image, opts);
    outlineRenderer = await drawOutlines(image, sdf, opts, outlineParams);
  });

  const f2 = pane.addFolder({
    title: "Stroke / Shadow",
  });
  f2.addBinding(outlineParamsBinding, "imageAlpha", { min: 0.0, max: 1.0 });
  f2.addBinding(outlineParamsBinding, "strokeWidth", { min: 0.0, max: 50.0 });
  f2.addBinding(outlineParamsBinding, "strokeSoftness", { min: 0.0, max: 1.0 });
  f2.addBinding(outlineParamsBinding, "strokeColor");
  f2.addBinding(outlineParamsBinding, "strokeAlpha", { min: 0.0, max: 1.0 });
  f2.addBinding(outlineParamsBinding, "shadowWidth", { min: 0.0, max: 100.0 });
  f2.addBinding(outlineParamsBinding, "shadowSoftness", { min: 0.0, max: 1.0 });
  f2.addBinding(outlineParamsBinding, "shadowColor");
  f2.addBinding(outlineParamsBinding, "shadowAlpha", { min: 0.0, max: 1.0 });
  f2.on("change", () => {
    const outlineParams = createOutlineParams(outlineParamsBinding);
    outlineRenderer.redraw(outlineParams);
  });
})();
