import { getSDF, drawOutlines, getSDFImage } from "../src";
import { Pane } from "tweakpane";
import { DrawOutlinesOptions } from "../src/stroke";
import { hexToRgba, loadImage } from "./utils";

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

(async function () {
  const [width, height] = [500, 500];
  // const [width, height] = [1024, 512];

  let image = await loadImage("./github.svg");
  // let image = await loadImage("./text1.png");
  // let image = await loadImage("./vfxjs.png");
  image.width = width;
  image.height = height;

  // const canvas = drawImageOnCanvas(image) as any;
  // const canvas = drawTextOnCanvas("hey", width, height, 200) as any;
  // image = canvas;

  const sdfOpts = {
    width,
    height,
    spread: 100,
    padding: 100,
    pixelRatio: 2,
    signed: false,
  };

  const sdfImg = await getSDFImage(image, sdfOpts);
  sdfImg.style.width = `${width}px`;
  sdfImg.style.height = `${height}px`;
  sdfImg.style.marginRight = `10px`;
  document.querySelector("#sdf-container")!.appendChild(sdfImg);

  const sdf = await getSDF(image, sdfOpts);

  const outlineOptsBindings = {
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

  const outlineOpts = createOutlineParams(outlineOptsBindings);
  let outlineRenderer = await drawOutlines(image, sdf, sdfOpts, outlineOpts);
  document
    .querySelector("#output-container")!
    .appendChild(outlineRenderer.canvas);

  // Setup tweakpane
  const pane = new Pane();
  const f1 = pane.addFolder({
    title: "Basic",
  });
  f1.addBinding(sdfOpts, "signed");
  f1.addBinding(sdfOpts, "spread", { min: 1.0, max: 300.0 });
  f1.addBinding(sdfOpts, "padding", { min: 1.0, max: 300.0 });
  f1.on("change", async () => {
    outlineRenderer.clear();

    const sdf = await getSDF(image, sdfOpts);
    outlineRenderer = await drawOutlines(image, sdf, sdfOpts, outlineOpts);
    document
      .querySelector("#output-container")!
      .appendChild(outlineRenderer.canvas);
  });

  const f2 = pane.addFolder({
    title: "Stroke / Shadow",
  });
  f2.addBinding(outlineOptsBindings, "imageAlpha", { min: 0.0, max: 1.0 });
  f2.addBinding(outlineOptsBindings, "strokeWidth", { min: 0.0, max: 50.0 });
  f2.addBinding(outlineOptsBindings, "strokeSoftness", { min: 0.0, max: 1.0 });
  f2.addBinding(outlineOptsBindings, "strokeColor");
  f2.addBinding(outlineOptsBindings, "strokeAlpha", { min: 0.0, max: 1.0 });
  f2.addBinding(outlineOptsBindings, "shadowWidth", { min: 0.0, max: 100.0 });
  f2.addBinding(outlineOptsBindings, "shadowSoftness", { min: 0.0, max: 1.0 });
  f2.addBinding(outlineOptsBindings, "shadowColor");
  f2.addBinding(outlineOptsBindings, "shadowAlpha", { min: 0.0, max: 1.0 });
  f2.on("change", () => {
    const outlineParams = createOutlineParams(outlineOptsBindings);
    outlineRenderer.redraw(outlineParams);
    document
      .querySelector("#output-container")!
      .appendChild(outlineRenderer.canvas);
  });
})();
