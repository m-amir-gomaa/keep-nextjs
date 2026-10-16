import { NoteDetail } from "@/components/NoteDetail";
export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NoteDetail key={id} id={id} />;
}
