/**
 * content-loader.js
 * Dynamically fetches videos and reviews from the Firestore API
 * and injects them into the page BEFORE GSAP initialises.
 *
 * Emits CustomEvent 'contentLoaded' on window when all content is injected.
 */

const API_BASE = '/api';

/* ─────────────────────────────────────────────── helpers ─── */

function buildCinematicCard(v) {
  return `
    <div class="video-card long-card" data-video-id="${v.youtube_id}" data-doc-id="${v.id}">
      <div class="card-image-wrapper">
        <img src="https://img.youtube.com/vi/${v.youtube_id}/maxresdefault.jpg"
             alt="${v.title}" loading="lazy">
        <div class="card-overlay">
          <span class="card-play-icon">◢</span>
        </div>
      </div>
      <div class="card-info">
        <span class="card-genre">${v.genre || 'CINEMATIC'}</span>
        <h3 class="card-title">${v.title}</h3>
        <p class="card-desc">${v.description || ''}</p>
      </div>
    </div>`;
}

function buildShortCard(v) {
  return `
    <div class="video-card short-card" data-video-id="${v.youtube_id}" data-doc-id="${v.id}">
      <div class="phone-mockup">
        <div class="phone-screen">
          <img src="https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg"
               alt="${v.title}" class="short-thumb" loading="lazy">
          <div class="short-overlay">
            <div class="short-stats">
              <span class="stat-views">${v.views || ''}</span>
              <span class="stat-retention">${v.retention || ''}</span>
            </div>
            <div class="short-info">
              <h4 class="short-title">${v.title}</h4>
              <p class="short-tags">${v.tags || ''}</p>
            </div>
            <span class="card-play-icon">◢</span>
          </div>
        </div>
      </div>
    </div>`;
}

function buildReviewCard(r, index) {
  const isActive = index === 0 ? 'active' : '';
  return `
    <div class="review-card ${isActive}" data-index="${index}" data-doc-id="${r.id}">
      <div class="review-quote-icon">"</div>
      <p class="review-text-content">${r.text}</p>
      <div class="review-author-meta">
        <h4 class="review-author-name">${r.author_name}</h4>
        <span class="review-author-details">${r.author_details || ''}</span>
      </div>
    </div>`;
}

/* ───────────────────────────────────────── fetch & inject ─── */

async function loadContent() {
  const cinematicTrack = document.getElementById('cinematic-track');
  const shortsTrack = document.getElementById('shorts-track');
  const reviewsStack = document.getElementById('reviews-stack');
  const indexLabel = document.querySelector('.active-index-label');

  try {
    const [cinematicRes, shortsRes, reviewsRes, showreelRes] = await Promise.all([
      fetch(`${API_BASE}/videos?type=cinematic&_t=${Date.now()}`),
      fetch(`${API_BASE}/videos?type=shorts&_t=${Date.now()}`),
      fetch(`${API_BASE}/reviews?_t=${Date.now()}`),
      fetch(`${API_BASE}/videos?type=showreel&_t=${Date.now()}`)
    ]);

    // ── Showreel Video ─────────────────────────────────────────
    if (showreelRes.ok) {
      const showreels = await showreelRes.json();
      if (Array.isArray(showreels) && showreels.length > 0) {
        const showreel = showreels[0];
        const wrapper = document.querySelector('.showreel-wrapper');
        const img = document.querySelector('.showreel-img');
        const metaTag = document.querySelector('.showreel-meta .meta-tag');
        const metaTime = document.querySelector('.showreel-meta .meta-time');
        
        if (wrapper && showreel.youtube_id) {
          wrapper.setAttribute('data-video-id', showreel.youtube_id);
        }
        if (img && showreel.youtube_id) {
          img.src = `https://img.youtube.com/vi/${showreel.youtube_id}/maxresdefault.jpg`;
        }
        if (metaTag && showreel.genre) {
          metaTag.textContent = showreel.genre;
        }
        if (metaTime && showreel.description) {
          metaTime.textContent = showreel.description;
        }
      }
    }

    // ── Cinematic Videos ───────────────────────────────────────
    if (cinematicTrack && cinematicRes.ok) {
      const videos = await cinematicRes.json();
      if (Array.isArray(videos) && videos.length > 0) {
        cinematicTrack.innerHTML = videos.map(buildCinematicCard).join('');
      } else {
        cinematicTrack.innerHTML = '<p class="cms-empty-notice">No cinematic videos added yet. Add them from the Admin Panel.</p>';
      }
    }

    // ── Shorts Videos ─────────────────────────────────────────
    if (shortsTrack && shortsRes.ok) {
      const shorts = await shortsRes.json();
      if (Array.isArray(shorts) && shorts.length > 0) {
        shortsTrack.innerHTML = shorts.map(buildShortCard).join('');
      } else {
        shortsTrack.innerHTML = '<p class="cms-empty-notice">No shorts added yet. Add them from the Admin Panel.</p>';
      }
    }

    // ── Reviews ───────────────────────────────────────────────
    if (reviewsStack && reviewsRes.ok) {
      const reviews = await reviewsRes.json();
      if (Array.isArray(reviews) && reviews.length > 0) {
        reviewsStack.innerHTML = reviews.map((r, i) => buildReviewCard(r, i)).join('');
        if (indexLabel) {
          indexLabel.textContent = `01 / ${String(reviews.length).padStart(2, '0')}`;
        }
      } else {
        reviewsStack.innerHTML = '<p class="cms-empty-notice" style="color:rgba(255,255,255,0.4);">No reviews added yet.</p>';
      }
    }

  } catch (err) {
    console.warn('[ContentLoader] Failed to load content from API:', err);
    // Fail gracefully — page still works, just empty sections
  }

  // Signal that content is ready so app.js can initialise GSAP
  window.dispatchEvent(new CustomEvent('contentLoaded'));
}

// Run immediately on script load (before DOM fully parsed is fine;
// we target specific containers that are already in the DOM at this point
// since the script tag is at the bottom of <body>)
loadContent();
