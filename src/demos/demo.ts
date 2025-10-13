import { DemoFactory } from "./types";

export const createDemo: DemoFactory = async ({ device, context, format }) => {
    const code = /* wgsl */`
struct Params {
    time: f32,
    width: f32,
    height: f32,
    _pad: f32,
}
@group(0) @binding(0) var<uniform> params: Params;

fn ndc_to_uv(nbc: vec2<f32>) -> vec2<f32> {
    return 0.5 * (nbc +  vec2<f32>(1.0,  1.0));
}

@vertex
fn vs(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4<f32> {
    var pos = array<vec2<f32>, 3> (
        vec2<f32>(-1.0, -3.0),
        vec2<f32>( 3.0,  1.0),
        vec2<f32>(-1.0,  1.0)
    );
    let p = pos[vid];
    return vec4<f32>(p, 0.0, 1.0);
}

@fragment
fn fs1(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let res = vec2<f32>(params.width, params.height);
    let uv = pos.xy / res;
    let t = params.time;

    let p = uv * 2.0 - vec2<f32>(1.0, 1.0);
    let r = length(p);
    
    let c = smoothstep(1.0, 0.0, r);
    
    return vec4<f32>(c, c*c, 1.0 - c, 1.0);
}

fn rot(a: f32) -> mat2x2<f32> {
    let c = cos(a);
    let s = sin(a);
    return mat2x2<f32>(vec2<f32>(c, -s), vec2<f32>(s, c));
}

@fragment
fn fs2(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let res = vec2<f32>(params.width, params.height);
    let uv = pos.xy / res;
    var p = uv * 2.0 - vec2<f32>(1.0, 1.0);

    p = rot(params.time * 0.5) * p;
    let ang = atan2(p.y, p.x);
    let rad = length(p);

    let petals = 32.0;
    let v = 0.5 + 0.5 * cos(ang * petals);

    let col = vec3<f32>(v, 1.0 - v, 0.5  + 0.5 * sin(params.time + rad * 10.0));
    return vec4<f32>(col * (1.0 - rad), 1.0);
}
`;

    const module = device.createShaderModule({ code });

    const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: { module, entryPoint: "vs" },
        fragment: { module, entryPoint: "fs2", targets: [{ format }] },
        primitive: { topology: "triangle-list" }
    });

    const uniformSize = 16;
    const uniformBuffer = device.createBuffer({ size: uniformSize, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
    });

    function tick(dt: number) {
        const tmp = new Float32Array([dt, context.canvas.width, context.canvas.height, 0]);
        device.queue.writeBuffer(uniformBuffer, 0, tmp.buffer);

        const encoder = device.createCommandEncoder();
        const view = context.getCurrentTexture().createView();

        const pass = encoder.beginRenderPass({
            colorAttachments: [{ view, loadOp: "clear", storeOp: "store", clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 } }]
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3, 1, 0, 0);
        pass.end();

        device.queue.submit([encoder.finish()]);
    }

    return { tick, dispose() { } };
};