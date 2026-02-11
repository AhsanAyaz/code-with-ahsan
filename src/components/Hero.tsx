"use client";

import Link from "next/link";
import { ArrowRight, Terminal, Code, Cpu } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden border-b border-base-300">
      {/* Background Grid & Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-base-100 via-transparent to-base-100"></div>

      {/* Animated Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse delay-1000"></div>

      <div className="relative z-[1] grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full px-4 sm:px-8 md:px-12 lg:px-16">
        {/* Text Content */}
        <div className="space-y-8">
          <a
            href="https://leanpub.com/mastering-angular-signals/c/GO2026"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-mono"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            Featured: Mastering Angular Signals (book)
          </a>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight text-base-content">
            Build with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-base-content to-secondary animate-gradient-x">
              Precision
            </span>
          </h1>

          <p className="text-xl text-base-content/70 max-w-lg leading-relaxed">
            Master AI & Modern Web Development with Muhammad Ahsan Ayaz. Google
            Developer Expert in AI & Angular, Speaker, and Award-Winning
            Educator.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href="/courses">
              <button className="btn btn-primary btn-lg">
                Start Learning
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
            </Link>
            <Link href="/about">
              <button className="btn btn-outline btn-lg">About Me</button>
            </Link>
          </div>

          <div className="pt-8 flex items-center gap-8 text-base-content/60 font-mono text-sm">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-secondary" />
              <span>100+ Tutorials</span>
            </div>
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-primary" />
              <span>50k+ Students</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-accent" />
              <span>13+ Years Exp</span>
            </div>
          </div>
        </div>

        {/* Visual Element / Code Block */}
        <div className="relative hidden lg:block">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-30"></div>
          <div className="relative bg-base-200 border border-base-300 rounded-lg p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4 border-b border-base-300 pb-4">
              <div className="w-3 h-3 rounded-full bg-error"></div>
              <div className="w-3 h-3 rounded-full bg-warning"></div>
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <span className="ml-2 text-xs text-base-content/50 font-mono">
                ahsan.tsx
              </span>
            </div>

            <pre className="font-mono text-sm leading-relaxed text-base-content">
              <code className="block">
                <span className="text-secondary">const</span>{" "}
                <span className="text-primary">Developer</span> = {"{"}
                {"\n"} name:{" "}
                <span className="text-accent">
                  &quot;Muhammad Ahsan Ayaz&quot;
                </span>
                ,{"\n"} role:{" "}
                <span className="text-accent">
                  &quot;Software Architect&quot;
                </span>
                ,{"\n"} skills: [{"\n"}{" "}
                <span className="text-accent">
                  &nbsp;&nbsp;&quot;Angular&quot;
                </span>
                ,{"\n"}{" "}
                <span className="text-accent">
                  &nbsp;&nbsp;&quot;React&quot;
                </span>
                ,{"\n"}{" "}
                <span className="text-accent">
                  &nbsp;&nbsp;&quot;Node.js&quot;
                </span>
                ,{"\n"}{" "}
                <span className="text-accent">
                  &nbsp;&nbsp;&quot;Architecture&quot;
                </span>
                {"\n"} ],
                {"\n"} mission: <span className="text-secondary">async</span> (){" "}
                {"=> {"} {"\n"}{" "}
                <span className="text-secondary">&nbsp;&nbsp;await</span>{" "}
                <span className="text-primary">empowerCommunity</span>();
                {"\n"}{" "}
                <span className="text-secondary">&nbsp;&nbsp;return</span>{" "}
                <span className="text-accent">
                  &quot;Developers Enabled&quot;
                </span>
                ;{"\n"} {"}"}
                {"\n"}
                {"}"}
              </code>
            </pre>

            {/* Floating Badge */}
            <a
              href="https://g.dev/ahsanayaz"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute -bottom-6 -right-6 bg-base-100 border border-primary p-4 rounded-lg shadow-lg flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="static/images/gde_logo_brackets.png"
                  alt="GDE"
                  className="w-10 h-10 object-contain"
                />
              </div>
              <div>
                <div className="text-xs text-base-content/60 font-mono">
                  AI & Angular
                </div>
                <div className="font-bold text-base-content">
                  Google Developers Expert
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
