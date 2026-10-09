# LOGOS Card Battle

Web game source: [WebBattle](WebBattle/README.md)

- Live game: https://logos-card-battle.netlify.app/
- This `web-battle` branch contains the standalone React/TypeScript game and Cloudflare server.
- The existing Unity project remains on `main`. Its large assets are excluded from this deployment branch.
- Netlify builds `WebBattle/` on pushes to `web-battle`.
- Server changes require the separate Cloudflare deployment described in [DEPLOY.md](WebBattle/docs/DEPLOY.md).
