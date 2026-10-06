let activeCompanyId = null;

export function setActiveCompanyId(id) {
  activeCompanyId = id == null || id === "" ? null : String(id);
}

export function getActiveCompanyId() {
  return activeCompanyId;
}

export function actorName() {
  if (typeof localStorage === "undefined") return "";
  try {
    const user = JSON.parse(localStorage.getItem("compta-mvp:user"));
    return typeof user?.name === "string" ? user.name : "";
  } catch {
    return "";
  }
}
