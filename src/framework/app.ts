export class App {
  private routes: { pattern: string; handler: (arg: any) => any }[] = [];

  get(path: string, handler: (arg: any) => any) {
    this.routes.push({ pattern: path, handler });
  }

  private matchRoute(pattern: string, path: string): { match: boolean; params: any } {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return { match: false, params: {} };
    }

    const params: any = {};

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        // This is a parameter
        const paramName = patternParts[i].substring(1);
        params[paramName] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        // Static parts don't match
        return { match: false, params: {} };
      }
    }

    return { match: true, params };
  }

  handle(request: { path: string; arg?: any }): any {
    for (const route of this.routes) {
      const { match, params } = this.matchRoute(route.pattern, request.path);
      if (match) {
        // If there are URL parameters, pass them; otherwise pass the original arg
        const handlerArg = Object.keys(params).length > 0 ? params : request.arg;
        const response = route.handler(handlerArg);
        return response;
      }
    }
    return `No handler for path: ${request.path}`;
  }
}