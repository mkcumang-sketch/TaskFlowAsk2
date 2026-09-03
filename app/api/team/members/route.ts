import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();

  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await prisma.user.findMany({
    where: {
      organizationId: session.organizationId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: {
        select: { name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(members);
}