// Runs before first paint so the chosen theme never flashes. Scoped to the public site.
export const THEME_KEY = "avrix_theme";

const code = `(function(){try{var d=document.documentElement;var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.setAttribute("data-site-theme",t);d.classList.add("site-js");setTimeout(function(){if(!d.classList.contains("site-reveal-live")){var n=document.querySelectorAll("[data-reveal]");for(var i=0;i<n.length;i++)n[i].classList.add("is-visible")}},2500)}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
