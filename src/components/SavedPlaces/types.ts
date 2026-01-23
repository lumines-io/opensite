// Types for Saved Places feature

export interface AddressList {
  id: string | number;
  name: string;
  description?: string;
  user: string | number | { id: string | number };
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  addressCount?: number;
}

export interface SavedAddress {
  id: string | number;
  label: string;
  addressText?: string;
  location: GeoJSON.Point;
  note?: string;
  user: string | number | { id: string | number };
  addressList: string | number | AddressList;
  construction?: string | number | {
    id: string | number;
    title?: string;
    slug?: string;
  };
  tags?: { tag: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedPlaceFeatureProperties {
  id: string | number;
  label: string;
  addressText?: string;
  note?: string;
  listId?: string | number;
  listName?: string;
  construction?: {
    id: string | number;
    title?: string;
    slug?: string;
  };
  tags: string[];
  createdAt: string;
}

// API Input Types
export interface CreateListInput {
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface UpdateListInput {
  name?: string;
  description?: string;
  isDefault?: boolean;
}

export interface CreateAddressInput {
  label: string;
  addressText?: string;
  location: GeoJSON.Point;
  note?: string;
  addressList?: string | number;
  construction?: string | number;
  tags?: { tag: string }[];
}

export interface UpdateAddressInput {
  label?: string;
  addressText?: string;
  location?: GeoJSON.Point;
  note?: string;
  addressList?: string | number;
  construction?: string | number | null;
  tags?: { tag: string }[];
}

// API Response Types
export interface ListsResponse {
  lists: AddressList[];
}

export interface ListWithAddressesResponse {
  list: AddressList;
  addresses: SavedAddress[];
}

export interface AddressesResponse {
  addresses: SavedAddress[];
  pagination: {
    page: number;
    limit: number;
    totalDocs: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CreateListResponse {
  success: boolean;
  list: AddressList;
}

export interface UpdateListResponse {
  success: boolean;
  list: AddressList;
}

export interface CreateAddressResponse {
  success: boolean;
  address: SavedAddress;
}

export interface UpdateAddressResponse {
  success: boolean;
  address: SavedAddress;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}

export interface ApiError {
  error: string;
}
