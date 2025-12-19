import axios from "axios";
import qs from "qs";
import Post from "@/classes/Post.class";
import { STRAPI_POST_QUERY_OBJ } from "@/lib/strapiQueryHelpers";
import { Metadata } from "next";
import RatesClient from "./RatesClient";

const strapiUrl = process.env.STRAPI_URL;
const strapiAPIKey = process.env.STRAPI_API_KEY;
const RATE_CARD_DOC_ID =
  process.env.STRAPI_RATE_CARD_DOC_ID || "tyzwd2y813dr8sldugy0y51l";

async function getRateCard() {
  const postQuery = qs.stringify(
    {
      ...STRAPI_POST_QUERY_OBJ,
      filters: {
        documentId: {
          $eq: RATE_CARD_DOC_ID,
        },
      },
    },
    { encodeValuesOnly: true }
  );

  const url = `${strapiUrl}/api/posts?${postQuery}`;

  try {
    const postResp = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${strapiAPIKey}`,
      },
    });

    if (!postResp.data?.data?.length) {
      return null;
    }

    return new Post(postResp.data.data[0]);
  } catch (error) {
    console.error("Error fetching rate card:", error);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const post = await getRateCard();

  return {
    title: post?.title || "Creator Rate Card",
    description:
      post?.description || "My creator rate card and pricing information",
  };
}

export default async function RatesPage() {
  const post = await getRateCard();

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

  // Next.js handles serialization of the Post object (created via constructor)
  // as it contains simpler data properties.
  return <RatesClient post={{ ...post }} />;
}
