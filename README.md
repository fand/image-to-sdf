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


### Float32Array output

Float32Array SDFs can be used as WebGL textures.
```javascript
const sdf = await sdfGen.getSDF(image, { spread: 32, pixelRatio: 2 });

// WebGL API
gl.texImage2D(..., gl.FLOAT, someFloat32Array);

// Three.js
const tex = new THREE.DataTexture(sdf, width, height, THREE.RGBAFormat);;
```

The output Float32Array has the distance from the shape in RGB channels:

```glsl
outColor = vec4(dist, dist, dist, 1.0);
```

`dist` is mapped to the range of `[-1, 1]`:

- If a pixel is outside the shape and is 10px away from the edge, `dist == 1.0`.
- If a pixel is at the edge of the shape, `dist == 0.0`.
- If a pixel is inside the shape and is 10px away from the edge, `dist == -1.0`.


### HTMLImageElement output

HTMLImageElement SDFs are useful for debug.
However, because HTMLImageElement cannot handle Float values, the SDF vales are mapped to `R` and `G` channel of the image.

```glsl
outColor = vec4(
    abs(dist),             // distance from edges
    dist > 0.0 ? 1.0 : 0.0,  // sign of the distance. if the pixel is outside
    0.0,
    1.0
);
```

- `R`: distance from edges.
  - The distance is mapped to the range of `[0, 1]`, according to the `spread` parameter.
  - e.g.) if `spread = 10`, pixels that are 10 pixel away from the edge will have `dist == 1.0`.
- `G`: sign of the distance.
  - If a pixel is outside of the shape `G` will be `1.0`, otherwise `0.0`.
  - If the `opts.signed == false`, `G` will always be 1.0.



## LICENSE

MIT
