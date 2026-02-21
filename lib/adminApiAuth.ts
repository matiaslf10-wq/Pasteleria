import { NextRequest } from 'next/server';

export function assertAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim();
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) throw new Error('ADMIN_API_TOKEN missing');
  return Boolean(token && token === expected);
}
