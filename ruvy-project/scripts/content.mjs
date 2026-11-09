// Pure rendering functions: one source of truth for HTML, with no browser dependency.
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char],
  );

function mediaURL(value, extensions) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const source = value.trim();
  if (!source.startsWith('ruvy-project/assets/') && !source.startsWith('https://'))
    return '';
  try {
    const url = new URL(source, 'https://local.invalid/');
    return extensions.test(url.pathname) && !url.username && !url.password ? source : '';
  } catch {
    return '';
  }
}

function validYouTube(project) {
  return (
    typeof project.youtubeId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(project.youtubeId)
  );
}

export function publishedProjects(data) {
  return (Array.isArray(data.projects) ? data.projects : [])
    .filter(
      (project) =>
        project &&
        project.published === true &&
        typeof project.title === 'string' &&
        project.title.trim(),
    )
    .map((project) => ({
      title: project.title.trim(),
      category: typeof project.category === 'string' ? project.category : '',
      description: typeof project.description === 'string' ? project.description : '',
      youtubeId: validYouTube(project) ? project.youtubeId : '',
      start: Number.isSafeInteger(project.start) && project.start > 0 ? project.start : 0,
      video: validYouTube(project)
        ? 'https://www.youtube.com/watch?v=' +
          project.youtubeId +
          '&t=' +
          (Number.isSafeInteger(project.start) ? Math.max(0, project.start) : 0) +
          's'
        : mediaURL(project.video, /\.(mp4|webm)$/i),
      cover: mediaURL(project.cover, /\.(avif|webp|jpe?g|png|gif)$/i),
    }))
    .filter((project) => project.video);
}

function placeholder(index) {
  const number = String(index + 1).padStart(2, '0');
  return `<div class="project project-placeholder"><div class="reveal">
    <div class="preview" aria-hidden="true"><div class="frame-art"></div>
      <span class="frame-num">${number}</span><span class="frame-tag">FRAME / ${number}</span>
      <span class="empty-label">МЕСТО ДЛЯ ОБЛОЖКИ</span>
    </div><div class="project-info"><p class="muted">Место для будущей работы</p></div>
  </div></div>`;
}

function playlistCard(title, works, rate) {
  const tracks = works.map((work, index) => {
    const number = String(index + 1).padStart(2, '0');
    const label = escape(title) + ' · ' + number;
    const thumb =
      work.cover ||
      (work.youtubeId
        ? 'https://i.ytimg.com/vi/' + work.youtubeId + '/hqdefault.jpg'
        : '');
    return `<li><a href="${escape(work.video)}" data-video aria-label="Смотреть: ${label}" data-title="${label}" data-description="${escape(work.description)}" data-cover="${escape(work.cover)}" data-youtube="${escape(work.youtubeId)}" data-start="${work.start}">
      <div class="track-cover">${thumb ? `<img loading="lazy" src="${escape(thumb)}" alt="">` : ''}<span aria-hidden="true">▶</span></div>
      <div class="track-caption">${number}</div></a></li>`;
  });
  return `<article class="playlist${title === 'Рилс' ? ' playlist--portrait' : ''}"><div class="rail-head"><div><h3>${escape(title)}</h3>${rate ? `<p class="rate">${escape(rate)}</p>` : ''}</div><div class="rail-buttons"><button type="button" data-step="-1" aria-label="Листать назад: ${escape(title)}">←</button><button type="button" data-step="1" aria-label="Листать вперёд: ${escape(title)}">→</button></div></div><ol class="track-rail">${tracks.join('')}</ol></article>`;
}
function renderPlaylists(projects, rates = {}) {
  const groups = new Map();
  for (const project of projects) {
    const name = project.category || 'Работы';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(project);
  }
  return [...groups]
    .map(([name, works]) => playlistCard(name, works, rates[name]))
    .join('\n');
}
export function renderContacts(data) {
  const telegram = typeof data.telegram === 'string' ? data.telegram.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const validTelegram = /^https:\/\/t\.me\/[a-zA-Z0-9_]+\/?$/.test(telegram);
  const validEmail = /^[^\s@?&#<>"'\r\n]+@[^\s@?&#<>"'\r\n]+\.[^\s@?&#<>"'\r\n]+$/.test(
    email,
  );
  const label = (name, detail) =>
    `<span class="contact-link-text">${name}<small>${escape(detail)}</small></span><span aria-hidden="true">↗</span>`;
  return `<div class="contact-links">
    ${validTelegram ? `<a id="telegram" class="contact-link" href="${escape(telegram)}" target="_blank" rel="noopener noreferrer">${label('Telegram', '@' + telegram.split('/').filter(Boolean).at(-1))}</a>` : '<p class="contact-missing">Telegram пока не указан.</p>'}
    ${validEmail ? `<a id="email" class="contact-link" href="mailto:${escape(email)}">${label('Email', email)}</a>` : '<p class="contact-missing">Email пока не указан.</p>'}
  </div>`;
}

export function renderContent(html, data) {
  const projects = publishedProjects(data);
  const placeholderCount = Number.isInteger(data.placeholderCount)
    ? Math.max(0, Math.min(6, data.placeholderCount))
    : 6;
  const parts = {
    count: `<span id="work-count" role="status" aria-label="Опубликовано работ: ${projects.length}">[ ${String(projects.length).padStart(2, '0')} ]</span>`,
    portfolio: `<div class="portfolio-grid" id="portfolio">${projects.length ? renderPlaylists(projects, data.rates) : Array.from({ length: placeholderCount }, (_, index) => placeholder(index)).join('\n')}</div>`,
    status: `<span>${projects.length ? 'Выберите ролик в подборке.' : 'Место для будущих работ. Портфолио скоро появится здесь.'}</span>`,
    contacts: renderContacts(data),
  };
  for (const [key, value] of Object.entries(parts)) {
    const pattern = new RegExp(
      `<!-- content:${key}:start -->[\\s\\S]*?<!-- content:${key}:end -->`,
    );
    if (!pattern.test(html)) throw new Error(`Missing content marker: ${key}`);
    html = html.replace(
      pattern,
      () => `<!-- content:${key}:start -->\n${value}\n<!-- content:${key}:end -->`,
    );
  }
  const tg = typeof data.telegram === 'string' ? data.telegram.trim() : '';
  if (/^https:\/\/t\.me\/[a-zA-Z0-9_]+\/?$/.test(tg)) {
    html = html.replace(
      /(<!-- content:cta:start -->)[\s\S]*?(<!-- content:cta:end -->)/,
      () =>
        `<!-- content:cta:start --><a href="${escape(tg)}" target="_blank" rel="noopener noreferrer" class="cta">Обсудить проект <span class="arrow" aria-hidden="true">↗</span></a><!-- content:cta:end -->`,
    );
  } else {
    html = html.replace(
      /(<!-- content:cta:start -->)[\s\S]*?(<!-- content:cta:end -->)/,
      () =>
        `<!-- content:cta:start --><a href="#contacts" class="cta">Обсудить проект <span class="arrow" aria-hidden="true">↗</span></a><!-- content:cta:end -->`,
    );
  }
  return html;
}
