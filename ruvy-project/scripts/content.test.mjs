import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedProjects, renderContacts, renderContent } from './content.mjs';

const template = ['count', 'portfolio', 'status', 'contacts']
  .map((key) => `<!-- content:${key}:start --><!-- content:${key}:end -->`)
  .join('\n');
const project = {
  published: true,
  title: 'Test fixture',
  video: 'ruvy-project/assets/test.webm',
};

test('empty portfolio has six static placeholders, zero published works and no video triggers', () => {
  const html = renderContent(template, { projects: [], placeholderCount: 6 });
  assert.equal((html.match(/class="project project-placeholder"/g) || []).length, 6);
  assert.match(html, /Опубликовано работ: 0/);
  assert.doesNotMatch(html, /data-video|<button|aria-disabled/);
});
test('only explicitly published, titled videos are visible', () => {
  const projects = [
    project,
    { ...project, published: false },
    { ...project, title: '' },
    { ...project, video: '' },
    { ...project, video: 'javascript:alert(1)' },
    { ...project, video: 'https://youtube.com/watch?v=123' },
  ];
  assert.equal(publishedProjects({ projects }).length, 1);
  const html = renderContent(template, { projects });
  assert.match(html, /Опубликовано работ: 1/);
  assert.doesNotMatch(html, /project-placeholder/);
  assert.match(html, /href="ruvy-project\/assets\/test.webm"/);
});
test('contact links exist without JavaScript; absent contacts are neutral text', () => {
  const html = renderContacts({
    telegram: 'https://t.me/ruvyemm',
    email: '1rruvyy1@gmail.com',
  });
  assert.match(html, /href="https:\/\/t.me\/ruvyemm"/);
  assert.match(html, /href="mailto:1rruvyy1@gmail.com"/);
  const empty = renderContacts({ telegram: 'javascript:alert(1)', email: '' });
  assert.doesNotMatch(empty, /<a|aria-disabled/);
});
test('project text is escaped and untrusted media URLs are excluded', () => {
  const html = renderContent(template, {
    projects: [
      {
        ...project,
        title: '<img src=x onerror="alert(1)">',
        description: '" onclick="alert(1)',
        cover: 'javascript:alert(1)',
      },
    ],
  });
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img|data-description="" onclick/);
});

test('primary CTA follows contact data and falls back to the contact section', () => {
  const page = template + '<!-- content:cta:start --><!-- content:cta:end -->';
  assert.match(renderContent(page, { telegram: 'https://t.me/ruvyemm' }), /class="cta"/);
  const missing = renderContent(page, {});
  assert.match(missing, /href="#contacts" class="cta"/);
  assert.doesNotMatch(missing, /href="https:\/\/t.me/);
});
