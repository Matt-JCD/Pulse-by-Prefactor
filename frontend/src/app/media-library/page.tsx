import { fetchEpisodes } from '@/features/media-library/MediaLibrary.api';
import { MediaLibrary } from '@/features/media-library/MediaLibrary';

export default async function MediaLibraryPage() {
  const episodes = await fetchEpisodes();
  return <MediaLibrary episodes={episodes} />;
}
