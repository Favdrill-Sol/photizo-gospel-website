/* =========================================================
   PHOTIZO GOSPEL MISSION INTERNATIONAL
   SUPABASE CONNECTION
========================================================= */

const SUPABASE_URL =
    "https://dtrhlngjqecednckwexv.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_orDFZig1PQp8ql7zRAMIuA_SXgoy4E3";


/* =========================================================
   CREATE SUPABASE CLIENT
========================================================= */

const photizoSupabase =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


/* =========================================================
   CONNECTION TEST
========================================================= */

async function testSupabaseConnection() {

    try {

        const { data, error } =
            await photizoSupabase
                .from("sermons")
                .select("id")
                .limit(1);


        if (error) {

            console.error(
                "Supabase connection error:",
                error
            );

            return false;
        }


        console.log(
            "Photizo Supabase connection successful."
        );

        return true;

    } catch (error) {

        console.error(
            "Unexpected Supabase error:",
            error
        );

        return false;
    }
  }
