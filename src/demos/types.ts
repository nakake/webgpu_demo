export type DemoInstance = {
    tick: (dt: number) => void;
    dispose?: () => void;
};

export type DemoFactory = (args: {
    device: GPUDevice;
    context: GPUCanvasContext;
    format: GPUTextureFormat;
}) => Promise<DemoInstance>;