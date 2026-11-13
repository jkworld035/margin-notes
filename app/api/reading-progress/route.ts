import { NextResponse } from "next/server";
import { saveReadingProgress } from "@/app/actions/library";

// Used by the reader's sendBeacon call when a tab is closed or hidden,
// when a normal request would be cancelled before it finishes.
export async function POST(req: Request) {
  try {
    const body = JSON.parse(await req.text()) as {
      bookId?: string;
      chapterNumber?: number;
      fraction?: number;
      percent?: number;
      completed?: boolean;
    };

    const result = await saveReadingProgress(
      String(body.bookId ?? ""),
      Number(body.chapterNumber),
      Number(body.fraction),
      Number(body.percent),
      Boolean(body.completed)
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}
