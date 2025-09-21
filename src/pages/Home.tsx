import React, { useState } from "react";
import { Link } from "react-router-dom";
import { DEMOS } from "../data/demos";
import { WebGPUCanvas } from "../components/WebGPUCanvas";


export default function Home() {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    return (
        <>
            <header>
                <div className="container">
                    <h1>WebGPU Demos</h1>
                    <p>React + Vite + GitHub Pages</p>
                </div>
            </header>
            <main className="container">
                <div className="grid">
                    {DEMOS.map((d) => (
                        <Link
                            key={d.id}
                            to={`/detail/${d.id}`}
                            className="card"
                            style={{ textDecoration: "none", color: "inherit" }}
                            onMouseEnter={() => setHoveredId(d.id)}
                            onMouseLeave={() => setHoveredId((cur) => cur === d.id ? null : cur)}
                            onFocus={() => setHoveredId(d.id)}
                            onBlur={() => setHoveredId((cur) => cur === d.id ? null : cur)}
                        >
                            <h3>{d.title}</h3>
                            <p>{d.description}</p>
                            <WebGPUCanvas demoId={d.id} preview active={hoveredId === d.id} />
                        </Link>
                    ))}
                </div>
            </main>
        </>
    );
}
