import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "C:/Users/Behnam/Desktop/repair-saas-clone/repair-saas-final";
const OUT = path.join(ROOT, "output/presentation/Peyvo-Arvan-Pitch-Deck.pptx");
const RENDER_DIR = path.join(ROOT, "tmp/peyvo_pitch_deck/rendered");

const ASSETS = {
  logo: path.join(ROOT, "store-assets/cafebazaar/Peyvo-CafeBazaar-512.png"),
  hero: path.join(ROOT, "public/images/peyvo-intelligence-hero.jpg"),
  home: path.join(ROOT, "store-assets/cafebazaar/01-home-store.png"),
  signup: path.join(ROOT, "store-assets/cafebazaar/03-signup-store.png"),
  customer: path.join(ROOT, "store-assets/cafebazaar/04-customer-login-store.png"),
};

const W = 1280;
const H = 720;
const FONT = "Tahoma";
const C = {
  ink: "#071426",
  muted: "#53657B",
  faint: "#EDF3F8",
  rule: "#D3DEE8",
  blue: "#159CF4",
  blue2: "#1276DB",
  green: "#66D437",
  greenDark: "#2A9B3A",
  navy: "#06101F",
  white: "#FFFFFF",
};

function rtl(value) {
  if (!/[\u0600-\u06FF]/.test(value)) return value;
  return value
    .split("\n")
    .map((line) => line.replace(/[،؛]/g, "").trim().split(/\s+/).reverse().join(" "))
    .join("\n");
}

async function bytes(file) {
  const b = await fs.readFile(file);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

function addText(slide, text, x, y, w, h, size, color = C.ink, opts = {}) {
  const box = slide.shapes.add({
    geometry: "textbox",
    name: opts.name,
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  box.text = rtl(text);
  box.text.style = {
    fontSize: size,
    typeface: FONT,
    color,
    bold: opts.bold ?? false,
    alignment: opts.align ?? "right",
    verticalAlignment: opts.valign ?? "top",
    autoFit: "shrinkText",
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  };
  return box;
}

function rect(slide, x, y, w, h, fill, radius = "rounded-xl", line = "none") {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: line === "none" ? { style: "solid", fill: "none", width: 0 } : { style: "solid", fill: line, width: 1 },
    ...(radius ? { borderRadius: radius } : {}),
  });
}

function circle(slide, x, y, d, fill) {
  return slide.shapes.add({ geometry: "ellipse", position: { left: x, top: y, width: d, height: d }, fill, line: { style: "solid", fill: "none", width: 0 } });
}

function topLine(slide, index, dark = false) {
  rect(slide, 0, 0, W, 8, C.blue, null);
  rect(slide, 1120, 0, 160, 8, C.green, null);
  addText(slide, `۰${index}`, 40, 666, 70, 24, 13, dark ? "#91A5BC" : C.muted, { align: "left" });
  addText(slide, "PEYVO  |  PITCH DECK", 850, 666, 390, 22, 12, dark ? "#91A5BC" : C.muted, { align: "right" });
}

function title(slide, value, index, dark = false) {
  topLine(slide, index, dark);
  addText(slide, value, 62, 48, 1156, 72, 38, dark ? C.white : C.ink, { bold: true });
}

function bullet(slide, heading, body, x, y, width, accent = C.blue, dark = false) {
  circle(slide, x + width - 18, y + 7, 10, accent);
  addText(slide, heading, x, y, width - 32, 35, 22, dark ? C.white : C.ink, { bold: true });
  addText(slide, body, x, y + 42, width, 72, 16, dark ? "#B7C6D8" : C.muted);
}

async function addImage(slide, file, x, y, w, h, fit = "cover", radius = "rounded-xl") {
  const ext = path.extname(file).toLowerCase();
  slide.images.add({
    blob: await bytes(file),
    contentType: ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png",
    fit,
    position: { left: x, top: y, width: w, height: h },
    geometry: radius ? "roundRect" : "rect",
    ...(radius ? { borderRadius: radius } : {}),
  });
}

function notes(slide, sources) {
  slide.speakerNotes.textFrame.setText(`[Sources]\n${sources.map((s) => `- ${s}`).join("\n")}\n[/Sources]`);
}

async function build() {
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.mkdir(RENDER_DIR, { recursive: true });
  const p = Presentation.create({ slideSize: { width: W, height: H } });

  // 1. Cover — adapted from the library's half-text / half-image cover.
  {
    const s = p.slides.add();
    s.background.fill = C.white;
    rect(s, 0, 0, 22, H, C.blue, null);
    await addImage(s, ASSETS.hero, 650, 0, 630, H, "cover", null);
    rect(s, 650, 0, 630, H, "#06101FCC", null);
    await addImage(s, ASSETS.logo, 72, 62, 178, 178, "contain", null);
    addText(s, "پیوو", 72, 260, 520, 88, 62, C.ink, { bold: true });
    addText(s, "زیرساخت هوشمند\nمدیریت تعمیرگاه‌های موبایل", 72, 356, 520, 96, 30, C.blue2, { bold: true });
    addText(s, "از پذیرش دستگاه تا تحویل و فاکتور\nارتباط یکپارچه با مشتری و زیرساخت ابری", 72, 477, 520, 92, 20, C.muted);
    addText(s, "درخواست حمایت زیرساختی آروان‌کلاد  |  ۱۴۰۵", 72, 625, 520, 30, 15, C.greenDark, { bold: true });
    notes(s, ["دارایی‌های برند و تصویر اصلی: فایل‌های داخلی پروژه پیوو"]);
  }

  // 2. Problem — two-column narrative.
  {
    const s = p.slides.add();
    s.background.fill = C.white;
    title(s, "فرایند سنتی، رشد تعمیرگاه را کند می‌کند", 2);
    addText(s, "بخش زیادی از عملیات روزانه بین دفتر و تماس پخش می‌شود\nبخشی دیگر در پیام‌رسان و حافظه افراد باقی می‌ماند", 640, 145, 570, 80, 24, C.muted, { bold: true });
    bullet(s, "اطلاعات پراکنده", "پذیرش، سوابق مشتری و وضعیت تعمیر در یک مسیر واحد ثبت نمی‌شود.", 650, 265, 540, C.blue);
    bullet(s, "شفافیت پایین برای مشتری", "مشتری برای اطلاع از وضعیت دستگاه ناچار به تماس‌های تکراری است.", 650, 405, 540, C.green);
    bullet(s, "کنترل دشوار مالی و تیم", "فاکتور، تسویه، ارجاع و عملکرد همکاران به‌سختی قابل پیگیری است.", 650, 545, 540, C.blue2);
    rect(s, 54, 142, 520, 485, C.navy, "rounded-2xl");
    addText(s, "مسئله‌ای روزمره، اما پرهزینه", 92, 186, 440, 58, 30, C.white, { bold: true });
    addText(s, "هر دستگاه یک گردش‌کار دارد\nاگر گردش‌کار ثبت و قابل مشاهده نباشد\nخطا و تأخیر و نارضایتی بیشتر می‌شود", 92, 275, 440, 150, 23, "#C6D3E2");
    rect(s, 92, 493, 330, 4, C.blue, null);
    addText(s, "پیوو این گردش‌کار را دیجیتال می‌کند.", 92, 530, 420, 54, 24, C.green, { bold: true });
    notes(s, ["تعریف مسئله بر اساس گردش‌کار پیاده‌سازی‌شده در پروژه و صفحات معرفی محصول"]);
  }

  // 3. Solution — product screenshot + simple process.
  {
    const s = p.slides.add();
    s.background.fill = C.faint;
    title(s, "یک پنل برای تمام مسیر تعمیر", 3);
    await addImage(s, ASSETS.home, 54, 142, 430, 486, "cover", "rounded-2xl");
    addText(s, "پیوو فرایند تعمیر را از لحظه ورود دستگاه ثبت می‌کند\nاین مسیر تا پایان تسویه قابل مشاهده و پیگیری است", 540, 148, 670, 76, 25, C.muted, { bold: true });
    const steps = [
      ["۱", "پذیرش", "ثبت مشتری، دستگاه و شرح ایراد"],
      ["۲", "مدیریت تعمیر", "وضعیت، تکنسین، قطعات و ارجاع"],
      ["۳", "تحویل و تسویه", "فاکتور، پرداخت و اطلاع‌رسانی"],
    ];
    for (let i = 0; i < steps.length; i++) {
      const y = 260 + i * 118;
      circle(s, 1140, y, 54, i === 2 ? C.green : C.blue);
      addText(s, steps[i][0], 1140, y + 10, 54, 32, 22, C.white, { bold: true, align: "center" });
      addText(s, steps[i][1], 730, y, 370, 38, 23, C.ink, { bold: true });
      addText(s, steps[i][2], 600, y + 45, 500, 44, 16, C.muted);
      if (i < 2) rect(s, 1166, y + 60, 3, 50, C.rule, null);
    }
    notes(s, ["اسکرین‌شات و متن قابلیت‌ها: فایل‌های داخلی پروژه پیوو"]);
  }

  // 4. Capabilities — three-column flat layout.
  {
    const s = p.slides.add();
    s.background.fill = C.white;
    title(s, "محصول برای سه ضلع اکوسیستم ساخته شده است", 4);
    const cols = [
      { x: 62, c: C.blue, h: "مدیریت تعمیرگاه", items: ["پذیرش و گردش‌کار تعمیر", "مشتریان، انبار و فاکتور", "کارمندان، گزارش و تسویه"] },
      { x: 446, c: C.green, h: "تجربه مشتری", items: ["پیگیری وضعیت تعمیر", "سوابق دستگاه‌ها", "گفت‌وگو و اعلان وضعیت"] },
      { x: 830, c: C.blue2, h: "شبکه همکاری", items: ["ارجاع تعمیر تخصصی", "ثبت نحوه ارسال و دریافت", "تسویه میان همکاران"] },
    ];
    for (const col of cols) {
      rect(s, col.x, 160, 330, 8, col.c, null);
      addText(s, col.h, col.x, 196, 330, 48, 25, C.ink, { bold: true });
      col.items.forEach((item, idx) => {
        circle(s, col.x + 302, 300 + idx * 92, 10, col.c);
        addText(s, item, col.x, 286 + idx * 92, 280, 62, 18, C.muted, { bold: idx === 0 });
      });
    }
    rect(s, 62, 603, 1098, 1, C.rule, null);
    addText(s, "وب، اپلیکیشن اندروید و پنل مشتری با یک هسته داده مشترک", 62, 625, 1098, 32, 18, C.greenDark, { bold: true, align: "center" });
    notes(s, ["قابلیت‌ها: کد و صفحات داخلی پروژه پیوو شامل tickets، invoices، customer و collaboration"]);
  }

  // 5. Market and business model — no invented market-size numbers.
  {
    const s = p.slides.add();
    s.background.fill = C.navy;
    title(s, "بازار هدف روشن است؛ مدل درآمدی تکرارشونده", 5, true);
    addText(s, "مشتریان هدف", 690, 160, 500, 52, 28, C.white, { bold: true });
    bullet(s, "تعمیرکار مستقل", "نیازمند نظم، سابقه مشتری و فاکتور حرفه‌ای", 690, 245, 500, C.blue, true);
    bullet(s, "تعمیرگاه در حال رشد", "نیازمند تقسیم کار، گزارش و مدیریت تیم", 690, 378, 500, C.green, true);
    bullet(s, "مراکز خدمات چندشعبه‌ای", "نیازمند دید یکپارچه و کنترل چند واحد", 690, 511, 500, C.blue2, true);
    rect(s, 70, 158, 520, 470, "#0D2138", "rounded-2xl", "#28425F");
    addText(s, "مدل درآمدی", 110, 205, 440, 48, 28, C.white, { bold: true });
    addText(s, "اشتراک نرم‌افزار به‌عنوان سرویس (SaaS)", 110, 300, 440, 70, 27, C.green, { bold: true });
    addText(s, "پلن‌های متناسب با اندازه و مدل کاری تعمیرگاه\nامکان ارتقای اشتراک هم‌زمان با رشد کسب‌وکار", 110, 396, 440, 120, 21, "#B7C6D8");
    addText(s, "شروع رایگان  →  تجربه محصول  →  ارتقای اشتراک", 110, 548, 440, 40, 18, C.blue, { bold: true });
    notes(s, ["مدل اشتراک و دسته‌بندی کاربران: lib/plans.ts و app/signup/page.tsx"]);
  }

  // 6. Current state — milestone sequence.
  {
    const s = p.slides.add();
    s.background.fill = C.white;
    title(s, "محصول ساخته شده و آماده ورود به مرحله رشد است", 6);
    addText(s, "مرحله فعلی: اولیه", 62, 145, 350, 48, 27, C.greenDark, { bold: true });
    addText(s, "نسخه عملیاتی وب و اندروید توسعه یافته است\nمسیرهای اصلی محصول اکنون قابل استفاده هستند", 480, 145, 730, 66, 22, C.muted, { bold: true });
    rect(s, 110, 356, 1060, 3, C.rule, null);
    const milestones = [
      ["محصول", "نسخه وب و اپ اندروید", C.blue],
      ["عملیات", "پذیرش، فاکتور و پیامک", C.green],
      ["اعتماد", "دامنه و درگاه پرداخت", C.blue2],
      ["انتشار", "آماده جذب کاربران اولیه", C.greenDark],
    ];
    milestones.forEach((m, i) => {
      const x = 135 + i * 270;
      circle(s, x + 192, 332, 50, m[2]);
      addText(s, `${i + 1}`, x + 192, 341, 50, 28, 20, C.white, { bold: true, align: "center" });
      addText(s, m[0], x, 418, 220, 38, 23, C.ink, { bold: true, align: "center" });
      addText(s, m[1], x, 468, 220, 70, 17, C.muted, { align: "center" });
    });
    rect(s, 62, 596, 1156, 1, C.rule, null);
    addText(s, "تمرکز بعدی: زیرساخت پایدار، استقرار تولیدی، جذب تعمیرگاه‌ها و توسعه شبکه همکاری", 62, 622, 1156, 36, 19, C.blue2, { bold: true, align: "center" });
    notes(s, ["وضعیت محصول: مخزن پروژه، فایل APK، مسیرهای پرداخت، پیامک و انتشار فروشگاه‌ها"]);
  }

  // 7. Infrastructure request — decision slide.
  {
    const s = p.slides.add();
    s.background.fill = C.faint;
    title(s, "حمایت آروان، مسیر رشد پیوو را پایدار می‌کند", 7);
    addText(s, "نیاز زیرساختی", 720, 150, 470, 50, 28, C.ink, { bold: true });
    bullet(s, "سرور و رایانش ابری", "اجرای پایدار اپلیکیشن و API", 720, 235, 470, C.blue);
    bullet(s, "دیتابیس و ذخیره‌سازی", "داده‌های عملیاتی، فایل‌ها و نسخه‌های پشتیبان", 720, 365, 470, C.green);
    bullet(s, "CDN و امنیت", "دسترسی سریع و امن برای کاربران سراسر ایران", 720, 495, 470, C.blue2);
    rect(s, 62, 145, 570, 470, C.navy, "rounded-2xl");
    addText(s, "هدف حمایت", 102, 195, 490, 45, 27, C.white, { bold: true });
    addText(s, "کاهش هزینه زیرساخت در دوره جذب کاربران اولیه\nایجاد بستری قابل اتکا برای رشد سراسری محصول", 102, 285, 490, 160, 27, C.white, { bold: true });
    rect(s, 102, 483, 390, 5, C.green, null);
    addText(s, "peyvo.ir  |  support@peyvo.ir", 102, 527, 490, 44, 19, C.blue, { bold: true, align: "left" });
    notes(s, ["نیازهای زیرساختی بر اساس معماری فعلی پروژه: Next.js، پایگاه داده، فایل، بکاپ و CDN"]);
  }

  for (let i = 0; i < p.slides.items.length; i++) {
    const slide = p.slides.items[i];
    const png = await p.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(RENDER_DIR, `slide-${String(i + 1).padStart(2, "0")}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(RENDER_DIR, `slide-${String(i + 1).padStart(2, "0")}.layout.json`), await layout.text());
  }
  const montage = await p.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(RENDER_DIR, "montage.webp"), new Uint8Array(await montage.arrayBuffer()));
  const pptx = await PresentationFile.exportPptx(p);
  await pptx.save(OUT);
  console.log(OUT);
}

build().catch((err) => { console.error(err); process.exitCode = 1; });
