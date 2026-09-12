/* =========================================================
   PHOTIZO GOSPEL MISSION INTERNATIONAL
   ADMIN AUTHENTICATION
========================================================= */

const adminLoginForm = document.getElementById("admin-login-form");
const loginMessage = document.getElementById("login-message");


/* =========================================================
   ADMIN LOGIN
========================================================= */

adminLoginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email =
        document.getElementById("admin-email").value.trim();

    const password =
        document.getElementById("admin-password").value;

    loginMessage.textContent = "Signing in...";


    try {

        /* Sign in with Supabase Auth */

        const { data: authData, error: authError } =
            await photizoSupabase.auth.signInWithPassword({
                email: email,
                password: password
            });


        if (authError) {

            console.error("Login error:", authError);

            loginMessage.textContent =
                "Invalid email or password.";

            return;
        }


        const user = authData.user;


        /* =================================================
           CHECK ADMIN TABLE
        ================================================= */

        const { data: adminData, error: adminError } =
            await photizoSupabase
                .from("admins")
                .select("id, user_id, full_name, email, is_active")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .maybeSingle();


        if (adminError) {

            console.error(
                "Admin verification error:",
                adminError
            );

            await photizoSupabase.auth.signOut();

            loginMessage.textContent =
                "Unable to verify administrator access.";

            return;
        }


        if (!adminData) {

            await photizoSupabase.auth.signOut();

            loginMessage.textContent =
                "You are not authorized to access the Admin area.";

            return;
        }


        /* =================================================
           SUCCESS
        ================================================= */

        loginMessage.textContent =
            "Login successful. Welcome " +
            adminData.full_name + "!";


        /*
           Dashboard will be connected here
           in the next stage.
        */

        console.log(
            "Administrator authenticated:",
            adminData
        );

    } catch (error) {

        console.error(
            "Unexpected login error:",
            error
        );

        loginMessage.textContent =
            "Something went wrong. Please try again.";
    }

});
