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
      video: mediaURL(project.video, /\.(mp4|webm)$/i),
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

function projectCard(project, index) {
  const number = String(index + 1).padStart(2, '0');
  return `<article class="project"><div class="reveal">
    <a class="preview" href="${escape(project.video)}" data-video
       data-title="${escape(project.title)}" data-description="${escape(project.description)}"
       data-cover="${escape(project.cover)}" aria-label="Смотреть: ${escape(project.title)}">
      <div class="frame-art" aria-hidden="true"></div>
      ${project.cover ? `<img src="${escape(project.cover)}" alt="" loading="lazy" decoding="async">` : ''}
      <span class="frame-num">${number}</span><span class="frame-tag">PLAY FILM</span>
      <span class="play" aria-hidden="true">▶</span>
    </a><div class="project-info"><div><h3>${escape(project.title)}</h3>
      ${project.category ? `<p>${escape(project.category)}</p>` : ''}
    </div><span aria-hidden="true">↗</span></div>
  </div></article>`;
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
    portfolio: `<div class="portfolio-grid" id="portfolio">${projects.length ? projects.map(projectCard).join('\n') : Array.from({ length: placeholderCount }, (_, index) => placeholder(index)).join('\n')}</div>`,
    status: `<span>${projects.length ? 'Выберите работу, чтобы посмотреть видео.' : 'Место для будущих работ. Портфолио скоро появится здесь.'}</span>`,
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
