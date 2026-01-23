import { HomePage } from '@/components/HomePage';

export default function Home() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  return <HomePage mapboxToken={mapboxToken} />;
}
