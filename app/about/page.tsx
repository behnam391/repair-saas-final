import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { db } from "@/lib/db";
import { getPublicLocale } from "@/lib/public-locales";

export const dynamic = "force-dynamic";

const COPY = {
  fa: { title: "درباره ما", empty: "محتوایی هنوز ثبت نشده است." },
  en: { title: "About Peyvo", content: "Peyvo is an integrated operations platform for mobile and computer repair businesses. It brings device intake, repair workflow, customer communication, inventory, invoicing, reporting and collaboration into one reliable workspace.\n\nOur aim is to help repair professionals spend less time on scattered administration and more time delivering accurate, transparent service. Peyvo is developed and operated as an active product, with continuous improvements shaped by real repair-business workflows." },
  ar: { title: "عن Peyvo", content: "Peyvo منصة تشغيل متكاملة لمراكز صيانة الهواتف والحواسيب. تجمع استلام الأجهزة وسير الصيانة والتواصل مع العملاء والمخزون والفواتير والتقارير والتعاون ضمن مساحة عمل واحدة موثوقة.\n\nهدفنا هو تقليل الوقت الذي يهدره متخصصو الصيانة في الأعمال الإدارية المتفرقة، ومساعدتهم على تقديم خدمة دقيقة وشفافة. يتم تطوير Peyvo وتشغيله كمنتج فعلي يتحسن باستمرار وفق احتياجات العمل اليومية لمراكز الصيانة." },
} as const;

export function generateMetadata({ searchParams }: { searchParams?: { lang?: string | string[] } }): Metadata {
  const locale = getPublicLocale(searchParams?.lang);
  return { title: `${COPY[locale].title} | Peyvo` };
}

export default async function AboutPage({ searchParams }: { searchParams?: { lang?: string | string[] } }) {
  const locale = getPublicLocale(searchParams?.lang);
  const copy = COPY[locale];
  let content: string | null = "content" in copy ? copy.content : null;
  if (locale === "fa") {
    try {
      const settings = await db.platformSettings.findUnique({ where: { id: "singleton" }, select: { aboutUsContent: true } });
      content = settings?.aboutUsContent || null;
    } catch {
      content = null;
    }
  }

  return (
    <LegalShell title={copy.title} locale={locale} pagePath="/about">
      {content ? <p className="text-sm whitespace-pre-line leading-8 text-muted">{content}</p> : <p className="text-xs text-muted">{"empty" in copy ? copy.empty : ""}</p>}
    </LegalShell>
  );
}
