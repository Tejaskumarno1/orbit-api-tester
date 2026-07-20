export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface HeaderItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface QueryParamItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export type AssertionType = 'status_code' | 'response_time' | 'json_body';
export type AssertionOperator = 'equals' | 'not_equals' | 'less_than' | 'greater_than' | 'contains' | 'has_property';

export interface Assertion {
  id: string;
  type: AssertionType;
  operator: AssertionOperator;
  targetPath?: string; // used for json_body
  expectedValue: string;
}

export interface SavedRequest {
  id: string;
  name: string;
  category: string;
  method: HttpMethod;
  url: string;
  headers: HeaderItem[];
  queryParams: QueryParamItem[];
  body: string;
  description?: string;
  bodySchema?: any;
  assertions?: Assertion[];
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    duration: number; // in ms
    size: string; // formatted size
    data: any;
  } | null;
  error?: string;
}

export interface WorkspaceTab {
  id: string;
  name: string;
  description: string;
  method: HttpMethod;
  url: string;
  headers: HeaderItem[];
  queryParams: QueryParamItem[];
  body: string;
  bodySchema?: any;
  category?: string;
  requestId?: string;
  historyId?: string;
  assertions?: Assertion[];
  testResults?: { assertionId: string; passed: boolean; actualValue?: any; error?: string }[];
  isLoading: boolean;
  response: any | null;
  error?: string;
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}
