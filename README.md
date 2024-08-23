# @fand/image-to-sdf

Generate SDF / unsigned DF from an image or canvas on the browser.

## Install

```
npm i @fand/image-to-sdf
```

or load from esm.sh:

```javascript
import { SDFGenerator } from "https://esm.sh/@fand/image-to-sdf";
```


## Usage

```javascript
const sdfGen = new SDFGenerator();

// Generate SDF as a Float32Array
const sdf = await sdfGen.getSDF(image, { spread: 32, pixelRatio: 2 });

// Or as an HTMLImageElement
const sdfImg = await sdfGen.getSDFImage(image, { ... });
```


## LICENSE

MIT
