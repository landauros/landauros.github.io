const DATA_URL = "../assets/data/musicians.json";

const state = {
  catalog: null,
  filter: "all",
};

const filtersEl = document.getElementById("music-filters");
const contentEl = document.getElementById("music-content");
const artistCountEl = document.getElementById("artist-count");
const genreCountEl = document.getElementById("genre-count");
const featureArtEl = document.getElementById("feature-art");
const featureKickerEl = document.getElementById("feature-kicker");
const featureNameEl = document.getElementById("feature-name");
const featureCommentEl = document.getElementById("feature-comment");
const featureLinkEl = document.getElementById("feature-link");
const featureStripEl = document.getElementById("feature-strip");

loadCatalog();

async function loadCatalog() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load catalog: ${response.status}`);
    }

    const payload = await response.json();
    state.catalog = normalizeCatalog(payload);

    renderFeature();
    renderFilters();
    renderContent();
    renderStats();
  } catch (error) {
    contentEl.innerHTML =
      '<p class="music-empty">The music archive could not be loaded right now.</p>';
    featureStripEl.innerHTML =
      '<p class="music-empty">Featured artists are unavailable right now.</p>';
    console.error(error);
  }
}

function normalizeCatalog(payload) {
  const genres = Array.isArray(payload?.genres) ? payload.genres : [];

  return {
    genres: genres.map((genre) => ({
      id: typeof genre.id === "string" ? genre.id : "",
      name: typeof genre.name === "string" ? genre.name : "Untitled",
      artists: Array.isArray(genre.artists)
        ? genre.artists.map((artist) => ({
            name: typeof artist.name === "string" ? artist.name : "Unknown Artist",
            cover: typeof artist.cover === "string" ? artist.cover : "",
            comment:
              typeof artist.comment === "string" && artist.comment.trim()
                ? artist.comment
                : "Add a short note about why this artist belongs here.",
            link: typeof artist.link === "string" ? artist.link : "",
          }))
        : [],
    })),
  };
}

function renderStats() {
  const genres = state.catalog?.genres ?? [];
  const artistTotal = genres.reduce((total, genre) => total + genre.artists.length, 0);

  artistCountEl.textContent = String(artistTotal);
  genreCountEl.textContent = String(genres.length);
}

function renderFeature() {
  const genres = state.catalog?.genres ?? [];
  const lead = genres[0]?.artists?.[0]
    ? { genre: genres[0], artist: genres[0].artists[0] }
    : null;
  const featuredEntries = genres
    .slice(1, 4)
    .map((genre) => ({ genre, artist: genre.artists[0] }))
    .filter((entry) => entry.artist);

  if (!lead) {
    return;
  }

  featureKickerEl.textContent = `${lead.genre.name} featured artist`;
  featureNameEl.textContent = lead.artist.name;
  featureCommentEl.textContent = lead.artist.comment;

  if (lead.artist.link) {
    featureLinkEl.href = lead.artist.link;
    featureLinkEl.target = "_blank";
    featureLinkEl.rel = "noreferrer noopener";
    featureLinkEl.textContent = "Visit artist";
  } else {
    featureLinkEl.href = "#music-directory";
    featureLinkEl.removeAttribute("target");
    featureLinkEl.removeAttribute("rel");
    featureLinkEl.textContent = "Open archive";
  }

  featureArtEl.innerHTML = lead.artist.cover
    ? renderFeatureImage(lead.artist.cover, lead.artist.name)
    : `<div class="music-feature-placeholder">${escapeHtml(getInitials(lead.artist.name))}</div>`;

  featureStripEl.innerHTML = featuredEntries.length
    ? featuredEntries.map(renderMiniFeature).join("")
    : '<p class="music-empty">More featured artists will appear here as the archive grows.</p>';

  attachImageFallbacks(featureArtEl);
  attachImageFallbacks(featureStripEl);
}

function renderFeatureImage(cover, name) {
  return `<img class="card-image" src="${escapeHtml(cover)}" alt="${escapeHtml(name)}" loading="eager" />`;
}

function renderMiniFeature(entry) {
  const coverMarkup = entry.artist.cover
    ? `<img class="card-image" src="${escapeHtml(entry.artist.cover)}" alt="${escapeHtml(entry.artist.name)}" loading="lazy" />`
    : renderPlaceholder(entry.artist.name);

  const href = entry.artist.link || `#genre-${escapeHtml(entry.genre.id)}`;

  return `
    <a class="music-mini-feature" href="${escapeHtml(href)}"${entry.artist.link ? ' target="_blank" rel="noreferrer noopener"' : ""}>
      <div class="music-mini-cover">
        ${coverMarkup}
      </div>
      <div class="music-mini-meta">
        <p class="music-mini-kicker">${escapeHtml(entry.genre.name)}</p>
        <h2 class="music-mini-name">${escapeHtml(entry.artist.name)}</h2>
        <p class="music-mini-text">${escapeHtml(trimComment(entry.artist.comment, 88))}</p>
      </div>
    </a>
  `;
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

  attachImageFallbacks(contentEl);
}

function renderGenreSection(genre, hideLabel) {
  return `
    <section class="genre-section" data-genre="${escapeHtml(genre.id)}" id="genre-${escapeHtml(genre.id)}">
      <p class="genre-label"${hideLabel ? ' style="display:none"' : ""}>
        ${escapeHtml(genre.name)} · ${genre.artists.length}
      </p>
      <div class="music-grid">
        ${genre.artists.map((artist) => renderArtistCard(artist, genre.name, genre.id)).join("")}
      </div>
    </section>
  `;
}

function renderArtistCard(artist, genreName, genreId) {
  const shellContent = `
    <div class="card-shell">
      <div class="card-cover">
        ${artist.cover ? renderCoverImage(artist.cover, artist.name) : renderPlaceholder(artist.name)}
      </div>
      <div class="card-meta">
        <h3 class="card-name">${escapeHtml(artist.name)}</h3>
        <p class="card-genre">${escapeHtml(genreName)}</p>
      </div>
      <p class="card-comment">${escapeHtml(artist.comment)}</p>
      ${artist.link ? '<span class="card-link">Visit</span>' : ""}
    </div>
  `;

  if (artist.link) {
    return `
      <a class="music-card" data-genre="${escapeHtml(genreId)}" href="${escapeHtml(artist.link)}" target="_blank" rel="noreferrer noopener">
        ${shellContent}
      </a>
    `;
  }

  return `
    <article class="music-card" data-genre="${escapeHtml(genreId)}">
      ${shellContent}
    </article>
  `;
}

function renderCoverImage(cover, name) {
  return `<img class="card-image" src="${escapeHtml(cover)}" alt="${escapeHtml(name)}" loading="lazy" />`;
}

function renderPlaceholder(name) {
  return `<span class="card-placeholder" aria-hidden="true">${escapeHtml(getInitials(name))}</span>`;
}

function attachImageFallbacks(scope) {
  for (const image of scope.querySelectorAll(".card-image")) {
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

function trimComment(comment, maxLength) {
  if (comment.length <= maxLength) {
    return comment;
  }

  return `${comment.slice(0, maxLength - 1).trimEnd()}…`;
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
