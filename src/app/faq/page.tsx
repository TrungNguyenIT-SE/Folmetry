import { EditorialContent } from "@/components/pages/editorial-content";
import { en } from "@/i18n/en";
import { createPageMetadata, serializeJsonLd } from "@/lib/site-metadata";

export const metadata = createPageMetadata({ title: "Frequently asked questions", description: "Answers about local Instagram export analysis, snapshots, deletion, accuracy, public Stories, privacy, and responsible downloading.", path: "/faq" });

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: en.marketing.faq.items.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
};

export default function FaqPage() {
  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- JSON-LD is serialized with markup characters escaped. */}
      <script dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }} type="application/ld+json" />
      <EditorialContent route="faq" />
    </>
  );
}
