from pathlib import Path
import re
from xml.sax.saxutils import escape

import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, LongTable, Preformatted, KeepTogether, Flowable,
    NextPageTemplate
)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs" / "PEYVO_OPERATIONAL_HANDBOOK.md"
OUTPUT = ROOT / "docs" / "PEYVO_OPERATIONAL_HANDBOOK.pdf"

NAVY = colors.HexColor("#101827")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#607086")
TEAL = colors.HexColor("#12A594")
TEAL_DARK = colors.HexColor("#08766B")
BLUE = colors.HexColor("#1677C8")
PALE = colors.HexColor("#EFF6F7")
PALE_BLUE = colors.HexColor("#EDF5FC")
AMBER = colors.HexColor("#D88A16")
PALE_AMBER = colors.HexColor("#FFF6E5")
RED = colors.HexColor("#B83B45")
PALE_RED = colors.HexColor("#FCEDEF")
LINE = colors.HexColor("#CFD9E4")
WHITE = colors.white

pdfmetrics.registerFont(TTFont("Tahoma", r"C:\Windows\Fonts\tahoma.ttf"))
pdfmetrics.registerFont(TTFont("Tahoma-Bold", r"C:\Windows\Fonts\tahomabd.ttf"))
pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFontFamily("Tahoma", normal="Tahoma", bold="Tahoma-Bold")

def rtl(text: str) -> str:
    text = text.replace("**", "").replace("`", "")
    text = re.sub(r"<[^>]+>", "", text)
    try:
        return get_display(arabic_reshaper.reshape(text), base_dir="R")
    except Exception:
        return text

def rich_rtl(text: str) -> str:
    # Bold is intentionally flattened; shaping the complete logical string keeps
    # Persian punctuation and embedded English identifiers visually stable.
    return escape(rtl(text))

styles = getSampleStyleSheet()
body = ParagraphStyle("BodyRTL", fontName="Tahoma", fontSize=9.2, leading=15.2,
                      textColor=INK, alignment=TA_RIGHT, wordWrap="RTL", spaceAfter=5)
small = ParagraphStyle("SmallRTL", parent=body, fontSize=7.3, leading=11.3, textColor=MUTED)
h1 = ParagraphStyle("H1RTL", fontName="Tahoma-Bold", fontSize=17, leading=25,
                    textColor=NAVY, alignment=TA_RIGHT, spaceAfter=8, spaceBefore=6)
h2 = ParagraphStyle("H2RTL", fontName="Tahoma-Bold", fontSize=12.2, leading=19,
                    textColor=TEAL_DARK, alignment=TA_RIGHT, spaceBefore=7, spaceAfter=5)
h3 = ParagraphStyle("H3RTL", fontName="Tahoma-Bold", fontSize=10.2, leading=16,
                    textColor=BLUE, alignment=TA_RIGHT, spaceBefore=5, spaceAfter=3)
quote = ParagraphStyle("QuoteRTL", parent=body, backColor=PALE_AMBER, borderColor=AMBER,
                       borderWidth=.8, borderPadding=8, borderRadius=4, textColor=INK,
                       spaceBefore=5, spaceAfter=7)
code_style = ParagraphStyle("Code", fontName="Arial", fontSize=7.1, leading=10,
                            textColor=NAVY, backColor=colors.HexColor("#F4F7FA"),
                            borderColor=LINE, borderWidth=.5, borderPadding=7,
                            alignment=TA_LEFT, leftIndent=0, rightIndent=0)

class Diagram(Flowable):
    def __init__(self, kind, width=168*mm, height=63*mm):
        super().__init__(); self.kind=kind; self.width=width; self.height=height
    def wrap(self, aw, ah):
        self.width=min(self.width, aw); return self.width, self.height
    def _box(self, c, x, y, w, h, label, fill=PALE_BLUE, stroke=BLUE):
        c.setFillColor(fill); c.setStrokeColor(stroke); c.setLineWidth(.8)
        c.roundRect(x,y,w,h,4,fill=1,stroke=1)
        c.setFillColor(INK); c.setFont("Tahoma-Bold",6.4)
        lines=label.split("\n")
        for i,line in enumerate(lines):
            c.drawCentredString(x+w/2,y+h/2+3-i*8,rtl(line))
    def _arrow(self,c,x1,y1,x2,y2):
        c.setStrokeColor(MUTED); c.setFillColor(MUTED); c.setLineWidth(1)
        c.line(x1,y1,x2,y2)
        import math
        a=math.atan2(y2-y1,x2-x1); s=4
        pts=[(x2,y2),(x2-s*math.cos(a-.5),y2-s*math.sin(a-.5)),(x2-s*math.cos(a+.5),y2-s*math.sin(a+.5))]
        p=c.beginPath(); p.moveTo(*pts[0]); p.lineTo(*pts[1]); p.lineTo(*pts[2]); p.close(); c.drawPath(p,fill=1,stroke=0)
    def draw(self):
        c=self.canv; w=self.width; h=self.height
        c.setFillColor(colors.white); c.setStrokeColor(LINE); c.roundRect(0,0,w,h,7,fill=1,stroke=1)
        c.setFillColor(TEAL_DARK); c.setFont("Tahoma-Bold",9)
        titles={1:"نمودار A - معماری کلان پیوو",2:"نمودار B - پرداخت تا فعال‌سازی اشتراک",3:"نمودار C - جریان ارائه‌دهنده هوش مصنوعی"}
        c.drawRightString(w-10,h-17,rtl(titles[self.kind]))
        y=h-55; bh=25
        if self.kind==1:
            labels=["کاربر وب\nAndroid WebView","peyvo.ir\nVercel DNS","Next.js / API\nVercel","Prisma","Neon\nPostgreSQL"]
            bw=(w-60)/5
            xs=[10+i*(bw+10) for i in range(5)]
            for i,l in enumerate(labels): self._box(c,xs[i],y,bw,bh,l,PALE if i<3 else PALE_BLUE,TEAL if i<3 else BLUE)
            for i in range(4): self._arrow(c,xs[i]+bw,y+bh/2,xs[i+1],y+bh/2)
            ext=["Kavenegar","Payment","Myket","Neshan","Blob/Telegram/AI"]
            y2=25; bw2=(w-70)/5; xs2=[10+i*(bw2+12.5) for i in range(5)]
            for i,l in enumerate(ext): self._box(c,xs2[i],y2,bw2,22,l,PALE_AMBER,AMBER)
            self._arrow(c,xs[2]+bw/2,y,xs2[2]+bw2/2,y2+22)
        elif self.kind==2:
            labels=["Checkout / Intent","درگاه یا Myket","Server Verify","SubscriptionService","Shop + PurchaseRecord"]
            bw=(w-60)/5; xs=[10+i*(bw+10) for i in range(5)]
            for i,l in enumerate(labels): self._box(c,xs[i],y,bw,bh,l,PALE_BLUE if i!=2 else PALE_AMBER,BLUE if i!=2 else AMBER)
            for i in range(4): self._arrow(c,xs[i]+bw,y+bh/2,xs[i+1],y+bh/2)
            self._box(c,w/2-60,25,120,24,"Unique externalRef + DB Transaction",PALE,TEAL)
            self._arrow(c,xs[3]+bw/2,y,xs[3]+bw/2,49)
        else:
            labels=["AI Feature","Config + Quota","Redaction","Primary Provider","Fallback"]
            bw=(w-60)/5; xs=[10+i*(bw+10) for i in range(5)]
            for i,l in enumerate(labels): self._box(c,xs[i],y,bw,bh,l,PALE if i<3 else PALE_BLUE,TEAL if i<3 else BLUE)
            for i in range(4): self._arrow(c,xs[i]+bw,y+bh/2,xs[i+1],y+bh/2)
            self._box(c,w/2-68,25,136,24,"Metadata Log + AiSuggestion Audit",PALE_AMBER,AMBER)
            self._arrow(c,xs[2]+bw/2,y,xs[2]+bw/2,49)

class HandbookDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(filename, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm,
                         topMargin=20*mm, bottomMargin=17*mm, title="PEYVO Operational Handbook",
                         author="Peyvo Operations")
        frame=Frame(self.leftMargin,self.bottomMargin,self.width,self.height,id="normal")
        self.addPageTemplates([PageTemplate(id="body",frames=[frame],onPage=self.header_footer)])
        self._last_outline_level = -1
    def header_footer(self,c,doc):
        if doc.page==1:
            c.saveState()
            c.setFillColor(NAVY)
            c.rect(0,0,A4[0],A4[1],fill=1,stroke=0)
            c.setFillColor(TEAL)
            c.rect(0,A4[1]-8*mm,A4[0],8*mm,fill=1,stroke=0)
            c.setFillColor(colors.HexColor("#172B40"))
            c.circle(A4[0]-25*mm,24*mm,38*mm,fill=1,stroke=0)
            c.restoreState()
            return
        c.saveState(); c.setStrokeColor(LINE); c.setLineWidth(.5)
        c.line(doc.leftMargin,A4[1]-14*mm,A4[0]-doc.rightMargin,A4[1]-14*mm)
        c.setFont("Tahoma-Bold",7.2); c.setFillColor(MUTED)
        c.drawRightString(A4[0]-doc.rightMargin,A4[1]-10.5*mm,rtl("پیوو - راهنمای عملیات و تداوم کسب‌وکار"))
        c.setFont("Arial",7.5); c.drawString(doc.leftMargin,9*mm,"CONFIDENTIAL - NO SECRETS")
        c.setFont("Tahoma",7.5); c.drawRightString(A4[0]-doc.rightMargin,9*mm,rtl(f"صفحه {doc.page}"))
        c.restoreState()
    def afterFlowable(self,flowable):
        if isinstance(flowable,Paragraph) and getattr(flowable,"_toc_level",None) is not None:
            level=flowable._toc_level; text=getattr(flowable,"_toc_text","")
            key=f"h{level}-{self.seq.nextf('heading')}"; self.canv.bookmarkPage(key)
            # Keep PDF bookmarks flat; the printed TOC retains full hierarchy.
            # A flat outline is also stable across ReportLab's multiBuild passes.
            self.canv.addOutlineEntry(text,key,level=0,closed=False)
            self.notify("TOCEntry",(level,text,self.page,key))

def make_table(rows):
    n=max(len(r) for r in rows); rows=[r+[""]*(n-len(r)) for r in rows]
    # Equal widths are predictable for RTL operational tables; compact font for wide matrices.
    colw=[(168*mm)/n]*n
    f=6.4 if n>=6 else 7.1 if n>=4 else 7.6
    ps=ParagraphStyle("Cell",fontName="Tahoma",fontSize=f,leading=f+3.3,alignment=TA_RIGHT,textColor=INK,wordWrap="RTL")
    ph=ParagraphStyle("CellH",parent=ps,fontName="Tahoma-Bold",textColor=WHITE)
    data=[]
    for ri,row in enumerate(rows):
        data.append([Paragraph(rich_rtl(c),ph if ri==0 else ps) for c in reversed(row)])
    t=LongTable(data,colWidths=colw,repeatRows=1,hAlign="RIGHT")
    t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),TEAL_DARK),("TEXTCOLOR",(0,0),(-1,0),WHITE),
        ("GRID",(0,0),(-1,-1),.35,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,colors.HexColor("#F7FAFC")]),
    ]))
    return t

def parse_markdown(text):
    story=[]; lines=text.splitlines(); i=0; mermaid_index=0; first_h1=True
    while i<len(lines):
        line=lines[i].rstrip()
        if not line or line.strip()=="---" or line.startswith("<div") or line.startswith("</div"):
            if not line: story.append(Spacer(1,2.5*mm))
            i+=1; continue
        if line.startswith("```"):
            lang=line[3:].strip(); buf=[]; i+=1
            while i<len(lines) and not lines[i].startswith("```"):
                buf.append(lines[i]); i+=1
            i+=1
            if lang=="mermaid":
                mermaid_index+=1; story.extend([Spacer(1,2*mm),Diagram(mermaid_index),Spacer(1,4*mm)])
            else:
                story.append(Preformatted("\n".join(buf),code_style,maxLineLength=105)); story.append(Spacer(1,3*mm))
            continue
        if line.startswith("# "):
            title=line[2:].strip()
            if first_h1: first_h1=False; i+=1; continue
            story.append(PageBreak()); p=Paragraph(rich_rtl(title),h1); p._toc_level=0; p._toc_text=rtl(title); story.append(p); i+=1; continue
        if line.startswith("## "):
            title=line[3:].strip(); p=Paragraph(rich_rtl(title),h2); p._toc_level=1; p._toc_text=rtl(title); story.append(p); i+=1; continue
        if line.startswith("### "):
            title=line[4:].strip(); p=Paragraph(rich_rtl(title),h3); p._toc_level=2; p._toc_text=rtl(title); story.append(p); i+=1; continue
        if line.startswith("|") and i+1<len(lines) and re.match(r"^\|?[\s:|-]+\|",lines[i+1]):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith("|"):
                if not re.match(r"^\|?[\s:|-]+\|?\s*$",lines[i]):
                    rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i+=1
            if rows: story.extend([make_table(rows),Spacer(1,4*mm)])
            continue
        if line.startswith("> "):
            story.append(Paragraph(rich_rtl(line[2:]),quote)); i+=1; continue
        if re.match(r"^[-*] ",line):
            story.append(Paragraph(rich_rtl("• "+line[2:]),body)); i+=1; continue
        if re.match(r"^\d+\. ",line):
            story.append(Paragraph(rich_rtl(line),body)); i+=1; continue
        # Join ordinary wrapped lines until a structural boundary.
        buf=[line]
        i+=1
        while i<len(lines):
            nxt=lines[i].rstrip()
            if not nxt or nxt.startswith(("#","|",">","```","- ","* ","<div","</div")) or re.match(r"^\d+\. ",nxt): break
            buf.append(nxt); i+=1
        story.append(Paragraph(rich_rtl(" ".join(buf).replace("  "," ")),body))
    return story

def cover():
    title=Paragraph(rich_rtl("PEYVO - راهنمای عملیات، زیرساخت و تداوم کسب‌وکار"),
                    ParagraphStyle("Cover",fontName="Tahoma-Bold",fontSize=24,leading=36,textColor=WHITE,alignment=TA_CENTER))
    subtitle=Paragraph(rich_rtl("Operational, Infrastructure & Business Continuity Handbook"),
                       ParagraphStyle("Sub",fontName="Arial-Bold",fontSize=12,leading=18,textColor=colors.HexColor("#B7E7E0"),alignment=TA_CENTER))
    meta=Table([
        [Paragraph(rich_rtl("نسخه سند"),small),Paragraph("1.0",small)],
        [Paragraph(rich_rtl("تاریخ"),small),Paragraph("2026-08-18",small)],
        [Paragraph(rich_rtl("Commit"),small),Paragraph("c6893bcdf90d815049cc5b8b82f66af0b09832c0",ParagraphStyle("hash",parent=small,fontName="Arial",fontSize=6.5))],
        [Paragraph(rich_rtl("Production"),small),Paragraph("https://peyvo.ir",small)],
    ],colWidths=[45*mm,95*mm])
    meta.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#16283B")),("GRID",(0,0),(-1,-1),.4,colors.HexColor("#36516A")),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
    warning=Paragraph(rich_rtl("محرمانه عملیاتی - بدون رمز و کلید. این سند را فقط در اختیار مالک و اپراتور مورد اعتماد قرار دهید."),
                      ParagraphStyle("CoverWarn",fontName="Tahoma-Bold",fontSize=9,leading=16,textColor=colors.HexColor("#FFE6A6"),alignment=TA_CENTER,borderColor=AMBER,borderWidth=.8,borderPadding=9))
    return [Spacer(1,35*mm),title,Spacer(1,5*mm),subtitle,Spacer(1,25*mm),meta,Spacer(1,18*mm),warning,PageBreak()]

def toc_page():
    toc=TableOfContents(); toc.levelStyles=[
        ParagraphStyle("TOC0",fontName="Tahoma-Bold",fontSize=9.5,leading=15,rightIndent=0,leftIndent=12,textColor=NAVY),
        ParagraphStyle("TOC1",fontName="Tahoma",fontSize=8,leading=13,rightIndent=12,leftIndent=20,textColor=MUTED),
        ParagraphStyle("TOC2",fontName="Tahoma",fontSize=7.2,leading=11,rightIndent=24,leftIndent=26,textColor=MUTED),
    ]
    return [Paragraph(rich_rtl("فهرست مطالب"),h1),Spacer(1,4*mm),toc,PageBreak()]

md=SOURCE.read_text(encoding="utf-8")
doc=HandbookDoc(str(OUTPUT))
story=cover()+toc_page()+parse_markdown(md)
doc.multiBuild(story)
print(str(OUTPUT))
