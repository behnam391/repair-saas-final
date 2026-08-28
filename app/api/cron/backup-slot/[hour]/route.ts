import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildBackupJson, sendBackupToTelegram } from "@/lib/backup";
import { decryptSecret } from "@/lib/crypto";
import { logCaught } from "@/lib/logError";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Hobby permits each cron only once daily. The project registers 24
// lightweight daily slots; only the slot selected in Super Admin sends data.
export async function GET(req:NextRequest,{params}:{params:{hour:string}}){
  if(req.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"unauthorized"},{status:401});
  const slot=Number(params.hour); if(!Number.isInteger(slot)||slot<0||slot>23)return NextResponse.json({error:"invalid_slot"},{status:400});
  try{
    const s=await db.platformSettings.findUnique({where:{id:"singleton"}});
    if(!s?.telegramBackupEnabled||s.telegramBackupHour!==slot)return NextResponse.json({ok:true,skipped:"not_selected_slot"});
    if(!s.telegramBotToken||!s.telegramChatId)return NextResponse.json({ok:false,skipped:"telegram_not_configured"});
    const token=decryptSecret(s.telegramBotToken);if(!token)return NextResponse.json({ok:false,skipped:"telegram_token_unreadable"});
    const stamp=new Date().toISOString();const {json,filename}=await buildBackupJson(stamp);
    const result=await sendBackupToTelegram(token,s.telegramChatId,json,filename,`🗄️ بکاپ خودکار پیوو — ساعت ${slot.toLocaleString("fa-IR")}:۰۰ ایران`);
    if(!result.ok)await logCaught(new Error(result.error||"telegram send failed"),{source:"server",path:`/api/cron/backup-slot/${slot}`});
    return NextResponse.json({ok:result.ok,error:result.ok?undefined:result.error});
  }catch(e){await logCaught(e,{source:"server",path:`/api/cron/backup-slot/${slot}`});return NextResponse.json({error:"internal_error"},{status:500});}
}
