const DATA_URL = "../assets/data/musicians.json";

const state = {
  catalog: null,
  filter: "all",
};

const filtersEl = document.getElementById("music-filters");
const contentEl = document.getElementById("music-content");
const artistCountEl = document.getElementById("artist-count");
const genreCountEl = document.getElementById("genre-count");

loadCatalog();

async function loadCatalog() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load catalog: ${response.status}`);
    }

    const payload = await response.json();
    state.catalog = normalizeCatalog(payload);

    renderFilters();
    renderContent();
    renderStats();
  } catch (error) {
    contentEl.innerHTML =
      '<p class="music-empty">The music catalog could not be loaded right now.</p>';
    console.error(error);
  }
}

function normalizeCatalog(payload) {
  const genres = Array.isArray(payload?.genres) ? payload.genres : [];

  return {
    genres: genres.map((genre) => ({
      id: typeof genre.id === "string" ? genre.id : "",
      name: typeof genre.name === "string" ? genre.name : "Untitled",
      artists: Array.isArray(genre.artists) ? genre.artists : [],
    })),
  };
}

function renderStats() {
  const genres = state.catalog?.genres ?? [];
  const artistTotal = genres.reduce((total, genre) => total + genre.artists.length, 0);

  artistCountEl.textContent = String(artistTotal);
  genreCountEl.textContent = String(genres.length);
}

function renderFilters() {
  const genres = state.catalog?.genres ?? [];
  const buttons = [
    '<button class="filter-btn active" data-filter="all" type="button">All</button>',
    ...genres.map(
      (genre) =>
        `<button class="filter-btn" data-filter="${escapeHtml(genre.id)}" type="button">${escapeHtml(genre.name)}</button>`,
    ),
  ];

  filtersEl.innerHTML = buttons.join("");
  filtersEl.addEventListener("click", handleFilterClick);
}

function handleFilterClick(event) {
  const button = event.target.closest(".filter-btn");
  if (!button) {
    return;
  }

  state.filter = button.dataset.filter || "all";

  for (const candidate of filtersEl.querySelectorAll(".filter-btn")) {
    candidate.classList.toggle("active", candidate === button);
  }

  renderContent();
}

function renderContent() {
  const genres = state.catalog?.genres ?? [];
  const visibleGenres =
    state.filter === "all"
      ? genres
      : genres.filter((genre) => genre.id === state.filter);

  if (!visibleGenres.length) {
    contentEl.innerHTML =
      '<p class="music-empty">No artists are available for this genre yet.</p>';
    return;
  }

  contentEl.innerHTML = visibleGenres
    .map((genre) => renderGenreSection(genre, state.filter !== "all"))
    .join("");

  attachImageFallbacks();
}

function renderGenreSection(genre, hideLabel) {
  return `
    <section class="genre-section" data-genre="${escapeHtml(genre.id)}">
      <p class="genre-label" ${hideLabel ? 'style="display:none"' : ""}>
        ${escapeHtml(genre.name)} · ${genre.artists.length}
      </p>
      <div class="music-grid">
        ${genre.artists.map((artist) => renderArtistCard(artist, genre.id)).join("")}
      </div>
    </section>
  `;
}

function renderArtistCard(artist, genreId) {
  const name = typeof artist.name === "string" ? artist.name : "Unknown Artist";
  const cover = typeof artist.cover === "string" ? artist.cover : "";
  const comment =
    typeof artist.comment === "string" && artist.comment.trim()
      ? artist.comment
      : "Add a short note about why this artist belongs here.";
  const link = typeof artist.link === "string" ? artist.link : "";

  return `
    <article class="music-card" data-genre="${escapeHtml(genreId)}">
      <div class="card-cover">
        ${cover ? renderCoverImage(cover, name) : renderPlaceholder(name)}
      </div>
      <h2 class="card-name">${escapeHtml(name)}</h2>
      <p class="card-comment">${escapeHtml(comment)}</p>
      ${link ? renderLink(link, name) : ""}
    </article>
  `;
}

function renderCoverImage(cover, name) {
  return `<img class="card-image" src="${escapeHtml(cover)}" alt="${escapeHtml(name)}" loading="lazy" />`;
}

function renderPlaceholder(name) {
  return `<span class="card-placeholder" aria-hidden="true">${escapeHtml(getInitials(name))}</span>`;
}

function renderLink(link, name) {
  return `
    <a class="card-link" href="${escapeHtml(link)}" target="_blank" rel="noreferrer noopener" aria-label="Open ${escapeHtml(name)}">
      ↗
    </a>
  `;
}

function attachImageFallbacks() {
  for (const image of contentEl.querySelectorAll(".card-image")) {
    if (image.complete && image.naturalWidth === 0) {
      image.parentElement.innerHTML = renderPlaceholder(image.alt || "NA");
      continue;
    }

    image.addEventListener(
      "error",
      () => {
        image.parentElement.innerHTML = renderPlaceholder(image.alt || "NA");
      },
      { once: true },
    );
  }
}

function getInitials(name) {
  const parts = name
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return "NA";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}
