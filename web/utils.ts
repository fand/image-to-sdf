export function hexToRgba(
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

export function drawImageOnCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas")!;
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0);

  return canvas;
}

export function drawTextOnCanvas(
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

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = url;
  });
}
