/* =========================================================
   PHOTIZO GOSPEL MISSION INTERNATIONAL
   COMPLETE ADMIN DASHBOARD JAVASCRIPT
   =========================================================

   Works with the existing admin.html.

   FEATURES:
   - Supabase authentication
   - Admin authorization
   - Session protection
   - Events management
   - Event flyer upload
   - Event date
   - Event description
   - Registration link
   - Publish / unpublish events
   - Edit events
   - Delete events
   - Event registrations
   - Delete registrations
   - Sermon audio upload
   - Sermon image upload
   - Add / edit sermons
   - Publish / unpublish sermons
   - Delete sermons
   - Dashboard counters
   - Logout
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
  "https://dtrhlngjqecednckwexv.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_orDFZig1PQp8ql7zRAMIuA_SXgoy4E3";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


/* =========================================================
   STORAGE BUCKETS
   ========================================================= */

const STORAGE = {
  sermonAudio: "sermon-media",
  sermonImages: "sermon-images",
  eventFlyers: "event-flyers"
};


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentAdmin = null;
let editingEventId = null;


/* =========================================================
   SMALL HELPERS
   ========================================================= */

function get(id) {
  return document.getElementById(id);
}


function safeText(value) {
  return value == null ? "" : String(value);
}


function escapeHtml(value) {
  return safeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function createFileName(file) {
  const cleanName =
    file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-");

  return Date.now() + "-" + cleanName;
}


function showMessage(elementId, message, type = "error") {
  const element = get(elementId);

  if (!element) return;

  element.textContent = message;

  element.className =
    "event-message " +
    (
      type === "success"
        ? "success-message"
        : "error-message"
    );
}


function clearMessage(elementId) {
  const element = get(elementId);

  if (!element) return;

  element.textContent = "";
  element.className = "event-message";
}


/* =========================================================
   LOGIN
   ========================================================= */

async function login() {

  const emailElement = get("email");
  const passwordElement = get("password");
  const message = get("loginMessage");

  if (!emailElement || !passwordElement || !message) {
    return;
  }

  const email =
    emailElement.value.trim();

  const password =
    passwordElement.value;

  message.textContent = "";

  if (!email || !password) {
    message.textContent =
      "Please enter your email and password.";
    return;
  }

  message.textContent =
    "Signing in...";

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      console.error("Login error:", error);

      message.textContent =
        "Invalid email or password.";

      return;
    }

    if (!data || !data.user) {

      message.textContent =
        "Unable to create a login session.";

      return;
    }


    /* =====================================================
       VERIFY ADMIN
       ===================================================== */

    const {
      data: adminData,
      error: adminError
    } =
      await supabaseClient
        .from("admins")
        .select(
          "id, user_id, full_name, email, is_active"
        )
        .eq("user_id", data.user.id)
        .eq("is_active", true)
        .maybeSingle();


    if (adminError) {

      console.error(
        "Admin verification error:",
        adminError
      );

      await supabaseClient.auth.signOut();

      message.textContent =
        "Unable to verify administrator access.";

      return;
    }


    if (!adminData) {

      await supabaseClient.auth.signOut();

      message.textContent =
        "You are not authorized to access the Admin area.";

      return;
    }


    currentAdmin = adminData;


    /* =====================================================
       SHOW DASHBOARD
       ===================================================== */

    if (get("loginPage")) {
      get("loginPage").style.display = "none";
    }

    if (get("dashboard")) {
      get("dashboard").style.display = "block";
    }


    const badge = get("adminBadge");

    if (badge) {

      badge.textContent =
        adminData.full_name ||
        adminData.email ||
        "Administrator";

    }


    message.textContent = "";


    /* =====================================================
       LOAD EVERYTHING
       ===================================================== */

    await loadDashboard();

  } catch (error) {

    console.error(
      "Unexpected login error:",
      error
    );

    message.textContent =
      error.message ||
      "Something went wrong. Please try again.";

  }

}


/* =========================================================
   DASHBOARD LOADER
   ========================================================= */

async function loadDashboard() {

  try {

    await Promise.all([
      loadEvents(),
      loadRegistrations(),
      loadSermons(),
      loadAttendance()
    ]);

  } catch (error) {

    console.error(
      "Dashboard loading error:",
      error
    );

  }

}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

  try {

    await supabaseClient.auth.signOut();

  } catch (error) {

    console.error(
      "Logout error:",
      error
    );

  }


  currentAdmin = null;
  editingEventId = null;


  if (get("dashboard")) {
    get("dashboard").style.display = "none";
  }

  if (get("loginPage")) {
    get("loginPage").style.display = "flex";
  }


  if (get("email")) {
    get("email").value = "";
  }

  if (get("password")) {
    get("password").value = "";
  }

  if (get("loginMessage")) {
    get("loginMessage").textContent = "";
  }

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function showSection(sectionId, button) {

  const sections =
    document.querySelectorAll(".section");

  sections.forEach(
    section => {
      section.classList.remove("active");
    }
  );


  const selected =
    get(sectionId);

  if (selected) {
    selected.classList.add("active");
  }


  const buttons =
    document.querySelectorAll(".nav-item");

  buttons.forEach(
    btn => {
      btn.classList.remove("active");
    }
  );


  if (button) {
    button.classList.add("active");
  }


  if (sectionId === "events") {
    ensureEventForm();
    loadEvents();
  }

  if (sectionId === "registrations") {
    loadRegistrations();
  }

  if (sectionId === "attendance") {
    loadAttendance();
  }

  if (sectionId === "sermons") {
    loadSermons();
  }

}


/* =========================================================
   EVENT FORM
   ========================================================= */

function ensureEventForm() {

  const titleInput =
    get("eventTitle");

  const form =
    document.querySelector(".add-event-form");

  if (!form || !titleInput) {
    return;
  }


  /* Don't create twice */

  if (get("eventDate")) {
    return;
  }


  /* =====================================================
     HIDDEN EVENT ID
     ===================================================== */

  const hiddenId =
    document.createElement("input");

  hiddenId.type = "hidden";
  hiddenId.id = "eventId";

  form.insertBefore(
    hiddenId,
    titleInput
  );


  /* =====================================================
     DATE
     ===================================================== */

  const date =
    document.createElement("input");

  date.type = "date";
  date.id = "eventDate";
  date.placeholder = "Event date";

  form.insertBefore(
    date,
    form.querySelector("button")
  );


  /* =====================================================
     DESCRIPTION
     ===================================================== */

  const description =
    document.createElement("textarea");

  description.id =
    "eventDescription";

  description.placeholder =
    "Event description";

  description.rows = 3;

  form.insertBefore(
    description,
    form.querySelector("button")
  );


  /* =====================================================
     REGISTRATION LINK
     ===================================================== */

  const registration =
    document.createElement("input");

  registration.type = "url";

  registration.id =
    "eventRegistrationLink";

  registration.placeholder =
    "Registration link (optional)";

  form.insertBefore(
    registration,
    form.querySelector("button")
  );


  /* =====================================================
     FLYER
     ===================================================== */

  const flyerWrapper =
    document.createElement("div");

  flyerWrapper.id =
    "eventFlyerWrapper";

  flyerWrapper.innerHTML = `
    <label
      for="eventFlyer"
      style="
        display:block;
        margin-bottom:8px;
        font-weight:bold;
      "
    >
      Event Flyer
    </label>

    <input
      type="file"
      id="eventFlyer"
      accept="image/*"
      style="
        width:100%;
        padding:10px;
        border:1px solid #d1d5db;
        border-radius:8px;
      "
    >

    <small
      style="
        display:block;
        margin-top:6px;
        color:#6b7280;
      "
    >
      Upload the event flyer/image.
    </small>
  `;

  form.insertBefore(
    flyerWrapper,
    form.querySelector("button")
  );


  /* =====================================================
     PUBLISH
     ===================================================== */

  const publishWrapper =
    document.createElement("label");

  publishWrapper.id =
    "eventPublishWrapper";

  publishWrapper.style.display =
    "flex";

  publishWrapper.style.alignItems =
    "center";

  publishWrapper.style.gap =
    "8px";

  publishWrapper.style.margin =
    "10px 0";

  publishWrapper.innerHTML = `
    <input
      type="checkbox"
      id="eventPublished"
    >

    <span>
      Publish this event
    </span>
  `;

  form.insertBefore(
    publishWrapper,
    form.querySelector("button")
  );


  /* =====================================================
     CANCEL EDIT
     ===================================================== */

  const cancel =
    document.createElement("button");

  cancel.type = "button";

  cancel.id =
    "cancelEventEditButton";

  cancel.className =
    "secondary-btn";

  cancel.textContent =
    "Cancel Edit";

  cancel.style.display =
    "none";

  cancel.onclick =
    cancelEventEdit;

  form.appendChild(cancel);


  /* =====================================================
     BASIC STYLING
     ===================================================== */

  [
    date,
    registration,
    description
  ].forEach(element => {

    element.style.width = "100%";
    element.style.padding = "13px";
    element.style.border =
      "1px solid #d1d5db";
    element.style.borderRadius = "8px";
    element.style.fontSize = "15px";
    element.style.marginBottom = "10px";

  });

}


/* =========================================================
   LOAD EVENTS
   ========================================================= */

async function loadEvents() {

  ensureEventForm();

  const tableBody =
    get("eventsTableBody");

  if (!tableBody) {
    return;
  }


  tableBody.innerHTML = `
    <tr>
      <td
        colspan="3"
        class="loading-message"
      >
        Loading events...
      </td>
    </tr>
  `;


  clearMessage("eventMessage");


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("Events")
        .select("*")
        .order(
          "id",
          {
            ascending: false
          }
        );


    if (error) {
      throw error;
    }


    const events =
      data || [];


    if (get("eventsCount")) {
      get("eventsCount").textContent =
        events.length;
    }


    if (
      !events.length
    ) {

      tableBody.innerHTML = `
        <tr>
          <td
            colspan="3"
            class="empty-message"
          >
            No events found.
          </td>
        </tr>
      `;

      return;
    }


    tableBody.innerHTML = "";


    events.forEach(event => {

      const row =
        document.createElement("tr");


      const idCell =
        document.createElement("td");

      idCell.textContent =
        safeText(event.id);


      const titleCell =
        document.createElement("td");

      titleCell.textContent =
        safeText(event.title);


      const actionCell =
        document.createElement("td");


      const editButton =
        document.createElement("button");

      editButton.className =
        "primary-btn";

      editButton.textContent =
        "Edit";

      editButton.style.marginRight =
        "6px";

      editButton.onclick =
        () => editEvent(event.id);


      const deleteButton =
        document.createElement("button");

      deleteButton.className =
        "delete-btn";

      deleteButton.textContent =
        "Delete";

      deleteButton.onclick =
        () => deleteEvent(event.id);


      actionCell.appendChild(
        editButton
      );

      actionCell.appendChild(
        deleteButton
      );


      row.appendChild(idCell);
      row.appendChild(titleCell);
      row.appendChild(actionCell);

      tableBody.appendChild(row);

    });


  } catch (error) {

    console.error(
      "Load events error:",
      error
    );


    tableBody.innerHTML = `
      <tr>
        <td
          colspan="3"
          class="empty-message"
        >
          Unable to load events.
        </td>
      </tr>
    `;


    showMessage(
      "eventMessage",
      error.message ||
      "Unable to load events.",
      "error"
    );

  }

}


/* =========================================================
   ADD / UPDATE EVENT
   ========================================================= */

async function addEvent() {

  ensureEventForm();


  const title =
    get("eventTitle")?.value.trim();

  const eventDate =
    get("eventDate")?.value || null;

  const description =
    get("eventDescription")?.value.trim() ||
    null;

  const registrationLink =
    get("eventRegistrationLink")?.value.trim() ||
    null;

  const published =
    get("eventPublished")?.checked || false;

  const flyer =
    get("eventFlyer")?.files[0] || null;


  clearMessage("eventMessage");


  if (!title) {

    showMessage(
      "eventMessage",
      "Please enter an event title.",
      "error"
    );

    return;
  }


  try {

    const existingId =
      editingEventId ||
      get("eventId")?.value;


    /* =====================================================
       UPDATE EXISTING EVENT
       ===================================================== */

    if (existingId) {

      await updateEvent(
        existingId,
        {
          title,
          eventDate,
          description,
          registrationLink,
          published,
          flyer
        }
      );

      return;
    }


    /* =====================================================
       ADD NEW EVENT
       ===================================================== */

    showMessage(
      "eventMessage",
      "Saving event...",
      "success"
    );


    let flyerPath = null;


    if (flyer) {

      showMessage(
        "eventMessage",
        "Uploading event flyer...",
        "success"
      );


      flyerPath =
        "flyers/" +
        createFileName(flyer);


      const {
        error: flyerError
      } =
        await supabaseClient
          .storage
          .from(STORAGE.eventFlyers)
          .upload(
            flyerPath,
            flyer,
            {
              cacheControl: "3600",
              upsert: false
            }
          );


      if (flyerError) {
        throw flyerError;
      }

    }


    showMessage(
      "eventMessage",
      "Saving event...",
      "success"
    );


    /*
      We try the complete event structure first.

      If your existing Events table only contains
      id + title, the fallback inserts title only.
    */

    let result =
      await supabaseClient
        .from("Events")
        .insert([
          {
            title: title,
            event_date: eventDate,
            description: description,
            registration_link: registrationLink,
            flyer_path: flyerPath,
            published: published
          }
        ]);


    /*
      Fallback for the current simple Events table.
    */

    if (
      result.error &&
      /column|schema cache|does not exist/i
        .test(result.error.message)
    ) {

      console.warn(
        "Extended event columns unavailable. Saving title only."
      );


      result =
        await supabaseClient
          .from("Events")
          .insert([
            {
              title: title
            }
          ]);

    }


    if (result.error) {
      throw result.error;
    }


    clearEventForm();


    showMessage(
      "eventMessage",
      "Event added successfully.",
      "success"
    );


    await loadEvents();


  } catch (error) {

    console.error(
      "Add event error:",
      error
    );


    showMessage(
      "eventMessage",
      error.message ||
      "Unable to add event.",
      "error"
    );

  }

}


/* =========================================================
   EDIT EVENT
   ========================================================= */

async function editEvent(eventId) {

  ensureEventForm();


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("Events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();


    if (error) {
      throw error;
    }


    if (!data) {

      showMessage(
        "eventMessage",
        "Event not found.",
        "error"
      );

      return;
    }


    editingEventId =
      data.id;


    if (get("eventId")) {
      get("eventId").value =
        data.id;
    }


    if (get("eventTitle")) {
      get("eventTitle").value =
        data.title || "";
    }


    if (get("eventDate")) {
      get("eventDate").value =
        data.event_date ||
        data.date ||
        "";
    }


    if (get("eventDescription")) {
      get("eventDescription").value =
        data.description || "";
    }


    if (get("eventRegistrationLink")) {
      get("eventRegistrationLink").value =
        data.registration_link ||
        data.registration_url ||
        "";
    }


    if (get("eventPublished")) {
      get("eventPublished").checked =
        data.published === true;
    }


    const addButton =
      document.querySelector(
        '.add-event-form button.primary-btn'
      );


    if (addButton) {
      addButton.textContent =
        "Update Event";
    }


    if (get("cancelEventEditButton")) {
      get("cancelEventEditButton").style.display =
        "inline-block";
    }get("eventTitle")?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });


    showMessage(
      "eventMessage",
      "Editing event.",
      "success"
    );


  } catch (error) {

    console.error(
      "Edit event error:",
      error
    );


    showMessage(
      "eventMessage",
      error.message ||
      "Unable to load event.",
      "error"
    );

  }

}


/* =========================================================
   UPDATE EVENT
   ========================================================= */

async function updateEvent(
  eventId,
  values
) {

  try {

    showMessage(
      "eventMessage",
      "Updating event...",
      "success"
    );


    const {
      data: existing,
      error: fetchError
    } =
      await supabaseClient
        .from("Events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();


    if (fetchError) {
      throw fetchError;
    }


    let flyerPath =
      existing?.flyer_path ||
      existing?.image_path ||
      null;


    if (values.flyer) {

      showMessage(
        "eventMessage",
        "Uploading new flyer...",
        "success"
      );


      const newPath =
        "flyers/" +
        createFileName(values.flyer);


      const {
        error: uploadError
      } =
        await supabaseClient
          .storage
          .from(STORAGE.eventFlyers)
          .upload(
            newPath,
            values.flyer,
            {
              cacheControl: "3600",
              upsert: false
            }
          );


      if (uploadError) {
        throw uploadError;
      }


      if (flyerPath) {

        await supabaseClient
          .storage
          .from(STORAGE.eventFlyers)
          .remove([
            flyerPath
          ]);

      }


      flyerPath =
        newPath;

    }


    let result =
      await supabaseClient
        .from("Events")
        .update({
          title: values.title,
          event_date: values.eventDate,
          description: values.description,
          registration_link:
            values.registrationLink,
          flyer_path: flyerPath,
          published: values.published
        })
        .eq("id", eventId);


    if (
      result.error &&
      /column|schema cache|does not exist/i
        .test(result.error.message)
    ) {

      result =
        await supabaseClient
          .from("Events")
          .update({
            title: values.title
          })
          .eq("id", eventId);

    }


    if (result.error) {
      throw result.error;
    }


    clearEventForm();


    showMessage(
      "eventMessage",
      "Event updated successfully.",
      "success"
    );


    await loadEvents();


  } catch (error) {

    console.error(
      "Update event error:",
      error
    );


    showMessage(
      "eventMessage",
      error.message ||
      "Unable to update event.",
      "error"
    );

  }

}


/* =========================================================
   CANCEL EVENT EDIT
   ========================================================= */

function cancelEventEdit() {

  editingEventId = null;


  if (get("eventId")) {
    get("eventId").value = "";
  }


  if (get("eventTitle")) {
    get("eventTitle").value = "";
  }


  if (get("eventDate")) {
    get("eventDate").value = "";
  }


  if (get("eventDescription")) {
    get("eventDescription").value = "";
  }


  if (get("eventRegistrationLink")) {
    get("eventRegistrationLink").value = "";
  }


  if (get("eventFlyer")) {
    get("eventFlyer").value = "";
  }


  if (get("eventPublished")) {
    get("eventPublished").checked = false;
  }


  const addButton =
    document.querySelector(
      '.add-event-form button.primary-btn'
    );


  if (addButton) {
    addButton.textContent =
      "Add Event";
  }


  if (get("cancelEventEditButton")) {
    get("cancelEventEditButton").style.display =
      "none";
  }

}


/* =========================================================
   CLEAR EVENT FORM
   ========================================================= */

function clearEventForm() {
  cancelEventEdit();
}


/* =========================================================
   DELETE EVENT
   ========================================================= */

async function deleteEvent(eventId) {

  const confirmed =
    confirm(
      "Are you sure you want to delete this event?"
    );


  if (!confirmed) {
    return;
  }


  try {

    const {
      data: event,
      error: fetchError
    } =
      await supabaseClient
        .from("Events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();


    if (fetchError) {
      throw fetchError;
    }


    const {
      error
    } =
      await supabaseClient
        .from("Events")
        .delete()
        .eq("id", eventId);


    if (error) {
      throw error;
    }


    if (
      event?.flyer_path
    ) {

      await supabaseClient
        .storage
        .from(STORAGE.eventFlyers)
        .remove([
          event.flyer_path
        ]);

    }


    showMessage(
      "eventMessage",
      "Event deleted successfully.",
      "success"
    );


    await loadEvents();


  } catch (error) {

    console.error(
      "Delete event error:",
      error
    );


    showMessage(
      "eventMessage",
      error.message ||
      "Unable to delete event.",
      "error"
    );

  }

}


/* =========================================================
   EVENT MESSAGE
   ========================================================= */

function showEventMessage(
  message,
  type
) {

  showMessage(
    "eventMessage",
    message,
    type
  );

}


function clearEventMessage() {
  clearMessage("eventMessage");
}


/* =========================================================
   REGISTRATIONS
   ========================================================= */

async function loadRegistrations() {

  const tableBody =
    get("registrationsTableBody");

  if (!tableBody) {
    return;
  }


  tableBody.innerHTML = `
    <tr>
      <td
        colspan="5"
        class="loading-message"
      >
        Loading registrations...
      </td>
    </tr>
  `;


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("event_registrations")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {
      throw error;
    }


    const registrations =
      data || [];


    if (get("registrationsCount")) {
      get("registrationsCount").textContent =
        registrations.length;
    }


    if (get("registrationsOverviewCount")) {
      get("registrationsOverviewCount").textContent =
        registrations.length;
    }


    if (!registrations.length) {

      tableBody.innerHTML = `
        <tr>
          <td
            colspan="5"
            class="empty-message"
          >
            No registrations found.
          </td>
        </tr>
      `;

      return;
    }


    tableBody.innerHTML = "";


    registrations.forEach(registration => {

      const row =
        document.createElement("tr");


      const id =
        registration.id;


      const name =
        registration.name ||
        "";


      const email =
        registration.email ||
        "";


      const eventName =
        registration.event_name ||
        "";


      row.innerHTML = `
        <td>
          ${escapeHtml(id)}
        </td>

        <td>
          ${escapeHtml(name)}
        </td>

        <td>
          ${escapeHtml(email)}
        </td>

        <td>
          ${escapeHtml(eventName)}
        </td>

        <td>
          <button
            class="delete-btn"
            onclick="deleteRegistration('${escapeHtml(id)}')"
          >
            Delete
          </button>
        </td>
      `;


      tableBody.appendChild(row);

    });


  } catch (error) {

    console.error(
      "Load registrations error:",
      error
    );


    tableBody.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="empty-message"
        >
          Unable to load registrations.
        </td>
      </tr>
    `;


    showMessage(
      "registrationMessage",
      error.message ||
      "Unable to load registrations.",
      "error"
    );

  }

}


/* =========================================================
   DELETE REGISTRATION
   ========================================================= */

async function deleteRegistration(
  registrationId
) {

  const confirmed =
    confirm(
      "Are you sure you want to delete this registration?"
    );


  if (!confirmed) {
    return;
  }


  try {

    const {
      error
    } =
      await supabaseClient
        .from("event_registrations")
        .delete()
        .eq("id", registrationId);


    if (error) {
      throw error;
    }


    showMessage(
      "registrationMessage",
      "Registration deleted successfully.",
      "success"
    );


    await loadRegistrations();


  } catch (error) {

    console.error(
      "Delete registration error:",
      error
    );


    showMessage(
      "registrationMessage",
      error.message ||
      "Unable to delete registration.",
      "error"
    );

  }

}/* =========================================================
   SERMONS
   ========================================================= */

async function addSermon() {

  const title =
    get("sermonTitle")?.value.trim();

  const speaker =
    get("sermonSpeaker")?.value.trim();

  const sermonDate =
    get("sermonDate")?.value;

  const description =
    get("sermonDescription")?.value.trim();

  const audioFile =
    get("sermonAudio")?.files[0];

  const imageFile =
    get("sermonImage")?.files[0];

  const published =
    get("sermonPublished")?.checked;


  if (!title) {

    showMessage(
      "sermonMessage",
      "Please enter the sermon title.",
      "error"
    );

    return;
  }


  if (!audioFile) {

    showMessage(
      "sermonMessage",
      "Please select a sermon audio file.",
      "error"
    );

    return;
  }


  try {

    showMessage(
      "sermonMessage",
      "Uploading sermon audio...",
      "success"
    );


    const audioPath =
      "audio/" +
      createFileName(audioFile);


    const {
      error: audioError
    } =
      await supabaseClient
        .storage
        .from(STORAGE.sermonAudio)
        .upload(
          audioPath,
          audioFile,
          {
            cacheControl: "3600",
            upsert: false
          }
        );


    if (audioError) {
      throw audioError;
    }


    let imagePath = null;


    if (imageFile) {

      showMessage(
        "sermonMessage",
        "Uploading sermon image...",
        "success"
      );


      imagePath =
        "images/" +
        createFileName(imageFile);


      const {
        error: imageError
      } =
        await supabaseClient
          .storage
          .from(STORAGE.sermonImages)
          .upload(
            imagePath,
            imageFile,
            {
              cacheControl: "3600",
              upsert: false
            }
          );


      if (imageError) {
        throw imageError;
      }

    }


    showMessage(
      "sermonMessage",
      "Saving sermon...",
      "success"
    );


    const {
      error
    } =
      await supabaseClient
        .from("Sermons")
        .insert([
          {
            title,
            speaker:
              speaker || null,
            description:
              description || null,
            sermon_date:
              sermonDate || null,
            audio_path:
              audioPath,
            image_path:
              imagePath,
            published:
              published === true
          }
        ]);


    if (error) {
      throw error;
    }


    resetSermonForm();


    showMessage(
      "sermonMessage",
      "Sermon uploaded successfully.",
      "success"
    );


    await loadSermons();


  } catch (error) {

    console.error(
      "Add sermon error:",
      error
    );


    showMessage(
      "sermonMessage",
      "Unable to upload sermon: " +
      (
        error.message ||
        "Unknown error"
      ),
      "error"
    );

  }

}


/* =========================================================
   LOAD SERMONS
   ========================================================= */

async function loadSermons() {

  const tableBody =
    get("sermonsTableBody");

  if (!tableBody) {
    return;
  }


  tableBody.innerHTML = `
    <tr>
      <td
        colspan="5"
        class="loading-message"
      >
        Loading sermons...
      </td>
    </tr>
  `;


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("Sermons")
        .select(
          "id, title, speaker, sermon_date, published"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {
      throw error;
    }


    const sermons =
      data || [];


    if (get("sermonsCount")) {
      get("sermonsCount").textContent =
        sermons.length;
    }


    if (!sermons.length) {

      tableBody.innerHTML = `
        <tr>
          <td
            colspan="5"
            class="empty-message"
          >
            No sermons found.
          </td>
        </tr>
      `;

      return;
    }


    tableBody.innerHTML = "";


    sermons.forEach(sermon => {

      const row =
        document.createElement("tr");


      row.innerHTML = `
        <td>
          ${escapeHtml(sermon.title || "")}
        </td>

        <td>
          ${escapeHtml(sermon.speaker || "")}
        </td>

        <td>
          ${escapeHtml(sermon.sermon_date || "")}
        </td>

        <td>
          ${
            sermon.published
              ? "Published"
              : "Unpublished"
          }
        </td>

        <td>

          <button
            class="primary-btn"
            onclick="editSermon('${escapeHtml(sermon.id)}')"
            style="margin-right:6px;"
          >
            Edit
          </button>

          <button
            class="primary-btn"
            onclick="toggleSermonPublished(
              '${escapeHtml(sermon.id)}',
              ${sermon.published === true}
            )"
            style="margin-right:6px;"
          >
            ${
              sermon.published
                ? "Unpublish"
                : "Publish"
            }
          </button>

          <button
            class="delete-btn"
            onclick="deleteSermon('${escapeHtml(sermon.id)}')"
          >
            Delete
          </button>

        </td>
      `;


      tableBody.appendChild(row);

    });


  } catch (error) {

    console.error(
      "Load sermons error:",
      error
    );


    tableBody.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="empty-message"
        >
          Unable to load sermons.
        </td>
      </tr>
    `;


    showMessage(
      "sermonMessage",
      error.message ||
      "Unable to load sermons.",
      "error"
    );

  }

}


/* =========================================================
   EDIT SERMON
   ========================================================= */

async function editSermon(
  sermonId
) {

  try {

    const {
      data: sermon,
      error
    } =
      await supabaseClient
        .from("Sermons")
        .select(`
          id,
          title,
          speaker,
          description,
          sermon_date,
          audio_path,
          image_path,
          published
        `)
        .eq("id", sermonId)
        .maybeSingle();


    if (error) {
      throw error;
    }


    if (!sermon) {

      showMessage(
        "sermonMessage",
        "Sermon not found.",
        "error"
      );

      return;
    }


    get("sermonId").value =
      sermon.id;

    get("sermonTitle").value =
      sermon.title || "";

    get("sermonSpeaker").value =
      sermon.speaker || "";

    get("sermonDate").value =
      sermon.sermon_date || "";

    get("sermonDescription").value =
      sermon.description || "";

    get("sermonPublished").checked =
      sermon.published === true;


    get("sermonFormTitle").textContent =
      "Edit Sermon";


    get("saveSermonButton").textContent =
      "Update Sermon";


    get("cancelEditButton").style.display =
      "inline-block";


    get("sermonTitle").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });


  } catch (error) {

    console.error(
      "Edit sermon error:",
      error
    );


    showMessage(
      "sermonMessage",
      error.message ||
      "Unable to load sermon for editing.",
      "error"
    );

  }

}


/* =========================================================
   UPDATE SERMON
   ========================================================= */

async function updateSermon(
  sermonId
) {

  const title =
    get("sermonTitle")?.value.trim();

  const speaker =
    get("sermonSpeaker")?.value.trim();

  const sermonDate =
    get("sermonDate")?.value;

  const description =
    get("sermonDescription")?.value.trim();

  const audioFile =
    get("sermonAudio")?.files[0];

  const imageFile =
    get("sermonImage")?.files[0];

  const published =
    get("sermonPublished")?.checked;


  if (!title) {

    showMessage(
      "sermonMessage",
      "Please enter the sermon title.",
      "error"
    );

    return;
  }


  try {

    showMessage(
      "sermonMessage",
      "Updating sermon...",
      "success"
    );


    const {
      data: existing,
      error: fetchError
    } =
      await supabaseClient
        .from("Sermons")
        .select(
          "audio_path, image_path"
        )
        .eq("id", sermonId)
        .maybeSingle();


    if (fetchError) {
      throw fetchError;
    }


    let audioPath =
      existing?.audio_path ||
      null;

    let imagePath =
      existing?.image_path ||
      null;


    /* =====================================================
       REPLACE AUDIO
       ===================================================== */

    if (audioFile) {

      const newAudioPath =
        "audio/" +
        createFileName(audioFile);


      showMessage(
        "sermonMessage",
        "Uploading new audio...",
        "success"
      );


      const {
        error: uploadError
      } =
        await supabaseClient
          .storage
          .from(STORAGE.sermonAudio)
          .upload(
            newAudioPath,
            audioFile,
            {
              cacheControl: "3600",
              upsert: false
            }
          );


      if (uploadError) {
        throw uploadError;
      }


      if (audioPath) {

        await supabaseClient
          .storage
          .from(STORAGE.sermonAudio)
          .remove([
            audioPath
          ]);

      }


      audioPath =
        newAudioPath;

    }


    /* =====================================================
       REPLACE IMAGE
       ===================================================== */

    if (imageFile) {

      const newImagePath =
        "images/" +
        createFileName(imageFile);


      showMessage(
        "sermonMessage",
        "Uploading new image...",
        "success"
      );


      const {
        error: uploadError
      } =
        await supabaseClient
          .storage
          .from(STORAGE.sermonImages)
          .upload(
            newImagePath,
            imageFile,
            {
              cacheControl: "3600",
              upsert: false
            }
          );


      if (uploadError) {
        throw uploadError;
      }


      if (imagePath) {

        await supabaseClient
          .storage
          .from(STORAGE.sermonImages)
          .remove([
            imagePath
          ]);

      }


      imagePath =
        newImagePath;

    }


    showMessage(
      "sermonMessage",
      "Saving changes...",
      "success"
    );


    const {
      error
    } =
      await supabaseClient
        .from("Sermons")
        .update({
          title,
          speaker:
            speaker || null,
          description:
            description || null,
          sermon_date:
            sermonDate || null,
          audio_path:
            audioPath,
          image_path:
            imagePath,
          published:
            published === true,
          updated_at:
            new Date().toISOString()
        })
        .eq("id", sermonId);


    if (error) {
      throw error;
    }


    resetSermonForm();


    showMessage(
      "sermonMessage",
      "Sermon updated successfully.",
      "success"
    );


    await loadSermons();


  } catch (error) {

    console.error(
      "Update sermon error:",
      error
    );


    showMessage(
      "sermonMessage",
      error.message ||
      "Unable to update sermon.",
      "error"
    );

  }

}


/* =========================================================
   SAVE SERMON
   ========================================================= */

async function saveSermon() {

  const sermonId =
    get("sermonId")?.value.trim();


  if (sermonId) {

    await updateSermon(
      sermonId
    );

  } else {

    await addSermon();

  }

}


/* =========================================================
   RESET SERMON FORM
   ========================================================= */

function resetSermonForm() {

  if (get("sermonId")) {
    get("sermonId").value = "";
  }

  if (get("sermonTitle")) {
    get("sermonTitle").value = "";
  }

  if (get("sermonSpeaker")) {
    get("sermonSpeaker").value = "";
  }

  if (get("sermonDate")) {
    get("sermonDate").value = "";
  }

  if (get("sermonDescription")) {
    get("sermonDescription").value = "";
  }

  if (get("sermonAudio")) {
    get("sermonAudio").value = "";
  }

  if (get("sermonImage")) {
    get("sermonImage").value = "";
  }

  if (get("sermonPublished")) {
    get("sermonPublished").checked = false;
  }


  if (get("sermonFormTitle")) {
    get("sermonFormTitle").textContent =
      "Add New Sermon";
  }


  if (get("saveSermonButton")) {
    get("saveSermonButton").textContent =
      "Upload & Save Sermon";
  }


  if (get("cancelEditButton")) {
    get("cancelEditButton").style.display =
      "none";
  }

}


/* =========================================================
   CANCEL SERMON EDIT
   ========================================================= */

function cancelSermonEdit() {
  resetSermonForm();
}


/* =========================================================
   PUBLISH / UNPUBLISH SERMON
   ========================================================= */

async function toggleSermonPublished(
  sermonId,
  currentStatus
) {

  const newStatus =
    !currentStatus;


  try {

    const {
      error
    } =
      await supabaseClient
        .from("Sermons")
        .update({
          published:
            newStatus,
          updated_at:
            new Date().toISOString()
        })
        .eq("id", sermonId);


    if (error) {
      throw error;
    }


    showMessage(
      "sermonMessage",
      newStatus
        ? "Sermon published successfully."
        : "Sermon unpublished successfully.",
      "success"
    );


    await loadSermons();


  } catch (error) {

    console.error(
      "Publish status error:",
      error
    );


    showMessage(
      "sermonMessage",
      error.message ||
      "Unable to update publication status.",
      "error"
    );

  }

}


/* =========================================================
   DELETE SERMON
   ========================================================= */

async function deleteSermon(
  sermonId
) {

  const confirmed =
    confirm(
      "Are you sure you want to delete this sermon?"
    );


  if (!confirmed) {
    return;
  }


  try {

    const {
      data: sermon,
      error: fetchError
    } =
      await supabaseClient
        .from("Sermons")
        .select(
          "audio_path, image_path"
        )
        .eq("id", sermonId)
        .maybeSingle();


    if (fetchError) {
      throw fetchError;
    }


    const {
      error: deleteError
    } =
      await supabaseClient
        .from("Sermons")
        .delete()
        .eq("id", sermonId);


    if (deleteError) {
      throw deleteError;
    }


    if (sermon?.audio_path) {

      await supabaseClient
        .storage
        .from(STORAGE.sermonAudio)
        .remove([
          sermon.audio_path
        ]);

    }


    if (sermon?.image_path) {

      await supabaseClient
        .storage
        .from(STORAGE.sermonImages)
        .remove([
          sermon.image_path
        ]);

    }


    showMessage(
      "sermonMessage",
      "Sermon deleted successfully.",
      "success"
    );


    await loadSermons();


  } catch (error) {

    console.error(
      "Delete sermon error:",
      error
    );


    showMessage(
      "sermonMessage",
      error.message ||
      "Unable to delete sermon.",
      "error"
    );

  }

}


/* =========================================================
   SERMON MESSAGE
   ========================================================= */

function showSermonMessage(
  message,
  type
) {

  showMessage(
    "sermonMessage",
    message,
    type
  );

}


/* =========================================================
   ATTENDANCE
   ========================================================= */

async function loadAttendance() {

  const tableBody =
    get("attendanceTableBody");

  if (!tableBody) {
    return;
  }


  tableBody.innerHTML = `
    <tr>
      <td
        colspan="5"
        class="loading-message"
      >
        Loading attendance...
      </td>
    </tr>
  `;


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("event_attendance")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {
      throw error;
    }


    const attendance =
      data || [];


    if (get("attendanceCount")) {
      get("attendanceCount").textContent =
        attendance.length;
    }


    if (get("attendanceTotal")) {
      get("attendanceTotal").textContent =
        attendance.length;
    }


    if (!attendance.length) {

      tableBody.innerHTML = `
        <tr>
          <td
            colspan="5"
            class="empty-message"
          >
            No attendance records found.
          </td>
        </tr>
      `;

      return;
    }


    tableBody.innerHTML = "";


    attendance.forEach(record => {

      const row =
        document.createElement("tr");


      const date =
        record.created_at
          ? new Date(
              record.created_at
            ).toLocaleString()
          : "";


      row.innerHTML = `
        <td>
          ${escapeHtml(record.id)}
        </td>

        <td>
          ${escapeHtml(
            record.name || ""
          )}
        </td>

        <td>
          ${escapeHtml(
            record.event_name || ""
          )}
        </td>

        <td>
          ${escapeHtml(date)}
        </td>

        <td>
          <button
            class="delete-btn"
            onclick="deleteAttendance('${escapeHtml(record.id)}')"
          >
            Delete
          </button>
        </td>
      `;


      tableBody.appendChild(row);

    });


  } catch (error) {

    console.error(
      "Attendance error:",
      error
    );


    tableBody.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="empty-message"
        >
          Unable to load attendance.
        </td>
      </tr>
    `;

  }

}


/* =========================================================
   DELETE ATTENDANCE
   ========================================================= */

async function deleteAttendance(
  attendanceId
) {

  const confirmed =
    confirm(
      "Delete this attendance record?"
    );


  if (!confirmed) {
    return;
  }


  try {

    const {
      error
    } =
      await supabaseClient
        .from("event_attendance")
        .delete()
        .eq("id", attendanceId);


    if (error) {
      throw error;
    }


    showMessage(
      "attendanceMessage",
      "Attendance record deleted.",
      "success"
    );


    await loadAttendance();


  } catch (error) {

    console.error(
      "Delete attendance error:",
      error
    );


    showMessage(
      "attendanceMessage",
      error.message ||
      "Unable to delete attendance.",
      "error"
    );

  }

}


/* =========================================================
   SESSION CHECK
   ========================================================= */

async function checkSession() {

  try {

    const {
      data
    } =
      await supabaseClient
        .auth
        .getSession();


    if (
      data &&
      data.session &&
      data.session.user
    ) {

      const user =
        data.session.user;


      const {
        data: adminData,
        error
      } =
        await supabaseClient
          .from("admins")
          .select(
            "id, user_id, full_name, email, is_active"
          ).eq(
            "user_id",
            user.id
          )
          .eq(
            "is_active",
            true
          )
          .maybeSingle();


      if (
        error ||
        !adminData
      ) {

        await supabaseClient
          .auth
          .signOut();

        return;
      }


      currentAdmin =
        adminData;


      if (get("loginPage")) {
        get("loginPage").style.display =
          "none";
      }

      if (get("dashboard")) {
        get("dashboard").style.display =
          "block";
      }


      if (get("adminBadge")) {
        get("adminBadge").textContent =
          adminData.full_name ||
          adminData.email ||
          "Administrator";
      }


      ensureEventForm();

      await loadDashboard();

    }

  } catch (error) {

    console.error(
      "Session check error:",
      error
    );

  }

}


/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

supabaseClient
  .auth
  .onAuthStateChange(
    async function (
      event,
      session
    ) {

      if (
        event === "SIGNED_OUT"
      ) {

        currentAdmin = null;

        if (get("dashboard")) {
          get("dashboard").style.display =
            "none";
        }

        if (get("loginPage")) {
          get("loginPage").style.display =
            "flex";
        }

      }

    }
  );


/* =========================================================
   START ADMIN
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    ensureEventForm();

    checkSession();

  }
);


/* =========================================================
   MAKE FUNCTIONS AVAILABLE TO HTML
   ========================================================= */

window.login =
  login;

window.logout =
  logout;

window.showSection =
  showSection;

window.loadEvents =
  loadEvents;

window.addEvent =
  addEvent;

window.editEvent =
  editEvent;

window.updateEvent =
  updateEvent;

window.deleteEvent =
  deleteEvent;

window.cancelEventEdit =
  cancelEventEdit;

window.loadRegistrations =
  loadRegistrations;

window.deleteRegistration =
  deleteRegistration;

window.loadAttendance =
  loadAttendance;

window.deleteAttendance =
  deleteAttendance;

window.addSermon =
  addSermon;

window.loadSermons =
  loadSermons;

window.editSermon =
  editSermon;

window.updateSermon =
  updateSermon;

window.saveSermon =
  saveSermon;

window.cancelSermonEdit =
  cancelSermonEdit;

window.toggleSermonPublished =
  toggleSermonPublished;

window.deleteSermon =
  deleteSermon;