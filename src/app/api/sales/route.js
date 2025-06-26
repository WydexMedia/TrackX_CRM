import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const salesFile = path.join(process.cwd(), 'sales.json');

export async function POST(request) {
  const data = await request.json();
  let sales = [];
  try {
    if (fs.existsSync(salesFile)) {
      const fileData = fs.readFileSync(salesFile, 'utf-8');
      sales = JSON.parse(fileData);
    }
  } catch (e) {
    sales = [];
  }
  sales.push({ ...data, createdAt: new Date().toISOString() });
  fs.writeFileSync(salesFile, JSON.stringify(sales, null, 2));
  return NextResponse.json({ success: true });
}

export async function GET() {
  let sales = [];
  try {
    if (fs.existsSync(salesFile)) {
      const fileData = fs.readFileSync(salesFile, 'utf-8');
      sales = JSON.parse(fileData);
    }
  } catch (e) {
    sales = [];
  }
  return NextResponse.json(sales);
}
