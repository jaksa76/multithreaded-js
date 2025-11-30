export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class Request {
  path: string;
  method: HttpMethod;
  query: Record<string, string>;
  params: Record<string, string>;
  headers: Record<string, string>;
  body?: any;
  arg?: any;

  constructor(
    path: string,
    method: HttpMethod = 'GET',
    query: Record<string, string> = {},
    params: Record<string, string> = {},
    headers: Record<string, string> = {},
    body?: any,
    arg?: any
  ) {
    this.path = path;
    this.method = method;
    this.query = query;
    this.params = params;
    this.headers = headers;
    this.body = body;
    this.arg = arg;
  }
}

export class App {
  private routes: { method: HttpMethod; pattern: string; handler: (arg: any) => any }[] = [];

  get(path: string, handler: (arg: any) => any) {
    this.routes.push({ method: 'GET', pattern: path, handler });
  }

  post(path: string, handler: (arg: any) => any) {
    this.routes.push({ method: 'POST', pattern: path, handler });
  }

  put(path: string, handler: (arg: any) => any) {
    this.routes.push({ method: 'PUT', pattern: path, handler });
  }

  patch(path: string, handler: (arg: any) => any) {
    this.routes.push({ method: 'PATCH', pattern: path, handler });
  }

  delete(path: string, handler: (arg: any) => any) {
    this.routes.push({ method: 'DELETE', pattern: path, handler });
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

  handle(request: Request | { path: string; method?: HttpMethod; query?: Record<string, string>; headers?: Record<string, string>; body?: any; arg?: any }): any {
    // Support both Request objects and plain objects for backward compatibility
    const req = request instanceof Request ? request : new Request(
      request.path,
      request.method || 'GET',
      request.query || {},
      {},
      request.headers || {},
      request.body,
      request.arg
    );

    for (const route of this.routes) {
      // Check if method and path match
      if (route.method !== req.method) {
        continue;
      }

      const { match, params } = this.matchRoute(route.pattern, req.path);
      if (match) {
        // Create handler argument with params, query, headers, body, and potentially arg
        const hasParams = Object.keys(params).length > 0;
        const hasQuery = Object.keys(req.query).length > 0;
        const hasHeaders = Object.keys(req.headers).length > 0;
        const hasBody = req.body !== undefined;
        
        let handlerArg: any;
        if (hasParams || hasQuery || hasHeaders || hasBody) {
          // Build rich request object
          handlerArg = { ...params };
          if (hasQuery) {
            handlerArg.query = req.query;
          }
          if (hasHeaders) {
            handlerArg.headers = req.headers;
          }
          if (hasBody) {
            handlerArg.body = req.body;
          }
        } else {
          // No params, query, headers, or body - use original arg
          handlerArg = req.arg;
        }
        
        const response = route.handler(handlerArg);
        return response;
      }
    }
    return `No handler for ${req.method} ${req.path}`;
  }
}