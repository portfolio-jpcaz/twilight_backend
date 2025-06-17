function logRoutes(app) {
  console.log("🔍 Registered routes:");

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Route directe (ex: app.get('/'))
      const method = Object.keys(middleware.route.methods)[0].toUpperCase();
      const path = middleware.route.path;
      console.log(`${method} ${path}`);
    } else if (middleware.name === "router" && middleware.handle.stack) {
      // Router monté via app.use('/prefix', router)
      let prefix = middleware.regexp?.source
        .replace("\\/?", "") 
        .replace("(?=\\/|$)", "") 
        .replace(/^\\\//, "/") 
        .replace(/\\\//g, "/")
        .replace(/\^/,""); 

      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const method = Object.keys(handler.route.methods)[0].toUpperCase();
          const path = handler.route.path;
          console.log(`${method} ${prefix}${path}`);
        }
      });
    }
  });
}

module.exports = logRoutes;
