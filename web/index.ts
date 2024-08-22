import { getSDF, drawOutlines, getSDFImage } from "../src";

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

  const opts = {
    width,
    height,
    spread: 30,
    padding: 30,
    pixelRatio: 2,
    // signed: true,
  };

  const sdfImg = await getSDFImage(image, opts);
  sdfImg.style.width = `${width}px`;
  sdfImg.style.height = `${height}px`;
  sdfImg.style.marginRight = `10px`;
  document.body.appendChild(sdfImg);

  const sdf = await getSDF(image, opts);

  drawOutlines(image, sdf, {
    ...opts,
    imageAlpha: 1,
    strokeWidth: 10,
    strokeColor: [1, 0.5, 0, 1],
    shadowWidth: 20,
    shadowOffset: [10, -10],
    shadowColor: [0, 0, 0, 1],
  });
})();
