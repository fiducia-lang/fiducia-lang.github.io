# fiducia-lang.github.io
Fiducia Information Flow Security for Embedded Devices Using seL4 and Trustworthy Systems

## Site structure

Static HTML served by GitHub Pages. Hand-written pages share
`assets/site.css` and `assets/site.js`, and each repeats the same header and
footer (update them together):

| Path | Page |
|------|------|
| `index.html` | Homepage: vision, Why Fiducia, How it works, data diode example, blog column |
| `blog/` | Blog index (Release / Publication / Post) and posts |
| `docs/` | Docs landing page; `docs/examples/`, `docs/publications/` |
| `about/` | People, supporters, contact |
| `examples/*.html` | The nine security-pattern pages, listed under Docs › Examples |

Written by fic CI, do not edit by hand: `docs/manual/`, `docs/lang-spec/`,
`releases/`. When a release is published, add a Release entry to
`blog/index.html` and update the release card and feed on `index.html`.

## Local source clones (optional, gitignored)

For diffing / browsing the source repos that the blog posts link to,
clone them locally into a `sources/` directory (kept out of the
published site by `.gitignore`):

```sh
mkdir -p sources/orin-agx sources/orin-nano

# Linked from blog/sel4-jetson-agx-orin.html
cd sources/orin-agx
for r in seL4 microkit libvmm seL4_tools util_libs; do
    git clone --branch orin-agx https://github.com/potanin/$r.git
done

# Linked from blog/sel4-jetson-orin-nano.html
cd ../orin-nano
for r in seL4 seL4_tools util_libs; do
    git clone --branch orin-nano https://github.com/potanin/$r.git
done
```

Run `git pull` inside each repo to refresh from upstream when those
public branches gain new commits.
