import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No document provided" }, { status: 400 });
    }

    // Size limit check: 10MB free limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Free Serverless Base64 Data URI - Har document format (PDF, Word, Excel, Images, ZIP) support karta hai
    const mimeType = file.type || "application/octet-stream";
    const base64Data = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType,
    });
  } catch (error: any) {
    console.error("Doc upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process document" },
      { status: 500 }
    );
  }
}