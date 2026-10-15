import { NotesView } from "@/components/NotesView";
export default async function LabelPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  return <NotesView view="label" label={name} />;
}
