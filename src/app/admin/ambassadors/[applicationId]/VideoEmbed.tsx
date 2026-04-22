"use client";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import {
  extractYouTubeId,
  extractLoomId,
  extractDriveFileId,
} from "@/lib/ambassador/videoUrl";

interface Props {
  videoUrl: string;
  videoEmbedType: "youtube" | "loom" | "drive" | "unknown";
}

export default function VideoEmbed({ videoUrl, videoEmbedType }: Props) {
  if (videoEmbedType === "youtube") {
    const id = extractYouTubeId(videoUrl);
    if (!id) return <FallbackLink url={videoUrl} />;
    return <LiteYouTubeEmbed id={id} title="Application video" />;
  }

  if (videoEmbedType === "loom") {
    const id = extractLoomId(videoUrl);
    if (!id) return <FallbackLink url={videoUrl} />;
    // Pitfall 5: Loom requires allowFullScreen; NO sandbox attribute.
    return (
      <div className="aspect-video w-full">
        <iframe
          src={`https://www.loom.com/embed/${id}`}
          frameBorder="0"
          allow="fullscreen"
          allowFullScreen
          className="w-full h-full"
          title="Application video"
        />
      </div>
    );
  }

  if (videoEmbedType === "drive") {
    const id = extractDriveFileId(videoUrl);
    if (!id) return <FallbackLink url={videoUrl} />;
    return (
      <div className="aspect-video w-full">
        <iframe
          src={`https://drive.google.com/file/d/${id}/preview`}
          frameBorder="0"
          allow="autoplay"
          allowFullScreen
          className="w-full h-full"
          title="Application video"
        />
      </div>
    );
  }

  // videoEmbedType === "unknown" or any unrecognized type
  return <FallbackLink url={videoUrl} />;
}

function FallbackLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="link link-primary break-all"
    >
      {url}
    </a>
  );
}
