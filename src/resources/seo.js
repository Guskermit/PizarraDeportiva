// IMPORTANT: Replace with your own domain address - it's used for SEO in meta tags and schema
const baseURL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// metadata for pages
const meta = {
  home: {
    path: "/",
    title: "Pizarra Deportiva | Pizarra táctica de fútbol sala",
    description:
      "Crea, comparte y visualiza jugadas de fútbol sala con una pizarra táctica interactiva para clubes, entrenadores y jugadores.",
    image: "/images/og/home.jpg",
    canonical: baseURL,
    robots: "index,follow",
    alternates: [{ href: baseURL, hrefLang: "es" }],
  },
  // add more routes and reference them in page.tsx
};

// default schema data
const schema = {
  logo: "",
  type: "Organization",
  name: "Pizarra Deportiva",
  description: meta.home.description,
  email: "",
};

export { meta, schema, baseURL };