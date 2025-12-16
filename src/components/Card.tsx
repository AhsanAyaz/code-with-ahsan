import Image from "./Image";
import Link from "./Link";

interface CardProps {
  title: string;
  description: string;
  imgSrc: string;
  href?: string;
}

const Card = ({ title, description, imgSrc, href }: CardProps) => (
  <div className="p-4 md:w-1/2 md" style={{ maxWidth: "544px" }}>
    <div className="card bg-base-100 shadow-xl h-full border border-base-300">
      {href ? (
        <Link href={href} aria-label={`Link to ${title}`}>
          <figure>
            <Image
              alt={title}
              src={imgSrc}
              className="object-cover object-center lg:h-48 md:h-36 w-full"
              width={544}
              height={306}
            />
          </figure>
        </Link>
      ) : (
        <figure>
          <Image
            alt={title}
            src={imgSrc}
            className="object-cover object-center lg:h-48 md:h-36 w-full"
            width={544}
            height={306}
          />
        </figure>
      )}
      <div className="card-body p-6">
        <h2 className="card-title text-2xl font-bold leading-8 tracking-tight">
          {href ? (
            <Link href={href} aria-label={`Link to ${title}`}>
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        <p className="prose mb-3 max-w-none text-base-content/70">
          {description}
        </p>
        {href && (
          <div className="card-actions justify-end">
            <Link
              href={href}
              className="btn btn-primary btn-sm"
              aria-label={`Link to ${title}`}
            >
              Learn more &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default Card;
