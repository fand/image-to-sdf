import { SDFGenerator, OutlineRenderer, OutlineOpts } from "../src";
import { Pane } from "tweakpane";
import { hexToRgba, loadImage } from "./utils";

type OutlineOptsUI = {
  imageAlpha: number;
  outlineWidth: number;
  outlineSoftness: number;
  outlineColor: string;
  outlineAlpha: number;
  shadowWidth: number;
  shadowSoftness: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowColor: string;
  shadowAlpha: number;
};

function createOutlineParams(outlineOptsBindings: OutlineOptsUI): OutlineOpts {
  return {
    ...outlineOptsBindings,
    outlineColor: hexToRgba(
      outlineOptsBindings.outlineColor,
      outlineOptsBindings.outlineAlpha,
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
  const sdfGen = new SDFGenerator();

  let sdf = await sdfGen.getSDF(image, sdfOpts);
  let sdfImg = await sdfGen.getSDFImage(image, sdfOpts);
  sdfImg.style.width = `${width}px`;
  sdfImg.style.height = `${height}px`;
  document.querySelector("#sdf-container")!.appendChild(sdfImg);

  const outlineOptsBindings = {
    imageAlpha: 1,
    outlineWidth: 10,
    outlineSoftness: 0.2,
    outlineColor: "#FF9900",
    outlineAlpha: 1.0,
    shadowWidth: 20,
    shadowSoftness: 0.5,
    shadowOffsetX: 10,
    shadowOffsetY: -10,
    shadowColor: "#000000",
    shadowAlpha: 1.0,
  };
  let outlineOpts = createOutlineParams(outlineOptsBindings);

  const outlineRenderer = new OutlineRenderer();
  await outlineRenderer.render(image, sdf, sdfOpts, outlineOpts);
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
  f1.addBinding(sdfOpts, "pixelRatio", { min: 0.5, max: 2.0, step: 0.5 });
  f1.on("change", async () => {
    sdfImg.remove();

    const newSdf = await sdfGen.getSDF(image, sdfOpts);
    await outlineRenderer.render(image, newSdf, sdfOpts, outlineOpts);

    const newSdfImg = await sdfGen.getSDFImage(image, sdfOpts);
    newSdfImg.style.width = `${width}px`;
    newSdfImg.style.height = `${height}px`;

    sdf = newSdf;
    sdfImg = newSdfImg;

    const sdfContainer = document.querySelector("#sdf-container")!;
    sdfContainer.innerHTML = "";
    sdfContainer.appendChild(sdfImg);
  });

  const f2 = pane.addFolder({
    title: "Outline / Shadow",
  });
  f2.addBinding(outlineOptsBindings, "imageAlpha", { min: 0.0, max: 1.0 });
  f2.addBinding(outlineOptsBindings, "outlineWidth", { min: 0.0, max: 50.0 });
  f2.addBinding(outlineOptsBindings, "outlineSoftness", { min: 0.0, max: 1.0 });
  f2.addBinding(outlineOptsBindings, "outlineColor");
  f2.addBinding(outlineOptsBindings, "outlineAlpha", { min: 0.0, max: 1.0 });
  f2.addBinding(outlineOptsBindings, "shadowWidth", { min: 0.0, max: 100.0 });
  f2.addBinding(outlineOptsBindings, "shadowSoftness", { min: 0.0, max: 1.0 });
  f2.addBinding(outlineOptsBindings, "shadowColor");
  f2.addBinding(outlineOptsBindings, "shadowAlpha", { min: 0.0, max: 1.0 });
  f2.addBinding(outlineOptsBindings, "shadowOffsetX", {
    min: -100.0,
    max: 100.0,
  });
  f2.addBinding(outlineOptsBindings, "shadowOffsetY", {
    min: -100.0,
    max: 100.0,
  });
  f2.on("change", async () => {
    outlineOpts = createOutlineParams(outlineOptsBindings);
    await outlineRenderer.render(image, sdf, sdfOpts, outlineOpts);
  });
})();
