import type { DemoFactory } from "./types";

export const createRotatingTriangle: DemoFactory = ({ device, context, format }) => {
    const code = /* wgsl */`
struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) color: vec3<f32> };
@vertex fn vs(@builtin(vertex_index) vid:u32, @location(0) ang:f32) -> VSOut {
  var p = array<vec2<f32>,3>(vec2(0.0,0.6), vec2(-0.52,-0.3), vec2(0.52,-0.3));
  let c = cos(ang); let s = sin(ang);
  let v = p[vid];
  let r = vec2(c*v.x - s*v.y, s*v.x + c*v.y);
  var col = array<vec3<f32>,3>(vec3(1.0,0.3,0.3), vec3(0.3,1.0,0.5), vec3(0.3,0.6,1.0));
  var o:VSOut; o.pos = vec4(r,0,1); o.color = col[vid]; return o; }
@fragment fn fs(@location(0) color: vec3<f32>) -> @location(0) vec4<f32> { return vec4(color,1); }
`;
    const module = device.createShaderModule({ code });
    const angleBuf = device.createBuffer({ size: 4 * 3, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: { module, entryPoint: "vs", buffers: [{ arrayStride: 4, attributes: [{ shaderLocation: 0, format: "float32", offset: 0 }] }] },
        fragment: { module, entryPoint: "fs", targets: [{ format }] },
        primitive: { topology: "triangle-list" }
    });

    let t = 0;
    return {
        tick(dt) {
            t += dt;
            device.queue.writeBuffer(angleBuf, 0, new Float32Array([t, t, t]));
            const enc = device.createCommandEncoder();
            const view = context.getCurrentTexture().createView();
            const pass = enc.beginRenderPass({ colorAttachments: [{ view, loadOp: "clear", storeOp: "store", clearValue: { r: .06, g: .07, b: .09, a: 1 } }] });
            pass.setPipeline(pipeline);
            pass.setVertexBuffer(0, angleBuf);
            pass.draw(3);
            pass.end();
            device.queue.submit([enc.finish()]);
        },
        dispose() { /* 必要ならリソース解放 */ }
    };
};
