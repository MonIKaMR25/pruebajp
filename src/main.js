const API_BASE = 'https://pokeapi.co/api/v2';
const POKEMON_LIMIT = 60;
const CAPTURED_KEY = 'pokeplay-captured';
const DARK_KEY = 'pokeplay-dark';

const app = document.getElementById('app');
const darkToggle = document.getElementById('dark-toggle');

const typeColors = {
  normal: 'bg-stone-400',
  fire: 'bg-orange-500',
  water: 'bg-blue-500',
  electric: 'bg-yellow-400 text-slate-900',
  grass: 'bg-green-500',
  ice: 'bg-cyan-300 text-slate-900',
  fighting: 'bg-red-700',
  poison: 'bg-purple-600',
  ground: 'bg-amber-600',
  flying: 'bg-indigo-400',
  psychic: 'bg-pink-500',
  bug: 'bg-lime-600',
  rock: 'bg-yellow-700',
  ghost: 'bg-violet-700',
  dragon: 'bg-indigo-700',
  dark: 'bg-slate-700',
  steel: 'bg-slate-500',
  fairy: 'bg-pink-300 text-slate-900'
};

let pokemonListCache = [];
let pokemonMapCache = new Map();

initDarkMode();
initRouting();

function initDarkMode() {
  const isDark = localStorage.getItem(DARK_KEY) === 'true';
  document.documentElement.classList.toggle('dark', isDark);
  darkToggle.textContent = isDark ? '☀️' : '🌙';
  darkToggle.addEventListener('click', () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem(DARK_KEY, String(next));
    darkToggle.textContent = next ? '☀️' : '🌙';
  });
}

function initRouting() {
  window.addEventListener('hashchange', renderRoute);
  if (!location.hash) location.hash = '#/';
  renderRoute();
}

function renderRoute() {
  const route = location.hash.replace('#', '') || '/';
  updateActiveNav(route);
  if (route.startsWith('/pokemon/')) {
    const id = route.split('/')[2];
    renderPokemonDetail(id);
    return;
  }
  if (route === '/battle') {
    renderBattle();
    return;
  }
  if (route === '/pokedex') {
    renderMyPokedex();
    return;
  }
  renderHome();
}

function updateActiveNav(route) {
  document.querySelectorAll('.nav-link').forEach((el) => {
    const href = el.getAttribute('href').replace('#', '');
    const active = route === href;
    el.classList.toggle('bg-slate-100', active);
    el.classList.toggle('dark:bg-slate-800', active);
    el.classList.toggle('text-red-500', active);
  });
}

function toId(url) {
  return Number(url.split('/').filter(Boolean).pop());
}

async function getPokemonList() {
  if (pokemonListCache.length) return pokemonListCache;
  const res = await fetch(`${API_BASE}/pokemon?limit=${POKEMON_LIMIT}`);
  const data = await res.json();
  const details = await Promise.all(
    data.results.map(async (item) => {
      const detail = await fetch(item.url).then((r) => r.json());
      const normalized = normalizePokemon(detail);
      pokemonMapCache.set(normalized.id, normalized);
      return normalized;
    })
  );
  pokemonListCache = details;
  return pokemonListCache;
}

async function getPokemon(idOrName) {
  const key = Number(idOrName);
  if (Number.isInteger(key) && pokemonMapCache.has(key)) return pokemonMapCache.get(key);
  const res = await fetch(`${API_BASE}/pokemon/${idOrName}`);
  const data = await res.json();
  const normalized = normalizePokemon(data);
  pokemonMapCache.set(normalized.id, normalized);
  return normalized;
}

function normalizePokemon(pokemon) {
  return {
    id: pokemon.id,
    name: pokemon.name,
    image:
      pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default,
    types: pokemon.types.map((t) => t.type.name),
    stats: pokemon.stats.map((s) => ({ name: s.stat.name, value: s.base_stat })),
    abilities: pokemon.abilities.map((a) => a.ability.name)
  };
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function typeBadge(type) {
  return `<span class="${typeColors[type] || 'bg-slate-400'} rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">${type}</span>`;
}

function cardSkeleton() {
  return '<div class="skeleton h-64 rounded-2xl"></div>';
}

function detailSkeleton() {
  return `
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="skeleton h-72 rounded-3xl"></div>
      <div class="space-y-4">
        <div class="skeleton h-10 rounded-lg"></div>
        <div class="skeleton h-6 rounded-lg"></div>
        <div class="skeleton h-44 rounded-lg"></div>
      </div>
    </div>`;
}

async function renderHome() {
  app.innerHTML = `
    <section class="space-y-6 animate-pulseIn">
      <div class="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800 sm:flex-row sm:items-center">
        <input id="search" class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 focus:border-red-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900" placeholder="Buscar Pokémon..." />
        <select id="type-filter" class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 focus:border-red-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 sm:max-w-xs">
          <option value="">Todos los tipos</option>
        </select>
      </div>
      <div id="list" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        ${Array.from({ length: 8 }, cardSkeleton).join('')}
      </div>
    </section>`;

  try {
    const list = await getPokemonList();
    const typeSet = [...new Set(list.flatMap((p) => p.types))].sort();
    const typeFilter = document.getElementById('type-filter');
    typeFilter.innerHTML += typeSet
      .map((type) => `<option value="${type}">${capitalize(type)}</option>`)
      .join('');

    const search = document.getElementById('search');
    const listContainer = document.getElementById('list');

    const draw = () => {
      const query = search.value.trim().toLowerCase();
      const selectedType = typeFilter.value;
      const filtered = list.filter((p) => {
        const matchName = p.name.includes(query);
        const matchType = selectedType ? p.types.includes(selectedType) : true;
        return matchName && matchType;
      });

      if (!filtered.length) {
        listContainer.innerHTML = '<p class="col-span-full rounded-2xl bg-white p-8 text-center dark:bg-slate-800">No se encontraron Pokémon.</p>';
        return;
      }

      listContainer.innerHTML = filtered
        .map(
          (p) => `
      <a href="#/pokemon/${p.id}" class="group rounded-2xl bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-slate-800">
        <div class="flex justify-between text-sm text-slate-500 dark:text-slate-300">
          <span>#${String(p.id).padStart(3, '0')}</span>
          <span class="transition group-hover:text-red-500">Ver detalle →</span>
        </div>
        <img loading="lazy" class="mx-auto h-32 w-32 object-contain transition duration-500 group-hover:scale-110 group-hover:animate-float" src="${p.image}" alt="${p.name}" />
        <h3 class="mt-2 text-center text-lg font-bold">${capitalize(p.name)}</h3>
        <div class="mt-3 flex flex-wrap justify-center gap-2">${p.types.map(typeBadge).join('')}</div>
      </a>`
        )
        .join('');
    };

    search.addEventListener('input', draw);
    typeFilter.addEventListener('change', draw);
    draw();
  } catch {
    document.getElementById('list').innerHTML =
      '<p class="col-span-full rounded-2xl bg-white p-8 text-center dark:bg-slate-800">No se pudo cargar la lista desde PokeAPI.</p>';
  }
}

async function renderPokemonDetail(id) {
  app.innerHTML = detailSkeleton();
  try {
    const p = await getPokemon(id);
    const captured = getCapturedIds().includes(p.id);

    app.innerHTML = `
      <section class="grid gap-6 rounded-3xl bg-white p-5 shadow-sm dark:bg-slate-800 lg:grid-cols-2 animate-pulseIn">
        <div class="rounded-3xl bg-gradient-to-br from-red-100 to-sky-100 p-6 dark:from-slate-700 dark:to-slate-600">
          <img class="mx-auto h-72 w-72 object-contain" src="${p.image}" alt="${p.name}" />
        </div>
        <div class="space-y-4">
          <a href="#/" class="inline-flex rounded-full border border-slate-300 px-3 py-1 text-sm dark:border-slate-600">← Volver</a>
          <h1 class="text-3xl font-extrabold">${capitalize(p.name)} <span class="text-xl text-slate-500">#${String(p.id).padStart(3, '0')}</span></h1>
          <div class="flex flex-wrap gap-2">${p.types.map(typeBadge).join('')}</div>
          <div class="space-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
            ${p.stats
              .map(
                (s) => `
              <div>
                <div class="mb-1 flex justify-between text-sm"><span>${s.name.replace('-', ' ')}</span><span>${s.value}</span></div>
                <div class="h-2 rounded-full bg-slate-200 dark:bg-slate-700"><div class="h-2 rounded-full bg-red-500" style="width:${Math.min(
                  s.value,
                  120
                ) / 1.2}%"></div></div>
              </div>`
              )
              .join('')}
          </div>
          <div>
            <h2 class="mb-1 font-semibold">Habilidades</h2>
            <div class="flex flex-wrap gap-2">${p.abilities
              .map(
                (ability) =>
                  `<span class="rounded-full bg-sky-100 px-3 py-1 text-sm dark:bg-slate-700">${ability.replace('-', ' ')}</span>`
              )
              .join('')}</div>
          </div>
          <button id="capture-btn" class="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white transition hover:scale-105 hover:bg-red-600">${
            captured ? 'Ya capturado' : 'Capturar'
          }</button>
        </div>
      </section>`;

    const captureBtn = document.getElementById('capture-btn');
    if (captured) captureBtn.disabled = true;
    captureBtn.addEventListener('click', () => {
      capturePokemon(p.id);
      captureBtn.textContent = '¡Capturado!';
      captureBtn.disabled = true;
    });
  } catch {
    app.innerHTML = '<p class="rounded-2xl bg-white p-8 text-center dark:bg-slate-800">No se pudo cargar el Pokémon.</p>';
  }
}

function getCapturedIds() {
  return JSON.parse(localStorage.getItem(CAPTURED_KEY) || '[]');
}

function saveCapturedIds(ids) {
  localStorage.setItem(CAPTURED_KEY, JSON.stringify([...new Set(ids)]));
}

function capturePokemon(id) {
  const ids = getCapturedIds();
  ids.push(id);
  saveCapturedIds(ids);
}

function removePokemon(id) {
  saveCapturedIds(getCapturedIds().filter((item) => item !== id));
}

async function renderMyPokedex() {
  app.innerHTML = `
    <section class="space-y-4 animate-pulseIn">
      <h1 class="text-3xl font-extrabold">Mi Pokédex</h1>
      <div id="captured-list" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">${Array.from({ length: 3 }, cardSkeleton).join('')}</div>
    </section>`;

  const ids = getCapturedIds();
  const container = document.getElementById('captured-list');
  if (!ids.length) {
    container.innerHTML = '<p class="col-span-full rounded-2xl bg-white p-8 text-center dark:bg-slate-800">Aún no has capturado Pokémon.</p>';
    return;
  }

  try {
    const captured = await Promise.all(ids.map((id) => getPokemon(id)));
    container.innerHTML = captured
      .map(
        (p) => `
      <article class="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800">
        <img loading="lazy" class="mx-auto h-28 w-28 object-contain" src="${p.image}" alt="${p.name}" />
        <h3 class="text-center text-lg font-bold">${capitalize(p.name)}</h3>
        <p class="text-center text-sm text-slate-500">#${String(p.id).padStart(3, '0')}</p>
        <div class="mt-3 flex justify-center gap-2">${p.types.map(typeBadge).join('')}</div>
        <div class="mt-4 flex gap-2">
          <a href="#/pokemon/${p.id}" class="w-full rounded-lg bg-sky-500 px-3 py-2 text-center text-sm font-semibold text-white">Detalle</a>
          <button data-remove="${p.id}" class="w-full rounded-lg bg-slate-500 px-3 py-2 text-sm font-semibold text-white">Eliminar</button>
        </div>
      </article>`
      )
      .join('');

    container.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        removePokemon(Number(btn.dataset.remove));
        renderMyPokedex();
      });
    });
  } catch {
    container.innerHTML =
      '<p class="col-span-full rounded-2xl bg-white p-8 text-center dark:bg-slate-800">No se pudo cargar tu colección.</p>';
  }
}

async function renderBattle() {
  app.innerHTML = `
    <section class="space-y-5 animate-pulseIn">
      <h1 class="text-3xl font-extrabold">Modo Batalla</h1>
      <div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800">
        <label class="mb-2 block text-sm font-semibold">Elige tu Pokémon</label>
        <select id="fighter" class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 dark:border-slate-600 dark:bg-slate-900"></select>
        <button id="fight-btn" class="mt-4 rounded-xl bg-red-500 px-4 py-2 font-semibold text-white transition hover:scale-105">¡Combatir!</button>
      </div>
      <div id="battle-result" class="grid gap-4 md:grid-cols-2"></div>
    </section>`;

  try {
    const fighters = await getPokemonList();
    const select = document.getElementById('fighter');
    select.innerHTML = fighters
      .map((p) => `<option value="${p.id}">#${String(p.id).padStart(3, '0')} ${capitalize(p.name)}</option>`)
      .join('');

    document.getElementById('fight-btn').addEventListener('click', async () => {
      const myPokemon = await getPokemon(select.value);
      const rival = fighters[Math.floor(Math.random() * fighters.length)];
      const result = document.getElementById('battle-result');

      result.innerHTML = `
      <div class="battle-card rounded-2xl bg-white p-4 text-center shadow-sm dark:bg-slate-800">
        <img class="mx-auto h-32 w-32 object-contain" src="${myPokemon.image}" alt="${myPokemon.name}" />
        <h3 class="font-bold">${capitalize(myPokemon.name)}</h3>
      </div>
      <div class="battle-card rounded-2xl bg-white p-4 text-center shadow-sm dark:bg-slate-800">
        <img class="mx-auto h-32 w-32 object-contain" src="${rival.image}" alt="${rival.name}" />
        <h3 class="font-bold">${capitalize(rival.name)}</h3>
      </div>`;

      await new Promise((resolve) => setTimeout(resolve, 900));

      const myPower = scorePokemon(myPokemon);
      const rivalPower = scorePokemon(rival);
      const winner = myPower >= rivalPower ? myPokemon : rival;
      playWinSound();

      result.insertAdjacentHTML(
        'beforeend',
        `<p class="md:col-span-2 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 p-4 text-center text-xl font-extrabold text-white">🏆 Ganador: ${capitalize(
          winner.name
        )}</p>`
      );
    });
  } catch {
    document.getElementById('battle-result').innerHTML =
      '<p class="md:col-span-2 rounded-2xl bg-white p-5 text-center dark:bg-slate-800">No se pudo cargar el modo batalla.</p>';
  }
}

function scorePokemon(pokemon) {
  const totalStats = pokemon.stats.reduce((acc, stat) => acc + stat.value, 0);
  return totalStats + Math.random() * 50;
}

function playWinSound() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const gain = ctx.createGain();
  o1.type = 'triangle';
  o2.type = 'sine';
  o1.frequency.value = 440;
  o2.frequency.value = 660;
  gain.gain.value = 0.02;
  o1.connect(gain);
  o2.connect(gain);
  gain.connect(ctx.destination);
  o1.start();
  o2.start();
  o1.stop(ctx.currentTime + 0.18);
  o2.stop(ctx.currentTime + 0.24);
}
