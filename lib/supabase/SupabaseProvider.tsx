"use client"

import { createContext, useContext, useState } from "react"
import {SupabaseClient} from "@supabase/supabase-js"
import { createClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/nextjs";
import { useEffect } from "react";

type SupabaseContext = {
    supabase: SupabaseClient | null; 
    isLoaded: boolean;
}

const Context = createContext<SupabaseContext>({
    supabase: null, 
    isLoaded: false 
});

export default function SupabaseProvider({children} : {children: React.ReactNode}) { 

    const {session} = useSession();
    const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
    const [isLoaded, setIsLoaded] = useState<boolean>(false);

    useEffect(() => {
        // Always create the client, even without a session
        const client = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                accessToken: async () => session?.getToken() ?? null
            }
        );
        setSupabase(client);
        setIsLoaded(true);
    }, [session])

    return (
        <Context.Provider value={{supabase, isLoaded}}>
            {children}
        </Context.Provider>
    )
}

export const useSupabase = () => {
    const context = useContext(Context);
    if (context === undefined) {
        throw new Error("useSupabase needs to be inside the provider")
    }
    return context;
}