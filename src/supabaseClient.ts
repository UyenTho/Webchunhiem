import { createClient } from '@supabase/supabase-js';

// Đảm bảo URL nằm trong dấu ngoặc '...' và không có /rest/v1/ ở cuối
const SUPABASE_URL = 'https://lhniybeikslkwtrwqktv.supabase.co';

// Dán Anon Key (chuỗi dài bắt đầu bằng eyJ...) vào giữa hai dấu nháy '...'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxobml5YmVpa3Nsa3d0cndxa3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyNTUzMDQsImV4cCI6MjEwMTgzMTMwNH0.70ml0JtA9VYIYoIFXz5X8vqOjyK6h0FBZYZTyzhhot0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);