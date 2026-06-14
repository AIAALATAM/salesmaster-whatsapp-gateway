const state = {
  secret: localStorage.getItem("sm_gateway_secret") || "",
  tenants: [],
  instances: []
};

const $ = selector => document.querySelector(selector);

const toast = message => {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  window.setTimeout(() => el.classList.remove("show"), 2600);
};

const api = async (path, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    "x-salesmaster-gateway-secret": state.secret,
    ...(options.headers || {})
  };
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
};

const pretty = value => JSON.stringify(value, null, 2);

const normalizeInstances = payload => {
  const value = payload?.instances ?? payload;
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.instances)) return value.instances;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const getInstanceName = item => item?.instance?.instanceName || item?.name || item?.instanceName || item?.id || "";

const getInstanceStatus = item =>
  item?.instance?.status || item?.connectionStatus || item?.status || item?.state || "unknown";

const findQr = value => {
  if (!value || typeof value !== "object") return "";
  const candidates = [
    value.base64,
    value.qrcode,
    value.qr,
    value.code,
    value.result?.base64,
    value.result?.qrcode,
    value.result?.qr,
    value.result?.code,
    value.result?.pairingCode
  ];
  return candidates.find(item => typeof item === "string" && item.length > 20) || "";
};

const asImageSrc = value => {
  if (!value) return "";
  if (value.startsWith("data:image")) return value;
  if (value.startsWith("http")) return value;
  if (value.includes("base64,")) return value;
  return `data:image/png;base64,${value}`;
};

const copy = async text => {
  await navigator.clipboard.writeText(text);
  toast("Copiado");
};

const renderTenants = () => {
  const list = $("#tenantList");
  const select = $("#tenantSelect");
  list.innerHTML = "";
  select.innerHTML = "";

  state.tenants.forEach(tenant => {
    const option = document.createElement("option");
    option.value = tenant.locationId;
    option.textContent = `${tenant.instanceName} · ${tenant.locationId}`;
    option.dataset.instance = tenant.instanceName;
    select.appendChild(option);

    const card = document.createElement("article");
    card.className = "tenantCard";
    card.innerHTML = `
      <header>
        <div>
          <h3>${tenant.instanceName}</h3>
          <span>${tenant.locationId}</span>
        </div>
        <span class="badge">${tenant.gateway}</span>
      </header>
      <div class="copyLine">
        <code>${tenant.deliveryUrl}</code>
        <button class="button" type="button" data-copy="${tenant.deliveryUrl}">Copiar</button>
      </div>
      <div class="copyLine">
        <code>${tenant.evolutionWebhookUrl}</code>
        <button class="button" type="button" data-copy="${tenant.evolutionWebhookUrl}">Copiar</button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll("[data-copy]").forEach(button => {
    button.addEventListener("click", () => copy(button.dataset.copy || ""));
  });

  if (state.tenants[0]) {
    $("#instanceInput").value = state.tenants[0].instanceName;
  }
};

const renderInstances = () => {
  const names = state.instances.map(getInstanceName).filter(Boolean);
  $("#evolutionState").textContent = names.length ? `${names.length} instancias` : "Sin datos";
};

const loadSummary = async () => {
  const data = await api("/api/dashboard/summary");
  state.tenants = data.tenants || [];
  $("#gatewayMode").textContent = data.gateway?.activeGateway || "-";
  $("#tenantCount").textContent = state.tenants.length.toString();
  $("#securityState").textContent = data.gateway?.requireGatewaySecret ? "Protegido" : "Abierto";
  renderTenants();
};

const loadInstances = async () => {
  const data = await api("/api/dashboard/evolution/instances");
  state.instances = normalizeInstances(data);
  renderInstances();
  $("#apiOutput").textContent = pretty(data);
};

const refresh = async () => {
  if (!state.secret) {
    toast("Guarda el Gateway secret primero");
    return;
  }
  try {
    await loadSummary();
    try {
      await loadInstances();
    } catch (error) {
      state.instances = [];
      renderInstances();
      $("#apiOutput").textContent = `Evolution no responde: ${error.message}`;
      toast("Gateway cargado; Evolution no responde");
      return;
    }
    toast("Dashboard actualizado");
  } catch (error) {
    $("#apiOutput").textContent = error.message;
    toast(error.message);
  }
};

const selectedTenant = () => {
  const locationId = $("#tenantSelect").value;
  return state.tenants.find(tenant => tenant.locationId === locationId);
};

const syncInstanceFromTenant = () => {
  const option = $("#tenantSelect").selectedOptions[0];
  if (option?.dataset.instance) {
    $("#instanceInput").value = option.dataset.instance;
  }
};

const createInstance = async () => {
  const instanceName = $("#instanceInput").value.trim();
  const data = await api("/api/dashboard/evolution/instances", {
    method: "POST",
    body: JSON.stringify({ instanceName })
  });
  $("#apiOutput").textContent = pretty(data);
  toast("Instancia creada");
  await loadInstances();
};

const connectInstance = async () => {
  const instanceName = $("#instanceInput").value.trim();
  const data = await api(`/api/dashboard/evolution/instances/${encodeURIComponent(instanceName)}/connect`, {
    method: "POST"
  });
  const qr = findQr(data);
  const box = $("#qrBox");
  if (qr) {
    box.innerHTML = `<img alt="QR WhatsApp" src="${asImageSrc(qr)}" />`;
  } else {
    box.innerHTML = "<span>No encontré una imagen QR en la respuesta. Revisa el JSON.</span>";
  }
  $("#apiOutput").textContent = pretty(data);
  toast("Respuesta QR recibida");
};

const setWebhook = async () => {
  const tenant = selectedTenant();
  const instanceName = $("#instanceInput").value.trim();
  const data = await api(`/api/dashboard/evolution/instances/${encodeURIComponent(instanceName)}/webhook`, {
    method: "POST",
    body: JSON.stringify({ locationId: tenant?.locationId })
  });
  $("#apiOutput").textContent = pretty(data);
  toast("Webhook configurado");
};

$("#secretInput").value = state.secret;
$("#saveSecretButton").addEventListener("click", () => {
  state.secret = $("#secretInput").value.trim();
  localStorage.setItem("sm_gateway_secret", state.secret);
  toast("Secret guardado");
  refresh();
});
$("#refreshButton").addEventListener("click", refresh);
$("#tenantSelect").addEventListener("change", syncInstanceFromTenant);
$("#createInstanceButton").addEventListener("click", () => createInstance().catch(error => toast(error.message)));
$("#connectInstanceButton").addEventListener("click", () => connectInstance().catch(error => toast(error.message)));
$("#setWebhookButton").addEventListener("click", () => setWebhook().catch(error => toast(error.message)));

if (state.secret) {
  refresh();
}
