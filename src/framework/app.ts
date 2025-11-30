export class Request {
  path: string;
  query: Record<string, string>;
  params: Record<string, string>;
  arg?: any;

  constructor(
    path: string,
    query: Record<string, string> = {},
    params: Record<string, string> = {},
    arg?: any
  ) {
    this.path = path;
    this.query = query;
    this.params = params;
    this.arg = arg;
  }
}

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
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];
      
      if (patternPart === undefined || pathPart === undefined) {
        return { match: false, params: {} };
      }
      
      if (patternPart.startsWith(':')) {
        // This is a parameter
        const paramName = patternPart.substring(1);
        params[paramName] = pathPart;
      } else if (patternPart !== pathPart) {
        // Static parts don't match
        return { match: false, params: {} };
      }
    }

    return { match: true, params };
  }

  handle(request: Request | { path: string; query?: Record<string, string>; arg?: any }): any {
    // Support both Request objects and plain objects for backward compatibility
    const req = request instanceof Request ? request : new Request(
      request.path,
      request.query || {},
      {},
      request.arg
    );

    for (const route of this.routes) {
      const { match, params } = this.matchRoute(route.pattern, req.path);
      if (match) {
        // Create handler argument with params, query, and potentially arg
        const hasParams = Object.keys(params).length > 0;
        const hasQuery = Object.keys(req.query).length > 0;
        
        let handlerArg: any;
        if (hasParams || hasQuery) {
          // Merge params and query, with query nested
          handlerArg = { ...params };
          if (hasQuery) {
            handlerArg.query = req.query;
          }
        } else {
          // No params or query, use original arg
          handlerArg = req.arg;
        }
        
        const response = route.handler(handlerArg);
        return response;
      }
    }
    return `No handler for path: ${req.path}`;
  }
}