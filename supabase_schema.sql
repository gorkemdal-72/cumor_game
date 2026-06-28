-- Cax Game Supabase Schema

-- Enable UUID extension (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: profiles (Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: We handle authentication via Supabase Auth. The 'profiles' table stores game-specific user data.
-- You can create a trigger to automatically add a profile when a new user signs up in auth.users, but for this implementation, we will manually insert into profiles upon registration.

-- Table: sessions (For custom session management if needed, but Supabase Auth gives us JWT tokens)
-- Since we are migrating, we might still want to keep our custom session IDs (UUIDs) for Socket.IO backwards compatibility or just use Supabase Auth tokens.
-- If we use custom tokens as before:
CREATE TABLE IF NOT EXISTS public.sessions (
    token UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: game_history
CREATE TABLE IF NOT EXISTS public.game_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_name TEXT NOT NULL,
    winner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    winner_name TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: game_history_players (To store players for each game)
CREATE TABLE IF NOT EXISTS public.game_history_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES public.game_history(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    color TEXT NOT NULL,
    vp INTEGER DEFAULT 0,
    is_winner BOOLEAN DEFAULT false
);

-- Policies (Optional, if you want Row Level Security)
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
