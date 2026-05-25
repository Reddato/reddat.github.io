/* ============================================================
   REDDAT — Reddit Clone  |  Vanilla JS + localStorage
   ============================================================ */

// ── STATE ──────────────────────────────────────────────────
let state = {
  currentUser: null,
  currentPage: 'home',
  currentSub: null,
  currentPost: null,
  sort: 'hot',
  profileUser: null,
  profileTab: 'posts',
  pendingCommentPostId: null,
};

const SITE_URL = 'https://reddat.github.io';

// ── STORAGE HELPERS ────────────────────────────────────────
const S = {
  get: k => JSON.parse(localStorage.getItem(k) || 'null'),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

function getUsers()      { return S.get('rdt_users')      || {}; }
function getPosts()      { return S.get('rdt_posts')      || []; }
function getSubs()       { return S.get('rdt_subs')       || []; }
function getComments()   { return S.get('rdt_comments')   || []; }
function getVotes()      { return S.get('rdt_votes')      || {}; }
function getJoined()     { return S.get('rdt_joined')     || {}; }
function saveUsers(v)    { S.set('rdt_users', v); }
function savePosts(v)    { S.set('rdt_posts', v); }
function saveSubs(v)     { S.set('rdt_subs', v); }
function saveComments(v) { S.set('rdt_comments', v); }
function saveVotes(v)    { S.set('rdt_votes', v); }
function saveJoined(v)   { S.set('rdt_joined', v); }

// ── SEED DATA ──────────────────────────────────────────────
function seedData() {
  const seededSubs = ['s1', 's2', 's3', 's4', 's5'];
  const seededPosts = ['p1', 'p2', 'p3', 'p4', 'p5'];
  const seededComments = ['c1', 'c2', 'c3', 'c4'];
  if (getSubs().some(s => seededSubs.includes(s.id))) {
    saveSubs(getSubs().filter(s => !seededSubs.includes(s.id)));
  }
  if (getPosts().some(p => seededPosts.includes(p.id))) {
    savePosts(getPosts().filter(p => !seededPosts.includes(p.id)));
  }
  if (getComments().some(c => seededComments.includes(c.id))) {
    saveComments(getComments().filter(c => !seededComments.includes(c.id)));
  }
}

// ── INIT ───────────────────────────────────────────────────
function init() {
  seedData();
  const saved = S.get('rdt_session');
  if (saved) {
    const users = getUsers();
    if (users[saved]) state.currentUser = users[saved];
  }
  renderNav();
  showPage('home');
}

// ── NAVIGATION ─────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(name + 'Page').classList.add('active');
  state.currentPage = name;
  if (name === 'home') renderHome();
  if (name === 'search') renderSearch();
}

function showSubreddit(subId) {
  state.currentSub = subId;
  showPage('subreddit');
  renderSubreddit(subId);
}

function showPost(postId) {
  state.currentPost = postId;
  showPage('post');
  renderPostDetail(postId);
}

function showProfile(username) {
  state.profileUser = username;
  state.profileTab = 'posts';
  showPage('profile');
  renderProfile(username);
}

// ── NAV RENDER ─────────────────────────────────────────────
function renderNav() {
  const nr = document.getElementById('navRight');
  if (state.currentUser) {
    const u = state.currentUser;
    nr.innerHTML = `
      <div class="user-nav">
        <button class="btn btn-primary" onclick="requireAuth(()=>showModal('createPostModal'))">+ Create Post</button>
        <div class="user-chip" onclick="showProfile('${esc(u.username)}')">
          <div class="avatar">${esc(u.username[0].toUpperCase())}</div>
          <span>${esc(u.username)}</span>
        </div>
        <button class="btn btn-ghost" onclick="logout()">Log out</button>
        <button class="theme-toggle" onclick="toggleTheme()" title="Toggle dark mode"><i class="fa fa-moon" id="themeIcon"></i></button>
      </div>
    `;
  } else {
    nr.innerHTML = `
      <button class="btn btn-outline" onclick="showModal('loginModal')">Log In</button>
      <button class="btn btn-primary" onclick="showModal('registerModal')">Sign Up</button>
      <button class="theme-toggle" onclick="toggleTheme()" title="Toggle dark mode"><i class="fa fa-moon" id="themeIcon"></i></button>
    `;
  }
  const theme = S.get('rdt_theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = theme === 'dark' ? 'fa fa-sun' : 'fa fa-moon';
}

// ── HOME ───────────────────────────────────────────────────
function renderHome() {
  renderPostFeed('postFeed', getPosts());
  renderSidebarSubs();
  populateSubSelect();
}

function renderSidebarSubs() {
  const subs = getSubs().sort((a,b) => b.members - a.members).slice(0,8);
  const el = document.getElementById('sidebarSubreddits');
  if (!subs.length) {
    el.innerHTML = `
      <div class="mini-empty">
        <i class="fa fa-sparkles"></i>
        <span>No communities yet.</span>
      </div>
    `;
    return;
  }
  el.innerHTML = subs.map((s,i) => `
    <div class="sub-list-item" onclick="showSubreddit('${s.id}')">
      <div class="sub-icon" style="background:${s.color}">${s.name[0].toUpperCase()}</div>
      <div>
        <div class="sub-name">r/${esc(s.name)}</div>
        <div class="sub-members">${formatNum(s.members)} members</div>
      </div>
    </div>
  `).join('');
}

// ── SUBREDDIT ──────────────────────────────────────────────
function renderSubreddit(subId) {
  const subs = getSubs();
  const sub = subs.find(s => s.id === subId);
  if (!sub) return;

  document.getElementById('subBanner').style.background = sub.color;

  const joined = isJoined(subId);
  document.getElementById('subInfo').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div class="sub-icon" style="background:${sub.color};width:40px;height:40px;font-size:1.1rem">${sub.name[0].toUpperCase()}</div>
      <div>
        <div style="font-weight:800;font-size:1rem">r/${esc(sub.name)}</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">${formatNum(sub.members)} members</div>
      </div>
    </div>
    <p>${esc(sub.description)}</p>
    <div class="divider"></div>
    <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px">Created by u/${esc(sub.createdBy)} • ${timeAgo(sub.created)}</div>
    <button class="btn btn-primary w-full" style="margin-bottom:8px" onclick="requireAuth(()=>showModal('createPostModal'))" >Create Post</button>
    <button class="join-btn w-full ${joined?'joined':''}" onclick="toggleJoin('${subId}',this)">${joined?'Joined':'Join'}</button>
  `;

  const posts = getPosts().filter(p => p.subId === subId);
  renderPostFeed('subPostFeed', posts);
}

function toggleJoin(subId, btn) {
  if (!state.currentUser) { showModal('loginModal'); return; }
  const joined = getJoined();
  const uid = state.currentUser.username;
  if (!joined[uid]) joined[uid] = [];
  const idx = joined[uid].indexOf(subId);
  if (idx === -1) {
    joined[uid].push(subId);
    btn.textContent = 'Joined';
    btn.classList.add('joined');
    const subs = getSubs();
    const s = subs.find(x => x.id === subId);
    if (s) { s.members++; saveSubs(subs); }
  } else {
    joined[uid].splice(idx, 1);
    btn.textContent = 'Join';
    btn.classList.remove('joined');
    const subs = getSubs();
    const s = subs.find(x => x.id === subId);
    if (s) { s.members = Math.max(0, s.members - 1); saveSubs(subs); }
  }
  saveJoined(joined);
}

function isJoined(subId) {
  if (!state.currentUser) return false;
  const joined = getJoined();
  const uid = state.currentUser.username;
  return joined[uid] && joined[uid].includes(subId);
}

// ── POST FEED ──────────────────────────────────────────────
function renderPostFeed(elId, posts) {
  const el = document.getElementById(elId);
  const sorted = sortPosts(posts);
  if (!sorted.length) {
    el.innerHTML = `
      <div class="empty-state hero-empty">
        <div class="empty-orb"><i class="fa fa-bolt"></i></div>
        <h2>Reddat is ready.</h2>
        <p>No fake posts, no fake comments, no fake communities. Start the first real conversation.</p>
        <div class="empty-actions">
          <button class="btn btn-primary" onclick="requireAuth(()=>showModal('createSubModal'))">Create Community</button>
          <button class="btn btn-outline" onclick="requireAuth(()=>showModal('createPostModal'))">Create Post</button>
        </div>
        <div class="site-pill"><i class="fa fa-link"></i> reddat.github.io</div>
      </div>
    `;
    return;
  }
  el.innerHTML = sorted.map(p => renderPostCard(p)).join('');
}

function renderPostCard(p) {
  const subs = getSubs();
  const sub = subs.find(s => s.id === p.subId) || { name: 'unknown', color: '#888' };
  const votes = getUserVote('post', p.id);
  const displayVotes = p.votes + (votes === 1 ? 1 : votes === -1 ? -1 : 0);
  return `
    <div class="post-card" id="postcard-${p.id}">
      <div class="vote-col">
        <button class="vote-btn ${votes===1?'active-up':''}" onclick="votePost('${p.id}',1)"><i class="fa fa-arrow-up"></i></button>
        <span class="vote-count">${formatNum(displayVotes)}</span>
        <button class="vote-btn downvote ${votes===-1?'active-down':''}" onclick="votePost('${p.id}',-1)"><i class="fa fa-arrow-down"></i></button>
      </div>
      <div class="post-content">
        <div class="post-meta">
          <span class="sub-link" onclick="showSubreddit('${sub.id}')" style="color:${sub.color}">r/${esc(sub.name)}</span>
          &nbsp;•&nbsp; Posted by <span onclick="showProfile('${esc(p.author)}')" style="cursor:pointer">u/${esc(p.author)}</span>
          &nbsp;•&nbsp; ${timeAgo(p.created)}
        </div>
        <div class="post-title" onclick="showPost('${p.id}')">${esc(p.title)}</div>
        ${p.image ? `<img class="post-image" src="${p.image}" alt="" onclick="showPost('${p.id}')" onerror="this.style.display='none'">` : ''}
        ${p.body ? `<div class="post-body-preview">${esc(p.body)}</div>` : ''}
        <div class="post-actions">
          <button class="action-btn" onclick="showPost('${p.id}')"><i class="fa fa-comment"></i> ${getComments().filter(c=>c.postId===p.id).length} Comments</button>
          <button class="action-btn" onclick="sharePost('${p.id}')"><i class="fa fa-share"></i> Share</button>
        </div>
      </div>
    </div>
  `;
}

function sortPosts(posts) {
  if (state.sort === 'new') return [...posts].sort((a,b) => b.created - a.created);
  if (state.sort === 'top') return [...posts].sort((a,b) => b.votes - a.votes);
  // hot: score + recency boost
  return [...posts].sort((a,b) => {
    const scoreA = a.votes / Math.pow((Date.now() - a.created)/3600000 + 2, 1.5);
    const scoreB = b.votes / Math.pow((Date.now() - b.created)/3600000 + 2, 1.5);
    return scoreB - scoreA;
  });
}

function setSort(s, btn) {
  state.sort = s;
  document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (state.currentPage === 'home') renderPostFeed('postFeed', getPosts());
  if (state.currentPage === 'subreddit') renderPostFeed('subPostFeed', getPosts().filter(p=>p.subId===state.currentSub));
}

// ── POST DETAIL ────────────────────────────────────────────
function renderPostDetail(postId) {
  const post = getPosts().find(p => p.id === postId);
  if (!post) return;
  const subs = getSubs();
  const sub = subs.find(s => s.id === post.subId) || { name: 'unknown', color: '#888', id: '' };
  const comments = getComments().filter(c => c.postId === postId);
  const votes = getUserVote('post', postId);
  const displayVotes = post.votes + (votes === 1 ? 1 : votes === -1 ? -1 : 0);

  document.getElementById('postDetail').innerHTML = `
    <div class="post-detail-card">
      <div class="post-meta">
        <span class="sub-link" onclick="showSubreddit('${sub.id}')" style="color:${sub.color};cursor:pointer;font-weight:700">r/${esc(sub.name)}</span>
        &nbsp;•&nbsp; Posted by <span onclick="showProfile('${esc(post.author)}')" style="cursor:pointer">u/${esc(post.author)}</span>
        &nbsp;•&nbsp; ${timeAgo(post.created)}
      </div>
      <div class="post-detail-title">${esc(post.title)}</div>
      ${post.image ? `<img class="post-image" src="${post.image}" alt="" onerror="this.style.display='none'">` : ''}
      ${post.body ? `<div class="post-detail-body">${esc(post.body)}</div>` : ''}
      <div class="post-actions" style="border-top:1px solid var(--border);padding-top:8px">
        <button class="vote-btn ${votes===1?'active-up':''}" onclick="votePost('${postId}',1);renderPostDetail('${postId}')"><i class="fa fa-arrow-up"></i></button>
        <span style="font-size:0.85rem;font-weight:700;margin:0 4px">${formatNum(displayVotes)}</span>
        <button class="vote-btn downvote ${votes===-1?'active-down':''}" onclick="votePost('${postId}',-1);renderPostDetail('${postId}')"><i class="fa fa-arrow-down"></i></button>
        <button class="action-btn" onclick="sharePost('${postId}')"><i class="fa fa-share"></i> Share</button>
      </div>
    </div>
    <div class="comment-section">
      <h3>${comments.length} Comment${comments.length!==1?'s':''}</h3>
      <button class="add-comment-btn" onclick="requireAuth(()=>openCommentModal('${postId}'))">
        <i class="fa fa-plus-circle"></i> Add a comment
      </button>
      ${comments.length ? sortComments(comments).map(c => renderComment(c)).join('') : `<div class="empty-state" style="padding:24px"><i class="fa fa-comments"></i><p>No comments yet.</p></div>`}
    </div>
  `;

  document.getElementById('postSidebar').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:pointer" onclick="showSubreddit('${sub.id}')">
      <div class="sub-icon" style="background:${sub.color}">${sub.name[0].toUpperCase()}</div>
      <div style="font-weight:700">r/${esc(sub.name)}</div>
    </div>
    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:8px">${esc(sub.description || '')}</p>
    <button class="btn btn-primary w-full" onclick="showSubreddit('${sub.id}')">View Community</button>
  `;
}

function renderComment(c) {
  const cv = getUserVote('comment', c.id);
  const displayVotes = c.votes + (cv === 1 ? 1 : cv === -1 ? -1 : 0);
  return `
    <div class="comment" id="comment-${c.id}">
      <div class="comment-meta">
        <span class="comment-author" onclick="showProfile('${esc(c.author)}')">${esc(c.author)}</span>
        &nbsp;•&nbsp; ${timeAgo(c.created)}
      </div>
      <div class="comment-body">${esc(c.body)}</div>
      <div class="comment-actions">
        <div class="comment-vote">
          <button class="${cv===1?'active-up':''}" onclick="voteComment('${c.id}');renderPostDetail('${state.currentPost}')"><i class="fa fa-arrow-up"></i></button>
          <span>${formatNum(displayVotes)}</span>
          <button class="${cv===-1?'active-down':''}" onclick="voteComment('${c.id}',-1);renderPostDetail('${state.currentPost}')"><i class="fa fa-arrow-down"></i></button>
        </div>
      </div>
    </div>
  `;
}

function sortComments(comments) {
  return [...comments].sort((a,b) => b.votes - a.votes);
}

// ── VOTING ─────────────────────────────────────────────────
function getUserVote(type, id) {
  const votes = getVotes();
  const uid = state.currentUser ? state.currentUser.username : '__anon__';
  return (votes[uid] && votes[uid][type + '_' + id]) || 0;
}

function votePost(postId, dir) {
  if (!requireAuthSilent()) { showModal('loginModal'); return; }
  const votes = getVotes();
  const uid = state.currentUser.username;
  if (!votes[uid]) votes[uid] = {};
  const key = 'post_' + postId;
  const prev = votes[uid][key] || 0;
  votes[uid][key] = prev === dir ? 0 : dir;
  saveVotes(votes);

  // Update karma
  const posts = getPosts();
  const p = posts.find(x => x.id === postId);
  if (p) {
    // undo previous, apply new
    p.votes -= prev;
    p.votes += votes[uid][key];
    savePosts(posts);
    updateAuthorKarma(p.author, -prev + votes[uid][key]);
  }

  // Re-render card if visible
  const card = document.getElementById('postcard-' + postId);
  if (card) {
    const tmp = document.createElement('div');
    tmp.innerHTML = renderPostCard(p);
    card.replaceWith(tmp.firstElementChild);
  }
}

function voteComment(commentId, dir = 1) {
  if (!requireAuthSilent()) { showModal('loginModal'); return; }
  const votes = getVotes();
  const uid = state.currentUser.username;
  if (!votes[uid]) votes[uid] = {};
  const key = 'comment_' + commentId;
  const prev = votes[uid][key] || 0;
  votes[uid][key] = prev === dir ? 0 : dir;
  saveVotes(votes);
  const comments = getComments();
  const c = comments.find(x => x.id === commentId);
  if (c) { c.votes -= prev; c.votes += votes[uid][key]; saveComments(comments); }
}

function updateAuthorKarma(username, delta) {
  const users = getUsers();
  if (users[username]) { users[username].karma = (users[username].karma || 0) + delta; saveUsers(users); }
}

// ── CREATING POSTS ─────────────────────────────────────────
function populateSubSelect() {
  const sel = document.getElementById('postSubreddit');
  if (!sel) return;
  const subs = getSubs();
  sel.innerHTML = `<option value="">Choose a community</option>` +
    subs.map(s => `<option value="${s.id}">r/${esc(s.name)}</option>`).join('');
  if (state.currentSub) sel.value = state.currentSub;
}

function createPost() {
  const subId = document.getElementById('postSubreddit').value;
  const title = document.getElementById('postTitle').value.trim();
  const body  = document.getElementById('postBody').value.trim();
  const image = document.getElementById('postImageUrl').value.trim();
  const errEl = document.getElementById('createPostError');
  errEl.textContent = '';
  if (!subId) { errEl.textContent = 'Please choose a community.'; return; }
  if (!title) { errEl.textContent = 'Title is required.'; return; }
  const posts = getPosts();
  const post = {
    id: 'p' + Date.now(),
    subId, title, body, image,
    author: state.currentUser.username,
    created: Date.now(),
    votes: 1,
  };
  posts.unshift(post);
  savePosts(posts);
  updateAuthorKarma(state.currentUser.username, 1);
  closeModal('createPostModal');
  document.getElementById('postTitle').value = '';
  document.getElementById('postBody').value = '';
  document.getElementById('postImageUrl').value = '';
  showPost(post.id);
}

// ── CREATING COMMENTS ──────────────────────────────────────
function openCommentModal(postId) {
  state.pendingCommentPostId = postId;
  document.getElementById('commentBody').value = '';
  document.getElementById('commentError').textContent = '';
  showModal('commentModal');
}

function submitComment() {
  const body = document.getElementById('commentBody').value.trim();
  const errEl = document.getElementById('commentError');
  errEl.textContent = '';
  if (!body) { errEl.textContent = 'Comment cannot be empty.'; return; }
  const comments = getComments();
  const comment = {
    id: 'c' + Date.now(),
    postId: state.pendingCommentPostId,
    author: state.currentUser.username,
    body,
    votes: 1,
    created: Date.now(),
  };
  comments.push(comment);
  saveComments(comments);
  updateAuthorKarma(state.currentUser.username, 1);
  closeModal('commentModal');
  if (state.currentPage === 'post') renderPostDetail(state.pendingCommentPostId);
}

// ── CREATING SUBREDDITS ────────────────────────────────────
function createSubreddit() {
  const name  = document.getElementById('subName').value.trim().replace(/\s/g,'');
  const desc  = document.getElementById('subDescription').value.trim();
  const color = document.getElementById('subColor').value.trim() || '#ff4500';
  const errEl = document.getElementById('createSubError');
  errEl.textContent = '';
  if (!name) { errEl.textContent = 'Community name is required.'; return; }
  if (!/^[a-zA-Z0-9_]{2,21}$/.test(name)) { errEl.textContent = 'Name must be 2-21 chars, letters/numbers/underscores only.'; return; }
  const subs = getSubs();
  if (subs.find(s => s.name.toLowerCase() === name.toLowerCase())) { errEl.textContent = 'That community name is taken.'; return; }
  const sub = {
    id: 'sub' + Date.now(),
    name, description: desc, color,
    created: Date.now(), members: 1,
    createdBy: state.currentUser.username,
  };
  subs.push(sub);
  saveSubs(subs);
  closeModal('createSubModal');
  showSubreddit(sub.id);
}

// ── SEARCH ─────────────────────────────────────────────────
let searchTimeout;
function handleSearch(val) {
  clearTimeout(searchTimeout);
  if (!val.trim()) return;
  searchTimeout = setTimeout(() => {
    showPage('search');
    renderSearch(val.trim());
  }, 300);
}

function renderSearch(query) {
  query = query || document.getElementById('searchInput').value.trim();
  document.getElementById('searchTitle').textContent = query ? `Results for "${query}"` : 'Search';
  if (!query) { document.getElementById('searchResults').innerHTML = ''; return; }
  const q = query.toLowerCase();
  const posts = getPosts().filter(p => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q));
  const subs  = getSubs().filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  const users = Object.values(getUsers()).filter(u => u.username.toLowerCase().includes(q));

  let html = '';
  if (subs.length) {
    html += `<h3 style="margin-bottom:8px;margin-top:16px">Communities</h3>`;
    html += subs.map(s => `
      <div class="post-card" style="padding:12px;cursor:pointer" onclick="showSubreddit('${s.id}')">
        <div class="sub-icon" style="background:${s.color};margin:0 12px 0 4px">${s.name[0].toUpperCase()}</div>
        <div>
          <div style="font-weight:700">r/${esc(s.name)}</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">${formatNum(s.members)} members • ${esc(s.description)}</div>
        </div>
      </div>
    `).join('');
  }
  if (users.length) {
    html += `<h3 style="margin-bottom:8px;margin-top:16px">Users</h3>`;
    html += users.map(u => `
      <div class="post-card" style="padding:12px;cursor:pointer;align-items:center" onclick="showProfile('${esc(u.username)}')">
        <div class="avatar" style="margin:0 12px 0 4px;width:36px;height:36px;font-size:1rem">${u.username[0].toUpperCase()}</div>
        <div>
          <div style="font-weight:700">u/${esc(u.username)}</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">${formatNum(u.karma||0)} karma</div>
        </div>
      </div>
    `).join('');
  }
  if (posts.length) {
    html += `<h3 style="margin-bottom:8px;margin-top:16px">Posts</h3>`;
    html += posts.map(p => renderPostCard(p)).join('');
  }
  if (!subs.length && !users.length && !posts.length) {
    html = `<div class="empty-state"><i class="fa fa-search"></i><p>No results for "${esc(query)}"</p></div>`;
  }
  document.getElementById('searchResults').innerHTML = html;
}

// ── PROFILE ────────────────────────────────────────────────
function renderProfile(username) {
  const users = getUsers();
  const u = users[username];
  if (!u) {
    document.getElementById('profileHeader').innerHTML = `<p style="color:var(--text-muted)">User not found.</p>`;
    return;
  }
  const posts = getPosts().filter(p => p.author === username);
  const comments = getComments().filter(c => c.author === username);
  const joined = formatDate(u.created);
  const isMe = state.currentUser && state.currentUser.username === username;

  document.getElementById('profileHeader').innerHTML = `
    <div class="profile-avatar">${username[0].toUpperCase()}</div>
    <div class="profile-info">
      <h2>u/${esc(username)} ${isMe ? '<span class="badge">You</span>' : ''}</h2>
      <p>Joined ${joined}</p>
      <div class="profile-stats">
        <div class="stat"><div class="stat-val">${formatNum(u.karma||0)}</div><div class="stat-label"><i class="fa fa-star karma-icon"></i> Karma</div></div>
        <div class="stat"><div class="stat-val">${posts.length}</div><div class="stat-label">Posts</div></div>
        <div class="stat"><div class="stat-val">${comments.length}</div><div class="stat-label">Comments</div></div>
      </div>
    </div>
  `;
  document.getElementById('profileSidebar').innerHTML = `
    <div class="profile-avatar" style="margin:0 auto 8px;width:48px;height:48px;font-size:1.3rem">${username[0].toUpperCase()}</div>
    <div style="text-align:center;font-weight:700;margin-bottom:4px">u/${esc(username)}</div>
    <div style="text-align:center;font-size:0.8rem;color:var(--text-muted);margin-bottom:12px">${formatNum(u.karma||0)} karma • joined ${joined}</div>
    ${isMe ? `<button class="btn btn-outline w-full" onclick="logout()">Log Out</button>` : ''}
  `;
  renderProfileContent(username);
}

function profileTab(tab, btn) {
  state.profileTab = tab;
  document.querySelectorAll('#profilePage .sort-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProfileContent(state.profileUser);
}

function renderProfileContent(username) {
  const el = document.getElementById('profileContent');
  if (state.profileTab === 'posts') {
    const posts = getPosts().filter(p => p.author === username);
    if (!posts.length) { el.innerHTML = `<div class="empty-state"><i class="fa fa-file-alt"></i><p>No posts yet.</p></div>`; return; }
    el.innerHTML = sortPosts(posts).map(p => renderPostCard(p)).join('');
  } else {
    const comments = getComments().filter(c => c.author === username);
    if (!comments.length) { el.innerHTML = `<div class="empty-state"><i class="fa fa-comment"></i><p>No comments yet.</p></div>`; return; }
    el.innerHTML = comments.map(c => {
      const post = getPosts().find(p => p.id === c.postId);
      return `
        <div class="post-card" style="flex-direction:column;padding:12px">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">
            Commented on <span onclick="showPost('${c.postId}')" style="cursor:pointer;color:var(--link)">${esc(post?post.title:'[deleted]')}</span>
            &nbsp;•&nbsp; ${timeAgo(c.created)}
          </div>
          <div style="font-size:0.875rem;color:var(--text)">${esc(c.body)}</div>
        </div>
      `;
    }).join('');
  }
}

// ── AUTH ───────────────────────────────────────────────────
function register() {
  const username = document.getElementById('regUsername').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const errEl    = document.getElementById('registerError');
  errEl.textContent = '';
  if (!username || !email || !password) { errEl.textContent = 'All fields are required.'; return; }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { errEl.textContent = 'Username: 3-20 chars, letters/numbers/underscore only.'; return; }
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
  const users = getUsers();
  if (users[username]) { errEl.textContent = 'Username already taken.'; return; }
  const user = { username, email, password: btoa(password), karma: 0, created: Date.now() };
  users[username] = user;
  saveUsers(users);
  S.set('rdt_session', username);
  state.currentUser = user;
  closeModal('registerModal');
  renderNav();
  showPage('home');
}

function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  errEl.textContent = '';
  if (!username || !password) { errEl.textContent = 'All fields are required.'; return; }
  const users = getUsers();
  const u = users[username];
  if (!u || atob(u.password) !== password) { errEl.textContent = 'Invalid username or password.'; return; }
  S.set('rdt_session', username);
  state.currentUser = u;
  closeModal('loginModal');
  renderNav();
  showPage('home');
}

function logout() {
  S.set('rdt_session', null);
  state.currentUser = null;
  renderNav();
  showPage('home');
}

function requireAuth(cb) {
  if (!state.currentUser) { showModal('loginModal'); return; }
  if (cb) cb();
}

function requireAuthSilent() {
  return !!state.currentUser;
}

// ── MODALS ─────────────────────────────────────────────────
function showModal(id) {
  if (id === 'createPostModal') populateSubSelect();
  document.getElementById(id).classList.add('open');
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeModalOutside(e, id) { if (e.target.id === id) closeModal(id); }
function switchModal(from, to) { closeModal(from); showModal(to); }

// ── SHARE ──────────────────────────────────────────────────
function sharePost(postId) {
  const text = `${SITE_URL}/#${postId}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => alert('Link copied to clipboard!'));
  } else {
    alert(text);
  }
}

// ── THEME ──────────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  S.set('rdt_theme', next);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = next === 'dark' ? 'fa fa-sun' : 'fa fa-moon';
}

// ── UTILS ──────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff/60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m/60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h/24);
  if (d < 30) return d + 'd ago';
  const mo = Math.floor(d/30);
  if (mo < 12) return mo + 'mo ago';
  return Math.floor(mo/12) + 'y ago';
}

function formatNum(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(1) + 'k';
  return String(n);
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
}

// ── BOOT ───────────────────────────────────────────────────
init();
