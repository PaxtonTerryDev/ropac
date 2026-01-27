import { NextRequest, NextResponse } from "next/server"
import { userModel } from "./model"
import { ModelInstance } from "@/lib/models";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('userId');

  const controller = new ModelInstance(userModel).createController();
  if (!id) return NextResponse.error();
  const res = await controller.handleRequest({ userId: id })
  return NextResponse.json({
    model: res,
  })

}
