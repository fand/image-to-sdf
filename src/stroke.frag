#version 300 es
precision highp float;

layout(std140, column_major) uniform;
uniform sampler2D src;
uniform sampler2D sdf;

uniform vec2 resolution;
uniform float padding;
uniform float spread;
uniform bool isSigned;

uniform OutlineOpts {
    float imageAlpha;
    float strokeWidth;
    vec4 strokeColor;
    vec2 shadowOffset;
    float shadowWidth;
    vec4 shadowColor;
};

in vec3 vPosition;
in vec2 vUV;

out vec4 fragColor;

// Both input and output are straight (unpremultiplied) colors.
vec4 blend(vec4 c_src, vec4 c_dst) {
    vec3 c_out = c_src.rgb * c_src.a + c_dst.rgb * (1. - c_src.a) * c_dst.a;
    float alpha = c_src.a + (1. - c_src.a) * c_dst.a;

    if (alpha != 0.) {
        c_out /= alpha;
    }

    return vec4(c_out, alpha);
}

float readSDF(vec2 uv) {
    vec2 resolutionPadded = (resolution + padding * 2.);
    vec2 offset = padding / resolutionPadded;
    vec2 uv2 = uv / (resolutionPadded / resolution) + offset;

    if (uv2.x < 0. || uv2.x > 1. || uv2.y < 0. || uv2.y > 1.) {
        return spread; // outside of image must be distance = 1.0
    }

    // SDF texture is straight (unpremultiplied)
    // The range of d is [-1, 1] (signed) or [0, 1] (unsigned).
    float d = texture(sdf, uv2).r;
    return abs(d) * spread;
}

void main() {
    vec2 uv = vUV.st;

    vec4 color = vec4(1);
    // vec4 color = vec4(1, 0, 0, 1);

    // float d = readSDF(uv);
    // // fragColor = fract(d * 10.) * vec4(1);
    // fragColor = fract(abs(d) / spread * 3.) * (d > 0. ? vec4(1, 0, 0, 1) : vec4(0, 0, 1, 1));
    // fragColor = blend(fragColor, vec4(0, 0, 0, 1));
    // return;

    // Drop shadow
    float d1 = readSDF(vUV.st - shadowOffset / resolution);
    float shadowAlpha =
        smoothstep(shadowWidth, shadowWidth * 0., d1);
    if (d1 == min(shadowWidth, spread)) {
        shadowAlpha = 0.;
    }
    if (d1 == 0.) {
        shadowAlpha = isSigned ? 0. : 1.;
    }

    vec4 cShadow = shadowColor;
    cShadow.a *= shadowAlpha;
    color = blend(cShadow, color);

    // Outline
    float d2 = readSDF(uv); // use linear value
    vec4 cOutline = smoothstep(strokeWidth, strokeWidth * 0.3, d2) * strokeColor;
    // if (d2 == 0.) {
    //     cOutline *= 0.;
    // }
    color = blend(cOutline, color);

    // Original image
    vec4 c0 = texture(src, uv);
    c0.a *= imageAlpha;
    color = blend(c0, color);

    fragColor = color;
}
