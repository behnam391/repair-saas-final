import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";

const Schema=z.object({active:z.boolean().optional(),permissions:z.array(z.string()).optional()});
export async function PATCH(req:NextRequest,{params}:{params:{id:string}}){try{const me=await requireSuperAdmin();if(!me.isOwner)throw new UnauthorizedError();const target=await db.platformAdmin.findUnique({where:{id:params.id}});if(!target||target.role==="OWNER")return NextResponse.json({error:"owner_protected"},{status:403});const b=Schema.parse(await req.json());const manager=await db.platformAdmin.update({where:{id:params.id},data:{active:b.active,permissions:b.permissions?.join(",")},select:{id:true,name:true,phone:true,role:true,permissions:true,active:true,createdAt:true}});return NextResponse.json({manager});}catch(e){return NextResponse.json({error:e instanceof UnauthorizedError?"unauthorized":"invalid_request"},{status:e instanceof UnauthorizedError?401:400});}}
