/**
 * Tenant Management Service
 * Handles API key validation and tenant ID resolution
 */

// In-memory tenant registry (for testing)
// In production, this would be stored in Firestore or environment variables
const TENANT_REGISTRY: Map<string, { tenantId: string; name: string; enabled: boolean }> = new Map([
  // Demo tenants for testing
  ["demo-key-1", { tenantId: "tenant-1", name: "Demo Tenant 1", enabled: true }],
  ["demo-key-2", { tenantId: "tenant-2", name: "Demo Tenant 2", enabled: true }],
  ["test-key", { tenantId: "test-tenant", name: "Test Tenant", enabled: true }],
]);

/**
 * Validate API key and return tenant information
 */
export function validateApiKey(apiKey: string | null | undefined): {
  valid: boolean;
  tenantId?: string;
  name?: string;
  error?: string;
} {
  if (!apiKey) {
    return { valid: false, error: "API key is required" };
  }

  const tenant = TENANT_REGISTRY.get(apiKey);
  if (!tenant) {
    return { valid: false, error: "Invalid API key" };
  }

  if (!tenant.enabled) {
    return { valid: false, error: "Tenant is disabled" };
  }

  return {
    valid: true,
    tenantId: tenant.tenantId,
    name: tenant.name,
  };
}

/**
 * Get tenant ID from API key or direct tenantId
 */
export function getTenantId(apiKey?: string | null, tenantId?: string | null): string | null {
  // If tenantId is provided directly, use it
  if (tenantId) {
    return tenantId;
  }

  // Otherwise, validate API key and extract tenantId
  if (apiKey) {
    const validation = validateApiKey(apiKey);
    if (validation.valid && validation.tenantId) {
      return validation.tenantId;
    }
  }

  return null;
}

export interface TenantExtractionSources {
  bodyTenantId: string | null;
  queryTenantId: string | null;
  headerTenantId: string | null;
  cookieTenantId: string | null;
  bodyApiKey: string | null;
  queryApiKey: string | null;
  headerApiKey: string | null;
  resolvedTenantId: string | null;
  apiKey?: string | null;
  tenantIdCandidate?: string | null;
}

export interface TenantExtractionResult {
  tenantId?: string;
  parsedBody?: unknown;
  sources: TenantExtractionSources;
}

function parseCookieValue(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [k, ...rest] = cookie.trim().split("=");
    if (k === key) {
      return rest.join("=").trim() || null;
    }
  }
  return null;
}

export async function extractTenantIdFromRequest(req: Request): Promise<TenantExtractionResult> {
  let parsedBody: unknown;
  let bodyTenantId: string | null = null;
  let bodyApiKey: string | null = null;

  try {
    const cloned = req.clone();
    const text = await cloned.text();
    if (text) {
      try {
        parsedBody = JSON.parse(text);
        if (parsedBody && typeof parsedBody === "object") {
          const record = parsedBody as Record<string, unknown>;
          if (typeof record.tenantId === "string" && record.tenantId.trim().length > 0) {
            bodyTenantId = record.tenantId.trim();
          }
          if (typeof record.apiKey === "string" && record.apiKey.trim().length > 0) {
            bodyApiKey = record.apiKey.trim();
          }
        }
      } catch (parseError) {
        console.warn("⚠️ Failed to parse request body while extracting tenantId:", parseError);
      }
    }
  } catch (cloneError) {
    console.warn("⚠️ Failed to clone request while extracting tenantId:", cloneError);
  }

  let queryTenantId: string | null = null;
  let queryApiKey: string | null = null;
  try {
    const url = new URL(req.url);
    queryTenantId = url.searchParams.get("tenantId");
    queryApiKey = url.searchParams.get("apiKey");
  } catch (urlError) {
    console.warn("⚠️ Failed to parse request URL while extracting tenantId:", urlError);
  }

  const headerTenantId = req.headers.get("x-tenant-id");
  const headerApiKey = req.headers.get("x-api-key") || req.headers.get("authorization");
  const cookieHeader = req.headers.get("cookie");
  const cookieTenantId = parseCookieValue(cookieHeader, "tenantId");
  const cookieApiKey = parseCookieValue(cookieHeader, "apiKey");

  const directTenant =
    bodyTenantId?.trim() ||
    queryTenantId?.trim() ||
    headerTenantId?.trim() ||
    cookieTenantId?.trim() ||
    undefined;

  const apiKeyCandidate =
    bodyApiKey?.trim() ||
    queryApiKey?.trim() ||
    headerApiKey?.trim() ||
    cookieApiKey?.trim() ||
    undefined;

  const resolvedTenantId = getTenantId(apiKeyCandidate || undefined, directTenant || undefined) || undefined;

  let path = "unknown";
  try {
    path = new URL(req.url).pathname;
  } catch {
    // ignore path parsing errors
  }

  console.log("[TRACE tenantId]", {
    path,
    directTenant: directTenant ?? null,
    apiKeyCandidate: apiKeyCandidate ?? null,
    resolvedTenantId: resolvedTenantId ?? null,
    bodyTenantId,
    queryTenantId,
    headerTenantId,
    cookieTenantId,
    bodyApiKey,
    queryApiKey,
    headerApiKey,
    cookieApiKey,
  });

  const sources: TenantExtractionSources = {
    bodyTenantId: bodyTenantId ?? null,
    queryTenantId: queryTenantId ?? null,
    headerTenantId: headerTenantId ?? null,
    cookieTenantId: cookieTenantId ?? null,
    bodyApiKey: bodyApiKey ?? null,
    queryApiKey: queryApiKey ?? null,
    headerApiKey: headerApiKey ?? null,
    resolvedTenantId: resolvedTenantId ?? null,
  };

  return {
    tenantId: resolvedTenantId,
    parsedBody,
    sources,
  };
}

/**
 * Get tenant-specific AI prompt template
 */
export function getTenantPromptTemplate(tenantId: string | null): string {
  // Default prompt template
  const defaultTemplate = `Generate one spontaneous local travel event near {location}.`;

  // Tenant-specific templates (can be stored in database)
  const tenantTemplates: Record<string, string> = {
    "tenant-1": `Generate a fun, family-friendly local travel event near {location}. Focus on activities suitable for all ages.`,
    "tenant-2": `Generate an adventurous, outdoor-focused local travel event near {location}. Emphasize active experiences and nature.`,
    "test-tenant": `Generate a unique, local experience near {location} that showcases the authentic culture of the area.`,
  };

  if (tenantId && tenantTemplates[tenantId]) {
    return tenantTemplates[tenantId];
  }

  return defaultTemplate;
}

/**
 * Get tenant-specific branding/configuration
 */
export function getTenantConfig(tenantId: string | null): {
  mapboxStyle?: string;
  primaryColor?: string;
  aiPromptTemplate?: string;
} {
  const configs: Record<
    string,
    {
      mapboxStyle?: string;
      primaryColor?: string;
      aiPromptTemplate?: string;
    }
  > = {
    "tenant-1": {
      primaryColor: "#3b82f6", // Blue
      aiPromptTemplate: "Generate a family-friendly event...",
    },
    "tenant-2": {
      primaryColor: "#10b981", // Green
      aiPromptTemplate: "Generate an adventurous outdoor event...",
    },
  };

  return configs[tenantId || ""] || {};
}

/**
 * List all tenants (for testing/admin)
 */
export function listTenants(): Array<{ tenantId: string; name: string; enabled: boolean }> {
  return Array.from(TENANT_REGISTRY.values());
}

