import { Metadata } from "next";
import Post from "@/classes/Post.class";
import RatesClient from "./RatesClient";
import { getRateCard } from "@/lib/content/contentProvider";

async function getRateCardPost() {
  const data = await getRateCard();
  if (!data) return null;

  return new Post({
    ...data,
    type: "article",
    hasAssignment: false,
    videoUrl: "",
    chapter: null,
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const post = await getRateCardPost();

  return {
    title: post?.title || "Creator Rate Card",
    description:
      post?.description || "My creator rate card and pricing information",
  };
}

export default async function RatesPage() {
  const post = await getRateCardPost();

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl text-center mb-6">Creator Rate Card</h1>
        <p className="text-center">
          Rate card not found or could not be loaded.
        </p>
      </div>
    );
  }

  return <RatesClient post={{ ...post }} />;
}
