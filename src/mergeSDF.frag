#version 300 es
precision highp float;
layout(std140, column_major) uniform;
uniform sampler2D tex1;
uniform sampler2D tex2;
uniform bool useUnsignedFormat;
in vec2 vUV;
out vec4 fragColor;

void main() {
    vec4 c1 = texture(tex1, vUV);
    vec4 c2 = texture(tex2, vUV);

    // Compose
    float d = c1.x * c1.y + c2.x * c2.y;

    if (useUnsignedFormat) {
        fragColor = vec4(abs(d), c1.y, 0, 1);
    } else {
        fragColor = vec4(d, d, d, 1);
    }
}
