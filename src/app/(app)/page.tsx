import { HomePage } from '@/components/HomePage';

export default function Home() {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  return <HomePage googleMapsApiKey={googleMapsApiKey} />;
}
