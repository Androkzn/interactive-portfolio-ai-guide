import type { Metadata } from "next";
import { CaseStudyArticle } from "@/components/engineering-work/case-study-article";
import { caseStudyById } from "@/lib/engineering-work";

const study = caseStudyById("step-ai-coach");

export const metadata: Metadata = {
  title: study.metaTitle,
  description: study.metaDescription,
  alternates: { canonical: study.href },
  openGraph: { type: "article", url: study.href, title: study.metaTitle, description: study.metaDescription },
};

export default function Page() {
  return <CaseStudyArticle study={study} />;
}
