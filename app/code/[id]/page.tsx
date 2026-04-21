import { createSession, getSession } from "../../../lib/api";
import CollaborativeEditor from "../../../components/CollaborativeEditor";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function CodePage({ params }: PageProps) {
  let session = await getSession(params.id);

  if (!session) {
    session = await createSession(params.id);
  }

  return (
    <CollaborativeEditor
      key={session.id}
      sessionId={session.id}
      initialCode={session.code}
      initialLanguage={session.language}
      initialBuffers={session.buffers}
    />
  );
}
