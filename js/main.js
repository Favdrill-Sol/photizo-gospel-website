/* =========================================================
   PHOTIZO GOSPEL MISSION INTERNATIONAL
   MAIN WEBSITE JAVASCRIPT
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const menuToggle =
    document.getElementById("menuToggle");

const mainNav =
    document.getElementById("mainNav");

const siteHeader =
    document.querySelector(".site-header");

const currentYear =
    document.getElementById("currentYear");


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

if (menuToggle && mainNav) {

    menuToggle.addEventListener(
        "click",
        function () {

            const isActive =
                mainNav.classList.toggle("active");

            menuToggle.classList.toggle(
                "active"
            );

            menuToggle.setAttribute(
                "aria-expanded",
                isActive
            );

        }
    );


    /* Close menu after clicking a link */

    const navLinks =
        mainNav.querySelectorAll("a");

    navLinks.forEach(
        function (link) {

            link.addEventListener(
                "click",
                function () {

                    mainNav.classList.remove(
                        "active"
                    );

                    menuToggle.classList.remove(
                        "active"
                    );

                    menuToggle.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }
            );

        }
    );

}


/* =========================================================
   HEADER SCROLL EFFECT
========================================================= */

function handleHeaderScroll() {

    if (!siteHeader) {
        return;
    }


    if (window.scrollY > 50) {

        siteHeader.classList.add(
            "scrolled"
        );

    } else {

        siteHeader.classList.remove(
            "scrolled"
        );

    }

}


window.addEventListener(
    "scroll",
    handleHeaderScroll,
    {
        passive: true
    }
);


/* Run once when page loads */

handleHeaderScroll();


/* =========================================================
   CURRENT YEAR
========================================================= */

if (currentYear) {

    currentYear.textContent =
        new Date().getFullYear();

}


/* =========================================================
   CLOSE MOBILE MENU WITH ESCAPE
========================================================= */

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            mainNav &&
            menuToggle
        ) {

            mainNav.classList.remove(
                "active"
            );

            menuToggle.classList.remove(
                "active"
            );

            menuToggle.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    }
);


/* =========================================================
   PREVENT MOBILE MENU FROM STAYING OPEN
   WHEN SCREEN BECOMES DESKTOP SIZE
========================================================= */

window.addEventListener(
    "resize",
    function () {

        if (
            window.innerWidth > 760 &&
            mainNav &&
            menuToggle
        ) {

            mainNav.classList.remove(
                "active"
            );

            menuToggle.classList.remove(
                "active"
            );

            menuToggle.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    }
);


/* =========================================================
   SMOOTH INTERNAL LINKS
========================================================= */

const internalLinks =
    document.querySelectorAll(
        'a[href^="#"]'
    );


internalLinks.forEach(
    function (link) {

        link.addEventListener(
            "click",
            function (event) {

                const targetId =
                    this.getAttribute("href");

                if (
                    !targetId ||
                    targetId === "#"
                ) {
                    return;
                }


                const target =
                    document.querySelector(
                        targetId
                    );

                if (!target) {
                    return;
                }


                event.preventDefault();


                const headerHeight =
                    siteHeader
                        ? siteHeader.offsetHeight
                        : 0;


                const targetPosition =
                    target.getBoundingClientRect()
                        .top +
                    window.scrollY -
                    headerHeight;


                window.scrollTo({
                    top: targetPosition,
                    behavior: "smooth"
                });

            }
        );

    }
);


/* =========================================================
   PAGE READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        document.body.classList.add(
            "page-ready"
        );

    }
);
/* =========================================================
   PUBLIC SERMONS
========================================================= */

async function loadPublicSermons() {

    const sermonsContainer =
        document.getElementById("sermonsContainer");

    if (!sermonsContainer) {
        return;
    }

    try {

        const { data, error } =
            await photizoSupabase
                .from("Sermons")
                .select(`
                    id,
                    title,
                    speaker,
                    description,
                    sermon_date,
                    audio_path,
                    image_path
                `)
                .eq("published", true)
                .order("sermon_date", {
                    ascending: false
                });

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {

            sermonsContainer.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        ✦
                    </div>

                    <h3>
                        No sermons available yet
                    </h3>

                    <p>
                        Check back soon for messages from
                        Photizo Gospel Mission International.
                    </p>

                </div>
            `;

            return;
        }


        sermonsContainer.innerHTML = "";


        data.forEach(function (sermon) {

            const audioUrl =
                photizoSupabase
                    .storage
                    .from("sermon-media")
                    .getPublicUrl(
                        sermon.audio_path
                    ).data.publicUrl;


            let imageHtml = "";

            if (sermon.image_path) {

                const imageUrl =
                    photizoSupabase
                        .storage
                        .from("sermon-images")
                        .getPublicUrl(
                            sermon.image_path
                        ).data.publicUrl;


                imageHtml = `
                    <img
                        src="${imageUrl}"
                        alt="${escapeSermonHtml(sermon.title)}"
                        class="sermon-image"
                        loading="lazy"
                    >
                `;
            }


            const sermonCard =
                document.createElement("article");

            sermonCard.className =
                "sermon-card";


            sermonCard.innerHTML = `

                ${imageHtml}

                <div class="sermon-content">

                    <h3>
                        ${escapeSermonHtml(sermon.title)}
                    </h3>

                    ${
                        sermon.speaker
                            ? `
                                <p class="sermon-speaker">
                                    ${escapeSermonHtml(
                                        sermon.speaker
                                    )}
                                </p>
                              `
                            : ""
                    }

                    ${
                        sermon.sermon_date
                            ? `
                                <p class="sermon-date">
                                    ${formatSermonDate(
                                        sermon.sermon_date
                                    )}
                                </p>
                              `
                            : ""
                    }

                    ${
                        sermon.description
                            ? `
                                <p class="sermon-description">
                                    ${escapeSermonHtml(
                                        sermon.description
                                    )}
                                </p>
                              `
                            : ""
                    }


                    <audio
                        controls
                        preload="none"
                        class="sermon-player"
                    >
                        <source
                            src="${audioUrl}"
                        >
                        Your browser does not support audio playback.
                    </audio>


                    <a
                        href="${audioUrl}"
                        download
                        class="btn btn-primary sermon-download"
                    >
                        Download Sermon
                    </a>

                </div>

            `;


            sermonsContainer.appendChild(
                sermonCard
            );

        });


    } catch (error) {

        console.error(
            "Error loading sermons:",
            error
        );


        sermonsContainer.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ✦
                </div>

                <h3>
                    Sermons are temporarily unavailable
                </h3>

                <p>
                    Please check back soon.
                </p>

            </div>
        `;

    }

}


/* =========================================================
   SERMON DATE
========================================================= */

function formatSermonDate(date) {

    const parsedDate =
        new Date(date + "T00:00:00");

    if (Number.isNaN(parsedDate.getTime())) {
        return date;
    }

    return parsedDate.toLocaleDateString(
        "en-NG",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );

}


/* =========================================================
   SERMON HTML SAFETY
========================================================= */

function escapeSermonHtml(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   LOAD SERMONS WHEN WEBSITE IS READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadPublicSermons();

    }
);
