/**
 * Shared TypeScript types. These mirror the database tables in
 * supabase/migrations so the compiler catches typos in column names.
 */
import type { Category } from '../constants/categories';
import type { Location } from '../constants/locations';

export type ItemType = 'lost' | 'found';
export type ItemStatus = 'open' | 'claimed' | 'returned';
export type ClaimStatus = 'pending' | 'approved' | 'rejected';

/** Your own profile row (includes private fields like phone). */
export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_admin: boolean;
  push_token: string | null;
  created_at: string;
}

/** What other users can see about someone. Phone and email are hidden. */
export type PublicProfile = Pick<Profile, 'id' | 'name' | 'is_admin' | 'created_at'>;

export interface Item {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  description: string;
  category: Category;
  location: Location;
  date: string; // 'YYYY-MM-DD': the day it was lost or found
  photo_urls: string[];
  verification_question: string | null;
  status: ItemStatus;
  created_at: string;
}

/** An item plus the poster's public name (joined from profiles). */
export interface ItemWithPoster extends Item {
  poster: { id: string; name: string } | null;
}

export interface ItemFilters {
  search?: string;
  type?: ItemType | null;
  category?: Category | null;
  location?: Location | null;
  dateFrom?: string | null; // YYYY-MM-DD
  dateTo?: string | null;
}

export interface Claim {
  id: string;
  item_id: string;
  claimer_id: string;
  answer_given: string | null;
  status: ClaimStatus;
  created_at: string;
}

/** A claim with the claimer's name (owner's view). */
export interface ClaimWithClaimer extends Claim {
  claimer: { id: string; name: string } | null;
}

/** A claim with its item (claimer's "My claims" view). */
export interface ClaimWithItem extends Claim {
  item: Pick<Item, 'id' | 'title' | 'type' | 'category' | 'photo_urls' | 'status'> | null;
}

/** Contact details shared after an approved claim. */
export interface ClaimContact {
  contact_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
}

/** A stored match, joined with the OTHER item, for the "Possible Matches" section. */
export interface MatchWithItem {
  id: string;
  score: number;
  item: ItemWithPoster;
}

export interface AdminStats {
  total_items: number;
  lost_items: number;
  found_items: number;
  open_items: number;
  claimed_items: number;
  returned_items: number;
  return_rate: number;
  top_lost_category: string | null;
  top_lost_location: string | null;
  total_users: number;
  open_reports: number;
}

export interface ReportWithItem extends Report {
  item: Pick<Item, 'id' | 'title' | 'type' | 'user_id'> | null;
  reporter: { id: string; name: string } | null;
}

export interface Match {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  score: number;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  item_id: string | null;
  read: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  item_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
}
