export async function GET() {
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;

  const body = publisherId
    ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0`
    : "# No ad network configured yet.";

  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
}
