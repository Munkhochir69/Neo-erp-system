
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://wzlzhauwegyrcyhdhfyd.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bHpoYXV3ZWd5cmN5aGRoZnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTI5NDcsImV4cCI6MjA4NDk4ODk0N30.wit-T2APmNpHoWgutQOwEcJhUKMoVnlrpkh4iGX1JL8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
