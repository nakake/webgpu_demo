import type { DemoFactory } from "./types";

export const createComputeParticles: DemoFactory = async ({ device, context, format }) => {
    const COUNAT = 4096;
    const WORKGROUP_SIZE = 256;
    const RADIUS = 0.0125;
    const GRAVITY = 0.6;

    const BYTES_PER_PARTICLE = 4 * 4; // vec4<f32> x,y,vx,vy
    const size = COUNAT * BYTES_PER_PARTICLE;

    const makeStorage = () => device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });

    const ssboA = makeStorage();
    const ssboB = makeStorage();

    // 初期ランダムデータ
    {
        const data = new Float32Array(COUNAT * 4);

        for (let i = 0; i < COUNAT; i++) {
            const idx = i * 4;
            data[idx + 0] = (Math.random() * 1.6 - 0.8);
            data[idx + 1] = (Math.random() * 0.8 + 0.2);
            data[idx + 2] = (Math.random() * 0.8 - 0.3);
            data[idx + 3] = (Math.random() * 0.1 - 0.05);
        }
        device.queue.writeBuffer(ssboA, 0, data);
    }

    const uniformBuffer = device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const uniAB = new ArrayBuffer(32);
    const uniF = new Float32Array(uniAB);
    const uniU = new Uint32Array(uniAB);

    const computeCode = /* wgsl */`
struct Particle { pos: vec2<f32>, vel: vec2<f32> };
struct Particles { p: array<Particle> };

struct Sim {
    dt: f32,
    aspect: f32,
    gravity: f32,
    radius: f32,
    count: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
};

@group(0) @binding(0) var<storage, read>        particlesIn: Particles;
@group(0) @binding(1) var<storage, read_write>  particlesOut: Particles;
@group(0) @binding(2) var<uniform>              sim: Sim;

@compute @workgroup_size(${WORKGROUP_SIZE})
fn cs(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    if (i  >= sim.count) { return; }

    var p = particlesIn.p[i];

    // 重力
    p.vel.y = p.vel.y - sim.gravity * sim.dt;

    // 位置更新
    p.pos = p.pos + p.vel * sim.dt;

    // 画面端で反射
    let maxX = 1.0 - sim.radius * 1.0;
    let maxY = 1.0 - sim.radius * 1.0;

    if (p.pos.x < -maxX) { p.pos.x = -maxX; p.vel.x =  abs(p.vel.x) * 0.9; }
    if (p.pos.x >  maxX) { p.pos.x =  maxX; p.vel.x = -abs(p.vel.x) * 0.9; }

    if (p.pos.y < -maxY) { p.pos.y = -maxY; p.vel.y =  abs(p.vel.y) * 0.6; }
    if (p.pos.y >  maxY) { p.pos.y =  maxY; p.vel.y = -abs(p.vel.y) * 0.6; }

    particlesOut.p[i] = p;
}
`;

    const computeModule = device.createShaderModule({ code: computeCode });
    const computePipeline = device.createComputePipeline({
        layout: "auto",
        compute: { module: computeModule, entryPoint: "cs" }
    });

    const renderCode = /* wgsl */`
struct Particle { pos: vec2<f32>, vel: vec2<f32> };
struct Particles { p: array<Particle> };

struct Sim {
    dt: f32,
    aspect: f32,
    gravity: f32,
    radius: f32,
    count: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
};

@group(0) @binding(0) var<storage, read> particles: Particles;
@group(0) @binding(1) var<uniform> sim: Sim;

struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> };

@vertex
fn vs (@location(0) v: vec2<f32>, @builtin(instance_index) iid: u32) -> VSOut {
    let pos = particles.p[iid].pos;

    let offset = vec2<f32>(v.x * sim.radius / sim.aspect, v.y * sim.radius);
    var o: VSOut;

    o.pos = vec4<f32>(pos + offset, 0.0, 1.0);
    o.uv = v;

    return o;
}

@fragment
fn fs(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let d = length(uv);
    let alpha = smoothstep(1.0, 0.8, d);
    return vec4<f32>(0.3, 0.7, 1.0, alpha);
}
`;

    const renderModule = device.createShaderModule({ code: renderCode });

    const quad = new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1
    ]);

    const quadVB = device.createBuffer({
        size: quad.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(quadVB, 0, quad);

    const renderPipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: renderModule,
            entryPoint: "vs",
            buffers: [{ arrayStride: 4 * 2, attributes: [{ shaderLocation: 0, format: "float32x2", offset: 0 }] }]
        },
        fragment: {
            module: renderModule,
            entryPoint: "fs",
            targets: [{ format, blend: { color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" } } }]
        },
        primitive: { topology: "triangle-list", cullMode: "none" },
    });

    const makeBG = (inBuf: GPUBuffer, outBuf: GPUBuffer) => 
        device.createBindGroup({
            layout: computePipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: inBuf } },
                { binding: 1, resource: { buffer: outBuf } },
                { binding: 2, resource: { buffer: uniformBuffer } }
            ]
        });

    let bgA = makeBG(ssboA, ssboB);
    let bgB = makeBG(ssboB, ssboA);
    let readFromA = false; // false: A→B, true: B→A

    const makeDrawBG = (inBuf: GPUBuffer) => 
        device.createBindGroup({
            layout: renderPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: inBuf } },
                { binding: 1, resource: { buffer: uniformBuffer } }
            ]
        });

    let drawBG = makeDrawBG(ssboB);

    let time = 0;
    const  workGroups = Math.ceil(COUNAT / WORKGROUP_SIZE);

    function frame (dt: number) {
        time += dt;

        const canvas = context.getCurrentTexture().createView();
        const  aspect = (context as any)?.canvas?.width / (context as any)?.canvas?.height
            ? (context as any).canvas.width / (context as any).canvas.height
            : 16 / 9;

        uniF[0] = dt;
        uniF[1] = aspect;
        uniF[2] = GRAVITY;
        uniF[3] = RADIUS;
        uniU[4] = COUNAT;
        device.queue.writeBuffer(uniformBuffer, 0, uniAB);

        const encoder  = device.createCommandEncoder();

        // Compute Pass
        {
            const pass = encoder.beginComputePass();
            pass.setPipeline(computePipeline);
            pass.setBindGroup(0, readFromA ? bgB : bgA);
            pass.dispatchWorkgroups(workGroups);
            pass.end();
        }           

        const srcForDraw = readFromA ? ssboA : ssboB;
        drawBG = makeDrawBG(srcForDraw);
        readFromA = !readFromA;

        const pass = encoder.beginRenderPass({
            colorAttachments: [{ view: canvas, loadOp: "clear", storeOp: "store", clearValue: { r: 0.06, g: 0.07, b: 0.09, a: 1 } }]
        });

        pass.setPipeline(renderPipeline);
        pass.setVertexBuffer(0, quadVB);
        pass.setBindGroup(0, drawBG);
        pass.draw(6, COUNAT, 0, 0);
        pass.end();

        device.queue.submit([encoder.finish()]);
    }

    return {
        tick: frame,
        dispose() {
            ssboA.destroy();
            ssboB.destroy();
            quadVB.destroy();
            uniformBuffer.destroy();
        }
    };
}