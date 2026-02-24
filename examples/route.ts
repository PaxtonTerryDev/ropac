import { NextRequest, NextResponse } from "next/server"
import { userModel } from "./model"
import { ModelInstance } from "@/lib/models";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const viewerId = searchParams.get('viewerId');

  const controller = new ModelInstance(userModel).createController();
  if (!userId) return NextResponse.error();

  const res = await controller.handleRequest({ userId, viewerId: viewerId ?? userId })

  return NextResponse.json(res)
}

export async function PATCH(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const viewerId = searchParams.get('viewerId');

  if (!userId) return NextResponse.error();

  const body = await request.json();
  const { data } = body;

  const controller = new ModelInstance(userModel).createController();

  try {
    const res = await controller.handleUpdate(data, { userId, viewerId: viewerId ?? userId });
    return NextResponse.json(res);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
