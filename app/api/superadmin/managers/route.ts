import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";

const PERMISSIONS = ["shops", "customers", "support", "verification", "marketing", "sessions", "settings", "maintenance"] as const;
const CreateSchema = z.object({ name:z.string().trim().min(2).max(80), phone:z.string().transform(normalizePhone), password:z.string().min(8).max(100), permissions:z.array(z.enum(PERMISSIONS)).min(1) });

export async function GET() {
  try { const me = await requireSuperAdmin(); if (!me.isOwner) throw new UnauthorizedError(); const managers = await db.platformAdmin.findMany({ orderBy:{createdAt:"asc"}, select:{id:true,name:true,phone:true,role:true,permissions:true,active:true,createdAt:true} }); return NextResponse.json({ managers }); }
  catch(e){ return NextResponse.json({error:"unauthorized"},{status:e instanceof UnauthorizedError?401:500}); }
}

export async function POST(req:NextRequest) {
  try { const me=await requireSuperAdmin(); if(!me.isOwner) throw new UnauthorizedError(); const body=CreateSchema.parse(await req.json()); const manager=await db.platformAdmin.create({data:{name:body.name,phone:body.phone,passwordHash:await bcrypt.hash(body.password,12),role:"MANAGER",permissions:body.permissions.join(","),active:true},select:{id:true,name:true,phone:true,role:true,permissions:true,active:true,createdAt:true}}); return NextResponse.json({manager},{status:201}); }
  catch(e:any){ if(e instanceof UnauthorizedError)return NextResponse.json({error:"unauthorized"},{status:401}); if(e instanceof z.ZodError)return NextResponse.json({error:"invalid_input",message:"نام، موبایل، رمز حداقل ۸ کاراکتری و دست‌کم یک دسترسی لازم است."},{status:400}); if(e?.code==="P2002")return NextResponse.json({error:"duplicate_phone",message:"این شماره قبلاً استفاده شده است."},{status:409}); return NextResponse.json({error:"internal_error"},{status:500}); }
}
