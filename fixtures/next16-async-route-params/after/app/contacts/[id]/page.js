import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Contact({ params, searchParams }) {
  const repaired = process.env.FIXTURE_AWAIT_PARAMS === '1';
  const path = repaired ? await params : params;
  const query = repaired ? await searchParams : searchParams;
  const id = Number(path.id);
  if (!Number.isFinite(id) || id <= 0) notFound();
  const display = id + (query.edit === '1' ? ' / edit' : ' / view');
  return <main id="answer">{display}</main>;
}
