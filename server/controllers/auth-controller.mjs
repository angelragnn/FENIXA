// Controlador de autenticación: traduce req/res a llamadas al servicio y maneja la cookie de sesión.
export function createAuthController({ auth, secureCookies }) {
  function setCookie(res, token) {
    res.cookie('fenixa_session', token, { httpOnly: true, sameSite: 'strict', secure: secureCookies, maxAge: auth.sessionMs, path: '/' });
  }

  return {
    async register(req, res) {
      const { user, token } = await auth.register(req.body);
      setCookie(res, token);
      res.status(201).json({ data: user });
    },

    async login(req, res) {
      const { user, token } = await auth.login(req.body, req);
      setCookie(res, token);
      res.json({ data: user });
    },

    me(req, res) {
      res.json({ data: req.user });
    },

    async logout(req, res) {
      await auth.logout(req);
      res.clearCookie('fenixa_session', { path: '/' });
      res.status(204).end();
    }
  };
}
