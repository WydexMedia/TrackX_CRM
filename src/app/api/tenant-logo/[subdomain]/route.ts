import { NextResponse } from "next/server";
import { getTenantLogo } from "@/lib/tenant";

export async function GET(
  _req: Request,
  { params }: { params: { subdomain: string } }
) {
  try {
    const subdomain = decodeURIComponent(params.subdomain);
    const logoPath = await getTenantLogo(subdomain);
    
    if (logoPath) {
      return NextResponse.json({ logoPath });
    } else {
      return NextResponse.json({ logoPath: null });
    }
  } catch (error) {
    console.error("Error fetching tenant logo:", error);
    return NextResponse.json({ logoPath: null });
  }
} 