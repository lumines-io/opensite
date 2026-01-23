import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function GET() {
  try {
    const payload = await getPayload({ config });

    const { docs: districts } = await payload.find({
      collection: 'districts',
      limit: 100,
      sort: 'name',
    });

    const results = districts.map((d) => ({
      id: d.id,
      name: d.name,
      nameEn: d.nameEn,
      code: d.code,
    }));

    return NextResponse.json({ districts: results });
  } catch (error) {
    console.error('Districts fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
