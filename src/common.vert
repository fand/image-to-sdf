#version 300 es
precision highp float;

layout(location = 0) in vec4 position;
layout(location = 1) in vec2 uv;
out vec2 vUV;

void main() {
    vUV = uv;
    gl_Position = position;
}
