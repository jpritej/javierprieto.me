/* Incrustación de YouTube sin coste de carga hasta que el visitante decide ver
   el vídeo: mientras tanto solo hay una miniatura estática de YouTube y un
   botón de reproducir, nada de scripts de seguimiento. */

export function videoFacadeHTML(youtubeId, label = "Reproducir vídeo") {
  return `<button type="button" class="video-facade" data-yt="${youtubeId}" aria-label="${label}">
    <img src="https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg" alt="" loading="lazy">
    <span class="video-facade__play" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 5v14l12-7z" fill="currentColor"/></svg>
    </span>
  </button>`;
}

/** Sustituye cada facade sin activar por el iframe real, al pulsarlo. */
export function bindVideoFacades(root = document) {
  root.querySelectorAll(".video-facade[data-yt]").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      const id = btn.dataset.yt;
      const wrap = document.createElement("div");
      wrap.className = "video-embed";
      wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1"
        title="Vídeo de YouTube" allow="autoplay; encrypted-media; picture-in-picture"
        allowfullscreen></iframe>`;
      btn.replaceWith(wrap);
    });
  });
}
