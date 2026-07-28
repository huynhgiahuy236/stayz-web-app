export type Hotel = {
  _id: string;
  title: string;
  slug: string;
  city: string;
  address: string;
  country?: string;
  description?: string;
  type?: string;
  main_image_url?: string;
  gallery_images?: { url: string; _id?: string }[];
  min_price?: number | null;
  base_price?: number | null;
  rating?: number | null;
  review_count?: number;
  available_rooms?: number;
  max_capacity?: number | null;
  is_preferred?: boolean;
  amenities?: Record<string, boolean>;
};

export type SearchResponse = {
  items?: Hotel[];
  data?: Hotel[];
  properties?: Hotel[];
  total?: number;
  page?: number;
};
