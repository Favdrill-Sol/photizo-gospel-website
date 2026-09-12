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
// =========================================================
// EVENT REGISTRATIONS
// =========================================================

async function loadRegistrations() {
  const tableBody = document.getElementById("registrationsTableBody");
  const countElement = document.getElementById("registrationsCount");
  const messageElement = document.getElementById("registrationMessage");

  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="loading-message">
        Loading registrations...
      </td>
    </tr>
  `;

  if (messageElement) {
    messageElement.textContent = "";
  }

  try {
    const { data, error } = await supabase
      .from("event_registrations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (countElement) {
      countElement.textContent = data.length;
    }

    if (!data || data.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="loading-message">
            No registrations found.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = data.map((registration) => `
      <tr>
        <td>${registration.id ?? ""}</td>
        <td>${registration.name ?? ""}</td>
        <td>${registration.email ?? ""}</td>
        <td>${registration.event_name ?? registration.event ?? ""}</td>
        <td>
          <button
            class="delete-btn"
            onclick="deleteRegistration('${registration.id}')"
          >
            Delete
          </button>
        </td>
      </tr>
    `).join("");

  } catch (error) {
    console.error("Error loading registrations:", error);

    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="loading-message">
          Failed to load registrations.
        </td>
      </tr>
    `;

    if (messageElement) {
      messageElement.textContent =
        "Unable to load registrations. Please try again.";
    }
  }
}


// =========================================================
// DELETE REGISTRATION
// =========================================================

async function deleteRegistration(id) {

  const confirmed = confirm(
    "Are you sure you want to delete this registration?"
  );

  if (!confirmed) return;

  try {

    const { error } = await supabase
      .from("event_registrations")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    alert("Registration deleted successfully.");

    loadRegistrations();

  } catch (error) {

    console.error("Error deleting registration:", error);

    alert("Failed to delete registration.");
  }
}
