import React, { useEffect, useRef, useState } from "react";
import { getDevice, getPreferredFormat } from "../webgpu/runtime";
import { loadDemo } from "../demos";
import type { DemoInstance } from "../demos/types";
import { useInViewport } from "../hooks/useInViewport";

type Props = {
    demoId: string;
    preview?: boolean;
};

export const WebGPUCanvas: React.FC<Props> = ({ demoId, preview }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const { ref: wrapperRef, visible } = useInViewport<HTMLDivElement>();
    const [status, setStatus] = useState("…");

    const [hover, setHover] = useState(false);

    useEffect(() => {
        let raf = 0;
        let demo: DemoInstance | null = null;
        let device: GPUDevice | null = null;
        let context: GPUCanvasContext | null = null;

        let running = false;

        const run = async () => {
            if (!visible) return;

            try {
                device = await getDevice();
            } catch (e) {
                setStatus("WebGPU未対応 or 初期化失敗");
                return;
            }

            const canvas = canvasRef.current!;
            context = canvas.getContext("webgpu")!;
            const format = getPreferredFormat();

            const configure = () => {
                const maxCSSWidth = preview ? 640 : canvas.clientWidth;
                const cssW = Math.min(canvas.clientWidth || maxCSSWidth, maxCSSWidth);
                const cssH = canvas.clientHeight || cssW * (9 / 16);

                const dpr = Math.min(window.devicePixelRatio ?? 1, preview ? 1.5 : 2);
                const width = Math.max(1, Math.floor(cssW * dpr));
                const height = Math.max(1, Math.floor(cssH * dpr));

                if (canvas.width !== width || canvas.height !== height) {
                    canvas.width = width;
                    canvas.height = height;
                }
                context!.configure({ device: device!, format, alphaMode: "opaque" });
            };
            configure();

            const factory = await loadDemo(demoId);
            demo = factory({ device: device!, context: context!, format });

            setStatus(preview ? "Preview" : "Rendering…");

            let t0 = performance.now();
            const tickOnce = () => {
                const t1 = performance.now();
                const dt = (t1 - t0) / 1000;
                t0 = t1;
                demo!.tick(dt);
            };

            if (preview && !hover) {
                tickOnce();
                return;
            }

            if (running) return;
            running = true;

            const loop = () => {
                tickOnce();
                raf = requestAnimationFrame(loop);
            };
            raf = requestAnimationFrame(loop);

            const onResize = () => configure();
            window.addEventListener("resize", onResize);

            return () => {
                window.removeEventListener("resize", onResize);
            };
        };

        const cleanupPromise = run();

        return () => {
            cancelAnimationFrame(raf);
            demo?.dispose?.();
            void cleanupPromise;
        };
    }, [demoId, preview, visible, hover]);

    return (
        <div
            ref={wrapperRef}
            className="canvasWrap"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            title={status}
        >
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
        </div>
    );
};
