import { Metadata } from "next";
// @ts-ignore
import siteMetadata from "@/data/siteMetadata";
// @ts-ignore
import AmazonGearItems from "@/components/AmazingGeatItems";

export const metadata: Metadata = {
  title: `Gear - ${siteMetadata.author}`,
  description: siteMetadata.description,
};

export default function Gear() {
  return (
    <div className="page-padding">
      <AmazonGearItems />
    </div>
  );
}
