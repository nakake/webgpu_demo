import React from "react";
import { Link } from "react-router-dom";
import { DEMOS } from "../data/demos";
import { WebGPUCanvas } from "../components/WebGPUCanvas";


export default function Home() {
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
                        >
                            <h3>{d.title}</h3>
                            <p>{d.description}</p>
                            <WebGPUCanvas demoId={d.id} preview />

                        </Link>
                    ))}
                </div>
            </main>
        </>
    );
}