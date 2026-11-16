import sanitizeHtml from "sanitize-html";

export function cleanHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "h3", "u", "s"]),
    allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt", "width", "height"], "*": ["style"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedStyles: { "*": { "text-align": [/^(left|right|center|justify)$/] } },
  });
}
