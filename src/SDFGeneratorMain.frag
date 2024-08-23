#version 300 es
precision highp float;

layout(std140, column_major) uniform;
uniform sampler2D src;
uniform sampler2D tex;
uniform vec2 resolution;
uniform float jump;
uniform float padding;
uniform int phase; // 0: scale, 1: jumping
uniform bool isFirstJump;
uniform float spread;
uniform bool isPositive;
uniform bool useUnsignedFormat;

in vec2 vUV;
out vec4 fragColor;

float getDist(vec2 offset) {
    return length(offset);
}

vec4 blend(vec4 c_src, vec4 c_dst) {
    vec3 c_out = c_src.rgb * c_src.a + c_dst.rgb * (1. - c_src.a) * c_dst.a;
    float alpha = c_src.a + (1. - c_src.a) * c_dst.a;
    return vec4(c_out, alpha);
}

vec4 readTex(sampler2D t, vec2 uv) {
    if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) {
        return vec4(0.);
    }
    return texture(t, uv);
}

vec4 readSrc(vec2 uv) {
    vec2 resolutionPadded = (resolution + padding * 2.);
    vec2 offset = padding / resolutionPadded;
    vec2 uv2 = (uv - offset) * (resolutionPadded / resolution);

    if (uv2.x < 0. || uv2.x > 1. || uv2.y < 0. || uv2.y > 1.) {
        return vec4(0);
    }

    return texture(src, uv2);
}

void drawJump(vec2 uv) {
    vec2 d = 1. / resolution;

    bool found = false;
    float bestDist = 999999.;
    vec2 bestUv;

    for (int x = -1; x < 2; x++) {
        for (int y = -1; y < 2; y++) {
            vec2 uv2 = uv + d * vec2(x, y) * jump;
            vec4 c = readTex(tex, uv2);
            if (c.a < 0.) {
                continue;
            }

            if (isPositive ? (c.a > 0.5) : (c.a <= 0.5)) {
                vec2 uv1 = isFirstJump ? uv2 : c.gb;
                vec2 uvOffset = uv - uv1;
                vec2 pxOffset = uvOffset * resolution;
                float dist = getDist(pxOffset);

                if (dist < bestDist) {
                    found = true;
                    bestDist = dist;
                    bestUv = uv1;
                }
            }
        }
    }

    if (found) {
        fragColor = vec4(bestDist, bestUv, isPositive ? 1.0 : 0.0);
    } else {
        fragColor = vec4(2.);
    }

    // Finished
    if (jump == 1.) {
        float alpha = readSrc(uv).a;
        bool isInside = isPositive ? alpha > 0.5 : alpha <= 0.5;

        float dist;
        if (isInside) {
            dist = 0.0; // inside
        }
        else if (found) {
            dist = clamp(bestDist, 0., spread) / spread;
        } else {
            dist = 1.0;
        }

        fragColor = vec4(dist, isInside ? 0. : 1., 0, 1.0);
    }
}

void main() {
    vec2 uv = vUV.st;

    if (phase == 0) {
        // Scale
        vec2 resolutionPadded = (resolution + padding * 2.);
        vec2 offset = padding / resolutionPadded;
        vec2 uv2 = (uv - offset) * (resolutionPadded / resolution);
        fragColor = readTex(tex, uv2);
        fragColor = vec4(length(fragColor.rgb));
    } else if (phase == 1) {
        drawJump(uv);
    }
}
