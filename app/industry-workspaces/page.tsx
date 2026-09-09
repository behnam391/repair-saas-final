import Link from "next/link";
import { INDUSTRY_WORKSPACES } from "@/lib/industry-workspaces";
export default function Page() {
  return <><h1>داشبوردهای مشاغل جدید</h1><p className="industry-muted">این بخش مستقل است؛ انتخاب یک نما، صنف مجموعه یا داشبورد فعلی موبایل و کامپیوتر را تغییر نمی‌دهد.</p>
    <div className="industry-directory">{Object.entries(INDUSTRY_WORKSPACES).map(([key, item]) => <Link key={key} href={`/industry-workspaces/${key}`}><small>{item.group}</small><h2>{item.title}</h2><p>{item.description}</p><p>{item.examples.join(" · ")}</p><b>مشاهده داشبورد ←</b></Link>)}</div>
    <p className="industry-notice">مرحله فعلی: داشبورد و گزارش وضعیت. پذیرش اختصاصی این مشاغل و انتخاب صنف در ثبت‌نام هنوز فعال نشده است.</p></>;
}
