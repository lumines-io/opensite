'use client';

import { VIETNAM_CITIES, type CityId } from './construction-map.constants';

interface CitySelectionModalProps {
  isOpen: boolean;
  onSelectCity: (cityId: CityId) => void;
}

/**
 * Location icon
 */
function LocationIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/**
 * City button component
 */
function CityButton({
  cityId,
  name,
  onClick,
}: {
  cityId: CityId;
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full p-4 text-left rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <LocationIcon />
        </div>
        <span className="text-base font-medium text-card-foreground">
          {name}
        </span>
      </div>
    </button>
  );
}

/**
 * Modal for selecting a city when geolocation is unavailable
 */
export function CitySelectionModal({
  isOpen,
  onSelectCity,
}: CitySelectionModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 z-30 backdrop-blur-sm" />

      {/* Modal */}
      <div className="absolute inset-0 z-40 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-xl border border-border w-full max-w-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-card-foreground">
              Chọn thành phố của bạn
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Không thể xác định vị trí của bạn. Vui lòng chọn thành phố để xem bản đồ công trình.
            </p>
          </div>

          {/* City options */}
          <div className="px-6 pb-6 space-y-3">
            {(Object.entries(VIETNAM_CITIES) as [CityId, typeof VIETNAM_CITIES[CityId]][]).map(
              ([cityId, city]) => (
                <CityButton
                  key={cityId}
                  cityId={cityId}
                  name={city.name}
                  onClick={() => onSelectCity(cityId)}
                />
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}
