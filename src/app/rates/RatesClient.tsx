"use client";

import { useState, useMemo, useEffect } from "react";
import LegitMarkdown from "@/components/LegitMarkdown";
import ResourcesLinks from "@/components/ResourcesLinks";
import confetti from "canvas-confetti";
import { 
  Plus, 
  Minus, 
  Check, 
  Sparkles, 
  Calculator, 
  Mail, 
  Calendar, 
  Send, 
  ArrowRight, 
  Info, 
  ShieldCheck, 
  CheckCircle,
  Flame, 
  Award,
  Video,
  Instagram,
  Linkedin,
  MessageSquare,
  FileText,
  Percent,
  TrendingUp,
  Sliders,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CREDENTIAL_PILLS = [
  "Google Developer Expert — AI and Angular",
  "4 published books",
  "13M+ library installs",
  "50+ conference talks",
  "Flat fee only — no commissions",
];

// Updated Stats to represent full 180,000+ developer reach including B2B channels like LinkedIn!
const STATS = [
  { label: "YouTube", value: "35.5k+", sub: "Subscribers" },
  { label: "Instagram", value: "64k+", sub: "Followers" },
  { label: "LinkedIn", value: "23k+", sub: "Followers (Premium B2B)" },
  { label: "Newsletter", value: "2,100+", sub: "Subscribers" },
  { label: "Discord", value: "4,400+", sub: "Developer Members" },
  { label: "TikTok", value: "9k+", sub: "Followers" },
];

interface DeliverableConfig {
  id: string;
  category: string;
  name: string;
  price: number;
  description: string;
  unit: string;
}

const DELIVERABLES: DeliverableConfig[] = [
  // YouTube
  { id: "youtubeDedicated5to10", category: "YouTube", name: "Dedicated Video (5-10 min)", price: 2500, description: "Full-length review, tutorial, or real-world integration.", unit: "video" },
  { id: "youtubeDedicated20to30", category: "YouTube", name: "Dedicated Video (20-30 min)", price: 3000, description: "Deep-dive thorough research, project building & tutorial.", unit: "video" },
  { id: "youtubeIntegration", category: "YouTube", name: "Video Mention / Integration (60-90s)", price: 1500, description: "Authentic shoutout/segment within a high-view tutorial.", unit: "segment" },
  { id: "youtubeShort", category: "YouTube", name: "YouTube Short (Up to 60s)", price: 900, description: "Quick vertical video featuring your product.", unit: "short" },
  // Instagram
  { id: "instagramReel", category: "Instagram", name: "Instagram Reel (Up to 90s)", price: 1200, description: "High-reach vertical video with link in bio and collaborator tag.", unit: "reel" },
  { id: "instagramCarousel", category: "Instagram", name: "Static Post / Carousel", price: 950, description: "Visual slider explaining a technical concept or launch.", unit: "carousel" },
  { id: "instagramStories", category: "Instagram", name: "Stories Set (3x with link sticker)", price: 750, description: "Direct B2C traffic driver with interactive link stickers.", unit: "story set" },
  // LinkedIn
  { id: "linkedinPost", category: "LinkedIn", name: "B2B Post (Text + Image/Video)", price: 1200, description: "Premium reach to software architects, engineering leads.", unit: "post" },
  { id: "linkedinArticle", category: "LinkedIn", name: "Co-Authored Long Article", price: 1500, description: "Thought-leadership B2B technical piece on LinkedIn.", unit: "article" },
  // TikTok
  { id: "tiktokVideo", category: "TikTok", name: "TikTok Video (Up to 60s)", price: 700, description: "Short trend-driven developer-focused content.", unit: "video" },
  // Newsletter & Community
  { id: "newsletter", category: "Community", name: "Newsletter Feature Slot", price: 500, description: "Dedicated section in Code with Ahsan newsletter (2,100+ devs).", unit: "slot" },
  { id: "discord", category: "Community", name: "Discord Announcement + Pinned", price: 400, description: "Sponsored announcement in Discord server (4,400+ members) + 7 days pinned.", unit: "announcement" },
];

const LICENSING_OPTIONS = [
  { id: "organic", name: "12-Month Organic (Included)", multiplier: 0, description: "Standard organic posting with brand resharing." },
  { id: "paid3m", name: "3-Month Paid Ads Whitelisting (+40%)", multiplier: 0.4, description: "Use content for paid social ads for 3 months." },
  { id: "paid6m", name: "6-Month Paid Ads Whitelisting (+75%)", multiplier: 0.75, description: "Use content for paid social ads for 6 months." },
  { id: "perpetualOrganic", name: "Perpetual Organic (+75%)", multiplier: 0.75, description: "Lifetime organic usage rights (no paid ads)." },
  { id: "buyout", name: "Full Buyout (+150%)", multiplier: 1.5, description: "Lifetime paid and organic rights in any medium." },
];

export default function RatesClient({ post }: { post: any }) {
  // 1. Calculator State
  const [quantities, setQuantities] = useState<Record<string, number>>({
    youtubeDedicated5to10: 0,
    youtubeDedicated20to30: 0,
    youtubeIntegration: 0,
    youtubeShort: 0,
    instagramReel: 0,
    instagramCarousel: 0,
    instagramStories: 0,
    linkedinPost: 0,
    linkedinArticle: 0,
    tiktokVideo: 0,
    newsletter: 0,
    discord: 0,
  });

  const [licensing, setLicensing] = useState<string>("organic");
  const [rawFootage, setRawFootage] = useState<boolean>(false);
  const [exclusivity, setExclusivity] = useState<boolean>(false);
  
  // Selected preset package track
  const [preset, setPreset] = useState<string>("custom");
  const [activeTab, setActiveTab] = useState<string>("All");

  // 2. Proposal Form State
  const [brandName, setBrandName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [targetMonth, setTargetMonth] = useState("");
  const [productBrief, setProductBrief] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mailtoUrl, setMailtoUrl] = useState("");

  // Set quantities according to preset packages
  const applyPreset = (presetName: string) => {
    setPreset(presetName);
    const newQuantities = {
      youtubeDedicated5to10: 0,
      youtubeDedicated20to30: 0,
      youtubeIntegration: 0,
      youtubeShort: 0,
      instagramReel: 0,
      instagramCarousel: 0,
      instagramStories: 0,
      linkedinPost: 0,
      linkedinArticle: 0,
      tiktokVideo: 0,
      newsletter: 0,
      discord: 0,
    };

    if (presetName === "instagram_launch") {
      newQuantities.instagramReel = 1;
      newQuantities.instagramStories = 1;
    } else if (presetName === "growth") {
      newQuantities.youtubeDedicated5to10 = 2;
    } else if (presetName === "authority") {
      newQuantities.youtubeDedicated5to10 = 3;
      newQuantities.newsletter = 1;
      newQuantities.discord = 1;
    }

    setQuantities(newQuantities);
    setLicensing("organic");
    setRawFootage(false);
    setExclusivity(false);
  };

  // Change quantity and break the preset if custom edits are made
  const adjustQuantity = (id: string, delta: number) => {
    setPreset("custom");
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, prev[id] + delta),
    }));
  };

  // 3. Dynamic Cost Calculations
  const calculations = useMemo(() => {
    let basePrice = 0;
    
    // Calculate total base cost
    if (preset === "instagram_launch") {
      basePrice = 1850; // Discounted preset base price (A la carte: $1,950)
    } else if (preset === "growth") {
      basePrice = 4750; // Discounted preset base price (A la carte: $5,000)
    } else if (preset === "authority") {
      basePrice = 6400; // Discounted preset base price (A la carte: $8,400)
    } else {
      DELIVERABLES.forEach((item) => {
        basePrice += (quantities[item.id] || 0) * item.price;
      });
    }

    // Licensing multiplier
    const selectedLicense = LICENSING_OPTIONS.find((l) => l.id === licensing);
    const licensingMultiplier = selectedLicense ? selectedLicense.multiplier : 0;

    // Custom multipliers
    const exclusivityMultiplier = exclusivity ? 0.25 : 0;
    const rawFootageMultiplier = rawFootage ? 0.40 : 0;

    // Complete add-ons surcharge
    const totalAddOnMultiplier = licensingMultiplier + exclusivityMultiplier + rawFootageMultiplier;
    const addOnsPrice = basePrice * totalAddOnMultiplier;
    
    const subtotal = basePrice + addOnsPrice;

    // Dynamic Volume Discounting
    let discountPercent = 0;
    let unlockedTier = "none";
    
    // Only apply volume discount for custom mix campaigns
    if (preset === "custom" && subtotal > 0) {
      if (subtotal >= 8000) {
        discountPercent = 0.15;
        unlockedTier = "Platinum";
      } else if (subtotal >= 5000) {
        discountPercent = 0.10;
        unlockedTier = "Gold";
      } else if (subtotal >= 3000) {
        discountPercent = 0.05;
        unlockedTier = "Silver";
      }
    }

    const discountAmount = subtotal * discountPercent;
    const totalPrice = subtotal - discountAmount;
    
    // Savings calculation
    let totalSavings = discountAmount;
    if (preset === "instagram_launch") totalSavings += 100;
    if (preset === "growth") totalSavings += 250;
    if (preset === "authority") totalSavings += 2000;

    // Check progress to next tier (if custom)
    let nextTierRequired = 0;
    let nextTierPercent = 0;
    if (preset === "custom") {
      if (subtotal < 3000) {
        nextTierRequired = 3000 - subtotal;
        nextTierPercent = (subtotal / 3000) * 100;
      } else if (subtotal < 5000) {
        nextTierRequired = 5000 - subtotal;
        nextTierPercent = ((subtotal - 3000) / 2000) * 100;
      } else if (subtotal < 8000) {
        nextTierRequired = 8000 - subtotal;
        nextTierPercent = ((subtotal - 5000) / 3000) * 100;
      }
    }

    return {
      basePrice,
      addOnsPrice,
      subtotal,
      discountPercent,
      discountAmount,
      totalPrice,
      totalSavings,
      unlockedTier,
      nextTierRequired,
      nextTierPercent,
      hasDeliverables: basePrice > 0,
    };
  }, [quantities, licensing, rawFootage, exclusivity, preset]);

  // Categories list
  const categories = ["All", "YouTube", "Instagram", "LinkedIn", "Community"];

  // Filter deliverables
  const filteredDeliverables = useMemo(() => {
    if (activeTab === "All") return DELIVERABLES;
    if (activeTab === "Instagram") {
      return DELIVERABLES.filter((d) => d.category === "Instagram" || d.category === "TikTok");
    }
    return DELIVERABLES.filter((d) => d.category === activeTab);
  }, [activeTab]);

  // 4. Handle Proposal Email Generation via API and Resend!
  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName || !contactEmail || !contactName) return;

    setIsSubmitting(true);
    setSubmitError(null);

    // List of selected deliverables with quantities and individual prices
    const selectedDeliverables = DELIVERABLES.filter((d) => quantities[d.id] > 0)
      .map((d) => ({
        id: d.id,
        name: d.name,
        price: d.price,
        quantity: quantities[d.id],
      }));

    const selectedLicenseObj = LICENSING_OPTIONS.find((l) => l.id === licensing);
    const licenseText = selectedLicenseObj ? selectedLicenseObj.name : "12-Month Organic (Included)";

    // Pre-calculate structured backup email body in case of network failures
    const selectedList = DELIVERABLES.filter((d) => quantities[d.id] > 0)
      .map((d) => `  - ${quantities[d.id]}x ${d.name} ($${d.price} each)`)
      .join("\n");

    const emailSubject = encodeURIComponent(`Collaboration Proposal: ${brandName} — $${calculations.totalPrice.toLocaleString()}`);
    let emailBody = `Hi Ahsan,\n\n`;
    emailBody += `I hope you're doing well.\n\n`;
    emailBody += `We visited your rates card at codewithahsan.dev/rates and custom-built a proposed campaign using your interactive planner. We would love to collaborate with you to reach your highly targeted audience of senior engineers and B2B developers!\n\n`;
    emailBody += `=== 🚀 PROPOSED CAMPAIGN BRIEF ===\n`;
    emailBody += `Brand / Product Name: ${brandName}\n`;
    emailBody += `Contact Person: ${contactName}\n`;
    emailBody += `Contact Email: ${contactEmail}\n`;
    emailBody += `Target Launch Window: ${targetMonth || "Not Selected"}\n`;
    if (productBrief) {
      emailBody += `Campaign / Product Goals: ${productBrief}\n`;
    }
    emailBody += `\n`;
    emailBody += `=== 📦 DELIVERABLES SELECTED ===\n`;
    if (preset !== "custom") {
      emailBody += `Preset Package Selected: ${preset.toUpperCase()} (Base Package Price Discount Applied)\n`;
    }
    emailBody += `${selectedList || "  - Custom pricing selected below"}\n\n`;
    emailBody += `=== ⚙️ LICENSE & ADD-ONS ===\n`;
    emailBody += `- Content Usage Licensing: ${licenseText}\n`;
    emailBody += `- Raw Footage Delivery: ${rawFootage ? "Yes (+40%)" : "No"}\n`;
    emailBody += `- Direct Category Exclusivity: ${exclusivity ? "Yes (+25%)" : "No"}\n\n`;
    emailBody += `=== 💰 DYNAMIC FINANCIAL ESTIMATE ===\n`;
    emailBody += `- Deliverables Base: $${calculations.basePrice.toLocaleString()}\n`;
    emailBody += `- Licensing & Add-on Surcharges: +$${calculations.addOnsPrice.toLocaleString()}\n`;
    emailBody += `- Subtotal: $${calculations.subtotal.toLocaleString()}\n`;
    if (calculations.totalSavings > 0) {
      emailBody += `- Unlocked Savings / Package Discounts: -$${calculations.totalSavings.toLocaleString()}\n`;
    }
    emailBody += `👉 PROPOSED INVESTMENT: $${calculations.totalPrice.toLocaleString()}\n\n`;
    emailBody += `Please let us know your availability so we can lock in the schedule and start collaborating!\n\n`;
    emailBody += `Best regards,\n`;
    emailBody += `${contactName}\n`;

    const generatedMailtoUrl = `mailto:ahsan.ubitian@gmail.com?subject=${emailSubject}&body=${encodeURIComponent(emailBody)}`;
    setMailtoUrl(generatedMailtoUrl);

    try {
      const response = await fetch('/api/sponsorship', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandName,
          contactName,
          contactEmail,
          targetMonth,
          productBrief,
          selectedDeliverables,
          licensing: licenseText,
          rawFootage,
          exclusivity,
          basePrice: calculations.basePrice,
          addOnsPrice: calculations.addOnsPrice,
          subtotal: calculations.subtotal,
          discountAmount: calculations.discountAmount,
          totalPrice: calculations.totalPrice,
          preset,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit proposal brief.');
      }

      // Fire premium confetti explosion
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#9B00D9", "#4F46E5", "#10B981", "#3B82F6"],
      });

      setFormSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting campaign proposal:', error);
      setSubmitError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-padding relative">
      {/* === HERO === */}
      <header className="mb-14 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-4 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" /> High-impact Sponsor Deck
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold mb-4 leading-tight bg-gradient-to-r from-white via-gray-200 to-purple-400 bg-clip-text text-transparent">
          Reach 180,000+ developers who build for a living
        </h1>
        <p className="text-lg text-gray-300 max-w-4xl mx-auto mb-8 leading-relaxed">
          Muhammad Ahsan Ayaz&apos;s developer ecosystem targets software architects, team leads, and developer advocates. 
          As a Google Developer Expert in AI and Angular with 13M+ open-source installs, his audience consists of professional tech decision makers. 
          Past collaborations include market leaders like <a href="https://airia.com" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-white transition-colors underline underline-offset-4">Airia</a>,{" "}
          <a href="https://kimi.com" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-white transition-colors underline underline-offset-4">Kimi (Moonshot AI)</a>, and{" "}
          <a href="https://cloudways.com" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-white transition-colors underline underline-offset-4">Cloudways</a>.
        </p>
        
        {/* Accessible Credential pills with excellent legibility */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-10 max-w-3xl mx-auto">
          {CREDENTIAL_PILLS.map((pill) => (
            <span
              key={pill}
              className="px-4 py-2 rounded-full border border-purple-500/30 bg-purple-950/40 text-purple-200 text-xs font-semibold tracking-wide"
            >
              {pill}
            </span>
          ))}
        </div>

        {/* CRITICAL UX FIX: Primary above-the-fold CTA buttons leading direct to builder funnel */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14 max-w-xl mx-auto">
          <button
            onClick={() => {
              const calcEl = document.getElementById("planner-section");
              if (calcEl) {
                calcEl.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#9B00D9] text-white font-extrabold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-purple-600/30 text-sm cursor-pointer"
          >
            <Sliders className="w-4 h-4" /> Build Your Campaign Plan
          </button>
          <a
            href="https://calendar.app.google/Z6g5dMyczq25hmjYA"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 border border-purple-500/30 bg-purple-500/10 text-purple-200 font-extrabold rounded-xl hover:bg-purple-500/20 transition-all text-sm"
          >
            <Calendar className="w-4 h-4" /> Book a Consultation
          </a>
        </div>

        {/* Stats grid with glowing accessible values and crisp text labels */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 rounded-2xl p-4 text-center border border-white/10 hover:border-purple-500/40 transition-all hover:scale-[1.03] duration-300 backdrop-blur"
            >
              <div className="text-2xl sm:text-3xl font-extrabold text-purple-300">{stat.value}</div>
              <div className="text-sm font-bold mt-1 text-white">{stat.label}</div>
              <div className="text-xs text-gray-300 mt-1 leading-tight">{stat.sub}</div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          Currently accepting only 4 brand partnerships per month for Q2/Q3 2026
        </div>
      </header>

      {/* === WHY MY AUDIENCE? PERFORMANCE METRICS === */}
      <section className="mb-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-2 text-center text-white">Why Collaborate With Ahsan?</h2>
        <p className="text-center text-gray-400 text-sm mb-8">Audience trust, organic longevity, and verified metrics</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Growth Momentum", value: "35,500+ Subs", sub: "+70% organic subscriber growth in last 16 months" },
            { label: "Total Channel Views", value: "2.76 Million", sub: "Deep technical catalog of 878 high-quality videos" },
            { label: "Unrivaled Engagement", value: "8m 8s Duration", sub: "Average video watch time (Last 90 days) — high retention" },
            { label: "Evergreen Authority", value: "675k+ Views", sub: "Top Angular Crash Course — continues generating 50+ views/hr" },
            { label: "High Interaction Rates", value: "2.1% – 4.5%", sub: "High like/comment metrics on custom tech tutorials" },
            { label: "Content Lifespan", value: "12–18+ Months", sub: "Search-driven tutorials continue driving traffic long-term" },
          ].map((item) => (
            <div key={item.label} className="bg-white/5 rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all">
              <div className="text-xl font-bold text-purple-300">{item.value}</div>
              <div className="text-sm font-semibold mt-1 text-white">{item.label}</div>
              <div className="text-xs text-gray-300 mt-1">{item.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* === INTERACTIVE BUILDER === */}
      <section id="planner-section" className="max-w-6xl mx-auto mb-16 relative scroll-mt-24">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-white mb-2">Campaign Budget & Deliverable Planner</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm">
            Select a package preset below or design a custom campaign in real-time. Uncharge-free dynamic volume discounts are automatically applied.
          </p>
        </div>

        {/* 1. Preset Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => applyPreset("custom")}
            className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between h-40 group ${
              preset === "custom"
                ? "border-purple-500 bg-purple-500/5 shadow-lg shadow-purple-500/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <Sliders className={`w-6 h-6 ${preset === "custom" ? "text-purple-300" : "text-gray-400"}`} />
                {preset === "custom" && <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
              </div>
              <h3 className="font-bold text-white mt-3">Fully Custom Mix</h3>
              <p className="text-xs text-gray-400 mt-1">Pick specific platforms and deliverables. Unlocks tier discounts.</p>
            </div>
            <span className="text-xs font-semibold text-purple-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Build from scratch <ArrowRight className="w-3 h-3" />
            </span>
          </button>

          <button
            onClick={() => applyPreset("instagram_launch")}
            className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between h-40 group ${
              preset === "instagram_launch"
                ? "border-purple-500 bg-purple-500/5 shadow-lg shadow-purple-500/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <Instagram className={`w-6 h-6 ${preset === "instagram_launch" ? "text-purple-300" : "text-gray-400"}`} />
                {preset === "instagram_launch" && <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
              </div>
              <h3 className="font-bold text-white mt-3">Instagram Launch</h3>
              <p className="text-xs text-gray-400 mt-1">Best for product launches on Instagram. 1x Reel + 1x Stories.</p>
            </div>
            <span className="text-xs font-semibold text-purple-300 flex items-center gap-1">
              $1,850 <span className="text-[10px] text-green-400 line-through">$1,950</span>
            </span>
          </button>

          <button
            onClick={() => applyPreset("growth")}
            className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between h-40 group ${
              preset === "growth"
                ? "border-purple-500 bg-purple-500/5 shadow-lg shadow-purple-500/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <Video className={`w-6 h-6 ${preset === "growth" ? "text-purple-300" : "text-gray-400"}`} />
                <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold uppercase">Popular</span>
              </div>
              <h3 className="font-bold text-white mt-3">Growth Scale</h3>
              <p className="text-xs text-gray-400 mt-1">Evergreen organic lead-gen. 2x Dedicated YouTube Videos.</p>
            </div>
            <span className="text-xs font-semibold text-purple-300 flex items-center gap-1">
              $4,750 <span className="text-[10px] text-green-400 line-through">$5,000</span>
            </span>
          </button>

          <button
            onClick={() => applyPreset("authority")}
            className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between h-40 group ${
              preset === "authority"
                ? "border-purple-500 bg-purple-500/5 shadow-lg shadow-purple-500/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <Award className={`w-6 h-6 ${preset === "authority" ? "text-purple-300" : "text-gray-400"}`} />
                {preset === "authority" && <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
              </div>
              <h3 className="font-bold text-white mt-3">Omni Authority</h3>
              <p className="text-xs text-gray-400 mt-1">Multi-channel dominance. 3x YouTube + News + Discord.</p>
            </div>
            <span className="text-xs font-semibold text-purple-300 flex items-center gap-1">
              $6,400 <span className="text-[10px] text-green-400 line-through">$8,400</span>
            </span>
          </button>
        </div>

        {/* 2. Main Builder Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left panel: Inputs */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Category tabs */}
            <div className="bg-white/5 p-1.5 rounded-xl border border-white/10 flex flex-wrap gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === cat
                      ? "bg-[#9B00D9] text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Deliverables selectors list */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-5">
              <h3 className="text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-400" /> 1. Select Deliverables
              </h3>
              
              <div className="divide-y divide-white/5 space-y-4">
                {filteredDeliverables.map((item, index) => {
                  const qty = quantities[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className={`pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        qty > 0 ? "opacity-100" : "opacity-75 hover:opacity-90"
                      }`}
                    >
                      <div className="max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            {item.category}
                          </span>
                          <span className="text-sm font-bold text-white">{item.name}</span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1">{item.description}</p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 min-w-[200px]">
                        <span className="text-sm font-bold text-gray-100">${item.price.toLocaleString()}</span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => adjustQuantity(item.id, -1)}
                            disabled={qty === 0}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                              qty > 0
                                ? "border-white/20 bg-white/5 text-white hover:bg-white/10"
                                : "border-white/5 bg-transparent text-gray-600 cursor-not-allowed"
                            }`}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          
                          <span className={`w-8 text-center font-bold text-sm ${qty > 0 ? "text-purple-300" : "text-gray-400"}`}>
                            {qty}
                          </span>
                          
                          <button
                            onClick={() => adjustQuantity(item.id, 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Licensing Options */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-5">
              <h3 className="text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" /> 2. Content Licensing Tiers
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                {LICENSING_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 justify-between ${
                      licensing === opt.id
                        ? "border-purple-500 bg-purple-500/5"
                        : "border-white/10 bg-transparent hover:bg-white/5"
                    }`}
                  >
                    <div className="flex gap-3">
                      <input
                        type="radio"
                        name="licensing"
                        value={opt.id}
                        checked={licensing === opt.id}
                        onChange={() => setLicensing(opt.id)}
                        className="mt-1 radio radio-primary radio-sm cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-bold text-white block">{opt.name}</span>
                        <span className="text-xs text-gray-300 mt-0.5 block">{opt.description}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 4. Campaign Extras */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-5">
              <h3 className="text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" /> 3. Campaign Enhancements
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Exclusivity */}
                <label
                  className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                    exclusivity
                      ? "border-purple-500 bg-purple-500/5"
                      : "border-white/10 bg-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start gap-3 justify-between w-full">
                    <div>
                      <span className="text-sm font-bold text-white block">Category Exclusivity</span>
                      <span className="text-xs text-gray-300 mt-1 block">
                        Ensures Ahsan does not partner with any direct competitor during your campaign.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={exclusivity}
                      onChange={(e) => setExclusivity(e.target.checked)}
                      className="checkbox checkbox-primary checkbox-sm mt-0.5 cursor-pointer"
                    />
                  </div>
                  <span className="text-xs font-bold text-purple-300 mt-3 block">+25% of base rate</span>
                </label>

                {/* Raw Footage */}
                <label
                  className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                    rawFootage
                      ? "border-purple-500 bg-purple-500/5"
                      : "border-white/10 bg-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start gap-3 justify-between w-full">
                    <div>
                      <span className="text-sm font-bold text-white block">Raw Video Footage</span>
                      <span className="text-xs text-gray-300 mt-1 block">
                        Get all unedited raw files and B-rolls. Perfect for editing internal ad creative assets.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={rawFootage}
                      onChange={(e) => setRawFootage(e.target.checked)}
                      className="checkbox checkbox-primary checkbox-sm mt-0.5 cursor-pointer"
                    />
                  </div>
                  <span className="text-xs font-bold text-purple-300 mt-3 block">+40% of base rate</span>
                </label>
              </div>
            </div>

          </div>

          {/* Right panel: Cost calculation & Checkout Brief */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
            
            {/* dynamic estimate breakdown */}
            <div className="bg-white/5 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-500/[0.07] to-transparent p-6 space-y-5 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl -z-10"></div>
              
              <h3 className="text-lg font-bold text-white flex items-center gap-2 pb-3 border-b border-white/10">
                <Calculator className="w-5 h-5 text-purple-400" /> Campaign Summary
              </h3>

              {calculations.hasDeliverables ? (
                <div className="space-y-4">
                  {/* Detailed list of choices */}
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {preset !== "custom" && (
                      <div className="text-xs font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                        <span>Preset: {preset === "instagram_launch" ? "Instagram Launch" : preset === "growth" ? "Growth Scale" : "Omni Authority"}</span>
                        <span>Package Discount Applied</span>
                      </div>
                    )}
                    
                    {DELIVERABLES.filter(d => quantities[d.id] > 0).map(d => (
                      <div key={d.id} className="flex justify-between text-xs text-gray-200">
                        <span>{quantities[d.id]}x {d.name}</span>
                        <span className="font-bold">${(quantities[d.id] * d.price).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <div className="flex justify-between text-sm text-gray-300">
                      <span>Base Campaign:</span>
                      <span className="text-white font-bold">${calculations.basePrice.toLocaleString()}</span>
                    </div>

                    {calculations.addOnsPrice > 0 && (
                      <div className="flex justify-between text-sm text-gray-300">
                        <span>Licensing & Extras:</span>
                        <span className="text-white font-bold">+${calculations.addOnsPrice.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm text-gray-200 font-bold border-t border-white/5 pt-2">
                      <span>Subtotal:</span>
                      <span className="text-white font-extrabold">${calculations.subtotal.toLocaleString()}</span>
                    </div>

                    {/* Volume discounts section for custom combinations */}
                    {preset === "custom" && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm text-green-400 font-bold">
                          <span>Volume Discount ({calculations.discountPercent * 100}%):</span>
                          <span>-${calculations.discountAmount.toLocaleString()}</span>
                        </div>

                        {/* gamified progress to next tier */}
                        {calculations.nextTierRequired > 0 && (
                          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 space-y-1.5 mt-2">
                            <div className="flex justify-between text-[11px] text-gray-300">
                              <span className="flex items-center gap-1 font-semibold"><Sparkles className="w-3 h-3 text-yellow-400" /> Spend <strong>${calculations.nextTierRequired.toLocaleString()}</strong> more</span>
                              <span>Unlock <strong>{calculations.discountPercent === 0 ? "5%" : calculations.discountPercent === 0.05 ? "10%" : "15%"} Off!</strong></span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-purple-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${calculations.nextTierPercent}%` }}></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {calculations.totalSavings > 0 && preset !== "custom" && (
                      <div className="flex justify-between text-sm text-green-400 font-bold">
                        <span>Preset Bundle Savings:</span>
                        <span>-${calculations.totalSavings.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* final price */}
                  <div className="pt-3 border-t border-white/10 flex items-baseline justify-between">
                    <div>
                      <span className="text-sm font-extrabold text-white block">Proposed Budget</span>
                      <span className="text-[10px] text-gray-300 block">Flat rate · No hidden fees</span>
                    </div>
                    <div className="text-right">
                      {calculations.unlockedTier !== "none" && (
                        <span className="inline-block text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded font-bold uppercase mb-1">
                          {calculations.unlockedTier} Tier Unlocked!
                        </span>
                      )}
                      <div className="text-3xl font-extrabold text-purple-400 leading-none">
                        ${calculations.totalPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-300 text-sm flex flex-col items-center justify-center gap-3">
                  <Sliders className="w-8 h-8 text-gray-500 stroke-1" />
                  <p className="font-semibold text-white">Your campaign is currently empty.</p>
                  <p className="text-xs text-gray-400 max-w-xs leading-normal">
                    Select a preset package above or increment quantities on deliverables below to see your customized pricing estimation!
                  </p>
                </div>
              )}
            </div>

            {/* dynamic B2B proposal submission form */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 pb-3 border-b border-white/10">
                <Mail className="w-5 h-5 text-purple-400" /> Send Proposal Brief
              </h3>

              {!formSubmitted ? (
                <form onSubmit={handleProposalSubmit} className="space-y-4">
                  {submitError && (
                    <div className="p-4 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl leading-normal space-y-3">
                      <div>
                        <strong>Submission Notice:</strong> We encountered a local network issue delivering your proposal automatically. No worries! You can still submit it instantly via your standard email client:
                      </div>
                      <a
                        href={mailtoUrl}
                        className="inline-flex w-full py-2.5 bg-red-600 text-white font-bold rounded-lg text-xs hover:bg-red-700 text-center items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" /> Open Email Client (Backup Fallback)
                      </a>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-gray-300 font-bold block mb-1">Brand Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Airia AI"
                      value={brandName}
                      disabled={isSubmitting}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-300 font-bold block mb-1">Your Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Maria"
                        value={contactName}
                        disabled={isSubmitting}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-300 font-bold block mb-1">Work Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="maria@brand.com"
                        value={contactEmail}
                        disabled={isSubmitting}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-300 font-bold block mb-1">Target Launch Window</label>
                    <select
                      value={targetMonth}
                      disabled={isSubmitting}
                      onChange={(e) => setTargetMonth(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none cursor-pointer disabled:opacity-50"
                    >
                      <option className="bg-[#111]" value="">As soon as possible</option>
                      <option className="bg-[#111]" value="Within 30 Days">Next 30 Days</option>
                      <option className="bg-[#111]" value="Next 1-2 Months">Next 1-2 Months</option>
                      <option className="bg-[#111]" value="Future Q3/Q4 2026">Future Q3/Q4 2026</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-300 font-bold block mb-1">Brief Description / Product Link</label>
                    <textarea
                      rows={3}
                      placeholder="Share a short summary about the product, developer value, and campaign goals..."
                      value={productBrief}
                      disabled={isSubmitting}
                      onChange={(e) => setProductBrief(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none resize-none disabled:opacity-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!calculations.hasDeliverables || isSubmitting}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                      calculations.hasDeliverables && !isSubmitting
                        ? "bg-[#9B00D9] text-white hover:opacity-90 shadow-lg shadow-purple-600/30 cursor-pointer"
                        : "bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading loading-spinner loading-xs mr-1"></span>
                        Sending Proposal...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Campaign Proposal
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex items-center justify-center mx-auto text-xl animate-bounce">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-base font-extrabold text-white">Proposal Submitted!</h4>
                    <p className="text-xs text-gray-300 max-w-sm mx-auto leading-normal">
                      Thank you, <strong>{contactName}</strong>! Your custom campaign proposal has been submitted successfully to Ahsan's inbox.
                    </p>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto leading-normal">
                      A copy of the confirmation receipt has also been sent to your email: <strong>{contactEmail}</strong>. We will review and reach back within 24 hours.
                    </p>
                  </div>
                  
                  <div className="max-w-xs mx-auto pt-2">
                    <button
                      onClick={() => setFormSubmitted(false)}
                      className="w-full py-2.5 border border-white/10 hover:bg-white/5 text-gray-400 font-bold rounded-xl text-xs text-center cursor-pointer transition-colors"
                    >
                      Build Another Campaign Plan
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* === A LA CARTE FULL DATA SHEETS === */}
      {post.article && (
        <section className="mb-12 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-center text-white">A La Carte Reference Sheet</h2>
          <p className="text-center text-gray-400 mb-6 text-sm">Individual flat rates and placements details.</p>
          <div className="collapse collapse-arrow border border-white/10 bg-white/5 rounded-2xl">
            <input type="checkbox" className="cursor-pointer" />
            <div className="collapse-title text-base font-semibold text-white">
              View Detailed Deliverable Specifications (Full Pricing Markdown)
            </div>
            <div className="collapse-content">
              <LegitMarkdown
                components={{
                  a: (props: any) => (
                    <a
                      className="text-purple-300 hover:text-white transition-colors underline"
                      target={"_blank"}
                      rel="noreferrer"
                      {...props}
                    >
                      {props.children}
                    </a>
                  ),
                }}
              >
                {post.article}
              </LegitMarkdown>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4 leading-normal max-w-2xl mx-auto">
            Sponsorship rates include standard technical research, scripting, recording, custom high-CTR thumbnails, and end-screen cards. 
            All campaigns are secure flat-fee arrangements to align product delivery completely with content quality.
          </p>
        </section>
      )}

      {post.resources?.length > 0 && (
        <section className="mt-4 max-w-6xl mx-auto">
          <ResourcesLinks
            resources={post.resources}
            heading="Resources"
            noHeading={false}
          />
        </section>
      )}

      {/* === CLOSING CTA === */}
      <section className="mt-16 mb-24 max-w-5xl mx-auto text-center rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-900/[0.08] to-indigo-600/[0.08] p-10 backdrop-blur">
        <h2 className="text-3xl font-extrabold mb-3 text-white">Let&apos;s Build Something Incredible for Developers</h2>
        <p className="text-gray-300 max-w-xl mx-auto mb-8 text-sm leading-relaxed">
          Need a completely custom sponsorship structure or have questions about B2B developer alignment? Let&apos;s discuss. 
          Standard bookings receive dedicated research, high-quality production, and organic channels distribution.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://calendar.app.google/Z6g5dMyczq25hmjYA"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-[#9B00D9] text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-purple-600/30 text-sm"
          >
            <Calendar className="w-4 h-4" /> Book a Quick Call
          </a>
          <button
            onClick={() => {
              const calcEl = document.getElementById("planner-section");
              if (calcEl) {
                calcEl.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 border border-purple-500/30 text-purple-200 font-bold rounded-xl hover:bg-purple-500/10 transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4" /> Open Campaign Builder
          </button>
        </div>
      </section>

      {/* === FLOATING CTA — desktop sidebar button === */}
      <a
        href="https://calendar.app.google/Z6g5dMyczq25hmjYA"
        target="_blank"
        rel="noreferrer"
        className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-50 items-center gap-2.5 bg-[#9B00D9] text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-purple-600/30 hover:opacity-90 transition-opacity"
      >
        <Calendar className="w-4 h-4" /> Book a call
      </a>

      {/* === FIXED BOTTOM BAR — mobile === */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur border-t border-purple-500/30 p-3 flex gap-2">
        <a
          href="https://calendar.app.google/Z6g5dMyczq25hmjYA"
          target="_blank"
          rel="noreferrer"
          className="flex-1 text-center py-3 bg-[#9B00D9] text-white font-bold rounded-lg hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-1.5"
        >
          <Calendar className="w-4 h-4" /> Book a call
        </a>
        <button
          onClick={() => {
            const calcEl = document.getElementById("planner-section");
            if (calcEl) {
              calcEl.scrollIntoView({ behavior: "smooth" });
            }
          }}
          className="flex-1 text-center py-3 border border-purple-500 text-purple-200 font-bold rounded-lg hover:bg-purple-500/10 transition-colors text-sm flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Sliders className="w-4 h-4" /> Custom Estimate
        </button>
      </div>
    </div>
  );
}
