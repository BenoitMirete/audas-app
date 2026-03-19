import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ArtifactViewerProps {
  screenshots: string[];
  videos: string[];
  traces: string[];
  apiBase: string;
}

export function ArtifactViewer({ screenshots, videos, traces, apiBase }: ArtifactViewerProps) {
  const hasTabs = screenshots.length > 0 || videos.length > 0 || traces.length > 0;
  if (!hasTabs) return null;

  return (
    <Tabs defaultValue={screenshots.length > 0 ? 'screenshots' : videos.length > 0 ? 'videos' : 'traces'}>
      <TabsList>
        {screenshots.length > 0 && <TabsTrigger value="screenshots">Screenshots</TabsTrigger>}
        {videos.length > 0 && <TabsTrigger value="videos">Videos</TabsTrigger>}
        {traces.length > 0 && <TabsTrigger value="traces">Traces</TabsTrigger>}
      </TabsList>
      {screenshots.length > 0 && (
        <TabsContent value="screenshots" className="flex flex-wrap gap-4 mt-4">
          {screenshots.map((path, i) => (
            <a key={i} href={`${apiBase}/${path}`} target="_blank" rel="noopener noreferrer">
              <img src={`${apiBase}/${path}`} alt={`Screenshot ${i + 1}`} className="max-h-64 rounded border" />
            </a>
          ))}
        </TabsContent>
      )}
      {videos.length > 0 && (
        <TabsContent value="videos" className="flex flex-col gap-4 mt-4">
          {videos.map((path, i) => (
            <video key={i} controls className="max-h-64 rounded border">
              <source src={`${apiBase}/${path}`} />
            </video>
          ))}
        </TabsContent>
      )}
      {traces.length > 0 && (
        <TabsContent value="traces" className="flex flex-col gap-2 mt-4">
          {traces.map((path, i) => (
            <a key={i} href={`${apiBase}/${path}`} download className="underline text-sm">
              Download Trace {i + 1}
            </a>
          ))}
        </TabsContent>
      )}
    </Tabs>
  );
}
