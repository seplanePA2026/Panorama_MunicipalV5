import { $, } from "../core/dom.js";
import { state, NAV_LABELS } from "../core/state.js";
import { canonCategory, escapeHtml, lower } from "../core/utils.js";

const LS_CUSTOM_CATS = "gp_custom_categories_v1";
const RESERVED_KEYS = new Set(["mapa","territorio","economia","populacao","educacao","outros","cecad","eleitoral","agua_esgoto","atlas_vulnerabilidade"]);

export function readCustomCategories(){
  try{
    const raw = localStorage.getItem(LS_CUSTOM_CATS);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    if(!Array.isArray(arr)) return [];
    return arr
      .map(x => ({
        key: String(x?.key || "").trim(),
        label: String(x?.label || "").trim(),
        icon: typeof x?.icon === "string" ? x.icon : ""
      }))
      .filter(x => x.key && x.label && !RESERVED_KEYS.has(x.key));
  }catch{ return []; }
}

export function writeCustomCategories(list){
  const safe = Array.isArray(list) ? list : [];
  localStorage.setItem(LS_CUSTOM_CATS, JSON.stringify(safe));
}

export function buildCategoryKeyFromLabel(label){
  const key = canonCategory(label);
  if(!key) return "";
  if(RESERVED_KEYS.has(key)) return "";
  return key;
}

export function renderCustomNavButtons(){
  const navList = $("navList") || document.querySelector("#sideNav");
  if(!navList) return;

  navList.querySelectorAll('.navBtn[data-custom="1"]').forEach(el => el.remove());

  const cats = readCustomCategories();
  for(const c of cats){
    NAV_LABELS[c.key] = c.label;
    const btn = document.createElement("div");
    btn.className = "navBtn";
    btn.setAttribute("data-group", c.key);
    btn.setAttribute("data-custom", "1");
    btn.setAttribute("title", c.label);
    if(c.icon){
      btn.innerHTML = `<img class="navImg" alt="" src="${c.icon}">`;
    }else{
      btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18"/><path d="M6 3h12"/><path d="M5 7v14h14V7"/></svg>`;
    }
    navList.appendChild(btn);
  }
}

export function setStatus(text){
  const el = $("statusHint");
  if(el) el.textContent = text;
}

export function openDrawer(group){
  if(group) state.navGroup = group;
  state.drawerOpen = true;
  $("drawer")?.classList.add("open");
  renderMainTabs();
}

export function closeDrawer(){
  state.drawerOpen = false;
  $("drawer")?.classList.remove("open");
}

export function renderMainTabs(){
  const box = $("mainTabs");
  if(!box) return;
  box.innerHTML = "";

  const sheets = state.model?.sheets || [];
  const wantedKey = state.navGroup || "territorio";


  // Categoria especial: Água e Esgoto (Dashboard)
  if(wantedKey === "agua_esgoto"){
    const drawerTopTitle = $("drawerTopTitle");
    if(drawerTopTitle) drawerTopTitle.textContent = NAV_LABELS[wantedKey] || "Água e Esgoto";

    const drawerTitle = $("drawerTitle");
    if(drawerTitle) drawerTitle.textContent = "";

    const baseBadge = $("baseBadge");
    if(baseBadge){
      const nm = state.baseName ? state.baseName.split(" ").slice(0,2).join(" ") : "—";
      baseBadge.innerHTML = `Base<br>${escapeHtml(nm)}`;
    }

    const leftCount = $("leftCount");
    if(leftCount) leftCount.textContent = `1 opção`;

    const btn = document.createElement("div");
    btn.className = "tab";
    btn.onclick = () => {
      state.navGroup = "agua_esgoto";
      state.rightMode = "data";
      closeDrawer();
      syncActiveNav();
      setAguaEsgotoView();
      window.__gpRenderAll?.();
    };
    btn.innerHTML = `<div class="name">Dashboard</div>`;
    box.appendChild(btn);
    return;
  }

  // Categoria especial: Atlas de Vulnerabilidade (Dashboard)
  if(wantedKey === "atlas_vulnerabilidade"){
    const drawerTopTitle = $("drawerTopTitle");
    if(drawerTopTitle) drawerTopTitle.textContent = NAV_LABELS[wantedKey] || "Atlas";

    const drawerTitle = $("drawerTitle");
    if(drawerTitle) drawerTitle.textContent = "";

    const baseBadge = $("baseBadge");
    if(baseBadge){
      const nm = state.baseName ? state.baseName.split(" ").slice(0,2).join(" ") : "—";
      baseBadge.innerHTML = `Base<br>${escapeHtml(nm)}`;
    }

    const leftCount = $("leftCount");
    if(leftCount) leftCount.textContent = `1 opção`;

    const btn = document.createElement("div");
    btn.className = "tab";
    btn.onclick = () => {
      state.navGroup = "atlas_vulnerabilidade";
      state.rightMode = "data";
      closeDrawer();
      syncActiveNav();
      setAtlasVulnerabilidadeView();
      window.__gpRenderAll?.();
    };
    btn.innerHTML = `<div class="name">Dashboard</div>`;
    box.appendChild(btn);
    return;
  }


  let filtered = sheets.filter(s => (s.categoryKey || "outros") === wantedKey);

  const drawerTopTitle = $("drawerTopTitle");
  if(drawerTopTitle){
    drawerTopTitle.textContent = NAV_LABELS[wantedKey] || (wantedKey ? wantedKey : "Categorias");
  }

  const drawerTitle = $("drawerTitle");
  if(drawerTitle) drawerTitle.textContent = "";

  const baseBadge = $("baseBadge");
  if(baseBadge){
    const nm = state.baseName ? state.baseName.split(" ").slice(0,2).join(" ") : "—";
    baseBadge.innerHTML = `Base<br>${escapeHtml(nm)}`;
  }

  const leftCount = $("leftCount");
  if(leftCount) leftCount.textContent = `${filtered.length} abas`;

  if(!filtered.length){
    const isCustom = readCustomCategories().some(c => c.key === wantedKey);
    if(!sheets.length){
      box.innerHTML = `<div class="empty">Nenhuma aba encontrada (planilha não carregada).</div>`;
    }else if(isCustom){
      box.innerHTML = `<div class="empty">Nenhuma aba encontrada nesta categoria.</div>`;
    }else{
      filtered = sheets.slice();
    }
  }

  if(!filtered.length){
    box.innerHTML = `<div class="empty">Nenhuma aba encontrada.</div>`;
    return;
  }

  for(const sh of filtered){
    const btn = document.createElement("div");
    btn.className = "tab" + (state.selectedSheet?.name === sh.name ? " active" : "");
    btn.onclick = () => {
      closeDrawer();
      window.__gpSelectSheet?.(sh.name);
    };
    const cat = sh.categoryRaw ? ` <span class="muted" style="font-size:11px; font-weight:850;">• ${escapeHtml(sh.categoryRaw)}</span>` : "";
    btn.innerHTML = `<div class="name">${escapeHtml(sh.name)}${cat}</div>`;
    box.appendChild(btn);
  }
}


function setIndiceView(key){
  const k = String(key || "").trim();
  const frame = $("indiceFrame");
  const title = $("indiceTitle");
  const meta  = $("indiceMeta");
  if(!frame) return;

  const isCecad = (k === "cecad");
  const src = isCecad ? "./indices/analise_cecad.html" : "./indices/analise_eleitorado.html";
  frame.setAttribute("src", src);

  if(title) title.textContent = isCecad ? "Índice CECAD" : "Índice Eleitoral";
  if(meta)  meta.textContent  = isCecad ? "CECAD • Cadastro Único" : "Perfil do Eleitorado (2024)";
}


function setAguaEsgotoView(){
  const frame = $("indiceFrame");
  const title = $("indiceTitle");
  const meta  = $("indiceMeta");
  if(!frame) return;

  frame.setAttribute("src", "./indices/dashboard_agua_esgoto.html");
  if(title) title.textContent = "Água e Esgoto";
  if(meta)  meta.textContent  = "Dashboard • SNIS 2022 (16 municípios)";
}


function setAtlasVulnerabilidadeView(){
  const frame = $("indiceFrame");
  const title = $("indiceTitle");
  const meta  = $("indiceMeta");
  if(!frame) return;

  frame.setAttribute("src", "./indices/dashboard_atlas_vulnerabilidade.html");
  if(title) title.textContent = "Atlas de Vulnerabilidade";
  if(meta)  meta.textContent  = "Dashboard • Vulnerabilidade Social";
}


function resetSelection(){
  state.selectedSheet = null;
  state.selectedSubtab = "Geral";
  state.selectedYear = null;
  state.selectedMeasure = null;
  state.selectedRowKey = null;
  state.lastCompare = null;
}

export function bindSideNav(){
  renderCustomNavButtons();
  window.__gpRefreshSideNav = () => {
    renderCustomNavButtons();
    syncActiveNav();
  };

  window.__gpOnCustomCategoryDeleted = (key) => {
    const k = String(key || "").trim();
    if(!k) return;

    // If the user deleted the currently active custom category, fall back safely.
    if(state.navGroup === k){
      state.navGroup = "territorio";
      state.rightMode = "data";
      resetSelection();
      closeDrawer();
    }

    // Refresh nav buttons and UI.
    renderCustomNavButtons();
    syncActiveNav();
    window.__gpRenderAll?.();
  };


  const nav = $("navList") || $("sideNav");
  if(nav){
    nav.addEventListener("click", (e) => {
      const btn = e.target.closest?.(".navBtn");
      if(!btn) return;
      const group = btn.getAttribute("data-group") || "";
      if(!group) return;


      const prevGroup = state.navGroup;
      const prevMode = state.rightMode;
      const changedGroup = group !== prevGroup;


      if(group === "cecad" || group === "eleitoral" || group === "agua_esgoto" || group === "atlas_vulnerabilidade"){
        resetSelection();
        state.navGroup = group;
        state.rightMode = "data";
        closeDrawer();
        syncActiveNav();

        if(group === "agua_esgoto"){
          setAguaEsgotoView();
        }else if(group === "atlas_vulnerabilidade"){
          setAtlasVulnerabilidadeView();
        }else{
          setIndiceView(group);
        }

        window.__gpRenderAll?.();
        return;
      }


      if(group === "mapa"){
        if(prevMode !== "map" || changedGroup) resetSelection();
        state.navGroup = "mapa";
        state.rightMode = "map";
        closeDrawer();
        syncActiveNav();
        window.__gpRenderAll?.();
        return;
      }

      state.rightMode = "data";

      if(prevMode !== "data" || changedGroup){
        resetSelection();
      }

      const isSame = state.navGroup === group;
      const willOpen = !(state.drawerOpen && isSame);

      state.navGroup = group;
      syncActiveNav();

      if(willOpen){
        openDrawer(group);
      }else{
        closeDrawer();
      }

      window.__gpRenderAll?.();
    });
  }

  $("btnCloseDrawer")?.addEventListener("click", closeDrawer);

  // Estado inicial
  syncActiveNav();
  closeDrawer();
}

function syncActiveNav(){
  document.querySelectorAll("#sideNav .navBtn").forEach(b => {
    b.classList.toggle("active", (b.getAttribute("data-group") || "") === state.navGroup);
  });

  // Ajustes globais de layout por modo (ex.: esconder barra de projeções no modo Mapa)
  const isMapMode = (state.navGroup === "mapa") || (state.rightMode === "map");
  document.documentElement.classList.toggle("mode-map", !!isMapMode);

  const isIndice = (state.navGroup === "cecad") || (state.navGroup === "eleitoral") || (state.navGroup === "agua_esgoto") || (state.navGroup === "atlas_vulnerabilidade");
  document.documentElement.classList.toggle("mode-indice", !!isIndice);
  if(isIndice){
    if(state.navGroup === "agua_esgoto"){
      setAguaEsgotoView();
    }else if(state.navGroup === "atlas_vulnerabilidade"){
      setAtlasVulnerabilidadeView();
    }else{
      setIndiceView(state.navGroup);
    }
  }else{
    const fr = $("indiceFrame");
    if(fr && fr.getAttribute("src") && fr.getAttribute("src") !== "about:blank"){
      fr.setAttribute("src","about:blank");
    }
  }
}
